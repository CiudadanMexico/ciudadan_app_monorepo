#!/usr/bin/env bash
# Descarga las 58 fotos de catalogo.json a images/<archivo>.
# curl --fail --location --max-time 45, 3 reintentos, max 3 simultaneas.
# Escribe en temporal y renombra solo al validar (HTTP, Content-Type,
# firma real JPEG/PNG, decodificable). Idempotente: reutiliza validas.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
IMG="$DIR/images"
CAT="$DIR/catalogo.json"
mkdir -p "$IMG"
command -v curl >/dev/null || { echo "falta curl" >&2; exit 1; }

es_valida() {
  local f="$1"
  [ -s "$f" ] || return 1
  local head
  head="$(head -c 8 "$f" | od -An -tx1 | tr -d ' \n')"
  case "$head" in
    ffd8ff*) return 0 ;;
    89504e47*) return 0 ;;
    *) return 1 ;;
  esac
}

descargar_una() {
  local archivo="$1" url="$2"
  local dest="$IMG/$archivo" tmp="$IMG/.$archivo.tmp.$$"
  if es_valida "$dest"; then echo "OK (reutilizada) $archivo"; return 0; fi
  local intento=1
  while [ $intento -le 3 ]; do
    rm -f "$tmp" "$tmp.hdr"
    if curl --fail --location --max-time 45 -sS -D "$tmp.hdr" -o "$tmp" "$url"; then
      local ct
      ct="$(grep -i '^content-type:' "$tmp.hdr" | tail -n1 | tr -d '\r' | awk '{print $2}' | cut -d';' -f1)"
      case "$ct" in
        image/jpeg|image/png|image/jpg)
          if es_valida "$tmp"; then
            mv -f "$tmp" "$dest"; rm -f "$tmp.hdr"
            echo "OK (descargada) $archivo"
            return 0
          else
            echo "FALLO firma-invalida intento=$intento $archivo ($url)" >&2
          fi
          ;;
        *)
          echo "FALLO content-type=$ct intento=$intento $archivo ($url)" >&2
          ;;
      esac
    else
      echo "FALLO curl intento=$intento $archivo ($url)" >&2
    fi
    rm -f "$tmp" "$tmp.hdr"
    intento=$((intento+1))
    sleep 1
  done
  echo "FALLO definitivo $archivo ($url)" >> "$DIR/fallos.log"
  return 1
}

export -f es_valida descargar_una
export IMG DIR
rm -f "$DIR/fallos.log"
python3 -c "
import json
c = json.load(open('$CAT'))
for f in c['fotos']:
    print(f\"{f['archivo']}\t{f['url']}\")
" > "$DIR/.lista.tsv"

cat "$DIR/.lista.tsv" | xargs -P 3 -I{} bash -c '
  archivo=$(printf "%s" "{}" | cut -f1)
  url=$(printf "%s" "{}" | cut -f2-)
  descargar_una "$archivo" "$url"
'
ec=$?
echo "---"
echo "archivos en images/: $(ls "$IMG" | wc -l) / 58"
if [ -f "$DIR/fallos.log" ]; then echo "FALLOS:"; cat "$DIR/fallos.log"; else echo "sin fallos"; fi
rm -f "$DIR/.lista.tsv"
exit $ec
