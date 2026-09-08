# 04 — Servicios Auxiliares del Backend

> Cubre los submódulos que acompañan a Strapi en `ciudadan_backend_26/`: **Socket Service**,
> **Market (Vendure)**, **Middleware (proxy)**, y los **scripts**, **CI/CD**, **Docker/Fly** y
> la **configuración** de Strapi. Todos los puertos y comandos aquí son verificados del disco.

## Contenido
1. [Socket Service](#socket-service)
2. [Market (Vendure)](#market)
3. [Middleware proxy](#middleware)
4. [Scripts de backend](#scripts)
5. [CI/CD](#ci-cd)
6. [Docker / Fly](#docker-fly)
7. [Configuración Strapi](#config-strapi)
8. [Extensions / Middlewares / Policies / Utils](#ext-policies)

---

<a name="socket-service"></a>
## 1. Socket Service (`socket-service/`)

Proceso **Node.js separado** de Strapi: **Express + Socket.IO** que presta tiempo real
(taxis/movilidad), un **webhook de chatbot WhatsApp**, un **endpoint de tarifas** y una
**wiki** con base SQLite local. Todo bajo un solo puerto HTTP.

**Puertos:** `SOCKET_PORT` (default **33035**; código usa `|| 33032`). El chat IA corre en
`server-lmai.js` (puerto **5000**) que proxya hacia un LLM LM Studio (default `http://192.168.1.3:1234`).

**Dependencias:** Express 4, Socket.IO 4, `@bot-whatsapp/*`, `better-sqlite3`, axios,
`cross-fetch`, `form-data`, `marked`, `node-fetch`, `@notionhq/client`, `queue-promise`,
`compression`, `cors`, `dotenv`, `uuid`, `polka`; TypeScript + `tsx` (dev).

### Cómo se levanta
```bash
cd socket-service
npm install
npm run build   # tsc -p .  → genera dist/ (ConfigDatabase, WikiService, ...)
npm start       # copia schema.sql a dist/ y ejecuta: tsx server.js
```
> ⚠️ `server.js` importa de `./dist/...`. Sin `npm run build` previo no arranca.

### Eventos Socket.IO
**Recibidos del cliente** (`io.on("connection")`):
- `register` → une al socket a la room `email`.
- `speakTTS` → rebroadcast global.
- `ofertaviaje` → re-emite a los demás (incluye rating del conductor).
- `actualizandoUbicacion` → rebroadcast `driver-location`.
- `trip-update` → rebroadcast global.
- `disconnect`.

**Emitidos por rutas HTTP:** `trip-request` (room driverId + global), `notification` (global +
room email), `viajeAceptado` (global), `trip-cancel` (rooms driver/user).

### Endpoints HTTP
| Método/ruta | Módulo | Función |
|---|---|---|
| `GET/POST /webhook` | chatbot | verificación y recepción WhatsApp |
| `POST /price-calculating` | priceCalculating | `price = (distance/1000) * 10.1` |
| `POST /rating-calculate` | calcRating | rating usuario desde Strapi `/api/viajes` |
| `POST /trip-request` | trip-request | emite `trip-request` |
| `POST /notifica` | notifica | emite `notification` |
| `POST /test/send-trip` · `POST /test/cancel-trip` | testTrip | simula viaje, emite eventos |
| `POST /api/calculate-fare` | calculateFare | tarifa Google Directions + fallback Haversine |
| `POST /api/aceptar-viaje` | aceptarViaje | actualiza viaje, emite `viajeAceptado` |
| `POST /api/suscribir` | openpay | cliente + suscripción Openpay (condicional) |
| `GET /wiki/:section` · `GET /wiki/:section/:path(*)` · `POST /wiki/save/:section` | WikiRouter (TS) | árbol/leer/guardar wiki |

**Rutas que existen pero NO se montan (código huérfano):** `routes/agencia.js`
(`POST /subsidio`), `routes/paymentlab.js` (`POST /pagar`), `routes/wallet.js`
(`POST /crear`, `GET /saldo/:address`, `POST /transferir`), `routes/wiki.js`.

### Chatbot (WhatsApp) — `chatbot.js`
- `attachChatbot(app, opts)` monta un router en `CHATBOT_WEBHOOK_PATH` (`/webhook`).
- **GET /webhook:** verificación Meta (`hub.mode=subscribe`, `hub.verify_token ===
  META_VERIFY_TOKEN`); devuelve `hub.challenge`.
- **POST /webhook:** procesa `whatsapp_business_account` → eco a la **WhatsApp Cloud API**
  (`https://graph.facebook.com/v17.0/{NUMBER_ID}/messages`).
- Inicializa `@bot-whatsapp/bot` con `MetaProvider` (jwtToken, numberId, verifyToken, v22) y
  flujos demo, DB `MockAdapter`.
- `.env`: `NUMBER_ID`, `META_VERIFY_TOKEN`, `VERIFY_TOKEN`, `PUBLIC_WEBHOOK_URL`.

> ⚠️ Credenciales: `VERIFY_TOKEN=f3b5...` y `NUMBER_ID=947765226366403` están en `.env`
> (riesgo de secretos versionados). No reutilizarlas en producción real.

### Base de datos local (SQLite) — `ciudadadan.db`
- Singleton `ConfigDatabase.getConnection()` (better-sqlite3).
- Esquema `config/schema.sql`: tablas `nodes`, `wikis`, `documents`, `versions`, `permissions`,
  `links`, `sync_queue` (wiki distribuida, PRAGMA WAL + FK).
- Bootstrap crea el nodo propio y las wikis base `main`, `help`, `faq`.
- `WikiService` (árbol, guardado, MD→HTML con `marked` + wikilinks `[[...]]`),
  `WikiWatcherService` observa `WIKI_ROOT_PATH` (`.env`: `C:/yii/wikis`) y sincroniza `.md`.

### Servidores LLM
- `server-lmai.js`: Express con `POST /chat` (proxy streaming SSE).
- `lmai.js`: POST a `LM_STUDIO_URL` (default `http://192.168.1.3:1234/v1/chat/completions`),
  modelo `deepseek-r1-distill-qwen-7b`, `stream:true`.
- `lmai/app.py`: equivalente en FastAPI (`POST /chat`, SSE + heartbeat 5 s, `max_tokens:2048`).

---

<a name="market"></a>
## 2. Market (Vendure) — `market/`

Subproyecto de **comercio headless** con **Vendure v3**, separado de Strapi.

- **Entrada:** `src/index.ts` → `bootstrap(config)`.
- **Config funcional:** `src/vendure.config.ts`:
  - `apiOptions`: puerto **4000**, `admin-api` y `shop-api`.
  - `authOptions`: superadmin `admin`/`admin`, `requireVerification:false`.
  - `dbConnectionOptions`: **sqlite** `vendure.sqlite`, `synchronize:true`.
  - `paymentOptions`: `stripePaymentMethodHandler`.
  - plugins: **DefaultSearchPlugin** (indexStockStatus), **AdminUiPlugin** (route `admin`,
    puerto **5001**), **StripePlugin**.
  - `customFields.Product.storeId` (string, etiqueta ES "ID de Tienda (Strapi)").
- **Stripe:** `plugins/stripe/stripe.handler.ts` define `PaymentMethodHandler` `code:'stripe'`
  que crea un `PaymentIntent` (moneda `mxn`) en `createPayment` y lo confirma en
  `settlePayment`. Usa `process.env.STRIPE_API_KEY`. `stripe.plugin.ts` es un `@VendurePlugin` vacío.
- `src/vendure-config.ts` (raíz): esqueleto incompleto/incoherente — la config usable es
  `src/vendure.config.ts`.

### Cómo corre
```bash
cd market
npm install
npm run dev   # ts-node-dev --transpile-only src/index.ts
```
- Solo script de desarrollo.
- Shop/Admin API en **4000**, Admin UI en **5001**.

---

<a name="middleware"></a>
## 3. Middleware proxy — `middleware/`

**Express 5 (ESM)** corriendo en el puerto **33010** (`npm run start` → `node src/index.js`).
Exponer media/upload/API de Strapi y endpoints privados de conductores.

Rutas `src/index.js`:
- `GET /uploads/*` — proxy de media en streaming a `${STRAPI_URL}...`; agrega
  `Cache-Control: public, max-age=31536000, immutable`.
- `POST /api/upload` — proxy de upload con `Authorization: Bearer ${STRAPI_API_TOKEN}`.
- `GET/POST /api/*` — proxy genérico a Strapi (excepto `/api/conductores` y `/api/upload`).
- `POST /api/conductores/preregistro` · `PUT /api/conductores/procesar/:agendaId` — flujo de
  conductores (verifica Auth0, crea citas `agenda`, agrega rol `conductor`).
- `GET /_health` — healthcheck.

Helpers: `src/auth0.js` (verificación RS256 con jwks-rsa), `src/strapiService.js`
(login `/api/auth/local` + cache JWT ~50 min), `src/proxy.js` (reutilizable),
`src/routes/auth0.js` (`POST /auth0-login`).

---

<a name="scripts"></a>
## 4. Scripts de backend

Se ejecutan desde la raíz `ciudadan_backend_26/`. La mayoría arranca un Strapi embebido contra
`/tmp/data.db` (sqlite). Varios requieren `NODE_OPTIONS=--openssl-legacy-provider`.

### Scripts raíz
| Script | Propósito | Comando |
|---|---|---|
| `seed-ad-rewards.js` | Seed de anuncios remunerados (usuario demo + 3 ads) | `node seed-ad-rewards.js` |
| `smoke-ad-rewards.js` | Smoke test E2E flujo anuncios | `node smoke-ad-rewards.js` |
| `assign-roles.js` | Sincroniza rol Strapi ↔ `roles.extra` | `node assign-roles.js [email]` |
| `list-perms.js` / `list-perms2.js` | Inspecciona permisos up_* | `node list-perms.js` |
| `fix-perms.js` | Crea permisos faltantes y roles Socio/Verificador | `node fix-perms.js` |
| `fix-ads-media.js` | Vincula uploads reales a anuncios | `node fix-ads-media.js` |
| `fix-text-encoding.js` | Corrige acentos/ñ en todos/tareas | `node fix-text-encoding.js` |
| `export-strapi-schema.js` | Genera `strapi-schema-export.md` | `node export-strapi-schema.js` |
| `publish-cowork-drafts.js` | Publica draft de area/skill/agencia/todo/tarea | `node publish-cowork-drafts.js` |
| `seed-root-areas.js` | Crea las 5 áreas raíz CoWork | `node seed-root-areas.js` |
| `seed-cowork-test-data.js` | Seed CoWork completo | `node seed-cowork-test-data.js` |
| `seed-cowork-extra.js` | Complementa estados asignada/pagada/cancelada | `node seed-cowork-extra.js` |
| `seed-herramientas-cowork-v2.js` | Inserta categorías herramientas | `node seed-herramientas-cowork-v2.js` |
| `test-cowork-e2e.js` | Test E2E flujo tareas CoWork | `node test-cowork-e2e.js` |
| `actualizar-videos-anuncios.js` | Vincula anuncios a videos reales | `node actualizar-videos-anuncios.js` |

### `scripts/`
| `smoke-test.sh` (bash/curl) · `smoke-test.ps1` (PowerShell) — smoke tests endpoints CoWork. |

### `seed/`
| Script | Propósito |
|---|---|
| `seed.js` | Crea 30 publicaciones (HTTP) |
| `update.js` | Sube imagen y actualiza posts (HTTP) |
| `test.js` | Comprueba conexión HTTP `/api/publicaciones` |
| `seed-cowork.js` | Inserta 5 áreas raíz + roles + usuarios demo (knex directo) |
| `seed-endpoints.js` | Inyecta herramientas/skills/carteras/todos/tareas |
| `insertar-tarea-resolucion.js` | Crea registros tarea de prueba (entityService) |
| `inspect-cartera.js` / `inspect-schema.js` | Inspecciones de esquema |

---

<a name="ci-cd"></a>
## 5. CI/CD

`ciudadan_backend_26/.github/workflows/deploy.yml`:
- **Trigger:** push a `main`.
- **Runner:** `self-hosted`.
- **Un job `deploy`** que, para 3 instalaciones (`strapi-ciudadan-dev`, `strapi-ciudadan-prod`,
  `strapi-marihuanas`), hace: `git fetch origin` → `git reset --hard origin/main` →
  `npm install --legacy-peer-deps` → `sudo systemctl restart <servicio>`.

---

<a name="docker-fly"></a>
## 6. Docker / Fly

- **Dockerfile:** `node:18-alpine`, `npm install`, `npm run build`, `EXPOSE 1337`,
  `CMD ["npm","start"]`.
- **docker-compose.yml:** servicio `strapi` (contenedor `ciudadan-backend`), `1337:1337`,
  `DATABASE_CLIENT=sqlite`, `DATABASE_FILENAME=/tmp/data.db`, volumen de código + node_modules.
- **fly.toml:** app `ciudadan-backend-morning-fog-6224`, build con Dockerfile, `PORT=1337`,
  internal_port 1337, entrada HTTP 80 y TLS 443.

---

<a name="config-strapi"></a>
## 7. Configuración Strapi (`config/`)

- **`server.js`:** host `HOST`, port `PORT` (default 1337; `.env` dev usa 33432),
  `app.keys: APP_KEYS`, `dirs.public`, bloque `stripe`.
- **`middlewares.js`:** `strapi::logger/errors/security`, **cors** custom con `CORS_ORIGINS` y
  header `X-Ad-Token`, `poweredBy/query/body/session/favicon/public`.
- **`plugins.js`:** plugin users-permissions con provider **auth0** (`AUT_CLIENT_ID`/
  `AUT_CLIENT_SECRET`, redirectUri `https://back.ciudadan.org/api/connect/auth0/callback`).
- **`admin.js`:** `auth.secret=ADMIN_JWT_SECRET`, `apiToken.salt`, `transfer.token.salt`, flags.
- **`api.js`:** REST `defaultLimit:25`, `maxLimit:100`, `withCount:true`.
- **`database.js`:** `DATABASE_CLIENT` (sqlite por defecto `.tmp/data.db`, mysql, mysql2,
  postgres) con pool/SSL.
- **`src/index.js`:** bootstrap asegura `public/uploads`.
- **`src/config/midleware.js`** (typo): stub casi comentado; la config real es
  `config/middlewares.js`.

---

<a name="ext-policies"></a>
## 8. Extensions / Middlewares / Policies / Utils

### `src/extensions/users-permissions/`
- **`strapi-server.js`** — añade `PUT/GET /users/:id/areas`, `POST /users/:id/proponer-subarea`,
  `GET /users/:id/proposed-subareas`, `POST /users/:id/subir-documento-area`,
  `POST /users/:id/revisar-subarea`; **overridea rutas built-in `/users`** para Auth0
  (`auth:false` + policies), evitando el 401 del JWT nativo.
- **`controllers/auth0.js`** y **`routes/auth0.js`** — `callback`: cambia `id_token` Auth0 por
  JWT Strapi (busca/crea usuario).
- **`auth0-authentication/services/auth0.js`** — `auth0Login({access_token})`: /userinfo,
  busca/crea usuario, setea **cookie httpOnly** con JWT.
- **`config/roles.json`**, **`content-types/user/schema.json`** — roles y schema de usuario.

### `src/middlewares/`
- `raw-body.js` — raw body (2 MB) solo para `POST /api/stripe/webhook`.
- `auth0jwt/index.js` — verificación RS256 Auth0 → `ctx.state.user`.
- `auth/` — directorio vacío.

### `src/policies/` (globales)
| Policy | Roles / uso |
|---|---|
| `auth.js` | envuelve `auth0jwt` |
| `is-authenticated-auth0.js` | cualquier usuario Auth0 válido existente |
| `is-admin-or-socio.js` | admin/socio |
| `is-admin-or-socio-or-verificador.js` | admin/socio/verificador |
| `is-verificador.js` | admin/verificador/socio |
| `can-asignar-tarea.js` | matriz agencia × tipo de tarea |
| `can-calificar-tarea.js` | calificación según agencia/tipo/asignación |
| `allow-public-relations.js` | rellena `ctx.state.auth` (no borra relaciones) |
| `try-auth0-user.js` | auth opcional |

### `src/utils/`
- `auth0-verify.js` — `getAuth0Email(token)` con caché en memoria.
- `ad-usuario.js` — usuario demo de anuncios sin JWT.
- `cowork/visibility.js` — visibilidad de tareas (buildTodoVisibilityFilter, canUserTakeTodo).

---

*Fin de servicios auxiliares. Sigue: [05 — Instalación y Ejecución](05-Instalacion-y-Ejecucion.md).*