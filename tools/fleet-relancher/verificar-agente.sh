#!/bin/bash
# Verifica que un agente este de verdad trabajando: prompt recibido, sesion
# registrada y actividad reciente.
# Uso: bash verificar-agente.sh <contenedor> <sesion>
c="$1"; ses="$2"
echo "===== $c / $ses ====="
echo "-- ultimo 'CLI run started':"
sudo -n docker exec "$c" sh -c 'grep "CLI run started" /workspace/.cline/data/logs/cline.log 2>/dev/null | tail -1' 2>/dev/null | cut -c1-230
echo "-- sesion creada:"
sudo -n docker exec "$c" sh -c 'ls -1t /workspace/.cline/data/sessions 2>/dev/null | head -1' 2>/dev/null
echo "-- pane (ultimas 12 lineas):"
sudo -n docker exec -u root "$c" tmux capture-pane -p -t "$ses" 2>&1 | grep -v '^\s*$' | tail -12 | cut -c1-170
echo
