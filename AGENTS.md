# AGENTS.md — Ciudadan Platform

Monorepo (plain git, no workspace tooling) for **Ciudadan**, a Spanish-language civic/community platform. Two subprojects, each with its own `package.json` and `.env`:

- `ciudadan_backend_26/` — Strapi 4.25.9 headless CMS + REST/GraphQL API (Node 18)
- `ciudadan_frontend/` — React 18 + CRA/CRACO + MUI v6 + Capacitor (Android/iOS)

> **Notas:** el proyecto original incluía un módulo `ciudadan_backend_26/market/`
> (Vendure e-commerce). Ese módulo se desmontó/figuramente por que solo servía
> como pasarela de pago de Stripe; su directorio y dependencias fueron removidos.
> No hay subproyectos extra, solo los dos descritos arriba.

## 🆕 Update Highlights (2026-10-14) — leer antes de tocar la wiki o los seeds

> **La wiki está SEMBRADA, CONFIGURADA y VERIFICADA end-to-end.**
> Runbook completo: **`docs/WIKI-SEED-SETUP.md`** (arquitectura, siembra, rutas, verificación).

- **Wiki**: 32 documentos sembrados (main 2 / help 29 / faq 1) en la raíz física
  `socket-service/wiki/` (gitignored; se resuelve vía `WIKI_ROOT_PATH` del env del
  watchdog de la instancia `/etc/agent/env/services.env`, con la fuente canónica
  `site_settings.wikis_path` configurada en Strapi). El árbol sale de la tabla
  `documents` de `ciudadadan.db` → `GET :33032/wiki/<sección>`.
- **⚠️ REGLA DE ORO — Node 22**: todo lo que toque `ciudadadan.db` o el
  `better-sqlite3` del socket-service DEBE correr con `/opt/node22/bin/node`
  (el paquete exige `>=22`; con Node 20 el `require` pasa pero **usar** el binding
  mata el proceso con SIGSEGV, señal no capturable). `wikiseed/sync-wikis.js`
  incluye un pre-vuelo ABI que lo reporta como `abi-incompatible` sin crashear.
- **Sembrar la wiki**: `set -a; . /etc/agent/env/services.env; set +a && /opt/node22/bin/node wikiseed/sync-wikis.js` (copia + indexa; idempotente; nunca borra).
- **Seeds Strapi**: los 13 ejecutados y verificados (2026-10-14). Tres estaban
  rotos y fueron reparados: `seed/seed-cowork.js` (columnas `nombre`/`nivel`
  inexistentes → `name`/`level`), `seed/seed-endpoints.js` (columna legada
  `pagos_laborys` eliminada del schema), `seed/seed.js` (HTML → `blocks` +
  `publishedAt`; sus POST anónimos requieren el permiso público `create` de
  `publicacion`, otorgado solo en la BD local de dev).
  Suite de verificación: `node --test ciudadan_backend_26/tests/wikiseed-sync.test.js` (8/8).

## Commands

### Backend (`ciudadan_backend_26/`)
```bash
npm run develop   # dev server (autoReload), port 1337
npm run build     # build admin panel
npm start         # production server (no autoReload)
node socket-service/server.js   # separate Socket.IO realtime server (port 33032)
```
No test script. Node `>=18.0.0 <=20.x.x`.

### Frontend (`ciudadan_frontend/`)
```bash
npm start         # craco start, dev server port 3000
npm run build     # production build → /build
npm test          # Jest watch (CRA defaults; minimal tests)
npx cap sync android && npx cap open android   # mobile build
```

> ⚠️ En la instancia del agente **adrian1** el frontend NO es dev server: es build
> estático (`serve -s build -l 3001` tras cloudflared → `frontend-adrian1.ciudadan.org`,
> unidad systemd `ciudadan-frontend.service`) y **GitHub Actions no lo despliega**.
> Para actualizarlo: `CI=false DISABLE_ESLINT_PLUGIN=true npx craco build` +
> `sudo systemctl restart ciudadan-frontend.service`. Runbook:
> **`docs/deploy-adrian1-local.md`**. (`DISABLE_ESLINT_PLUGIN` es necesario mientras
> haya errores de ESLint en archivos ajenos que bloquean el build.)
>
> Login/logout con Auth0 (login vuelve a la página previa vía `appState.returnTo`;
> logout se queda EN la página vía `utils/logoutAqui.js`, iframe oculto):
> **`docs/03-Frontend.md` §2.1**.

