#!/usr/bin/env bash
# Release frontend-only para Polanco.
# No instala dependencias ni reinicia backend/socket. Requiere un build ya
# compilado en CI y publica el SHA exacto bajo /var/www/releases/ciudadan_frontend.
set -Eeuo pipefail
umask 022

STAGING=""
cleanup() {
  if [[ -n "${STAGING:-}" && -d "$STAGING" ]]; then
    rm -rf -- "$STAGING"
  fi
}
trap cleanup EXIT

REL_FE=/var/www/releases/ciudadan_frontend
META_FE=/var/www/releases/ciudadan_frontend/.metadata
APP_DIR=/var/www/apps/frontend-ciudadan
APP_BUILD="$APP_DIR/build"
LOCK=/var/www/releases/.deploy.lock
PENDING="$REL_FE/.pending-rollback"

log() { printf '[frontend-release %s] %s\n' "$(date -u +%FT%TZ)" "$*" >&2; }
die() { printf '[frontend-release %s] ERROR: %s\n' "$(date -u +%FT%TZ)" "$*" >&2; exit 1; }

assert_sha() {
  [[ "$1" =~ ^[0-9a-f]{40}$ ]] || die "SHA inválido: $1"
}

read_current() {
  if [[ -L "$REL_FE/current" ]]; then
    basename "$(readlink -f "$REL_FE/current")"
  fi
}

write_state() {
  local name="$1"
  local value="$2"
  local tmp="$REL_FE/.${name}.tmp.$$"
  printf '%s\n' "$value" > "$tmp"
  mv -f "$tmp" "$REL_FE/$name"
}

flip_current() {
  local target="$1" tmp="$REL_FE/.current.tmp.$$"
  ln -s "$target" "$tmp"
  mv -T "$tmp" "$REL_FE/current"
}

ensure_layout() {
  [[ "$(hostname -s)" == *polanco* ]] || die "este instalador solo corre en Polanco"
  [[ -d "$REL_FE" && -w "$REL_FE" ]] || die "no se puede escribir $REL_FE"
  [[ -d "$APP_DIR" && -w "$APP_DIR" ]] || die "no se puede escribir $APP_DIR"
  install -d -m 0755 "$META_FE"
}

