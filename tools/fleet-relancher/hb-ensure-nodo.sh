#!/bin/bash
# Reactiva los vigilantes de heartbeat en los contenedores indicados.
# Uso: bash hb-ensure-nodo.sh <contenedor> [<contenedor>...]
#
# El heartbeat es el sensor del monitor. Si su vigilante muere (reinicio del
# contenedor, OOM, kill manual), el sensor se queda mudo aunque el agente
# siga trabajando. Este script lo repone; es idempotente.
set -u
for c in "$@"; do
  [ -z "$c" ] && continue
  out=$(bash /tmp/activar-heartbeat.sh "$c" /tmp/hb-watch.sh 2>&1)
  echo "$c: $(echo "$out" | tr '\n' ' ' | cut -c1-160)"
done