## Architecture & Key Docs

- **Canonical CoWork spec:** `docs/documento-off.md` (source of truth)
- **⭐ Wiki seed/setup runbook (nuevo 2026-10-14):** `docs/WIKI-SEED-SETUP.md` — arquitectura de la wiki, siembra (`wikiseed/sync-wikis.js`), resolución de rutas y verificación end-to-end
- **Implementation status:** `docs/final-cowork.md`, `docs/RESUMEN-AVANCES-COWORK.md`
- **Database schema:** `docs/DATABASE-SCHEMA.md` (60 tables, generated from schemas)
- **Auth/permissions detail:** `docs/TAREAS-CRUD-PERMISOS.md`
- **Notifications API (toast + notificaciones):** `docs/NOTIFICACIONES.md` —
  todo pasa por `useNotifications()`; nunca `useSnackbar` ni un segundo socket.
- **Deploy frontend instancia adrian1 (build estático + systemd):**
  `docs/deploy-adrian1-local.md` — GH Actions NO despliega este frontend.
- **Flujo Auth0 login/logout (returnTo, Allowed Logout URLs a nivel app):**
  `docs/03-Frontend.md` §2.1.
- **Agenda migration:** `docs/AGENDA-VALIDATION-SYNC.md`
- **Monorepo/CI plan:** `plan_nonorepo.md`
- **Backend schema dump:** `ciudadan_backend_26/strapi-schema-export.md` (regenerate via `node export-strapi-schema.js`)
- **Cartera (fichas + wiki) spec & runbook:** `docs/CARTERA-ESPECIFICACION.md` —
  fichas de tokens, integración con la wiki, y §10.6 el **CORS del túnel
  Cloudflare** (obligatorio para que la wiki se vea por HTTPS).
- **Wiki (cómo funciona y se siembra):** la wiki son `.md` servidos por
  `socket-service` (`routes/WikiRouter`, prefijo `/wiki`). Raíz física
  `/var/www/apps/wikis/{main,help,faq}` (`WIKI_ROOT_PATH`, precedencia:
  Strapi `wikis_path` → `WIKI_ROOT_PATH` → default Linux). Frontend consume vía
  `src/services/wikiService.ts` (`{REACT_APP_SOCKET_URL}/wiki`). Semilla:
  `node wikiseed/sync-wikis.js` (idempotente).

## Domain Concepts (Spanish-first)

| Concept | Meaning |
|---|---|
| **laborys** | Internal currency. Auto-paid on task qualification. Stored in `carteras` (`laborysSaldo`, `laborysGanados`). |
| **todo** | Master/published task definition (10-state enum). |
| **tarea** | A user's resolution/submission against a `todo` (8-state enum). Never conflate with `todo`. |
| **área** | Top category. **Exactly 5 fixed roots**: Administrativo, Técnico, Comercial-difusión, Software, Creación multimedia (enforced in `area/lifecycles.js`). |
| **skill (habilidad)** | Capability enabling specialized tasks without full area verification. |
| **cartera** | User's laborys wallet. |
| **calificación** | Rating a `tarea`; triggers automatic laborys payment (backend lifecycle, not frontend). |
| **verificación** | Document-based validation of a user's area/subarea, stored in `up_users.area_details` JSON. |
| **notificación** | Persistent message stored in `api::notificacion.notificacion`, delivered in realtime to the recipient's **socket room (email)**. Never broadcast globally. Use `useNotifications()` only: `toast.*` = ephemeral local, `send()` = persistent. Full guide: `docs/NOTIFICACIONES.md`. |

⚠️ `membresiatipo: 'socio'` (cannabis club membership) ≠ `roles.extra: 'socio'` (permission role). Different concepts.

## Authentication & Authorization

