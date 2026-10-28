# ROTACIÓN DE SECRETOS — Inventario post-incidente (backdoor `api.js` / `middleware auth0.js`)

- **Fecha:** 2026-10-28 · **Rama:** `feature/inventario-secretos-1028`
- **Evento:** un payload malicioso (`api.js` en la raíz del monorepo y
  `ciudadan_backend_26/middleware/src/routes/auth0.js`) estuvo presente en `main`
  y se reinyectó varias veces. Ya fue purgado de `main` (commit `4d1aec7`, con la
  guarda de CI `ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js`).
- **Alcance de su etapa 2:** podía leer **archivos** y **variables de entorno** del
  contenedor donde se ejecutaba (el contenedor del agente).
- **Naturaleza de este documento:** **inventario de solo lectura**. No se giró
  ningún secreto, no se modificó ningún `.env`, llave, servicio ni unidad
  systemd, no se reinició `dsh-dany.service` y no se hizo limpieza de discos.
- **Regla aplicada en todo el levantamiento:** **no se imprime ningún valor de
  secreto, ni siquiera parcial**. Solo nombres de variable, rutas, permisos y
  metadatos de presencia (definido / vacío).

> ⚠️ **Este documento no contiene valores.** Cuando el inventario de un secreto
> exceda lo aceptable en un documento versionado, se registra solo su **nombre**,
> su **ubicación** y su **criterio de rotación**.

---

## 1. Resumen ejecutivo

1. **Todo lo que era legible desde el contenedor del agente se considera
   potencialmente expuesto** y entra en rotación inmediata (P0): los `.env` del
   backend y del frontend, los `.env` del host (`services.env`, `cline.env`), la
   llave SSH de push a GitHub y la API key de NVIDIA persistida en la
   configuración de Cline.
2. **Los secretos que viven fuera de ese contenedor** (GitHub Actions, hosts VPS,
   puente de supervisión de Dany, cloudflared del host) **no son alcanzables**
   desde donde corría el payload: no se rotan de inmediato y pasan a
   **rotación programada** o a **NO rotar sin autorización/coordinación**.
3. **Hallazgo de salud pública del bundle:** varias claves del frontend
   (`REACT_APP_*`) se hornean en el JavaScript que se sirve a cualquier
   visitante. Independientemente del incidente, esas claves están **expuestas al
   público** y por tanto deben rotarse y restringirse.
4. **Hallazgo de higiene:** `/etc/agent/env/services.env` está en `0644` y los
   logs/transcripts del agente en `0644`: cualquier proceso del contenedor puede
   leerlos.
5. **Lo que NO se encontró** (y por tanto no hay que rotar): `.env` versionados
   en git, tokens npm, `~/.git-credentials`, tokens de Discord o Telegram, claves
   de cloudflared dentro del contenedor.

### 1.1 Resumen por prioridad

| Prioridad | Significado | Nº de ítems |
|---|---|---|
| **P0 — Inmediata (hoy)** | Legible desde el contenedor del payload o expuesto en artefactos públicos | 21 |
| **P1 — Programada (ventana de mantenimiento)** | Fuera del alcance del contenedor, pero con ventana de rotación conocida | 6 |
| **P2 — Sin rotación / higiene** | No es secreto, no existe, o requiere coordinación externa | 13 |

---

## 2. Inventario

**Leyenda de la columna “¿Alcanzable desde el contenedor del agente?”**
`SÍ` = el proceso del payload (mismo usuario/root, sistema de archivos y
`/proc/<pid>/environ` del contenedor) podía leerlo ·
`NO` = solo existe fuera del contenedor (GitHub, hosts, servicio externo).

### 2.1 Backend Strapi — `ciudadan_backend_26/.env` (permisos `0600`, owner `yizuz`)

Alcance: backend Strapi 4.25.9, `socket-service` y `middleware` (el middleware
resuelve `dotenv` a `../../.env`, es decir **este mismo archivo**).

