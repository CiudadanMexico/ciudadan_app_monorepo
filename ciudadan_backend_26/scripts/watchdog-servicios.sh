#!/usr/bin/env bash
# =============================================================================
# Watchdog de servicios Ciudadan (temporal1-agent1).
# - Vigila back (1337), front (3001) y socket (33032) por puerto TCP.
# - Si un servicio cae, lo reinicia en su sesion tmux con backoff.
# - Idempotente y resistente a reinicios del contenedor: se relanza desde
#   /etc/agent/start-services.sh si existe, o a mano.
# - Loga en /workspace/logs/watchdog.log
# =============================================================================
set -u
REPO=/workspace/ciudadan_app_monorepo
LOG_DIR=/workspace/logs
LOG=$LOG_DIR/watchdog.log
BACKEND_DIR="$REPO/ciudadan_backend_26"
FRONTEND_DIR="$REPO/ciudadan_frontend"
SOCKET_DIR="$REPO/ciudadan_backend_26/socket-service"
ENV_DIR=/etc/agent/env
NODE22=/opt/node22

mkdir -p "$LOG_DIR"

say() { printf '[watchdog %s] %s\n' "$(date '+%F %T')" "$*" | tee -a "$LOG"; }

puerto_abierto() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && { exec 3>&- 3<&- 2>/dev/null; return 0; } || return 1; }

lanzar_back() {
  tmux kill-session -t back 2>/dev/null || true
  tmux new-session -d -s back -c "$BACKEND_DIR" \
    "while true; do NODE_OPTIONS=--max-old-space-size=1500 npm run develop 2>&1 | tee -a $LOG_DIR/back.log; echo '[back] cayo, reinicio en 10s'; sleep 10; done"
}

lanzar_front() {
  tmux kill-session -t front 2>/dev/null || true
  tmux new-session -d -s front -c "$FRONTEND_DIR" \
    "while true; do NODE_OPTIONS=--max-old-space-size=1600 BROWSER=none npm start 2>&1 | tee -a $LOG_DIR/front.log; echo '[front] cayo, reinicio en 10s'; sleep 10; done"
}

lanzar_socket() {
  tmux kill-session -t socket 2>/dev/null || true
  tmux new-session -d -s socket -c "$SOCKET_DIR" \
    "while true; do set -a; . $ENV_DIR/services.env; set +a; PATH=$NODE22/bin:\$PATH npm start 2>&1 | tee -a $LOG_DIR/socket.log; echo '[socket] cayo, reinicio en 10s'; sleep 10; done"
}

# Backoff por servicio: 10s, 30s, 60s, 120s (max)
declare -A FALLOS
chequear() { # $1=nombre $2=puerto $3=funcion-lanzar
  local nombre="$1" puerto="$2" lanzar="$3"
  if puerto_abierto "$puerto"; then
    FALLOS[$nombre]=0
    return 0
  fi
  local n=${FALLOS[$nombre]:-0}
  n=$((n + 1))
  FALLOS[$nombre]=$n
  local espera=10
  [ "$n" -eq 2 ] && espera=30
  [ "$n" -eq 3 ] && espera=60
  [ "$n" -ge 4 ] && espera=120
  say "$nombre CAIDO en :$puerto (fallo #$n) -> reinicio en ${espera}s"
  sleep "$espera"
  # re-verificar: pudo recuperarse solo (ej. Strapi recompilando tras autoReload)
  if puerto_abierto "$puerto"; then
    say "$nombre se recupero solo; no reinicio"
    FALLOS[$nombre]=0
    return 0
  fi
  "$lanzar"
  say "$nombre relanzado"
}

say "watchdog iniciado (back:1337 front:3001 socket:33032)"
while true; do
  chequear back 1337 lanzar_back
  chequear front 3001 lanzar_front
  chequear socket 33032 lanzar_socket
  sleep 20
done
