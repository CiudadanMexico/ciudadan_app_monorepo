#!/bin/bash
# Lanzamiento de una sesion Cline en un contenedor.
# Uso: bash launch-cont.sh <contenedor> <sesion> <tarea_b64> <usuario> <cfg_dir>
#
# TRES FALLOS REALES corregidos aqui el 2026-11-01:
#
# 1) `--id` NO SE USA. En Cline, `--id <session-id>` significa "Resume an
#    existing session by ID". Al pasar un id inexistente, Cline creaba la
#    sesion con ese id pero entraba en modo reanudacion: ignoraba el prompt,
#    arrancaba con hasPrompt=false y se quedaba horas en "Ask anything...".
#    Sin --id, Cline genera su propio identificador de sesion.
#
# 2) EL PROMPT NO LLEGABA. `tmux new-session` re-ensambla sus argumentos y
#    reparte el prompt en palabras sueltas. El prompt va en un fichero y un
#    wrapper lo lee con "$(cat ...)": asi llega como un unico argumento.
#
# 3) GIT "DUBIOUS OWNERSHIP". Al lanzar como root sobre un repo propiedad de
#    yizuz, `git rev-parse` falla con "detected dubious ownership" y Cline
#    registra workspace.init_error. Se registra el directorio como seguro.
set -u
c="$1"; ses="$2"; b64="$3"; usr="$4"; cfg="$5"
if [ -z "$c" ] || [ -z "$ses" ] || [ -z "$usr" ] || [ -z "$cfg" ]; then
  echo "err=uso_incorrecto"; exit 2
fi

# 1) Tarea en un fichero, dentro del contenedor.
echo "$b64" | base64 -d > "/tmp/${ses}-tarea.md" || { echo "err=base64"; exit 2; }
sudo -n docker cp "/tmp/${ses}-tarea.md" "$c":"/tmp/${ses}-tarea.md" >/dev/null 2>&1 || { echo "err=cp"; exit 2; }

# 2) Prompt en un fichero (sin comillas que tmux pueda romper).
printf 'Lee /tmp/%s-tarea.md y ejecuta la tarea completa. Trabaja sin preguntar: ejecuta los pasos, verifica y deja el informe y el centinela DONE indicados en el fichero.\n' "$ses" > "/tmp/${ses}-prompt.txt"

# 3) Wrapper: entrega el prompt como un unico argumento y NO usa --id.
#    Ademas engancha el vigilante de heartbeat: el hub de Cline NO emite
#    heartbeat en estos contenedores (hub-daemon.log se queda vacio), asi que
#    sin este vigilante el monitor no tiene ninguna senal real del runtime.
#    El vigilante escribe {"ts":"<ISO>","event":"run.heartbeat",...} cada 15 s
#    mientras el proceso Cline siga vivo, con el tamaño del messages.json
#    (si no crece, el agente esta vivo pero no avanza).
#
#    El vigilante se embebe aqui para que el launcher sea autocontenido: si
#    no existe /tmp/hb-watch.sh en el nodo, se escribe antes de copiarlo.
if [ ! -f /tmp/hb-watch.sh ]; then
  cat > /tmp/hb-watch.sh <<'HBEOF'
#!/bin/sh
pid="$1"; ses="$2"; msgs="$3"; log="$4"
[ -z "$pid" ] || [ -z "$log" ] && exit 2
while kill -0 "$pid" 2>/dev/null; do
  n=0
  if [ -z "$msgs" ] || [ ! -f "$msgs" ]; then
    msgs=$(ls -t /workspace/.cline/data/sessions/*/*.messages.json 2>/dev/null | head -1)
  fi
  if [ -n "$msgs" ] && [ -f "$msgs" ]; then
    n=$(wc -c < "$msgs" 2>/dev/null | tr -d ' ')
    [ -z "$n" ] && n=0
  fi
  printf '{"ts":"%s","event":"run.heartbeat","session":"%s","bytes":%s}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" "$ses" "$n" >> "$log" 2>/dev/null
  sleep 15
done
HBEOF
  chmod +x /tmp/hb-watch.sh
fi

cat > "/tmp/${ses}-run.sh" <<'WRAP'
#!/bin/sh
ses=$(basename "$0" | sed 's/-run\.sh$//')
cfg="$1"
base=/workspace/.cline/data
log="$base/logs/hub-daemon.log"
mkdir -p "$base/logs"
cline --config "$cfg" --cwd /workspace/ciudadan_app_monorepo "$(cat /tmp/$ses-prompt.txt)" &
pid=$!
/tmp/hb-watch.sh "$pid" "$ses" "" "$log" >/dev/null 2>&1 &
wait "$pid"
rc=$?
exit $rc
WRAP
chmod +x "/tmp/${ses}-run.sh"

sudo -n docker cp "/tmp/${ses}-prompt.txt" "$c":"/tmp/${ses}-prompt.txt" >/dev/null 2>&1 || { echo "err=cp_prompt"; exit 2; }
sudo -n docker cp "/tmp/${ses}-run.sh" "$c":"/tmp/${ses}-run.sh" >/dev/null 2>&1 || { echo "err=cp_run"; exit 2; }
# El vigilante de heartbeat tiene que estar dentro del contenedor.
if [ -f /tmp/hb-watch.sh ]; then
  sudo -n docker cp /tmp/hb-watch.sh "$c":/tmp/hb-watch.sh >/dev/null 2>&1
fi
sudo -n docker exec -u "$usr" "$c" chmod +x "/tmp/${ses}-run.sh" >/dev/null 2>&1
sudo -n docker exec -u "$usr" "$c" chmod +x /tmp/hb-watch.sh >/dev/null 2>&1

# 4) Git: el directorio del repo debe ser seguro para este usuario.
sudo -n docker exec -u "$usr" "$c" git config --global --add safe.directory /workspace/ciudadan_app_monorepo >/dev/null 2>&1

# 5) Si ya existe una sesion con este nombre (zombie de una corrida previa),
#    se cierra antes de crear la nueva. Los procesos headless sueltos tambien.
sudo -n docker exec -u "$usr" "$c" tmux kill-session -t "$ses" >/dev/null 2>&1
for p in $(sudo -n docker exec "$c" sh -c 'ps -eo pid,args | grep "[c]line --config" | grep -v " -i " | cut -d" " -f1' 2>/dev/null); do
  sudo -n docker exec "$c" kill -9 "$p" >/dev/null 2>&1
done
sleep 1

# 6) Lanzar. El comando no lleva comillas internas, asi que tmux lo reparte bien.
sudo -n docker exec -u "$usr" "$c" \
  tmux new-session -d -s "$ses" -x 220 -y 50 "/tmp/${ses}-run.sh $cfg" >/dev/null 2>&1
rc=$?
echo "launch_rc=$rc"
echo "sesion=$ses usuario=$usr cfg=$cfg"
exit $rc