**Auth0** is the identity provider. Strapi's built-in JWT auth is bypassed (`auth: false` on protected routes).

- Frontend: `@auth0/auth0-react`, audience `https://api.ciudadan.org`. Sends `Authorization: Bearer <Auth0 token>`.
- Backend policies validate by calling `https://{AUTH0_DOMAIN}/userinfo`, then look up user by email in `plugin::users-permissions.user`, check `user.roles.extra` (JSON array), and set **`ctx.state.strapiUser`** (NOT `ctx.state.user`).

**Roles** (informal, stored in `up_users.roles.extra` JSON array):
- `admin` — full CRUD
- `socio` — create/edit/delete/calify tasks
- `verificador` — reviews documentation, validates areas
- `editor`, `root` — also exist

**Backend policies** (`ciudadan_backend_26/src/policies/`):
| Policy | Allows |
|---|---|
| `is-authenticated-auth0` | Any authenticated user (resolver, completar) |
| `is-admin-or-socio` | admin, socio (calificar, delete, manage todos/areas) |
| `is-verificador` | admin, verificador (corregir flow) |
| `is-admin-or-socio-or-verificador` | admin, socio, verificador (update tasks, subir-evidencia) |

**Frontend:** `RolesContext` exposes `isAdmin()`, `isSocio()`, `isVerificador()`, `isEditor()`, `isRoot()`.

⚠️ Known bug: `POST /auth/auth0-login` reads token from `ctx.request.body.access_token` but frontend sends it in the `Authorization` header → silently fails. CoWork policies bypass this by calling `/userinfo` directly.

## Backend Conventions (`ciudadan_backend_26/`)

### Custom routes (numbered files)
Custom endpoints use numbered route files (`01-`, `02-`, `03-`...) loaded alphabetically. Each sets `auth: false` and attaches `global::` policies:
```js
// routes/03-tarea-calificar.js
module.exports = {
  routes: [{
    method: 'POST',
    path: '/tareas/calificar',
    handler: 'calificar.calificar',
    config: { auth: false, policies: ['global::is-authenticated-auth0', 'global::is-admin-or-socio'] },
  }],
};
```

### Controllers
Use `ctx.state.strapiUser` (set by policies). Prefer `strapi.entityService` for relation-aware CRUD, `strapi.db.query` for direct queries:
```js
const tarea = await strapi.entityService.findOne('api::tarea.tarea', id, { populate: ['usuario', 'todo'] });
const cartera = await strapi.db.query('api::cartera.cartera').findOne({ where: { user_id: tarea.usuario.id } });
```

### Lifecycle hooks
- `tarea/lifecycles.js` — enforces state machine (`VALID_TRANSITIONS` map) on `beforeUpdate`; auto-pays laborys on `afterUpdate` when `status='calificada'`; propagates status to parent `todo`.
- `area/lifecycles.js` — enforces max 5 root areas with fixed names; prevents circular/self-parent references.

**Tarea valid transitions:** `en_proceso→completada|cancelada`, `completada→corregir|calificada|cancelada`, `corregir→corregida|cancelada`, `corregida→calificada|corregir|cancelada`, `calificada→pagada`, `pagada`/`cancelada` terminal, `modificada→en_proceso|completada`.

### Stripe webhook
Requires raw body — route config must include `middlewares: ["global::raw-body"]` (only for `POST /api/stripe/webhook`).

### Database
`config/database.js` supports sqlite (default dev), mysql, postgres via `DATABASE_CLIENT` env. All config via `env()` calls — no `config/env/` directory.

### Socket service
`socket-service/` is a **separate Express + Socket.IO process** (not started by Strapi). Has its own `package.json`. Handles realtime trip events, WhatsApp chatbot, and the **wiki** (`WikiRouter`: tree from the `documents` table of `ciudadadan.db` + `.md` files from the physical root — see `docs/WIKI-SEED-SETUP.md`). Runs under **Node 22** in this instance (`/opt/node22/bin/node`).

## Frontend Conventions (`ciudadan_frontend/`)

