#!/bin/bash
# Sonda de contenedor para el relanzador. Un argumento: nombre del contenedor.
# Salida en lineas clave=valor, estable y parseable.
#
# NOTA: las sesiones headless ya NO llevan --id (Cline lo interpreta como
# "resume an existing session" e ignora el prompt). Por eso la sonda cuenta
# las SESIONES TMUX y no los procesos con --id.
cont="$1"
[ -z "$cont" ] && { echo "err=sin_contenedor"; exit 2; }

# Sesiones tmux del contenedor (la base del nodo se llama "cline").
sudo -n docker exec "$cont" sh -c 'tmux list-sessions -F "#{session_name}" 2>/dev/null' 2>/dev/null | sed 's/^/tmux=/'

# Procesos Cline headless (sin el flag -i de la sesion base interactiva).
n=$(sudo -n docker exec "$cont" sh -c 'ps -eo args | grep -c "[c]line --config"' 2>/dev/null | tr -d ' \r\n')
echo "headless=${n:-0}"

# Centinelas DONE: el trabajo entregado.
sudo -n docker exec "$cont" sh -c 'ls /tmp/DONE-* 2>/dev/null' 2>/dev/null | head -8 | sed 's/^/done=/'

# Config de proveedor legible: se listan todas las candidatas, el que elige es el llamador.
for u in yizuz root; do
  for d in /workspace/.cline /workspace/.cline-agente; do
    if sudo -n docker exec -u "$u" "$cont" test -r "$d/data/settings/providers.json" 2>/dev/null; then
      echo "cfg=$u|$d"
    fi
  done
done

# Git utilizable por cada usuario (para detectar 'dubious ownership').
for u in yizuz root; do
  if sudo -n docker exec -u "$u" "$cont" sh -c 'cd /workspace/ciudadan_app_monorepo && git rev-parse --abbrev-ref HEAD' >/dev/null 2>&1; then
    echo "git=$u"
  fi
done
echo "fin"
