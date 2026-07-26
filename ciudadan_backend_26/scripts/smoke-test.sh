#!/usr/bin/env bash
# smoke-test.sh — Fix H
# Smoke test de endpoints CoWork (casos negativos) + happy path si hay tokens.
# Ver docs/FIX-H-SMOKE-TEST.md para prerequisitos.

set -u
STRAPI_URL="${STRAPI_URL:-http://localhost:33032}"

PASS=0
FAIL=0

test_endpoint() {
  local method="$1"
  local path="$2"
  local body="$3"
  local expected="$4"
  local desc="$5"
  local token="${6:-}"

  local url="${STRAPI_URL}/api${path/api/}"
  local extra=()
  if [ -n "$body" ]; then
    extra+=(-H "Content-Type: application/json" -d "$body")
  fi
  if [ -n "$token" ]; then
    extra+=(-H "Authorization: Bearer $token")
  fi

  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "${extra[@]}" "$url")

  if [ "$status" = "$expected" ]; then
    echo "[PASA] $method $path -> $status ($desc)"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] $method $path -> $status (esperado $expected) -- $desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "===== Fix H - Smoke test Negativo (sin auth) ====="
echo "Strapi: $STRAPI_URL"
echo

test_endpoint GET  '/todos'                       ''   200 'tareas generales visibles (Public.find)'
test_endpoint POST '/todos'                        '{}' 401 'sin Authorization 401'
test_endpoint POST '/tareas/resolver'              '{}' 401 'sin Authorization 401'
test_endpoint POST '/tareas/calificar'             '{}' 401 'sin Authorization 401'
test_endpoint POST '/tareas/subir-evidencia'       '{}' 401 'sin Authorization 401'
test_endpoint POST '/areas/verificar-area'         '{}' 401 'sin Authorization 401 (Fix D)'
test_endpoint GET  '/areas/verificaciones'         ''   401 'sin Authorization 401 (Fix D)'
test_endpoint POST '/tareas/resolver-apelacion'    '{}' 401 'sin Authorization 401 (Fix A)'

echo
echo "===== Fix H - Casos borde (con token, payload mínimo) ====="

if [ -n "${TOKEN_SOCIO:-}" ]; then
  test_endpoint POST '/tareas/resolver'           '{}' 400 'con token socio, sin todoId'        "$TOKEN_SOCIO"
  test_endpoint POST '/tareas/calificar'          '{}' 400 'con token socio, sin tareaId'       "$TOKEN_SOCIO"
  test_endpoint POST '/tareas/resolver-apelacion' '{}' 400 'con token socio, sin tareaId (Fix A)' "$TOKEN_SOCIO"
else
  echo "[SKIP] Casos borde con token socio (TOKEN_SOCIO no definido)"
fi

if [ -n "${TOKEN_VERIFICADOR:-}" ]; then
  test_endpoint POST '/areas/verificar-area' '{}' 400 'con token verif, sin userId (Fix D)' "$TOKEN_VERIFICADOR"
else
  echo "[SKIP] Casos borde con token verificador (TOKEN_VERIFICADOR no definido)"
fi

echo
echo "===== Fix H - Resumen ====="
echo "PASARON: $PASS"
echo "FALLARON: $FAIL"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
