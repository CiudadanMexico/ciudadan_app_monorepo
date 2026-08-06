# Fix H — Smoke test de endpoints CoWork

> Script de smoke test para validar los endpoints críticos del módulo CoWork una
> vez Strapi esté levantado. No depende de un runtime concreto: corre con
> `curl`/`Invoke-WebRequest` desde tu máquina o el VPS de despliegue.

## Archivos

- `scripts/smoke-test.ps1` — versión PowerShell (Windows nativo).
- `scripts/smoke-test.sh` — versión bash (VPS / Linux / macOS / Git Bash).

## Prerequisitos

1. Strapi levantado en `http://localhost:33032` (o ajustar `STRAPI_URL` env)
2. Haber corrido `node seed/seed-cowork.js` (Fix E) una vez para que existan
   usuario demo y 5 áreas raíz.
3. Haber corrido `node fix-perms.js` (Fix B) para que el rol `Authenticated`
   tenga los permisos nativos.
4. Un access token de Auth0 válido para:
   - `demo-socio@ciudadan.org` (rol `socio`) → reserva de tarea, calificación
   - `demo-verificador@ciudadan.org` (rol `verificador`) → verificación de área
   - `demo-admin@ciudadan.org` (rol `admin`) → resolución de apelaciones
   Para conseguirlo: en el frontend, loguear con cada uno y copiar el token
   de Network tab; o usar el flujo Auth0 OAuth token endpoint.

## Qué valida

| Endpoint | Método | Qué chequea | Rol requerido |
|---|---|---|---|
| `/api/todos` | GET | Tareas generales visibles sin auth (Public.find) | ninguno |
| `/api/todos` | POST | 401 sin Authorization (policy is-admin-or-socio) | socio/admin |
| `/api/tareas/resolver` | POST | 401 sin auth / 400 sin todoId | authenticated |
| `/api/tareas/calificar` | POST | 401 sin auth / 400 sin tareaId | admin/socio |
| `/api/tareas/subir-evidencia` | POST | 401 sin auth / 400 sin tareaId | admin/socio/verificador |
| `/api/areas/verificar-area` | POST | 401 sin auth / 400 sin userId | verificador/admin |
| `/api/areas/verificaciones` | GET | 401 sin auth / 400 sin userId | verificador/admin |
| `/api/tareas/resolver-apelacion` | POST | 401 sin auth / 400 sin tareaId | admin/socio |

El smoke test:

1. Lanza los casos **negativos** (sin auth, sin payload) — deben devolver 401/400.
2. Lanza los **positivos** con tokens válidos (requiere variables env
   `TOKEN_SOCIO`, `TOKEN_VERIFICADOR`, `TOKEN_ADMIN`) — happy path.
3. Imprime PASA/FAILA por endpoint y un resumen al final.

## Uso (PowerShell)

```powershell
# Casos negativos (no requiere tokens)
cd ciudadan_backend_26
.\scripts\smoke-test.ps1

# Casos completos (incluye happy path con tokens)
$env:TOKEN_SOCIO = "<auth0 jwt socio>"
$env:TOKEN_VERIFICADOR = "<auth0 jwt verificador>"
$env:TOKEN_ADMIN = "<auth0 jwt admin>"
.\scripts\smoke-test.ps1
```

## Uso (bash)

```bash
cd ciudadan_backend_26
./scripts/smoke-test.sh

# Con tokens:
TOKEN_SOCIO=xxx TOKEN_VERIFICADOR=yyy TOKEN_ADMIN=zzz ./scripts/smoke-test.sh
```

## Output esperado (negativos)

```
[PASA] GET  /api/todos                                  → 200 (visibilidad pública)
[FAIL] GET  /api/todos                                  → esperado 200, obtuvo 500
[PASA] POST /api/todos        (sin auth)                → 401 (policy corre)
[PASA] POST /api/tareas/resolver (sin auth)             → 401
...
[PASA] POST /api/areas/verificar-area (sin auth)        → 401
[PASA] POST /api/tareas/resolver-apelacion (sin auth)  → 401

Resumen: 9/9 PASARON
```

## Si algo falla

| Error | Causa probable | Fix |
|---|---|---|
| `500` en GET `/api/todos` | Strapi falle al redireccionar el query | Revisar logs Strapi con `--debug` |
| `403` en POST (con token) | Permiso nativo no habilitado en rol | Correr `node fix-perms.js` (Fix B) |
| `401` en POST (con token) | Policy custom no reconoce el user | Verificar que `AUTH0_DOMAIN` en `.env` es correcto (`ciudadan.us.auth0.com`); ver `docs/TAREAS-CRUD-PERMISOS.md` |
| `404` en rutas custom | Caché de Strapi | Reiniciar `npm run develop` (autoReload re-escanea rutas) |
| `400` "rol inválido" en verificar-area | Status != verified/pending/rejected | Revisar body del request |
