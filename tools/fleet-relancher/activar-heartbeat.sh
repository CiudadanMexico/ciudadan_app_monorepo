#!/bin/bash
# Activa el heartbeat NATIVO de la flota en el contenedor indicado.
#
# Por que: el hub de Cline en estos contenedores NO emite heartbeat
# (hub-daemon.log se queda en 0 bytes o con trazas viejas), asi que el monitor
# no tiene ninguna señal real del runtime. Este script engancha un vigilante
# a cada proceso Cline headless vivo y escribe en hub-daemon.log:
#
#   {"ts":"<ISO>","event":"run.heartbeat","session":"<id>","bytes":<n>}
#
# - ts    : ISO-8601 UTC, que es lo que lee el monitor (backend leer_alive).
# - bytes : tamaño del messages.json de la sesión; si NO crece, el agente esta
#           vivo pero no avanza (lo detecta el monitor como STALLED, no como
#           muerte).
#
# No se reinicia ni se mata ningun agente: solo se engancha el vigilante.
# Idempotente: si ya hay un vigilante para ese PID, no duplica.
cont="$1"
[ -z "$cont" ] && { echo "err=sin_contenedor"; exit 2; }

WATCH_SRC="${2:-/tmp/hb-watch.sh}"
[ -f "$WATCH_SRC" ] || { echo "err=no_existe_watcher"; exit 2; }

sudo -n docker cp "$WATCH_SRC" "$cont":/tmp/hb-watch.sh >/dev/null 2>&1 || {
  echo "err=no_se_pudo_copiar_watcher"; exit 2; }
sudo -n docker exec "$cont" chmod +x /tmp/hb-watch.sh >/dev/null 2>&1

sudo -n docker exec -i "$cont" python3 - <<'PYEOF'
import os
import sqlite3
import subprocess
import sys

BASE_CANDIDATES = ['/workspace/.cline/data', os.path.expanduser('~/.cline/data')]
base = next((b for b in BASE_CANDIDATES if os.path.isdir(os.path.join(b, 'db'))), None)
if not base:
    print('sin_base_de_datos')
    sys.exit(0)

log_path = os.path.join(base, 'logs', 'hub-daemon.log')
os.makedirs(os.path.dirname(log_path), exist_ok=True)

db_path = os.path.join(base, 'db', 'sessions.db')
try:
    conn = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    rows = conn.execute(
        "SELECT session_id, pid, status, messages_path FROM sessions ORDER BY updated_at DESC LIMIT 12"
    ).fetchall()
    conn.close()
except Exception as exc:
    print(f'error_db:{exc}')
    sys.exit(0)


def pid_vivo(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except Exception:
        return False


def es_headless(pid):
    try:
        with open(f'/proc/{pid}/cmdline', 'rb') as fh:
            args = fh.read().decode('utf-8', 'replace').split('\x00')
    except OSError:
        return False
    if not args or not any('cline' in a for a in args):
        return False
    return '-i' not in args


procesos = subprocess.run(['ps', '-eo', 'pid,args'], capture_output=True, text=True).stdout

activados = 0
for session_id, pid, status, messages_path in rows:
    if not pid or not pid_vivo(pid) or not es_headless(pid):
        continue
    if f'hb-watch.sh {pid} ' in procesos:
        continue
    if status not in ('running', 'waiting'):
        continue
    if not messages_path:
        candidates = sorted(
            glob_paths := __import__('glob').glob(
                os.path.join(base, 'sessions', session_id, '*.messages.json')
            )
        )
        messages_path = candidates[0] if candidates else ''
    cmd = [
        'nohup', '/tmp/hb-watch.sh', str(pid), session_id,
        messages_path or '', log_path,
    ]
    try:
        subprocess.Popen(
            cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    except Exception as exc:
        print(f'error_lanzar:{exc}')
        continue
    activados += 1
    print(f'heartbeat_activado pid={pid} session={session_id}')

print(f'activados={activados}')
PYEOF