install_release() {
  local sha="$1" tarball="$2"
  assert_sha "$sha"
  [[ -f "$tarball" ]] || die "no existe tarball: $tarball"

  exec 9>"$LOCK"
  flock -n 9 || die "hay otro deploy en curso"

  local current target previous app_target
  current="$(read_current || true)"
  target="$REL_FE/$sha"

  if [[ -e "$target" ]]; then
    if [[ "$current" == "$sha" ]]; then
      log "release $sha ya está activo; operación idempotente"
      return 0
    fi
    # Solo se reemplaza un release parcial del mismo SHA, nunca el activo.
    rm -rf -- "$target"
  fi

  STAGING="$(mktemp -d "$REL_FE/.staging-${sha}.XXXXXX")"

  tar -xzf "$tarball" -C "$STAGING"
  [[ -f "$STAGING/MANIFEST.json" ]] || die "MANIFEST.json ausente"
  [[ -f "$STAGING/checksums.sha256" ]] || die "checksums.sha256 ausente"
  [[ -f "$STAGING/ciudadan_frontend_build/index.html" ]] || die "index.html ausente"

  local manifest_sha
  manifest_sha="$(sed -n 's/.*"sha"[[:space:]]*:[[:space:]]*"\([0-9a-f]\{40\}\)".*/\1/p' "$STAGING/MANIFEST.json" | head -1)"
  [[ "$manifest_sha" == "$sha" ]] || die "MANIFEST SHA $manifest_sha != $sha"

  (cd "$STAGING" && sha256sum --check checksums.sha256 --quiet >/dev/null) || die "checksums NO cuadran"

  # Una carpeta física llamada /inauguracion gana sobre /index.html en
  # try_files de Nginx y rompe la ruta SPA. El build debe enviarla fuera.
  [[ ! -e "$STAGING/ciudadan_frontend_build/inauguracion" ]] \
    || die "build contiene ruta física /inauguracion; colisiona con la SPA"

  mv "$STAGING/ciudadan_frontend_build" "$target"
  cp "$STAGING/MANIFEST.json" "$META_FE/$sha.MANIFEST.json"
  cp "$STAGING/checksums.sha256" "$META_FE/$sha.checksums.sha256"
  rm -rf -- "$STAGING"
  STAGING=""
  find "$target" -type d -exec chmod 0755 {} +
  find "$target" -type f -exec chmod 0644 {} +

  previous="$current"
  [[ -n "$previous" ]] || die "no hay release frontend activo para rollback"

  # Marcador transaccional: rollback solo actúa si current == sha intentada.
  printf '%s %s\n' "$sha" "$previous" > "$PENDING.tmp.$$"
  mv -f "$PENDING.tmp.$$" "$PENDING"

  flip_current "$sha"
  [[ "$(read_current)" == "$sha" ]] || die "flip frontend no verificado"

  app_target="$(readlink "$APP_BUILD" || true)"
  if [[ "$app_target" != "$REL_FE/current" ]]; then
    ln -s "$REL_FE/current" "$APP_DIR/.build.tmp.$$"
    mv -T "$APP_DIR/.build.tmp.$$" "$APP_BUILD"
  fi
  [[ "$(readlink "$APP_BUILD")" == "$REL_FE/current" ]] \
    || die "vhost build no apunta a $REL_FE/current"

  write_state PREVIOUS "$previous"
  write_state CURRENT "$sha"
  log "frontend $sha activo (anterior $previous)"
  printf 'PREVIOUS=%s\n' "$previous"
}

mark_good() {
  local sha="$1"
  assert_sha "$sha"
  exec 9>"$LOCK"
  flock -n 9 || die "hay otro deploy en curso"
  [[ "$(read_current)" == "$sha" ]] || die "current no es $sha"
  write_state LAST_GOOD "$sha"
  rm -f "$PENDING"
  log "frontend $sha verificado y marcado LAST_GOOD"
}

rollback_pending() {
  exec 9>"$LOCK"
  flock -n 9 || die "hay otro deploy en curso"
  [[ -f "$PENDING" ]] || { log "no hay rollback pendiente"; return 0; }

  local attempted previous current
  read -r attempted previous < "$PENDING"
  current="$(read_current || true)"
  if [[ "$current" != "$attempted" ]]; then
    rm -f "$PENDING"
    log "current=$current no coincide con intento=$attempted; no se hace rollback"
    return 0
  fi
  [[ -n "$previous" && -d "$REL_FE/$previous" ]] || die "no existe release de rollback $previous"

  flip_current "$previous"
  [[ "$(read_current)" == "$previous" ]] || die "rollback no verificado"
  write_state CURRENT "$previous"
  printf '%s\n' "$previous" > "$REL_FE/ROLLBACK_FROM"
  rm -f "$PENDING"
  log "rollback frontend $attempted -> $previous completado"
}

status() {
  printf 'CURRENT=%s\n' "$(read_current || true)"
  for state in PREVIOUS LAST_GOOD ROLLBACK_FROM; do
    printf '%s=%s\n' "$state" "$(cat "$REL_FE/$state" 2>/dev/null || true)"
  done
  [[ -f "$PENDING" ]] && printf 'PENDING=%s\n' "$(cat "$PENDING")"
}

main() {
  local command="${1:-}" sha="${2:-}" tarball="${3:-}"
  ensure_layout
  case "$command" in
    install) install_release "$sha" "$tarball" ;;
    mark-good) mark_good "$sha" ;;
    rollback) rollback_pending ;;
    status) status ;;
    *) die "uso: $0 install <sha> <tarball> | mark-good <sha> | rollback | status" ;;
  esac
}

main "$@"
