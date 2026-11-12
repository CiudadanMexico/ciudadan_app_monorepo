#!/bin/bash
# Despliega el publicador de heartbeat en un nodo y lo programa cada minuto.
# Idempotente: se puede repetir sin duplicar la entrada de crontab.
set -u

SRC_DIR="$HOME/.ciudadan-fleet"
SRC="$SRC_DIR/fleet-heartbeat.sh"
CRON_LINE="* * * * * $SRC >> $SRC_DIR/heartbeat.log 2>&1"

mkdir -p "$SRC_DIR" || exit 1
cp "$SRC_DIR/.incoming/fleet-heartbeat.sh" "$SRC" || exit 1
# El fichero llega de Windows: se normaliza a LF para bash.
sed -i 's/\r$//' "$SRC" || exit 1
chmod 0755 "$SRC" || exit 1

# Primera pasada inmediata y validacion del JSON.
"$SRC" || exit 1
if command -v python3 >/dev/null 2>&1; then
  python3 -c "import json,sys; d=json.load(open('$SRC_DIR/heartbeat.json')); print('json_ok contenedores=%d ts=%s' % (len(d.get('contenedores',[])), d.get('ts')))" || exit 1
elif command -v node >/dev/null 2>&1; then
  node -e "const d=require('$SRC_DIR/heartbeat.json'); console.log('json_ok contenedores='+d.contenedores.length+' ts='+d.ts)" || exit 1
else
  head -c 120 "$SRC_DIR/heartbeat.json"; echo
fi

# Crontab idempotente.
( crontab -l 2>/dev/null | grep -v 'fleet-heartbeat.sh' ; echo "$CRON_LINE" ) | crontab -

echo "instalado: $SRC"
echo "crontab:"; crontab -l 2>/dev/null | grep 'fleet-heartbeat.sh' || echo "  (sin entrada)"
