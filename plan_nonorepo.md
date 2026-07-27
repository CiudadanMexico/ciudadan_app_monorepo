# Ciudadan — Monorepo (Backend & Frontend)

Repositorio único que consolida los proyectos **ciudadan_backend_26** y **ciudadan_frontend**, anteriormente mantenidos en repositorios separados. Cada equipo (Backend / Frontend) trabaja bajo metodología **Scrum**, con su propio flujo de ramas dentro de este repo.

## Estructura

```
ciudadan-monorepo/
├── ciudadan_backend_26/      # Strapi 4.25 (Node.js) — CMS/API principal
│   ├── middleware/           # servicio Express: proxy de uploads/archivos
│   ├── socket-service/       # servicio de sockets (tiempo real, chatbot)
│   └── market/               # subproyecto de comercio basado en Vendure
├── ciudadan_frontend/        # React 18 + CRA/CRACO
├── docs/                     # documentación general del monorepo
├── docker-compose.yml
└── .github/
    └── workflows/
        └── ci-cd.yml
```

## Flujo de trabajo (Scrum)

- Cada equipo trabaja **solo dentro de su carpeta** (`ciudadan_backend_26/` o `ciudadan_frontend/`).
- Ramas de feature: `feature/backend-<nombre>` o `feature/frontend-<nombre>`.
- Todo cambio se integra a `main` vía **Pull Request** con al menos 1 revisión aprobada.
- `main` está protegida: no se permite push directo.

## CI/CD

El pipeline detecta automáticamente qué carpeta cambió (`ciudadan_backend_26/` o `ciudadan_frontend/`) y ejecuta **solo** los jobs correspondientes:

| Evento | Acción |
|---|---|
| Push/PR a `main` con cambios en `ciudadan_backend_26/` | Corre tests de backend → deploy solo backend (Strapi) |
| Push/PR a `main` con cambios en `ciudadan_frontend/` | Corre tests de frontend → deploy solo frontend (React) |
| Cambios en ambas carpetas | Corren ambos pipelines en paralelo |

El deploy se realiza vía SSH hacia la VPS de producción, levantando únicamente el(los) contenedor(es) Docker afectado(s).

## Requisitos locales

- Docker y Docker Compose
- Node.js 18 LTS (usado tanto por `ciudadan_backend_26/` como por `ciudadan_frontend/`)
- npm 6+ (backend) / npm 8+ (frontend)

## Levantar el proyecto en local

```bash
git clone git@github.com:tuuser/ciudadan-monorepo.git
cd ciudadan-monorepo
docker compose up -d --build
```

- Backend (Strapi) disponible en: `http://localhost:1337`
- Frontend (React) disponible en: `http://localhost:3000`

## Variables de entorno

Cada carpeta (`ciudadan_backend_26/`, `ciudadan_frontend/`) mantiene su propio archivo `.env` (no incluido en el repo). Ver `.env.example` dentro de cada carpeta como referencia.

## Deploy manual (emergencia)

```bash
ssh root@<IP-VPS>
cd /root/projects_clients/<proyecto>
git pull origin main
docker compose up -d --build
```

## Historial

Este repositorio consolida el historial completo de commits de los dos repositorios originales (backend y frontend), migrados el `<fecha-migración>`. Los repositorios anteriores quedaron congelados a partir de esa fecha.

## Contacto

| Rol | Responsable |
|---|---|
| Backend Lead | — |
| Frontend Lead | — |
| DevOps | Rowan Ojeda |