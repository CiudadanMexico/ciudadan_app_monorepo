# 01 — Arquitectura

## 1. Visión general

Ciudadan es un **monorepo git plano** (un solo `.git/` en la raíz, sin workspace tooling
tipo npm workspaces/lerna) que consolida dos subproyectos que antes vivían en repositorios
separados:

1. **`ciudadan_backend_26/`** — Strapi 4.25.9 (CMS + REST/GraphQL API) más varios submódulos
   de soporte (socket-service, market Vendure, middleware proxy, scripts).
2. **`ciudadan_frontend/`** — React 18 (CRA + CRACO) + MUI + Capacitor.

Cada subproyecto tiene su propio `package.json` y `.env`. Se rigen por Scrum (ramas de
feature por carpeta) y despliegan por CI/CD con cambios en `main`.

```
                        ┌─────────────────────────────┐
                        │     FRONTEND (React 18)      │
                        │  CRA + CRACO ... :3001       │
                        │  Auth0 / Roles / Contexts    │
                        └──────┬──────────────┬────────┘
                               │ REST+JWT      │ socket.io-client
                               ▼               ▼
   ┌──────────────────────────────────┐   ┌──────────────────────────┐
   │   BACKEND STRAPI 4.25 (:33432)   │   │   SOCKET SERVICE (:33035)│
   │   REST/GraphQL + Media + Admin   │   │  Express + Socket.IO     │
   │   políticas Auth0 / cobros       │   │  chatbot + Wiki + tarifas│
   └───────┬──────────┬───────────────┘   └───────────┬──────────────┘
           │          │                               │
       DB (SQLite/   Media Library               SQLite wiki (ciudadadan.db)
       MySQL/Postgres)                           + LLM/LM Studio
           │
   ┌───────▼───────────────────────────┐
   │  MIDDLEWARE proxy (:33010)        │  → reenvía /uploads, /api/upload, /api/* a Strapi
   │  + rutas de conductores            │
   └───────────────────────────────────┘
   ┌───────────────────────────────────┐
   │  MARKET / Vendure (:4000, :5001)  │  → e-commerce headless (Stripe)
   └───────────────────────────────────┘
```

## 2. Componentes del monorepo

### 2.1 Backend Strapi (`ciudadan_backend_26/`)
Actúa como **fuente de verdad de datos**. Expone APIs por contenido-tipo y endpoints custom
de negocio (CoWork, anuncios, agenda, conductores, carteras, etc.).

Estructura relevante de `src/`:
- `src/api/<contenido>/` — cada contenido con `content-types/`, `controllers/`, `routes/`, `services/`.
  Los `controllers/services` personalizados pueden vivir en `content-type` con UID completo.
- `src/extensions/users-permissions/` — extensión del plugin de usuarios: override de rutas
  `/users` para Auth0 + endpoints de áreas/subáreas/verificación.
- `src/policies/` — **policies globales** de autorización (Auth0 + roles).
- `src/middlewares/` — `raw-body` (Stripe webhook) y `auth0jwt`.
- `src/utils/` — helpers (auth0-verify, ad-usuario, cowork/visibility).
- `src/index.js` — bootstrap asegura `public/uploads`.
- `config/` — server, database, middlewares, plugins, admin, api.

### 2.2 Socket Service (`socket-service/`)
Proceso **separado** (no lo arranca `npm run develop`). Express + Socket.IO que brinda:
- eventos en tiempo real de taxis/viajes,
- chatbot de WhatsApp (Meta Cloud API + @bot-whatsapp),
- cálculo de tarifas (Google Directions + fallback Haversine),
- una **wiki** con base SQLite local (`ciudadadan.db`), watcher de `.md` y LLM (LM Studio).

### 2.3 Market / Vendure (`market/`)
Subproyecto de **comercio headless** independiente (Vendure v3). API en puerto 4000 y Admin
UI en 5001. Está diseñado para e-commerce con pasarela Stripe. Se ejecuta por separado (`npm run dev`).

### 2.4 Middleware (`middleware/`)
Proxy ligero en **Express 5** (ESM) que corre en el puerto **33010**. Reenvía a Strapi:
- `GET /uploads/*` (media en streaming),
- `POST /api/upload` y `GET/POST /api/*` (con API token),
- además define endpoints privados de **conductores** (`/api/conductores/preregistro`, `/procesar/:agendaId`).

### 2.5 Frontend (`ciudadan_frontend/`)
Aplicación **React 18 (CRA + CRACO)** que consume la API de Strapi (REST) por HTTP y el
socket-service para tiempo real. Empaquetable para Android/iOS con Capacitor.