### Structure
```
src/
├── index.js              # Provider stack: Router > Auth0 > Auth > Localization > Roles > Notifications > Cart > Snackbar
├── Routes/index.jsx       # ALL routes (single flat file, ~100+ routes, no lazy loading)
├── Pages/                 # Route-level pages
├── components/            # Feature components (Cowork/, NavBar/, MarketPlace/, ...)
├── Contexts/             # AuthContext, RolesContext, CartContext, NotificationsContext, ClubContext
├── hooks/                # useTodos.jsx, useTarea.jsx, useSkills/, ...
├── services/             # cowork/queryServices.js, cowork/mutationsServices.js
├── utils/                 # cowork.helpers.js, strapiHelpers.js, request.utils.js, constants.js
└── styles/               # Plain CSS files
```

⚠️ **Folder casing is inconsistent** (`Contexts/` capital vs `components/` lowercase; `Pages/Coowork/` vs `Pages/CoWork/`). Windows is case-insensitive but Linux/CI is not — match exact casing in imports.

### Patterns
- **Functional components + hooks only.** No class components.
- **UI:** Prefer **MUI v6** (`@mui/*`) + `@emotion` + `sx` prop for new work (see `src/components/Cowork/`). Legacy code uses MUI v4 (`@material-ui/*`), `react-bootstrap`, plain CSS, `aphrodite` — do not extend legacy patterns.
- **HTTP:** Prefer centralized `src/utils/request.utils.js` → `fetchJson(url, options, fallbackMessage)` with `credentials: 'include'`. Wrap services in `src/services/<feature>/`. Avoid inline `fetch`/`axios`.
- **Auth flow (dual token):** Auth0 access token (primary Bearer) + Strapi JWT (`strapi_jwt` in localStorage via `AuthContext`). New code uses Auth0 token with `audience: 'https://api.ciudadan.org'`.
- **Strapi v4 responses:** reads return `{ data: [...] }`; writes wrapped as `{ data: {...} }`; use `getAttributes()` / `normalizeAreas()` helpers in `utils/cowork.helpers.js`.
- **State:** React Context only (no Redux/Zustand). Local `useState` for UI; custom hooks for CRUD.
- **`@` path alias** → `src/` (configured in `craco.config.js` + `src/utils/jsconfig.json`).
- **Spanish-first:** UI strings, comments, variable names (`tarea`, `creador`, `fecha_entrega`) are in Spanish. Match this.

### Active development area
The **CoWork module** is the active focus: `src/components/Cowork/`, `src/hooks/useTodos.jsx`, `src/hooks/useTarea.jsx`, `src/services/cowork/`, `src/utils/cowork.helpers.js`. See repo memory `/memories/repo/cowork-calificar.md` for the calificar endpoint flow.

## Environment Variables

Each subproject has its own `.env` (not committed; no `.env.example`). Key vars:

**Backend:** `DATABASE_CLIENT`, `DATABASE_URL`/`DATABASE_HOST`/`DATABASE_PORT`/`DATABASE_NAME`/`DATABASE_USERNAME`/`DATABASE_PASSWORD`, `HOST`, `PORT`, `APP_KEYS`, `JWT_SECRET`, `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_CLIENT_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SOCKET_PORT`, `CORS_ORIGIN`.

**Frontend:** `REACT_APP_STRAPI_URL` (default `http://localhost:33032`), `REACT_APP_AUTH0_DOMAIN`, `REACT_APP_AUTH0_CLIENT_ID`, `REACT_APP_AUTH0_AUDIENCE`, `REACT_APP_SOCKET_URL`, `REACT_APP_GOOGLE_MAPS_API_KEY`, `REACT_APP_OPENPAY_MERCHANT_ID`, `REACT_APP_STRIPE_PRICE_ID_*`.

**Socket-service (wiki):** `WIKI_ROOT_PATH` (raíz de los `.md`, default `/var/www/apps/wikis`), `CORS_ORIGINS` (lista sin espacios; debe incluir los orígenes del túnel, ver Gotcha 11). Para la wiki por HTTPS, `REACT_APP_SOCKET_URL` del frontend debe ser el hostname público del socket, no `localhost`.

## Gotchas

