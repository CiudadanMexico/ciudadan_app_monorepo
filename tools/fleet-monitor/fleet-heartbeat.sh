#!/bin/bash
# ---------------------------------------------------------------------
# Publica el estado de los contenedores Cline del nodo en un JSON.
#
# Solo lectura: consulta Docker y escribe UNICAMENTE en su propio
# directorio (~/.ciudadan-fleet). No reinicia, no ejecuta acciones dentro
# de los contenedores y no toca nada fuera de casa.
#
# El colector central (C:\yii\tools\fleet) lee este fichero por SSH.
# Ventaja: si el colector se cae, el nodo sigue publicando su estado y
# al volver se sabe cuanto tiempo lleva callado cada agente.
# ---------------------------------------------------------------------
set -u

DIR="$HOME/.ciudadan-fleet"
OUT="$DIR/heartbeat.json"
TMP="$OUT.tmp.$$"

mkdir -p "$DIR" 2>/dev/null || exit 0

# Cerrojo: evita que dos pasadas se pisen (el ciclo dura ~2 s).
exec 9>"$DIR/heartbeat.lock" || exit 0
flock -n 9 || exit 0

TS=$(date +%s)

# Quita caracteres que romperian el JSON (comillas, barras, saltos).
limpio() { printf '%s' "$1" | tr -d '"\\' | tr '\n\r' '  ' | cut -c1-120; }

primero() { printf '%s' "$1" | head -1; }

{
  printf '{"esquema":"ciudadan-fleet-heartbeat-v1","nodo":"%s","ts":%s,"contenedores":[' \
    "$(limpio "${HOSTNAME:-desconocido}")" "$TS"

  primero=1
  for c in $(sudo -n docker ps -a --format '{{.Names}}' 2>/dev/null | sort); do
    st=$(sudo -n docker inspect --format '{{.State.Status}}' "$c" 2>/dev/null || echo "desconocido")
    running=$(sudo -n docker inspect --format '{{.State.Running}}' "$c" 2>/dev/null || echo "false")
    exitc=$(sudo -n docker inspect --format '{{.State.ExitCode}}' "$c" 2>/dev/null || echo "null")
    oom=$(sudo -n docker inspect --format '{{.State.OOMKilled}}' "$c" 2>/dev/null || echo "false")
    inicio=$(sudo -n docker inspect --format '{{.State.StartedAt}}' "$c" 2>/dev/null || echo "")
    fin=$(sudo -n docker inspect --format '{{.State.FinishedAt}}' "$c" 2>/dev/null || echo "")

    # El monorepo vive en /workspace/ciudadan_app_monorepo; /workspace es solo
    # el contenedor de trabajo. Se prueban ambos por si cambia el montaje.
    gitinfo=$(sudo -n docker exec "$c" sh -c 'cd /workspace/ciudadan_app_monorepo 2>/dev/null || cd /workspace; git log -1 --format="%ct %h" 2>/dev/null' 2>/dev/null | head -1)
    gepoch=$(printf '%s\n' "$gitinfo" | awk '{print $1+0}')
    ghash=$(printf '%s\n' "$gitinfo" | awk '{print $2}')

    logf=$(sudo -n docker exec "$c" sh -c 'ls -t /workspace/logs/*.log 2>/dev/null | head -1' 2>/dev/null)
    logepoch=0
    if [ -n "$logf" ]; then
      logepoch=$(sudo -n docker exec "$c" sh -c "stat -c %Y '$logf' 2>/dev/null || echo 0" 2>/dev/null | head -1)
      logepoch=$(printf '%s\n' "$logepoch" | awk '{print $1+0}')
    fi

    procs=$(sudo -n docker exec "$c" sh -c 'pgrep -f cline 2>/dev/null | wc -l' 2>/dev/null | head -1)
    procs=$(printf '%s\n' "$procs" | awk '{print $1+0}')

    # La sesion tmux vive DENTRO del contenedor, no en el host.
    tm=$(sudo -n docker exec "$c" sh -c 'tmux ls 2>/dev/null | head -3 | cut -d: -f1 | tr "\n" ","' 2>/dev/null | head -1)

    # --- Señal nativa de Cline ---------------------------------------------
    # alive_ts: el hub de Cline emite run.heartbeat cada ~30 s. Es la senal
    # de que el RUNTIME de Cline esta vivo (no de que avance el trabajo).
    hubts=$(sudo -n docker exec "$c" sh -c 'tail -c 8000 /workspace/.cline/data/logs/hub-daemon.log 2>/dev/null | grep -o "\"ts\":\"[^\"]*\"" | tail -1 | cut -d\" -f4' 2>/dev/null | head -1)
    alive=0
    if [ -n "$hubts" ]; then
      alive=$(date -u -d "$hubts" +%s 2>/dev/null || echo 0)
    fi

    # progress_ts: cuando se escribio por ultima vez el estado o la
    # conversacion de una sesion de Cline. Este es el progreso REAL.
    # OJO: /workspace/logs/*.log NO sirve (back.log lo escribe un health
    # poll cada 60 s y haria que todo pareciera activo para siempre).
    sessionts=$(sudo -n docker exec "$c" sh -c 'find /workspace/.cline/data/sessions -name "*.json" -printf "%T@\n" 2>/dev/null | sort -rn | head -1 | cut -d. -f1' 2>/dev/null | head -1)
    sessionts=$(printf '%s\n' "$sessionts" | awk '{print $1+0}')

    progress=0
    [ "$gepoch" -gt "$progress" ] && progress="$gepoch"
    [ "$sessionts" -gt "$progress" ] && progress="$sessionts"

    [ "$primero" -eq 1 ] || printf ','
    primero=0
    printf '{"contenedor":"%s","estado":"%s","running":%s,"exit_code":%s,"oom":%s,"inicio":"%s","fin":"%s","commit_epoch":%s,"commit_hash":"%s","log_epoch":%s,"procesos_cline":%s,"tmux":"%s","alive_ts":%s,"session_ts":%s,"progress_ts":%s}' \
      "$(limpio "$c")" "$(limpio "$st")" "$running" "$exitc" "$oom" \
      "$(limpio "$inicio")" "$(limpio "$fin")" \
      "$gepoch" "$(limpio "$ghash")" "$logepoch" "$procs" "$(limpio "$tm")" \
      "$alive" "$sessionts" "$progress"
  done

  printf ']}\n'
} > "$TMP" 2>/dev/null

# El JSON se valida ANTES de publicar: si esta mal formado, se conserva el
# heartbeat anterior (mejor un dato viejo que ningun dato).
validado=0
if command -v python3 >/dev/null 2>&1; then
  python3 -c "import json;json.load(open('$TMP'))" 2>/dev/null && validado=1
elif command -v node >/dev/null 2>&1; then
  node -e "JSON.parse(require('fs').readFileSync('$TMP','utf8'))" 2>/dev/null && validado=1
else
  grep -q '^{.*}$' "$TMP" 2>/dev/null && validado=1
fi

if [ "$validado" -eq 1 ]; then
  # Escritura atomica: el colector nunca lee un JSON a medias.
  mv -f "$TMP" "$OUT" 2>/dev/null || rm -f "$TMP" 2>/dev/null
else
  rm -f "$TMP" 2>/dev/null
  echo "heartbeat-json-invalido: se conserva el anterior" >> "$DIR/heartbeat.log" 2>/dev/null
fi
exit 0