| Nombre o ruta | Ubicación | ¿Alcanzable desde el contenedor? | Riesgo | Prioridad | Rotar | Procedimiento resumido | Quién lo ejecuta |
|---|---|---|---|---|---|---|---|
| `APP_KEYS` | `ciudadan_backend_26/.env` | SÍ | Alto | **P0** | **SÍ** — alcanzable desde el contenedor donde corría el payload; cifra las cookies de sesión del panel admin | Generar 4 claves nuevas (`openssl rand -base64 32`), actualizar `.env` y reiniciar Strapi; invalida las sesiones admin abiertas | Admin de plataforma (Strapi) |
| `ADMIN_JWT_SECRET` | `ciudadan_backend_26/.env` | SÍ | Alto | **P0** | **SÍ** — alcanzable; con él se pueden firmar tokens de administrador | Rotar el valor, reiniciar Strapi; obliga a re-loguear a admins | Admin de plataforma (Strapi) |
| `JWT_SECRET` | `ciudadan_backend_26/.env` | SÍ | Alto | **P0** | **SÍ** — alcanzable; firma los JWT de `users-permissions` | Rotar el valor, reiniciar Strapi; re-login masivo de usuarios | Admin de plataforma (Strapi) |
| `API_TOKEN_SALT` | `ciudadan_backend_26/.env` | SÍ | Alto | **P0** | **SÍ** — alcanzable; con él se pueden derivar/forjar API tokens de Strapi | Rotar el valor y **re-emitir** el token de API del servicio backend (`STRAPI_API_TOKEN`) y el del frontend (`REACT_APP_STRAPI_TOKEN`) | Admin de plataforma (Strapi) |
| `TRANSFER_TOKEN_SALT` | `ciudadan_backend_26/.env` | SÍ | Medio | **P0** | **SÍ** — alcanzable | Rotar el valor y reiniciar los servicios que lo consumen | Admin de plataforma |
| `STRIPE_SECRET_KEY` | `ciudadan_backend_26/.env` | SÍ | Crítico | **P0** | **SÍ** — alcanzable; da control de la cuenta de pagos (cargos, reembolsos) | Panel Stripe → rotar clave secreta; actualizar `.env`; reiniciar backend | Admin de plataforma + titular de la cuenta Stripe |
| `STRIPE_WEBHOOK_SECRET` | `ciudadan_backend_26/.env` | SÍ | Alto | **P0** | **SÍ** — alcanzable; permite falsificar eventos de webhook | Stripe → re-emitir el secreto del endpoint webhook; actualizar `.env`; reiniciar backend | Admin de plataforma + titular Stripe |
| `OPENPAY_PRIVATE_KEY` | `ciudadan_backend_26/.env` | SÍ | Crítico | **P0** | **SÍ** — alcanzable; clave privada de cobro OpenPay | Panel OpenPay → rotar clave privada del comercio; actualizar `.env`; reiniciar backend | Admin de plataforma + titular OpenPay |
| `STRAPI_API_TOKEN` | `ciudadan_backend_26/.env` | SÍ | Alto | **P0** | **SÍ** — alcanzable; token de servicio usado por `middleware` y `socket-service` | Crear token nuevo en Strapi (mismos permisos), actualizar `.env` y los consumidores, revocar el anterior | Admin de plataforma (Strapi) |
| `STRAPI_SERVICE_PASSWORD` | `ciudadan_backend_26/.env` | SÍ | Alto | **P0** | **SÍ** — alcanzable; credencial del usuario de servicio (`STRAPI_SERVICE_EMAIL`) | Reset de contraseña del usuario de servicio en Strapi y actualización de `.env` | Admin de plataforma (Strapi) |
| `AUT_CLIENT_SECRET` | `ciudadan_backend_26/.env` | SÍ | Alto | **P0** | **SÍ** — alcanzable; secreto de cliente OAuth (grant) de Auth0 | Auth0 → Applications → credenciales del cliente → rotar *client secret*; actualizar `.env` | Titular de la aplicación Auth0 |
| `NOTION_TOKEN`, `NOTION_TOKENM`, `NOTION_TOKENN` | `ciudadan_backend_26/.env` | SÍ | Medio | **P0** | **SÍ** — alcanzables; integraciones de Notion | Notion → Connections → revocar y re-emitir token por integración; actualizar `.env` | Admin de plataforma |
| `GEOCODING_KEY` | `ciudadan_backend_26/.env` | SÍ | Medio | **P0** | **SÍ** — alcanzable; API key de geocodificación | Google Cloud → credenciales → rotar y restringir por API e IP | Admin de plataforma |
| `META_VERIFY_TOKEN`, `VERIFY_TOKEN` | `ciudadan_backend_26/.env` | SÍ | Medio | **P0** | **SÍ** — alcanzables; tokens de verificación de webhooks de WhatsApp/Cloud API | Regenerar en la configuración del webhook de Meta/WhatsApp; actualizar `.env`; reiniciar socket-service | Admin de plataforma + titular WhatsApp Cloud |
| `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_CLIENT_ID` | `ciudadan_backend_26/.env` | SÍ | Bajo | **P2** | **NO** — identificadores públicos; su exposición no permite autenticarse | — | — |
| `NUMBER_ID`, `PUBLIC_WEBHOOK_URL`, `CHATBOT_WEBHOOK_PATH` | `ciudadan_backend_26/.env` | SÍ | Bajo | **P2** | **NO** — identificadores/rutas públicas | — | — |
| `OPENPAY_MERCHANT_ID`, `OPENPAY_PLAN_ID` | `ciudadan_backend_26/.env` | SÍ | Bajo | **P2** | **NO** — identificadores públicos | — | — |
| `STRAPI_SERVICE_EMAIL` | `ciudadan_backend_26/.env` | SÍ | Bajo | **P2** | **NO** — correo, no secreto | — | — |
| `DATABASE_CLIENT`, `DATABASE_FILENAME` | `ciudadan_backend_26/.env` | SÍ | Bajo | **P2** | **NO** — no son credenciales (SQLite local, sin usuario ni contraseña) | — | — |

