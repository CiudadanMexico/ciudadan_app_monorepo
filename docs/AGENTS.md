# AGENTS.md — Ciudadan Platform

> Guía para **agentes de IA** (y desarrolladores) que trabajan sobre el monorepo
> **Ciudadan**. Resumen ejecutivo actualizado; para profundizar ver la documentación completa
> en esta misma carpeta (`01-Arquitectura.md` … `07-Variables-de-Entorno.md`).

## Qué es

Monorepo **git plano** (un solo `.git/`, sin npm workspaces) para **Ciudadan**, plataforma
cívica/comunitaria en español (México). Dos subproyectos, cada uno con su propio `package.json`
y `.env`:

- `ciudadan_backend_26/` — **Strapi 4.25.9** headless CMS + REST/GraphQL API (Node `>=18 <=20`), más:
  - `socket-service/` (Express + Socket.IO + chatbot + wiki, proceso separado),
  - `market/` (Vendure v3, comercio headless),
  - `middleware/` (proxy Express 5 de media/upload + rutas de conductores).
- `ciudadan_frontend/` — **React 18 + CRA/CRACO + MUI v5/v6 + Capacitor** (Android/iOS).

## Comandos

### Backend (`ciudadan_backend_26/`)
```bash
npm install --legacy-peer-deps   # instalar
npm run develop   # dev server (autoReload), env PORT=33432
npm run build     # build admin panel
npm start         # producción (sin autoReload)

# servicios auxiliares (procesos separados, no los arranca `npm run develop`)
cd socket-service && npm install && npm run build && npm start   # :33035
cd middleware     && npm install && npm run start                 # :33010
cd market         && npm install && npm run dev                   # :4000 / :5001
```
No hay script de tests en el backend. Scripts de seed/prob en la raíz (`node seed-*.js`, `node fix-perms.js`, etc.).

### Frontend (`ciudadan_frontend/`)
```bash
npm install --legacy-peer-deps
npm start         # craco start → :3001
npm run build     # craco build → /build
npm test          # craco test (Jest, mínimos)
npx cap sync android && npx cap open android   # móvil
```

## Arquitectura / Docs de referencia

| Cosa | Fuente |
|---|---|
| Arquitectura general | `01-Arquitectura.md` |
| **Todas las tablas Strapi** (80 colecciones + 2 single + 4 componentes) | `02-BaseDeDatos-Strapi.md` |
| Frontend (rutas, páginas, componentes, hooks, services, utils) | `03-Frontend.md` |
| Servicios auxiliares (socket, market, middleware, scripts, CI/CD, Docker) | `04-Servicios-Auxiliares.md` |
| Paso a paso de instalación/ejecución | `05-Instalacion-y-Ejecucion.md` |
| Ramas y estado git | `06-Ramas-y-Git.md` |
| Variables de entorno | `07-Variables-de-Entorno.md` |
| Dump de esquema Strapi (regenerable) | `ciudadan_backend_26/strapi-schema-export.md` (vía `node export-strapi-schema.js`) |

## Conceptos de dominio (Spanish-first)

| Concepto | Significado |
|---|---|
| **laborys** | Moneda interna. Se paga automáticamente al calificar una `tarea` (`carteras.laborysSaldo`) |
| **todo** | Definición "maestro"/publicada de tarea (enum de 10 estados) |
| **tarea** | Entregable/resolución de un usuario contra un `todo` (8 estados). **No confundir con `todo`** |
| **área** | Categoría superior. **5 raíces fijas**: Administrativo, Técnico, Comercial-difusión, Software, Creación multimedia (enforce en `area/lifecycles.js`) |
| **skill** | Habilidad que habilita tareas especializadas |
| **cartera** | Billetera de laborys del usuario |
| **calificación** | Calificar `tarea` dispara pago automático de laborys (lifecycle de backend) |
| **verificación** | Validación documental del área/subárea del usuario (`up_users.area_details` JSON) |

> ⚠️ `membresiatipo: 'socio'` (club de cannabis) **≠** `roles.extra: 'socio'` (rol de permiso).

## Autenticación y autorización

- **Auth0** es el identity provider. El JWT nativo de Strapi se evita (rutas con `auth:false`).
- Frontend: `@auth0/auth0-react`, audience `https://api.ciudadan.org`, manda
  `Authorization: Bearer <Auth0 token>`.
