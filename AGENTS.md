# AGENTS.md — Ciudadan Platform

Monorepo (plain git, no workspace tooling) for **Ciudadan**, a Spanish-language civic/community platform. Two subprojects, each with its own `package.json` and `.env`:

- `ciudadan_backend_26/` — Strapi 4.25.9 headless CMS + REST/GraphQL API (Node 18)
- `ciudadan_frontend/` — React 18 + CRA/CRACO + MUI v6 + Capacitor (Android/iOS)

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

## Architecture & Key Docs

- **Canonical CoWork spec:** `docs/documento-off.md` (source of truth)
- **Implementation status:** `docs/final-cowork.md`, `docs/RESUMEN-AVANCES-COWORK.md`
- **Database schema:** `docs/DATABASE-SCHEMA.md` (60 tables, generated from schemas)
- **Auth/permissions detail:** `docs/TAREAS-CRUD-PERMISOS.md`
- **Agenda migration:** `docs/AGENDA-VALIDATION-SYNC.md`
- **Monorepo/CI plan:** `plan_nonorepo.md`
- **Backend schema dump:** `ciudadan_backend_26/strapi-schema-export.md` (regenerate via `node export-strapi-schema.js`)

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
`socket-service/` is a **separate Express + Socket.IO process** (not started by Strapi). Has its own `package.json`. Handles realtime trip events, WhatsApp chatbot, Notion wiki proxy.

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

## Git Workflow

Plain git monorepo (single `.git/` at root). Feature branches: `feature/backend-<name>` or `feature/frontend-<name>`, PR to `main`. CI/CD is path-based (changes in `ciudadan_backend_26/` trigger backend deploy, `ciudadan_frontend/` triggers frontend deploy). Deploy via SSH to VPS, Docker Compose.