### 2.2 Frontend — `ciudadan_frontend/.env` (permisos `0600`, owner `yizuz`)

Alcance: bundle CRA/CRACO servido al público. `REACT_APP_*` se hornea en
`build/static/js/main.*.js` → **cualquier visitante puede leerlo**.

| Nombre o ruta | Ubicación | ¿Alcanzable desde el contenedor? | Riesgo | Prioridad | Rotar | Procedimiento resumido | Quién lo ejecuta |
|---|---|---|---|---|---|---|---|
| `REACT_APP_STRAPI_TOKEN` | `ciudadan_frontend/.env` | SÍ | Crítico | **P0** | **SÍ** — alcanzable y además **expuesto en el bundle público** | Crear token de API de **solo lectura** y con permisos mínimos; publicarlo por variable de entorno en el build; revocar el actual | Admin de plataforma (Strapi) |
| `REACT_APP_PLACES_KEY` | `ciudadan_frontend/.env` | SÍ | Alto | **P0** | **SÍ** — alcanzable y además **expuesto en el bundle público** | Rotar la clave en Google Cloud, restringir por dominio HTTP referrer, reinyectar por variable de entorno del build | Admin de plataforma |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | `ciudadan_frontend/.env` | SÍ | Alto | **P0** | **SÍ** — alcanzable y **expuesto en el bundle público** | Igual que `REACT_APP_PLACES_KEY` | Admin de plataforma |
| `REACT_APP_GEOCODING_KEY` | `ciudadan_frontend/.env` | SÍ | Medio | **P0** | **SÍ** — alcanzable y **expuesto en el bundle público** | Rotar y restringir por API/referrer | Admin de plataforma |
| `REACT_APP_OPENPAY_PUBLIC_KEY` | `ciudadan_frontend/.env` | SÍ | Bajo | **P2** | **NO** — clave pública por definición | — | — |
| `REACT_APP_AUTH0_*`, `REACT_APP_WHATSAPP_NUMBER`, URLs (`REACT_APP_STRAPI_URL`, `REACT_APP_SOCKET_URL`, `REACT_APP_MAIN_DOMAIN`) | `ciudadan_frontend/.env` | SÍ | Bajo | **P2** | **NO** — identificadores públicos | — | — |