- Backend: las **policies** del backend validan contra `https://{AUTH0_DOMAIN}/userinfo`, buscan
  usuario por email en `plugin::users-permissions.user`, leen `user.roles.extra` (JSON array) y
  setean **`ctx.state.strapiUser`** (no `ctx.state.user`).
- **Roles** (informales, en `up_users.roles.extra`): `admin`, `socio`, `verificador`, `editor`, `root`.

Policies globales (`src/policies/`): `is-authenticated-auth0`, `is-admin-or-socio`,
`is-verificador`, `is-admin-or-socio-or-verificador`, `can-asignar-tarea`, `can-calificar-tarea`,
`allow-public-relations`, `try-auth0-user`, `auth`.

## Convenciones de backend

- **Endpoints custom**: archivos numerados en `routes/` (`01-`, `02-`…) cargados alfabéticamente,
  con `auth:false` + policies globales:
  ```js
  // routes/03-tarea-calificar.js
  module.exports = {
    routes: [{
      method: 'POST', path: '/tareas/calificar', handler: 'calificar.calificar',
      config: { auth: false, policies: ['global::can-calificar-tarea'] },
    }],
  };
  ```
- Controllers usan `ctx.state.strapiUser`; prefieren `strapi.entityService` (con relaciones) y
  `strapi.db.query` (queries directas).
- Middleware `raw-body` solo en `POST /api/stripe/webhook` (requiere raw body para firmar).
- DB: `config/database.js` soporta `sqlite` (default), `mysql`, `mysql2`, `postgres` vía `DATABASE_CLIENT`.
- `src/extensions/users-permissions/strapi-server.js` **overridea `/users`** para Auth0 y agrega
  endpoints de áreas/subáreas/verificación.

**Máquina de estados `tarea`** (lifecycle): `en_proceso→completada|cancelada`,
`completada→corregir|calificada|cancelada`, `corregir→corregida|cancelada`,
`corregida→calificada|corregir|cancelada`, `calificada→pagada`, `pagada`/`cancelada` terminal.

## Convenciones de frontend

- **Todo el router en un solo archivo**: `src/Routes/index.jsx` (~130 rutas, sin lazy loading).
- Patrones: componentes funcionales + hooks; MUI v5/v6 + Emotion + `sx` para código nuevo;
  legacy v4/Bootstrap 4 no extender.
- HTTP: prefiere `src/utils/request.utils.js` → `fetchJson(...)` con `credentials:'include'`.
  Envolver servicios en `src/services/<feature>/`.
- Auth: Auth0 token (primario) + `strapi_jwt` en localStorage de `AuthContext`.
- Estado: Contexts (no Redux/Zustand). `@` alias → `src/` (craco).
- **Spanish-first**: nombres y strings en español.

## Gotchas

1. `ctx.state.strapiUser` (policies) ≠ `ctx.state.user` (middleware `auth0jwt`). Usar `strapiUser`.
2. Máquina de estados de `tarea` enforce en lifecycle — saltar transición arroja error.
3. **5 áreas raíz fijas** — nombres exactos; enforce en `area/lifecycles.js`.
4. `roles.extra` es JSON libre; las policies leen array y `role.name`.
5. `socket-service/`, `middleware/`, `market/` son procesos **separados** de Strapi.
6. Stripe webhook necesita `raw-body`.
7. Sin code-splitting en frontend pese a deps pesadas (`three`, `ethers`, `quill`, `@react-pdf`) — build lento.
8. `?mockRole=` en `Coowork.jsx` es solo preview UI — sin efecto backend.
9. **Dos sets de taxi** (`components/Taxis/` vs `components/Taxiz/`) y dos carritos (`CartContext`/`cartref`).
10. `.env` versionados contienen secretos reales — no reutilizarlos/commitearlos en producción.

## Git workflow

- Branch de feature por carpeta; PR a `main` (protegida). CI/CD por paths:
  `.github/workflows/deploy.yml` (backend) con runner self-hosted (reinicia
  `strapi-ciudadan-dev`, `strapi-ciudadan-prod`, `strapi-marihuanas`).
- Ramas destacadas: `feature/abraham-gana`, `feature/abraham-ad-rewards`,
  `feature/abraham-cartera`, `feature/abraham-home`, `feature/Jesus-Roberto-Wiki-Viewer`,
  `feature/coworkv2`, `feature/taxis-trips`, `verify_changes` (ver `06-Ramas-y-Git.md`).

---

*Documento generado. Mantener sincronizado con los `0X-*.md` de esta carpeta.*