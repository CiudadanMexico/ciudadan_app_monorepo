#!/bin/bash
# Relanza un agente: limpia sus procesos Cline previos y arranca la sesion.
# Uso: bash relanzar-agente.sh <contenedor> <sesion> <tarea_b64> <usuario> <cfg_dir>
#
# La sesion base del contenedor (nombre "cline", sin --id) NO se toca: es la
# sesion interactiva principal del agente dueno del nodo.
set -u
c="$1"; ses="$2"; b64="$3"; usr="$4"; cfg="$5"

echo "=== 1. mato la sesion tmux '$ses' ==="
sudo -n docker exec -u "$usr" "$c" tmux kill-session -t "$ses" 2>&1 | head -2
sleep 1

echo "=== 2. mato los procesos Cline con --id (los de este agente) ==="
pids=$(sudo -n docker exec "$c" sh -c 'ps -eo pid,args | grep "[c]line" | grep -v hub-daemon | grep -v "sh -c" | grep -F -- "--id" | cut -d" " -f1' 2>/dev/null)
n=0
for p in $pids; do
  sudo -n docker exec "$c" kill -9 "$p" 2>/dev/null && n=$((n+1))
done
echo "  procesos terminados: $n"
sleep 3

rest=$(sudo -n docker exec "$c" sh -c 'ps -eo pid,args | grep "[c]line" | grep -v hub-daemon | grep -v "sh -c" | grep -c -F -- "--id"' 2>/dev/null | tr -d ' \r\n')
echo "  procesos --id restantes: ${rest:-0}"

echo "=== 3. lanzo ==="
bash /tmp/fleet-launch.sh "$c" "$ses" "$b64" "$usr" "$cfg"
