# Despliegue — Instancia 3 (`dos`) · Ciudadan App Monorepo

> Runbook de la **instancia 3** del monorepo Ciudadan. Complementa al general
> `docs/oracle-agents.md` (runbook de la instancia VPS original) y lo adapta a los
> puertos de esta instancia. Fecha: 2026-09-14.

## 0. Contexto: 3 instancias, 3 bases de datos

Cada instancia corre en **su propia máquina** (VPS) con **SU PROPIA base SQLite**
(`ciudadan_backend_26/.tmp/data.db`). **Los datos NO se comparten**:
usuarios, roles, tareas y membresías se gestionan **por instancia**.
`git push` a `main` solo actualiza el código; los datos hay que gestionarlos en cada despliegue.

| | Máquina | Acceso SSH |
|---|---|---|
| Instancia 1 | VPS original | `160.34.214.224` (referencia) |
| Instancia 2 | VPS ARM | `160.34.214.224` (túnel: 3002/33432/33035) |
| **Instancia 3 (esta)** | **`dos`** | **`159.54.135.230`** |

## 1. Puertos por instancia

| Servicio | Inst 1 | Inst 2 | **Inst 3 (esta)** | Dónde se define |
|---|---|---|---|---|
| React (craco dev server) | 3001 | 3002 | **3003** | `ciudadan_frontend/.env` → `PORT` + `craco.config.js` (lee `process.env.PORT`) |
| Strapi | 33432 | 33432 | **33433** | `ciudadan_backend_26/.env` → `PORT` |
| socket-service | 33035 | 33035 | **33036** | `socket-service/.env` → `SOCKET_PORT` |
| middleware | 33010 | 33010 | **33010** | hardcodeado en `middleware/src/index.js` (no tocar) |

> ⚠️ Los puertos de Inst 3 son **distintos** a los de Inst 2 para poder abrir **ambos
> túneles SSH a la vez** desde la máquina del dev sin que choquen los puertos locales.

## 2. Dónde vive cada cosa (máquina `dos`)

| Recurso | Ruta |
|---|---|
| Repo | `/home/opc/ciudadan_app_monorepo` |
| Node 20.20.2 (backend + frontend) | `/home/opc/node20/bin` |
| Node 22 sistema (socket-service + middleware) | `/usr/bin/node` |
| Logs | `/home/opc/logs/` (`backend-develop.log`, `frontend-start.log`, `socket-service.log`, `middleware.log`) |
| Wikis (socket-service) | `/var/www/apps/wikis` (obligatorio) |
| Shim compilador low-mem | `/home/opc/bin/cc-lowmem` (recompilar `better-sqlite3` si se reinstala) |
| BD SQLite | `ciudadan_backend_26/.tmp/data.db` |

## 3. Variables de entorno clave (instancia 3)

**`ciudadan_frontend/.env`**
```
PORT=3003
REACT_APP_STRAPI_URL=http://localhost:33433
REACT_APP_SOCKET_URL=http://localhost:33036
REACT_APP_AUTH0_DOMAIN=ciudadan.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=za265MeRdxMKuPqzdPSTL7lHL0yyg5bd
REACT_APP_AUTH0_AUDIENCE=https://api.ciudadan.org
```

**`ciudadan_backend_26/.env`**
```
HOST=0.0.0.0
PORT=33433
SOCKET_PORT=33036
SOCKET_HOST=http://localhost
STRAPI_URL=http://localhost:33433
CORS_ORIGINS=http://localhost:3001,http://localhost:3000,http://localhost:3003,http://localhost,http://localhost:33422,http://localhost:33033,https://chatbot.ciudadan.org,https://ciudadan.org,https://marihuanas.club,http://159.54.135.230:3003
WIKI_ROOT_PATH=/var/www/apps/wikis
```

**`ciudadan_backend_26/socket-service/.env`**
```
SOCKET_PORT=33036
CORS_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:33433,http://localhost:33036,http://159.54.135.230:3003
WIKI_ROOT_PATH=/var/www/apps/wikis
```

Los 3 `.env` están en `.gitignore` → nunca subirlos.

## 4. Arranque de servicios (en orden)