### 2.3 Host del agente (contenedor) — `/etc/agent/env/`

| Nombre o ruta | Ubicación | ¿Alcanzable desde el contenedor? | Riesgo | Prioridad | Rotar | Procedimiento resumido | Quién lo ejecuta |
|---|---|---|---|---|---|---|---|
| `STRAPI_TOKEN` | `/etc/agent/env/services.env` (`0644`) | SÍ | Alto | **P0** | **SÍ** — alcanzable; el launcher lo exporta al proceso `socket-service` (`/proc/<pid>/environ` lo expone a cualquier proceso del mismo usuario) | Re-emitir token de API de Strapi; actualizar `services.env`; reiniciar el socket-service; **bajar permisos a `0600`** | Admin de plataforma |
| `CLINE_API_KEY` | `/etc/agent/env/cline.env` (`0600`) | SÍ | Crítico | **P0** | **SÍ** — alcanzable; es la **llave de la API NVIDIA usada por la flota de agentes** (proveedor `nvidia`) | Generar llave nueva en NVIDIA NIM; actualizar `cline.env`; re-autenticar Cline (`setup-cline.sh`); **purgar las copias persistidas** (ver 2.4) | Responsable de la flota de agentes |
| `CORS_ORIGINS`, `STRAPI_URL`, `NODE_ENV`, `SOCKET_PORT`, `WIKI_ROOT_PATH` | `/etc/agent/env/services.env` | SÍ | Bajo | **P2** | **NO** — no son secretos | — | — |
| `CLINE_PROVIDER`, `CLINE_MODEL` | `/etc/agent/env/cline.env` | SÍ | Bajo | **P2** | **NO** — no son secretos | — | — |
| `AGENT_HOSTNAME`, `AGENT_USER`, `BACKEND_PORT`, `CIUDADAN_AGENT_ID`, `CONFIG_DIR`, `DEBIAN_FRONTEND`, `EXTRA_PORT`, `FRONTEND_PORT`, `GIT_AGENT_BRANCH`, `GIT_DEFAULT_BRANCH`, `GIT_REMOTE`, `MEM_LIMIT`, `NODE_MAJOR`, `PUBLIC_HOST_BACKEND`, `PUBLIC_HOST_FRONTEND`, `PUBLIC_HOST_SOCKET`, `REPO_DIR`, `SOCKET_PORT`, `SSH_PORT`, `WORKSPACE_DIR` | `/etc/agent/agent.env` + entorno del proceso | SÍ | Bajo | **P2** | **NO** — no son secretos (nombres de host, puertos, rutas) | — | — |

### 2.4 Cline / hub de agentes — configuración persistida

| Nombre o ruta | Ubicación | ¿Alcanzable desde el contenedor? | Riesgo | Prioridad | Rotar | Procedimiento resumido | Quién lo ejecuta |
|---|---|---|---|---|---|---|---|
| `providers.nvidia.settings.apiKey` (misma credencial que `CLINE_API_KEY`) | `/workspace/.cline/data/settings/providers.json` (`0600`) | SÍ | Crítico | **P0** | **SÍ** — alcanzable; la configuración persistida guarda la llave de NVIDIA en claro | Rotar la llave en NVIDIA (origen), re-autenticar, y **reescribir/eliminar** este archivo para que la llave nueva no vuelva a duplicarse en claro | Responsable de la flota de agentes |
| Copia de respaldo con la misma llave | `/workspace/.cline/data/settings/providers.json.bak-20261028` (`0600`) | SÍ | Crítico | **P0** | **SÍ** — alcanzable; **backup** que conserva la llave vieja viva en disco | Eliminar el `.bak` tras la rotación; si la llave no se rota, el backup mantiene la exposición | Responsable de la flota de agentes |
| Copia de configuración en el home del agente | `/workspace/.cline-agente/data/settings/providers.json` | SÍ | Crítico | **P0** | **SÍ** — alcanzable; **segunda copia** de la misma credencial | Eliminar la copia tras la rotación (o sustituir por una que solo referencie el almacén de secretos) | Responsable de la flota de agentes |
| Base de datos de ejecuciones del hub | `/home/yizuz/.cline/data/db/hub-runs-hub-production.db` | SÍ | Medio | **P2** | **NO** — base de datos de historial, no contiene credenciales por sí misma; sí puede contener prompts/salidas con material sensible | Revisar y sanear contenido; aplicar retención | Responsable de la flota de agentes |
| Base de datos de eventos del hub | `/home/yizuz/.cline/data/db/hub-events-hub-production.db` | SÍ | Medio | **P2** | **NO** — ídem | Revisar y sanear contenido; aplicar retención | Responsable de la flota de agentes |

