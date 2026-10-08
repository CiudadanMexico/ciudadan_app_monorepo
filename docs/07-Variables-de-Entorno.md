# 07 — Variables de Entorno

> Inventario de todas las variables de entorno por subproyecto. Revisa los `.env` reales antes
> de producción y **no subas secretos** (algunos `.env` del repo ya los contienen).

## 1. Backend Strapi (`ciudadan_backend_26/.env`)

| Variable | Valor ejemplo | Descripción |
|---|---|---|
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `PORT` | `33432` / `1337` | Puerto HTTP |
| `APP_KEYS` | CSV de 4 claves | `app.keys` de Strapi |
| `API_TOKEN_SALT` | `tobemodified` | Salt API token |
| `ADMIN_JWT_SECRET` | — | Secreto JWT admin |
| `TRANSFER_TOKEN_SALT` | `tobemodified` | Salt tokens de transferencia |
| `JWT_SECRET` | — | Secreto JWT (users-permissions) |
| `NODE_ENV` | `production` | Entorno |
| `DATABASE_CLIENT` | `sqlite` | `sqlite` / `mysql` / `mysql2` / `postgres` |
| `DATABASE_FILENAME` | `.tmp/data.db` | sqlite path |
| `DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD` | — | para mysql/postgres |
| `DATABASE_URL` | — | opcional (connectionString) |
| `SOCKET_PORT` | `33035` | Puerto socket service |
| `SOCKET_HOST` | `http://localhost` | Host socket |
| `CORS_ORIGIN` / `CORS_ORIGINS` | CSV de origines | CORS (permite `X-Ad-Token`) |
| `CLIENT` / `CLIENT_DOMAIN` | `http://localhost` | Dominios cliente |
| `AUTH0_DOMAIN` | `ciudadan.us.auth0.com` | Dominio Auth0 |
| `AUTH0_AUDIENCE` | `https://api.ciudadan.org` | Audience Auth0 |
| `AUTH0_CLIENT_ID` | — | Client ID Auth0 |
| `AUT_CLIENT_ID` | — | Client ID grant (plugin users-permissions) |
| `AUT_CLIENT_SECRET` | — | Client secret grant |
| `GEOCODING_KEY` | — | Google Maps (directions/geocoding) |
| `STRIPE_SECRET_KEY` | — | Stripe secret |
| `STRIPE_WEBHOOK_SECRET` | — | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | — | Stripe price (server.js) |
| `OPENPAY_MERCHANT_ID` | — | Openpay merchant |
| `OPENPAY_PRIVATE_KEY` | — | Openpay private key |
| `OPENPAY_PLAN_ID` | — | Openpay plan |
| `STRAPI_URL` | `http://localhost:33432` | URL propia del backend |
| `STRAPI_API_TOKEN` | — | Token de API service |
| `STRAPI_SERVICE_EMAIL` / `PASSWORD` | — | Credenciales de login service |
| `NOTION_TOKEN` / `NOTION_TOKENN` / `NOTION_TOKENM` | — | Tokens Notion (blog/news) |
| `META_VERIFY_TOKEN` | — | Verificación webhook Meta |
| `VERIFY_TOKEN` | — | Token WhatsApp Cloud |
| `NUMBER_ID` | — | Número WhatsApp Cloud |
| `PUBLIC_WEBHOOK_URL` | `https://chatbot.ciudadan.org/webhook` | URL webhook pública |
| `CHATBOT_WEBHOOK_PATH` | `/webhook` | Path webhook |
| `WIKI_ROOT_PATH` | `/home/ubuntu/apps/wikis` | Raíz de la wiki local (.md) |
| `WIKI_CONFIG_TTL_MS` | `60000` | TTL de caché de la config de wiki desde Strapi |
| `WIKI_CONFIG_TIMEOUT_MS` | `5000` | Timeout HTTP al leer `wikis_path` de Strapi |
| `WEBHOOKS_POPULATE_RELATIONS` | `false` | populate en webhooks |
| `BREVO_API_KEY` | — | API key v3 de Brevo (token). Sin valor **no se envía ningún correo** |
| `BREVO_SENDER_EMAIL` | `no-reply@ciudadan.org` | Remitente verificado en Brevo |
| `BREVO_NOTIFICACION_EMAIL` | `equipo@ciudadan.org` | Buzón(es) que reciben el aviso de cada postulación (CSV) |
| `BREVO_TIMEOUT_MS` | `10000` | Timeout HTTP del cliente Brevo |

### 1.1 Correo transaccional (Brevo)

Implementado en `ciudadan_backend_26/src/services/brevo/index.js` (mismo patrón que
`src/services/uber-direct/`) y se dispara desde `POST /api/prelanzamiento` cuando
`tipo === 'socio-estatal'` (el único formulario que captura correo del postulante):

1. **Confirmación al postulante** si dejó un correo válido.
2. **Aviso interno** a `BREVO_NOTIFICACION_EMAIL` con los datos capturados.

El nombre del remitente (`sender.name` de la API) **no vive en el `.env`**: lo define
cada módulo que llama a `brevo.enviar()` vía el parámetro `senderName`
(ej. `'Ciudadan · Socios Estatales'`), con fallback a `"Ciudadan"` cuando no se
especifica. El `.env` queda solo con infraestructura: `BREVO_API_KEY`,
`BREVO_SENDER_EMAIL` y `BREVO_NOTIFICACION_EMAIL` (+ `BREVO_TIMEOUT_MS` opcional).