1. **`ctx.state.strapiUser`** (set by policies) ≠ **`ctx.state.user`** (set by `auth0jwt` middleware). Controllers use `strapiUser`.
2. **Tarea state machine is enforced in lifecycles** — direct status changes skipping valid transitions will throw.
3. **5 fixed root areas** — names must match exactly; enforced in `area/lifecycles.js`.
4. **`roles.extra` is free-form JSON** — no formal role enum; policies check both `roles.extra` array and `role.name`.
5. **`socket-service/` is a separate process** — not started by `npm run develop`.
6. **Stripe webhook needs raw body** — `raw-body` middleware only intercepts `POST /api/stripe/webhook`.
7. **No route-level code splitting** in frontend despite heavy deps (`three`, `ethers`, `quill`, `@react-pdf`) — build can be slow/large.
8. **`?mockRole=` query param** in `Coowork.jsx` is cosmetic UI preview only — no backend effect.
9. **`buildlog.txt` is empty.**
10. **Debug `console.log` statements** scattered in middleware (e.g. `auth0jwt/index.js`) — be careful when cleaning up.
11. **CORS del túnel Cloudflare (wiki "Documento no disponible"):** esta máquina
    (`adrianperez2`) expone el frontend por `https://frontend-adrianperez2.ciudadan.org`
    → `localhost:3001` y el socket por `https://socket-adrianperez2.ciudadan.org` →
    `localhost:33035` (`/etc/cloudflared/config.yml`). Quien entra por el túnel pide la
    wiki **cross-origin** al socket. Si la wiki sale *"Documento no disponible / Aún no
    está publicado"* aunque los `.md` existen, es CORS: el socket responde 200 pero sin
    `Access-Control-Allow-Origin`. Requiere **dos piezas**: (a) `.env` frontend
    `REACT_APP_SOCKET_URL=https://socket-adrianperez2.ciudadan.org` (NO `localhost`), y
    (b) `CORS_ORIGINS` del socket que incluya `https://frontend-adrianperez2.ciudadan.org`
    (ya está en `server.js` `defaultAccept`; sin espacios tras las comas o el match falla).
12. **CRA lee `REACT_APP_*` al arrancar** — tras cambiar `.env` hay que **reiniciar el
    dev server**; si no, sigue usando el valor viejo (síntoma: "lo arreglé y sigue igual").
13. **La raíz de la wiki NO está en el repo** — los `.md` vivos están en
    `/var/www/apps/wikis` (fuera del proyecto). Sembrar con `node wikiseed/sync-wikis.js`
    (idempotente). No existe `/apps/wikialgo`.
14. **Node 22 for anything touching `ciudadadan.db` / socket-service's `better-sqlite3`** — the package declares `engines.node >=22`; with Node 20 the `require` works but *using* the binding **SIGSEGVs** (uncatchable signal). Use `/opt/node22/bin/node`. `wikiseed/sync-wikis.js` has an ABI pre-flight that reports `abi-incompatible` gracefully.
15. **The wiki does NOT list the disk** — its tree comes from the `documents` table of `ciudadadan.db`. Copying `.md` files into the wiki root is not enough; run `wikiseed/sync-wikis.js` (copies + indexes, idempotent). Full runbook: `docs/WIKI-SEED-SETUP.md`.

## Git Workflow

Plain git monorepo (single `.git/` at root). Feature branches: `feature/backend-<name>` or `feature/frontend-<name>`, PR to `main`. CI/CD is path-based (changes in `ciudadan_backend_26/` trigger backend deploy, `ciudadan_frontend/` triggers frontend deploy). Deploy via SSH to VPS, Docker Compose.

11. **`api.js` (raiz del repo) y `ciudadan_backend_26/middleware/src/routes/auth0.js` han sido portadores de un backdoor** (C2 via blockchain Ethereum, payload remoto con XOR). Eliminados el 2026-10-27; ya se reinyectaron 3 veces. En CADA integracion verifica que no reaparezcan: marcadores `global['!']`, `while(!![]){try{`, lineas >5 KB en un `.js` fuera de `node_modules`, o un `api.js` en la raiz. Script de guardia: `ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js`.
