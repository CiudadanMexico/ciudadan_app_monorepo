# 📘 Documentación completa — Ciudadan App Monorepo

> Documentación auto-generada a partir de la revisión exhaustiva del repositorio
> **`https://github.com/CiudadanMexico/ciudadan_app_monorepo`**
> (revisada en la copia local `c:\yii\ciudadan_app_monorepo`, última revisión 2026-09).

Este documento es la **guía maestra** del monorepo Ciudadan. Reúne, en un solo lugar,
toda la información técnica necesaria para entender, instalar y operar la plataforma:
arquitectura, base de datos Strapi, frontend, servicios auxiliares, ramas, variables de
entorno y despliegue.

---

## 📑 Índice de documentos

| Documento | Contenido |
|---|---|
| **[`01-Arquitectura.md`](01-Arquitectura.md)** | Estructura del monorepo, componentes, puertos, flujo de datos y Arquitectura general |
| **[`02-BaseDeDatos-Strapi.md`](02-BaseDeDatos-Strapi.md)** | **TODAS** las tablas/colecciones de Strapi (80 colecciones + 2 single types), campos, relaciones y componentes |
| **[`03-Frontend.md`](03-Frontend.md)** | Todas las páginas, componentes, contexts, hooks, servicios, utils y rutas del frontend |
| **[`04-Servicios-Auxiliares.md`](04-Servicios-Auxiliares.md)** | Socket Service, Market (Vendure), Middleware proxy, scripts, CI/CD, Docker/Fly |
| **[`05-Instalacion-y-Ejecucion.md`](05-Instalacion-y-Ejecucion.md)** | **Paso a paso** para instalar y correr todos los servicios (backend, frontend, socket, market, middleware) |
| **[`06-Ramas-y-Git.md`](06-Ramas-y-Git.md)** | Todas las ramas del repositorio, su propósito, commits recientes y flujo de trabajo |
| **[`07-Variables-de-Entorno.md`](07-Variables-de-Entorno.md)** | Todas las variables de entorno por servicio (backend, frontend, socket) |

---

## 🧱 Resumen ejecutivo

**Ciudadan** es una plataforma cívica/comunitaria en español (México) que combina:

- **Red social y comunidad** (publicaciones, comentarios, clubs, bitácoras, plantas).
- **Marketplace / e-commerce** (tiendas, productos, carrito, pagos Stripe, envíos).
- **Food delivery** (restaurantes, productos de comida, ofertas, pedidos, Delivery Uber Direct).
- **Taxi / movilidad** (conductores, viajes en tiempo real, cálculo de tarifas, PRD de conductores).
- **CoWork / economía colaborativa** (tareas `todo`/`tarea`, áreas, habilidades, moneda interna **laborys**).
- **Anuncios remunerados** ("Gana" — ver anuncios y ganar laborys).
- **Membresías** de club de cannabis (Marihuanas Club) con OpenPay/Stripe.
- **Wiki** interna con visor de archivos `.md` y chatbot de WhatsApp + IA.
- **Carteras / wallets** (laborys, Ciudadan tokens, World Coin, billeteras con ethers.js).

## 🧩 Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Backend API / CMS** | Strapi v4 (`@strapi/strapi` **4.25.9**), Node 18, REST + GraphQL |
| **Base de datos** | SQLite (dev), MySQL, PostgreSQL (configurable vía `DATABASE_CLIENT`); el `.env` de dev usa SQLite en `.tmp/data.db` |
| **Autenticación** | **Auth0** (identity provider principal). JWT nativo de Strapi queda en segundo plano. Roles en `up_users.roles.extra` (JSON array) |
| **Frontend** | React 18 + CRA/CRACO + MUI v5/v6 + Emotion + Capacitor (Android/iOS) |
| **Tiempo real** | Socket.IO (sockets-service separado) |
| **Comercio headless** | Vendure v3 (`market/`) |
| **Pagos** | Stripe + OpenPay |
| **Mensajería** | WhatsApp Cloud API / @bot-whatsapp |
| **Despliegue** | Docker / Docker Compose / Fly.io (fly.toml) / CI GitHub Actions (push a `main`) |

## 🗂 Estructura raíz

```
ciudadan_app_monorepo/
├── ciudadan_backend_26/      # Backend Strapi 4.25.9 + servicios auxiliares
│   ├── src/                  # APIs Strapi (api/), extensions, middlewares, policies, utils
│   ├── config/               # server, database, middlewares, plugins, admin, api
│   ├── socket-service/       # Servidor Express + Socket.IO + chatbot + wiki (separado)
│   ├── market/               # Subproyecto de comercio Vendure (headless)
│   ├── middleware/           # Proxy de uploads/media + endpoints de conductores
│   ├── seed/ y scripts/      # Scripts de seed y pruebas
│   ├── .env                  # Variables de entorno del backend
│   └── strapi-schema-export.md  # Dump de esquema (regenerable)
├── ciudadan_frontend/        # React 18 + CRA/CRACO + Capacitor
│   ├── src/                  # Pages, components, Contexts, hooks, services, utils, Routes
│   ├── android/, ios/        # Proyectos nativos Capacitor
│   ├── .env                  # Variables de entorno del frontend
│   └── capacitor.config.ts
├── docs/                     # Documentación general (documento de referencia)
├── plan_nonorepo.md          # Plan del monorepo
├── AGENTS.md                 # Convenciones para agentes de IA
├── README.md
└── package.json              # (tsx, utilidades raíz)
```

---

## ⚡ Puertos principales

| Servicio | Puerto | Archivo |
|---|---|---|
| Strapi backend (despliegue local `PORT`) | **33432** | `ciudadan_backend_26/.env` |
| Strapi backend (default / Docker) | **1337** | `config/server.js`, `docker-compose.yml` |
| Frontend (CRA/craco) | **3001** (`PORT` en .env) | `ciudadan_frontend/.env` (craco `start`) |
| Socket service (sockets + http) | **33035** (`SOCKET_PORT`) | `socket-service/server.js` |
| LLM (LM Studio) — IA | **1234** (origen) / `server-lmai.js` **5000** | `socket-service/lmai.js`, `server-lmai.js` |
| Market Vendure API | **4000** (admin/shop API) | `market/src/vendure.config.ts` |
| Market Vendure Admin UI | **5001** | `market/src/vendure.config.ts` |
| Middleware proxy (uploads) | **33010** | `middleware/src/index.js` |
| Postgres (en máquina local dev) | **5432 / 5433** | (instancia local) |
| MongoDB (local dev) | **27017** | (instancia local) |

---

## 🔍 Cómo leer este monorepo (convenciones clave)

- **`todo`** = tarea "maestro"/publicado (definición de trabajo). **`tarea`** = resolución/entrega de un usuario contra un `todo`. No confundirlas.
- **`área`** = categoría superior. **5 raíces fijas**: Administrativo, Técnico, Comercial-difusión, Software, Creación multimedia.
- **`laborys`** = moneda interna; se paga automáticamente al calificar una tarea (`carteras.laborysSaldo`).
- **`membresiatipo: 'socio'`** (club cannabis) **≠** `roles.extra: 'socio'` (permiso). Conceptos distintos.
- Los **endpoints custom** de Strapi usan archivos numerados (`01-`, `02-`…) en `routes/` con `auth: false` + policies globales.
- `ctx.state.strapiUser` (puesto por las policies) ≠ `ctx.state.user` (puesto por middleware `auth0jwt`).

---

*Documentación generada automáticamente.*