Es *best-effort*: si falta la API key, el remitente o el correo del postulante, se registra
un warning en el log y la postulación se guarda igual (un fallo de correo nunca pierde el lead).
Diagnóstico rápido: `BREVO_API_KEY` + `BREVO_SENDER_EMAIL` son las dos mínimas para enviar.

Selftest sin red: `node tests/selftests/brevo.selftest.js`

## 2. Socket Service (`socket-service/.env`)

Contiene **las mismas variables** que el backend (incluidos secretos). Las específicas:
- `SOCKET_PORT` (`33035`) — puerto del server.
- `STRAPI_URL` — url del backend para consultas (tarifas, ratings, viajes).
- `LM_STUDIO_URL` (usada por `lmai.js`; default `http://192.168.1.3:1234/v1/chat/completions`).
- `LMAI_PORT` (usada por `server-lmai.js`; default 5000).
- Credenciales WhatsApp (`NUMBER_ID`, `META_VERIFY_TOKEN`, `VERIFY_TOKEN`, `PUBLIC_WEBHOOK_URL`).
- Credenciales Notion y `WIKI_ROOT_PATH`.
- `STRAPI_URL` debe apuntar al backend real (`http://127.0.0.1:33032` en esta
  instancia; el valor viejo `http://localhost:33432` no responde). También la
  usan tarifas/ratings/viajes y la wiki.

### 2.1 Wiki: contenido fuera del repo (`site-setting.wikis_path`)

Los `.md` de la wiki **no viven en el monorepo**: están en una carpeta física
fuera del proyecto (`/home/ubuntu/apps/wikis/{main,help,faq}/`, con un
subdirectorio por sección). La ruta se configura en Strapi
(**Gestor de Contenidos → Site_setting → `wikis_path`**, ruta ABSOLUTA, ej.
`/home/ubuntu/apps/wikis`).

El socket-service la resuelve con esta precedencia
(`socket-service/config/WikiRootProvider.ts`):
1. `site-setting.wikis_path` en Strapi (`GET /api/wiki/public-config`).
2. `WIKI_ROOT_PATH` del `.env` (fallback operativo si Strapi está caído).
3. Default por plataforma (`/var/www/apps/wikis` en Linux).

Notas operativas:
- El valor de Strapi se cachea 60 s (`WIKI_CONFIG_TTL_MS`); el watcher se
  re-apunta solo si `wikis_path` cambia (log `[Wiki] Re-chequeo`).
- **Cuidado**: cualquier escritura dentro de `ciudadan_backend_26/` (incluido
  `socket-service/dist/` o su `.env`) dispara el autoReload de Strapi (~24 s).
  Mientras Strapi recarga, la wiki cae al fallback y luego se autocorrige en
  el siguiente re-chequeo (es el comportamiento diseñado, no un error).
- Al arrancar, el watcher indexa todos los `.md` (`Indexación inicial: N`);
  si el árbol llega vacío (`nodes: []`), revisar que la carpeta tenga `.md`.
- El frontend pide el árbol al socket: `REACT_APP_SOCKET_URL + /wiki`
  (`services/wikiService.ts`); no debe apuntar a `localhost` en producción.
- `socket-service/wiki/` está en `.gitignore`: no volver a commitear .md ahí.
- La fuente versionada de los .md de ejemplo es `wikiseed/` (raíz del
  monorepo). Para llevarlos al destino en vivo:
  `node wikiseed/sync-wikis.js [--dry-run] [--force]`
  (usa la misma precedencia Strapi → `.env` → default; ver `wikiseed/README.md`).
- Endpoint de diagnóstico: `GET /api/wiki/public-config` → `{ wikisPath }`.

## 3. Frontend (`ciudadan_frontend/.env`)

| Variable | Descripción |
|---|---|
| `PORT` | `3001` (dev server) |
| `REACT_APP_MAIN_DOMAIN` | Dominio principal (https://ciudadan.org) |
| `REACT_APP_AUTH0_DOMAIN` | `ciudadan.us.auth0.com` |
| `REACT_APP_AUTH0_CLIENT_ID` | Client ID Auth0 |
| `REACT_APP_AUTH0_AUDIENCE` | `https://api.ciudadan.org` |
| `REACT_APP_STRAPI_URL` | backend (default `http://localhost:33432`) |
| `REACT_APP_SOCKET_URL` | socket (default `http://localhost:33035`) |
| `REACT_APP_AI_URL` | URL IA (http://llmciudadan.org) |
| `REACT_APP_STRAPI_TOKEN` | token Strapi (⚠️ duplicado en el .env) |
| `REACT_APP_GOOGLE_MAPS_API_KEY` / `REACT_APP_PLACES_KEY` / `REACT_APP_GEOCODING_KEY` | Google Maps |
| `REACT_APP_OPENPAY_MERCHANT_ID` / `REACT_APP_OPENPAY_PUBLIC_KEY` | Openpay |
| `REACT_APP_WHATSAPP_NUMBER` | WhatsApp de contacto |
| `REACT_APP_PRESENTATION_VIDEO` | video presentación (YouTube) |
| `REACT_APP_APP_ENV` | `development` |

> ⚠️ Los `.env` versionados contienen secretos reales. En producción usa variables de entorno
> o gestores de secretos; no commitees claves.

---

*Fin de variables de entorno.*