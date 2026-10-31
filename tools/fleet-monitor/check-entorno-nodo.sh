#!/bin/bash
# Comprobacion del entorno del nodo (solo lectura).
echo -n "cron_bin="; command -v crontab >/dev/null && echo -n "si" || echo -n "no"
echo -n " flock="; command -v flock >/dev/null && echo -n "si" || echo -n "no"
echo -n " user="; id -un
echo -n " entradas_crontab="; crontab -l 2>/dev/null | grep -vc '^#' || true
echo -n " contenedores="; sudo -n docker ps --format '{{.Names}}' 2>/dev/null | wc -l
echo -n " mi_usuario_docker="; sudo -n true 2>/dev/null && echo -n "si" || echo -n "no"
echo " directorio_home=$HOME"
