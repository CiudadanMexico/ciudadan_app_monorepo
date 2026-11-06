#!/bin/sh
# Vigilante de heartbeat de un runtime Cline.
#
# Uso: hb-watch.sh <pid> <session_id> <messages_path> <log_path>
#
# Escribe en <log_path> una linea por cada 15 s mientras el proceso siga
# vivo:
#   {"ts":"<ISO-8601>","event":"run.heartbeat","session":"<id>","bytes":<n>}
#
# "bytes" es el tamaño del messages.json de la sesión. Si NO crece, el agente
# esta vivo pero no avanza: el monitor distingue asi "vivo" de "chambeando".
pid="$1"
ses="$2"
msgs="$3"
log="$4"

[ -z "$pid" ] || [ -z "$log" ] && exit 2

while kill -0 "$pid" 2>/dev/null; do
  n=0
  if [ -f "$msgs" ]; then
    n=$(wc -c < "$msgs" 2>/dev/null | tr -d ' ')
    [ -z "$n" ] && n=0
  fi
  printf '{"ts":"%s","event":"run.heartbeat","session":"%s","bytes":%s}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)" "$ses" "$n" >> "$log" 2>/dev/null
  sleep 15
done