```bash
# 1) Strapi (node20) — puerto 33433
cd /home/opc/ciudadan_app_monorepo/ciudadan_backend_26
setsid env PATH=/home/opc/node20/bin:$PATH npm run develop </dev/null > ~/logs/backend-develop.log 2>&1 &

# 2) socket-service (node22 + tsx) — puerto 33036
cd socket-service
setsid npm start </dev/null > ~/logs/socket-service.log 2>&1 &

# 3) middleware — puerto 33010
cd ../middleware
setsid npm start </dev/null > ~/logs/middleware.log 2>&1 &

# 4) frontend (node20) — puerto 3003
cd ../../ciudadan_frontend
setsid env PATH=/home/opc/node20/bin:$PATH npm start </dev/null > ~/logs/frontend-start.log 2>&1 &
```

**Verificación:**
```bash
ss -tln | grep -E ':(3003|33433|33036|33010)\b'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:33433/_health   # 204
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3003/           # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:33036/wiki/main # 200
```

> ⚠️ `npm run develop` tiene **autoReload**: si cambian archivos del backend (p. ej. un
> `git pull`), Strapi se reinicia solo (~10-15 s de hueco). Es normal y no requiere acción.

## 5. Túnel SSH desde la máquina del dev (Windows)

```powershell
ssh -i "C:\yii\yiz.key" -L 3003:localhost:3003 -L 33433:localhost:33433 -L 33036:localhost:33036 opc@159.54.135.230
```

Luego abrir **http://localhost:3003** en el navegador.
(Si la instancia 2 también está tunelada: usa 3002/33432/33035 contra `160.34.214.224`, sin conflictos.)

## 6. Auth0 (app SPA `za265MeRdxMKuPqzdPSTL7lHL0yyg5bd`)

Para ESTA instancia agregar en el panel de Auth0:
- **Allowed Callback URLs** += `http://localhost:3003`
- **Allowed Web Origins** += `http://localhost:3003`
- **Allowed Origins (CORS)** += `http://localhost:3003`
- **Allowed Logout URLs** += `http://localhost:3003`
- ⚠️ **Application Login URI** debe estar **VACÍO** (si apunta a un dominio muerto, el login falla para todos).

## 7. Actualizar (recibir cambios de `main`)

```bash
cd /home/opc/ciudadan_app_monorepo && git pull   # ff-only en main
```
- Si el pull toca el backend → Strapi se reinicia solo.
- Si toca el frontend → webpack recompila solo.
- **Los roles del usuario se leen SIEMPRE frescos al recargar la página** (fix en
  `RolesContext.jsx`, merge `56af39e`): editar roles en el admin de Strapi y recargar
  la app con un F5 es suficiente (ya no hace falta limpiar `sessionStorage`).

## 8. Roles por instancia (BD independiente)

Cada instancia tiene SUS usuarios. Para dar/quitar roles extra sin abrir el admin:

```bash
cd /home/opc/ciudadan_app_monorepo/ciudadan_backend_26
node scripts/set-roles.js <email> admin socio conductor   # reemplaza la lista
node scripts/set-roles.js <email> +editor -conductor      # incremental
node scripts/set-roles.js <email> reset                   # vacía
```

> El script escribe directo a la BD (knex+sqlite3) porque el `STRAPI_API_TOKEN` solo
> tiene permisos de lectura. Ya está en `main` (merge `bc938a9`).

## 9. Flujo de trabajo git (convención)

1. Trabajar en rama `feat/...`.
2. Merge a `main` (local) y `git push origin main`.
3. **Cada instancia** que quiera el cambio hace `git pull` (los demás clones NO se enteran del push).
4. Datos (roles, usuarios, contenidos) se gestionan por instancia, no via git.

## 10. Notas de plataforma (máquina ARM)

- Esta máquina es **aarch64** (ARM). Node 20.20.2 va en `~/node20`.
- **Bug conocido:** el `fetch` (undici) de Node 20.20.2 falla con `fetch failed` en ARM
  contra `localhost`. Usar los módulos `http/https` (ya implementado en `set-roles.js`)
  o correr scripts con Node 22 (`/usr/bin/node`).
- `better-sqlite3` se compila con el shim `~/bin/cc-lowmem` (evita OOM) si se
  reinstala `node_modules` del socket-service.