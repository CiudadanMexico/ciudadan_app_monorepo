#!/bin/bash
# Temporary, fail-closed P4 re-arm for Polanco after a verified fence.
# Run as root on polanco-server only. This script never promotes Daniel and
# never changes the arbiter's stable state/epoch. It archives fence evidence,
# creates the primary marker only after all safety gates pass, acquires the
# existing Polanco lease at the current epoch, and starts primary services.
set -euo pipefail

HOSTN=$(hostname -s)
STATE_DIR=/etc/p4
MARKER="$STATE_DIR/PRIMARY_ENABLED"
SELF_FENCED="$STATE_DIR/SELF_FENCED"
INCOMPLETE="$STATE_DIR/FENCE_INCOMPLETE"
FENCING="$STATE_DIR/FENCING"
EPOCH_FILE="$STATE_DIR/epoch"
GUARD=/usr/local/sbin/p4-guard.sh
REMOTE_ROOT=/usr/local/sbin/p4-remote-control-root
LOCK=/run/lock/p4-rearm-polanco.lock
REASON='P4 recovery: rearm verified Polanco primary'

UNITS=(
  civic-data-gateway-api
  ciudadan-backend-prod
  strapi-marihuanas
  ciudadan-socket-prod
  socket-marihuanas
  ecosistema
  civic-data-gateway-worker
)
WRITER_PORTS='33332|33331|33334|33431|33432|8772|3055'
PRIMARY_UNITS=(
  ciudadan-backend-prod
  ciudadan-socket-prod
  strapi-marihuanas
  socket-marihuanas
  ecosistema
  civic-data-gateway-api
  civic-data-gateway-worker
  strapi-ciudadan-prod
  strapi-ciudadan-dev
  socket-ciudadan
  socket-ciudadan-prod
  market-ciudadan
  middleware-ciudadan
  ciudadan-middleware
  ciudadan-market
  chatbot-publia
)

log() { logger -t p4-rearm-polanco -- "$*"; printf '[p4-rearm] %s\n' "$*"; }
die() { log "ABORT: $*"; exit 2; }
now() { date -u +%Y%m%dT%H%M%SZ; }

[ "$HOSTN" = polanco-server ] || die "host incorrecto: $HOSTN"
[ "$(id -u)" = 0 ] || die 'se requiere root'
exec 9>"$LOCK"
flock -n 9 || die 'otro rearm esta en curso'

# Gate 1: official fence verification. The official verifier deliberately
# does not reject a stale FENCE_INCOMPLETE, so the additional checks below do.
fence_json=$($REMOTE_ROOT verify-fence)
printf '%s\n' "$fence_json" | grep -q '"ok":true' || die "verify-fence no verde: $fence_json"
[ ! -e "$MARKER" ] || die 'PRIMARY_ENABLED ya existe'
[ ! -e "$FENCING" ] || die 'FENCING presente'
[ -f "$SELF_FENCED" ] || die 'SELF_FENCED ausente'
grep -qx 'verification=passed' "$SELF_FENCED" || die 'SELF_FENCED sin verification=passed'
[ -f "$INCOMPLETE" ] || die 'FENCE_INCOMPLETE ya no existe; se requiere revisar la cronologia'

# Gate 2: no local writers may be alive while rearming.
active=0
for u in "${PRIMARY_UNITS[@]}"; do
  st=$(systemctl is-active "$u.service" 2>/dev/null || true)
  if [ "$st" = active ] || [ "$st" = activating ]; then
    log "writer activo: $u=$st"
    active=$((active + 1))
  fi
done
[ "$active" -eq 0 ] || die "$active writer(s) activos"
ports=$(ss -lnt 2>/dev/null | grep -cE ":($WRITER_PORTS) " || true)
[ "$ports" -eq 0 ] || die "$ports writer port(s) abiertos"
ro=$(mariadb -N -B -e 'SELECT @@read_only;' 2>/dev/null | head -1)
[ "$ro" = 1 ] || die "MariaDB read_only=$ro (se esperaba 1)"
for c in planka planka-postgres; do
  running=$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null || echo missing)
  [ "$running" = false ] || die "contenedor $c no detenido"
done

