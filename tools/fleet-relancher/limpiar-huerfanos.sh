#!/bin/bash
# Limpia procesos Cline huerfanos y muestra el estado real de un contenedor.
# La sesion base del contenedor (la que usa el flag -i) NO se toca.
c="$1"
echo "===== Cline por sesion ====="
sudo -n docker exec "$c" sh -c 'ps -eo pid,etime,args | grep "[c]line" | grep -v hub-daemon | grep -v "sh -c"' 2>/dev/null
echo
echo "===== mato huerfanos (headless, sin -i) ====="
pids=$(sudo -n docker exec "$c" sh -c 'ps -eo pid,args | grep "[c]line" | grep -v hub-daemon | grep -v "sh -c" | grep -v " -i " | grep -v "tmux new-session" | cut -d" " -f1' 2>/dev/null)
n=0
for p in $pids; do
  if sudo -n docker exec "$c" sh -c "kill -9 $p 2>/dev/null"; then n=$((n+1)); fi
done
echo "  terminados: $n"
sleep 2
echo "===== Cline restante ====="
sudo -n docker exec "$c" sh -c 'ps -eo pid,etime,args | grep "[c]line" | grep -v hub-daemon | grep -v "sh -c"' 2>/dev/null
