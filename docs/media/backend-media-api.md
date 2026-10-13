# Backend ↔ Media API — Integración como servicio interno seguro (Bloque 5B)

Fecha: 2026-10-08 · Estado: **OPERATIVO** (E2E verificado end-to-end).

## 1. Qué es

El backend Strapi (ciudadan_backend_26) integra la **Ciudadan Media API**
(http://100.73.191.3:8090, tailnet privada, Bloques 4D/5A) como servicio
interno seguro:

- **browser → backend ONLY** (el frontend NUNCA habla con la Media API).
- **backend → Media API → motores** (con credencial dedicada revocable).
- Sin camino browser → Media API (verificado: 0 leaks de URL/token en build).

## 2. Credencial server-to-server

- Cliente dedicado: `ciudadan-backend` (NO compartido con OpenClaw).
- Token fuerte (64 hex) generado EN el servidor; **solo hash sha256 en la
  DB de la Media API** (tabla `api_clients`); el token vive SOLO en el
  `.env` del backend (chmod 600).
- Scopes concedidos: `capabilities:read`, `jobs:create`, `jobs:read`,
  `jobs:cancel`, `jobs:retry`, `uploads:create`, `artifacts:read`.
- NO: admin, delete, engine_override, policy_override.
- El token legacy (MEDIA_API_TOKEN) conserva acceso completo (OpenClaw y
  media-job.sh siguen funcionando sin cambios — compatibilidad verificada).
- Revocación: `sudo /opt/ciudadan-media/venvs/media-api/bin/python
  /opt/ciudadan-media/api/manage-clients.py revoke ciudadan-backend`.

## 3. Endpoints del backend (prefijo /api)

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/media/capabilities | capabilities filtradas (type, resourceClass, commercialStatus, warning) |
| POST | /api/media/uploads | upload en STREAM (multipart, field=file; audio/video/imagen) |
| GET | /api/media/jobs | jobs DEL usuario (status/type/limit/offset) |
| POST | /api/media/jobs | crea job (Idempotency-Key; ID local público) |
| GET | /api/media/jobs/:id | detalle con sync del estado (ownership verificado) |
| POST | /api/media/jobs/:id/cancel | cancel (queued/running; ownership) |
| POST | /api/media/jobs/:id/retry | retry → NUEVO job con parentJob |
| GET | /api/media/jobs/:id/artifacts | metadata de artifacts (sin rutas internas) |
| GET | /api/media/jobs/:id/artifacts/:artifactId/download | proxy con Range (206/Content-Range) + Content-Disposition |

## 4. Autenticación

- Policy `global::is-authenticated-media` (src/policies/): REUTILIZA los dos
  sistemas de login EXISTENTES:
  1. **Auth0** (RS256/JWKS vía utils/auth0-verify.js — mismo flujo que
     is-authenticated-auth0).
  2. **JWT local users-permissions** (HS256 con JWT_SECRET; POST
     /api/auth/local del plugin ya presente — para tests y usuarios de
     servicio).
- Roles: usuario normal (cualquier autenticado) + admin/socio (convención
  is-admin-or-socio). Admin puede ver jobs ajenos; un usuario normal recibe
  404 (no 403) para no revelar existencia.

## 5. Ownership (crítico)

- Todo get/list/cancel/retry/artifacts/download **verifica ownership LOCAL
  ANTES** de tocar la Media API (`findOwnedJob`/`findOwnedUpload` con
  populate del user).
- El MediaJob guarda la relación `user` (link table) + `mediaJobId` remoto;
  **NO guarda Bearer ni paths internos** (paramsSafeJson solo uploadId +
  params permitidos).
- El download confirma que el artifact pertenece al job (lista remota) antes
  de proxy.

## 6. Upload streaming

- El backend recibe multipart (busboy temp file) y lo pasa en STREAM a la
  Media API (read stream + form-data; sin 2 GB en RAM).
- Límite: `MEDIA_USER_MAX_UPLOAD_BYTES` (default 500 MiB; 413 si excede).
- Formatos: audio/video/imagen por extensión (KIND_EXT); la Media API
  revalida magic+ffprobe en su extremo.

## 7. Reglas de negocio (server-side)

- **usage_context**: default `internal`; el cliente puede pedir `commercial`
  (trabajo Publia pagado); la Media API aplica la policy (faceswap
  commercial → 409).
- **priority**: server-side — usuario normal SIEMPRE 50; admin/socio hasta
  0-100.
- **Quotas** (configurables): `MEDIA_MAX_ACTIVE_LIGHT` (3),
  `MEDIA_MAX_ACTIVE_HEAVY` (1), `MEDIA_MAX_UPLOADS_PER_DAY` (20),
  `MEDIA_MAX_JOBS_PER_DAY` (50).
- **Heavy limit**: si el usuario ya tiene un heavy activo → **429
  MEDIA_HEAVY_LIMIT** (excepto admin).
- **Rate limit**: simple en memoria por usuario (`MEDIA_RATE_LIMIT_PER_MIN`,
  default 60) — sin Redis (el backend NO usa Redis solo para esto).
- **params allowlist por type** (sin passthrough): los uploadId se resuelven
  a rutas internas del workspace (NUNCA expuestas); camelCase → snake_case
  server-side (noFallback→no_fallback, durationPolicy→duration_policy...).

## 8. Errores (mapeo seguro)

| Origen | Respuesta | Código |
|---|---|---|
| credencial rechazada por la Media API | 502 | MEDIA_BACKEND_AUTH_ERROR |
| 409 remoto (policy) | 409 | MEDIA_POLICY_CONFLICT |
| 404 remoto / ownership | 404 | MEDIA_NOT_FOUND |
| 400/422 remoto / validación local | 422 | MEDIA_INVALID_REQUEST |
| 429 remoto | 429 | MEDIA_LIMIT |
| 5xx remoto | 502 | MEDIA_SERVICE_ERROR |
| Media API down (ECONNREFUSED) | 503 | MEDIA_SERVICE_UNAVAILABLE |
| timeout (acotado por operación) | 504 | MEDIA_SERVICE_TIMEOUT |

- **client disconnect NO cancela** el job (sin polling bloqueante ni
  cancelación por desconexión).
- **NO hay delete** de jobs (solo cancel/retry).
- El detalle de job lleva `estimatedTime` (orientativo, no bloqueante).

## 9. Variables de entorno del backend

```
CIUDADAN_MEDIA_API_URL=http://100.73.191.3:8090   # URL privada tailnet
CIUDADAN_MEDIA_API_TOKEN=<token-64-hex>           # SOLO .env (chmod 600)
MEDIA_USER_MAX_UPLOAD_BYTES=524288000              # 500 MiB
MEDIA_MAX_ACTIVE_LIGHT=3
MEDIA_MAX_ACTIVE_HEAVY=1
MEDIA_MAX_UPLOADS_PER_DAY=20
MEDIA_MAX_JOBS_PER_DAY=50
MEDIA_RATE_LIMIT_PER_MIN=60
```

`.env.example` del backend: plantilla SIN valores reales.

## 10. WebSocket (SOLO documentado, NO implementado)

FUTURO: la Media API publica eventos por /v1/jobs/{id}/events y existe
infraestructura Socket.IO en el backend (SOCKET_PORT). Un futuro listener
podría notificar la UI. Fuera de alcance del 5B (la UI usa polling manual
con GET /api/media/jobs/:id, que sincroniza el estado).

## 11. Ejemplos

```bash
# 1. login (o JWT de Auth0 del frontend)
TOKEN=$(curl -s -X POST http://localhost:33432/api/auth/local \
  -H "Content-Type: application/json" \
  -d '{"identifier":"usuario@ejemplo.org","password":"***"}' | jq -r .jwt)

# 2. upload
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -F "file=@clase.mp3" http://localhost:33432/api/media/uploads

# 3. crear job (transcribe provider=auto)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"transcribe","params":{"uploadId":"<upload-id>","provider":"auto"}}' \
  http://localhost:33432/api/media/jobs

# 4. estado (sync)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:33432/api/media/jobs/<job-id>

# 5. artifacts + descarga con Range
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:33432/api/media/jobs/<job-id>/artifacts
curl -s -H "Authorization: Bearer $TOKEN" -H "Range: bytes=0-1023" \
  http://localhost:33432/api/media/jobs/<job-id>/artifacts/<artifact-id>/download
```

## 12. Frontend

- `ciudadan_frontend/src/services/mediaService.js`: cliente MINIMO (fetch;
  9 métodos: capabilities/upload/create/list/get/cancel/retry/artifacts/
  downloadUrl). Sin URL/token de la Media API (0 leaks verificados).

## 13. Verificación E2E (real, en este servidor)

- health 200/204; media routes 403 sin credencial; capabilities 200 filtradas.
- upload WAV → id + sha256 (streaming); transcribe → id local + queued →
  running → **succeeded**; sync en GET ✓; params seguros (sin rutas) ✓.
- artifacts → metadata; **download Range 0-1023 → 206 + EXACTAMENTE 1024
  bytes** + Content-Range/Accept-Ranges/Content-Disposition ✓.
- **Owner A/B: B lee/cancela/artifacts/descarga job de A → 404 (×4)** ✓.
- cancel → cancelled ✓; retry → NUEVO id + parentJob ✓.
- **heavy limit: heavy #2 → 429 MEDIA_HEAVY_LIMIT** ✓; faceswap commercial
  → 409 MEDIA_POLICY_CONFLICT ✓.
- scopes: random 401 / backend 200 / legacy 200 ✓; **token leak: 0** en
  frontend src/build y backend src ✓.
- Regresión: rutas públicas existentes (todo find → 200) sin cambios ✓.
