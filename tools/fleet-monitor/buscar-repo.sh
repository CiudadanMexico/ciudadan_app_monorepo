#!/bin/bash
# Localiza el repositorio dentro del contenedor (solo lectura).
c="$1"
echo "contenedor=$c"
sudo -n docker exec "$c" sh -c 'ls -d /workspace/* 2>/dev/null | head -12' 2>/dev/null
echo "--- donde hay .git ---"
sudo -n docker exec "$c" sh -c 'for p in /workspace /workspace/* /workspace/*/*; do if [ -e "$p/.git" ]; then echo "GIT=$p"; fi; done' 2>/dev/null | head -8
echo "--- git log desde /workspace ---"
sudo -n docker exec "$c" sh -c 'cd /workspace && git log -1 --format="%ct %h" 2>&1 | head -2' 2>/dev/null
echo "--- git log desde /workspace/ciudadan_app_monorepo ---"
sudo -n docker exec "$c" sh -c 'cd /workspace/ciudadan_app_monorepo 2>/dev/null && git log -1 --format="%ct %h" 2>&1 | head -2' 2>/dev/null