# Gate 3: arbiter must already name Polanco primary at epoch 1, with a free
# lease. This recovery does not transition or increment the epoch.
state=$($GUARD state)
state_value=$(printf '%s' "$state" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["state"]["state"])')
primary_value=$(printf '%s' "$state" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["state"]["primary"])')
epoch_value=$(printf '%s' "$state" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["state"]["epoch"])')
owner_value=$(printf '%s' "$state" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["state"].get("lease_owner") or "null")')
valid_value=$(printf '%s' "$state" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("true" if d.get("lease_valid") else "false")')
[ "$state_value" = PRIMARY_POLANCO ] || die "arbiter state=$state_value"
[ "$primary_value" = polanco-server ] || die "arbiter primary=$primary_value"
[ "$epoch_value" = 1 ] || die "arbiter epoch=$epoch_value (se esperaba 1)"
[ "$owner_value" = null ] || die "lease no libre: owner=$owner_value valid=$valid_value"
[ "$valid_value" = false ] || die 'lease unexpectedly valid antes del acquire'
local_epoch=$(tr -d '[:space:]' < "$EPOCH_FILE")
[ "$local_epoch" = "$epoch_value" ] || die "epoch local=$local_epoch remoto=$epoch_value"

# Archive, never silently delete, the two fence records. The successful
# SELF_FENCED record proves the completed fence; FENCE_INCOMPLETE is the stale
# record from the earlier failed attempt.
ts=$(now)
mkdir -p "$STATE_DIR/archive"
chmod 700 "$STATE_DIR/archive"
for f in "$INCOMPLETE" "$SELF_FENCED"; do
  base=$(basename "$f")
  dest="$STATE_DIR/archive/$base.cleared-$ts"
  [ ! -e "$dest" ] || die "archivo de evidencia ya existe: $dest"
  mv "$f" "$dest"
  chmod 600 "$dest"
  log "evidencia archivada: $dest"
done

# Recreate the local authority marker only after all gates and archival passed.
printf 'primary=%s\nepoch=%s\nat=%s\nactor=p4-rearm-polanco\n' \
  polanco-server "$epoch_value" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$MARKER"
chown root:root "$MARKER"
chmod 600 "$MARKER"

# Acquire the lease at the same stable epoch before starting any writer.
acquired=$($GUARD acquire polanco-server "$epoch_value" 600 'p4-rearm-polanco')
printf '%s' "$acquired" | grep -q '"lease_owner"[[:space:]]*:[[:space:]]*"polanco-server"' \
  || die "acquire no devolvio lease de Polanco"
state2=$($GUARD state)
printf '%s' "$state2" | grep -q '"lease_owner"[[:space:]]*:[[:space:]]*"polanco-server"' \
  || die 'arbiter no confirma lease de Polanco'
printf '%s' "$state2" | grep -q '"lease_valid"[[:space:]]*:[[:space:]]*true' \
  || die 'arbiter no confirma lease valido de Polanco'

# The drop-in guard must explicitly authorize this host before any start.
$GUARD check-primary polanco-server >/dev/null

# Writer DB becomes writable only after authority is valid.
mariadb -e 'SET GLOBAL read_only=0;' >/dev/null
ro2=$(mariadb -N -B -e 'SELECT @@read_only;' 2>/dev/null | head -1)
[ "$ro2" = 0 ] || die "MariaDB no quedo writable: read_only=$ro2"

# Restore the services in dependency order. A failure aborts and leaves the
# arbiter/lease in place, but no further services are started.
for u in "${UNITS[@]}"; do
  if systemctl list-unit-files "$u.service" --no-legend 2>/dev/null | grep -q .; then
    systemctl start "$u.service"
    log "service started: $u"
  fi
done

# Restore the user service stopped by the fence, then Planka in dependency
# order. Preserve Planka's original restart policy: planka=no and postgres=yes.
runuser -u polanco -- env XDG_RUNTIME_DIR=/run/user/$(id -u polanco) \
  systemctl --user start esfericulos.service >/dev/null 2>&1 || true
docker update --restart=no planka >/dev/null
docker update --restart=always planka-postgres >/dev/null
docker start planka-postgres >/dev/null
for _ in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Running}}' planka-postgres 2>/dev/null || echo false)" = true ] && break
  sleep 1
done
docker start planka >/dev/null
rm -f /var/tmp/planka-watchdog.paused

# Renewer and watchdog must be active after the rearm.
systemctl enable --now p4-lease-renewer.timer
systemctl start p4-lease-renewer.service
systemctl enable --now planka-watchdog.timer

# Wait for Strapi's production listener: it may take several minutes to boot,
# migrate and warm up after a cold start.
port_ready=0
for _ in $(seq 1 90); do
  if ss -lnt 2>/dev/null | grep -q ':33332 '; then
    port_ready=1
    break
  fi
  sleep 2
done
[ "$port_ready" -eq 1 ] || die 'puerto backend 33332 no abrio dentro de 180s'

# Verify authority and core listeners. Do not report success unless these pass.
state3=$($GUARD state)
printf '%s' "$state3" | grep -q '"state"[[:space:]]*:[[:space:]]*"PRIMARY_POLANCO"' || die 'estado final no PRIMARY_POLANCO'
printf '%s' "$state3" | grep -q '"primary"[[:space:]]*:[[:space:]]*"polanco-server"' || die 'primary final no Polanco'
printf '%s' "$state3" | grep -q '"lease_owner"[[:space:]]*:[[:space:]]*"polanco-server"' || die 'lease final no Polanco'
printf '%s' "$state3" | grep -q '"lease_valid"[[:space:]]*:[[:space:]]*true' || die 'lease final no valido'
for p in 33332 33331; do
  ss -lnt 2>/dev/null | grep -q ":$p " || die "puerto requerido no abierto: $p"
done
for u in ciudadan-backend-prod ciudadan-socket-prod; do
  [ "$(systemctl is-active "$u.service" 2>/dev/null || true)" = active ] || die "servicio no activo: $u"
done
[ ! -e "$INCOMPLETE" ] || die 'FENCE_INCOMPLETE todavia presente'
[ ! -e "$SELF_FENCED" ] || die 'SELF_FENCED todavia presente'
[ ! -e "$FENCING" ] || die 'FENCING todavia presente'

printf 'REARM_OK host=%s epoch=%s lease_owner=polanco-server\n' "$HOSTN" "$epoch_value"