### 2.5 SSH y acceso a repositorios

| Nombre o ruta | Ubicación | ¿Alcanzable desde el contenedor? | Riesgo | Prioridad | Rotar | Procedimiento resumido | Quién lo ejecuta |
|---|---|---|---|---|---|---|---|
| Llave privada SSH **de push a GitHub** (`id_ed25519_github_ciudadan`) | `/home/yizuz/.ssh/id_ed25519_github_ciudadan` (`0600`) | SÍ | Crítico | **P0** | **SÍ** — alcanzable; da acceso de escritura al repositorio y es la llave usada por el pipeline de parches | Generar par nuevo, añadir la clave pública al repositorio, **revocar la deploy key vieja** en GitHub, distribuir la nueva por el canal seguro (`/etc/agent/ssh/`) y verificar `git push --dry-run` | Responsable de la flota de agentes + admin del repositorio |
| Copia de la misma llave | `/etc/agent/ssh/id_ed25519_github_ciudadan` (`0600`) | SÍ | Crítico | **P0** | **SÍ** — alcanzable; **segunda copia** de la misma llave | Sustituir por la nueva y **eliminar la copia vieja**; verificar que solo queda una | Responsable de la flota de agentes |
| `known_hosts` / `config` SSH | `/home/yizuz/.ssh/` | SÍ | Bajo | **P2** | **NO** — no son credenciales | — | — |
| Claves públicas autorizadas | `/home/yizuz/.ssh/authorized_keys`, `/etc/agent/authorized_keys` | SÍ | Medio | **P1** | **NO** — claves públicas; no son secretos, pero controlan quién entra | Revisar entradas y retirar las de agentes dados de baja (higiene de acceso, no rotación de secreto) | Sysadmin del host |
| Token/API de GitHub en credential helper | `~/.git-credentials`, `git config credential.helper` | — | — | — | **NO existe** en este entorno (la autenticación es por SSH) | — | — |

### 2.6 Pipeline y despliegue (GitHub Actions + host)

| Nombre o ruta | Ubicación | ¿Alcanzable desde el contenedor? | Riesgo | Prioridad | Rotar | Procedimiento resumido | Quién lo ejecuta |
|---|---|---|---|---|---|---|---|
| `DEPLOY_SSH_PRIVATE_KEY` | GitHub Actions Secrets (referenciado en `.github/workflows/deploy.yml`) | **NO** — vive en GitHub, se materializa solo en el runner | Alto | **P1** | **NO (inmediato)** — no era alcanzable desde el contenedor del payload; **SÍ programada** por higiene y porque es la llave con acceso a producción | Rotar el par en la ventana de deploy; actualizar el secret en GitHub; invalidar la llave anterior en los hosts destino | Admin del repositorio + sysadmin de los hosts |
| `DEPLOY_USER` | GitHub Actions Secrets | **NO** | Bajo | **P2** | **NO** — usuario de despliegue, no credencial | — | — |
| `POLANCO_HOST`, `DANIEL_HOST` | GitHub Actions Secrets | **NO** | Bajo | **P2** | **NO** — nombres/hosts, no credenciales | — | — |
| Llave SSH de despliegue en los hosts destino | `/root/.ssh/…` de Polanco y Daniel (producción) | **NO** desde este contenedor | Crítico | **P1** | **NO (inmediato)** — fuera del alcance del payload; **SÍ programada** | Sustituir por llave de uso único por pipeline y revocación tras el deploy | Sysadmin de los hosts |

<!--CONT-->