## 3. Flujo de autenticación (Auth0)

- **Identity provider:** Auth0 (`ciudadan.us.auth0.com`), audience `https://api.ciudadan.org`.
- El frontend usa `@auth0/auth0-react` y manda `Authorization: Bearer <Auth0 token>`.
- Las **policies del backend** validan llamando a `https://{AUTH0_DOMAIN}/userinfo`, buscan el
  usuario por email en `plugin::users-permissions.user`, leen `user.roles.extra` (JSON array)
  y setean **`ctx.state.strapiUser`**.
- Los JWT nativos de Strapi casi no se usan; las rutas custom llevan `auth: false` + policies.

**Roles** (informales, en `up_users.roles.extra`): `admin`, `socio`, `verificador`, `editor`, `root`.

## 4. Middlewares / Policies (resumen)

| Policy global | Permite |
|---|---|
| `is-authenticated-auth0` | Cualquier usuario autenticado (resolver, completar) |
| `is-admin-or-socio` | admin/socio (calificar, delete, gestionar todos/áreas) |
| `is-verificador` | admin/verificador (corregir flow) |
| `is-admin-or-socio-or-verificador` | admin/socio/verificador |
| `can-asignar-tarea` | Asignación según matriz agencia × tipo de tarea |
| `can-calificar-tarea` | Calificación según agencia/tipo/asignación |
| `allow-public-relations` | Rellenar `ctx.state.auth` en públicas (no eliminar relaciones) |
| `try-auth0-user` | Auth opcional (identifica pero no bloquea) |

Middleware: `raw-body` (Stripe webhook), `auth0jwt` (valida JWT Auth0 → `ctx.state.user`).

## 5. Flujo de datos (ejemplos)

### CoWork (tareas + laborys)
`todo` (maestro) → `tarea` (entrega del usuario) → `calificación` → pago automático de
`laborys` en `cartera` (lifecycle `tarea/lifecycles.js`). El Estado de `tarea` es una
máquina de estados validada por lifecycle (`en_proceso→completada→corregir→corregida→calificada→pagada`).

### Anuncios remunerados ("Gana")
`ad` (publicitario) → `ad-session` (sesión) → `ad-session-item` (por anuncio, con `cobertura`)
→ `ad-view` (regreso). El backend valida la reproducción (heartbeat) y emite `recompensa`
(laborys) al completar.

### Taxis / movilidad
Conductores y pasajeros se conectan por **Socket.IO**; el socket-service maneja ofertas de
viaje, ubicación, `trip-update`, cálculo de tarifa y persistencia en Strapi (`viaje`, `triprequest`, `driver`, `driver-location`, `cars-validation`…).

### Marketplace / Food
Tienda o Restaurante vende producto; carrito (`carrito`/`food-cart`) → pedido (`pedido`/`food-order`)
→ pago `pago` (Stripe/OpenPay) → envío (`direccion`, `shipping`). El middleware proxy y el socket
service secundan pagos/envíos.

## 6. Puertos y servicios (tabla resumen)

| Servicio | Puerto | Notas |
|---|---|---|
| Strapi backend (env dev) | 33432 | `.env` `PORT=33432` |
| Strapi backend (default/Docker) | 1337 | config/docker |
| Frontend | 3001 | craco start, `PORT` en .env |
| Socket service | 33035 | `SOCKET_PORT` |
| LLM server-lmai | 5000 | chat IA |
| LM Studio (origen) | 1234 | `lmai.js` |
| Market API Vendure | 4000 | admin-api + shop-api |
| Market Admin UI | 5001 | admin |
| Middleware proxy | 33010 | uploads/media |
| Postgres (dev local) | 5432/5433 | instancia local |
| MySQL (`DATABASE_CLIENT=mysql`) | 3306 | configurable |

## 7. Despliegue

- **CI/CD:** `.github/workflows/deploy.yml` (backend) hace `push` a `main` → runner
  self-hosted actualiza y reinicia 3 servicios systemd (`strapi-ciudadan-dev`,
  `strapi-ciudadan-prod`, `strapi-marihuanas`).
- **Docker:** `Dockerfile` (node:18-alpine) + `docker-compose.yml` (SQLite /tmp/data.db, puerto 1337).
- **Fly.io:** `fly.toml` (app `ciudadan-backend-morning-fog-6224`, puerto 1337, HTTP 80/443).

---

*Sigue: [02 — Base de Datos Strapi](02-BaseDeDatos-Strapi.md).*