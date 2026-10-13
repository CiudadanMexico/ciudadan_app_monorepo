# 05 — Instalación y Ejecución (paso a paso)

> Guía completa para instalar y correr TODOS los servicios del monorepo en local (Windows
> con PowerShell u otro SO con Node). Se basa en los scripts y `.env` reales del repositorio.

## Prerrequisitos

| Software | Versión | Por qué |
|---|---|---|
| **Node.js** | **18.x / 20.x** (backend exige `>=18 <=20`; Node 22 en máquina dev) | Strapi 4 y Vendure |
| **npm** | 6+ | gestor principal |
| **Git** | — | clonar el repo |
| **SQLite** | (incluido vía `sqlite3`) | DB por defecto (dev) |
| (Opcional) **Docker** | — | `docker compose up` |
| (Opcional) **MySQL/Postgres** | — | si se usa `DATABASE_CLIENT=mysql/postgres` |
| (Opcional) **Android SDK / iOS Xcode** | — | build Capacitor |

> 💡 En la máquina de desarrollo se usa **Node 22** con la bandera
> `NODE_OPTIONS=--openssl-legacy-provider` para varios scripts de seed.

---

## Paso 0 — Clonar el repositorio

```bash
git clone https://github.com/CiudadanMexico/ciudadan_app_monorepo.git
cd ciudadan_app_monorepo
```

---

## Paso 1 — Backend Strapi (servicio principal)

### 1.1 Instalar dependencias
```bash
cd ciudadan_backend_26
npm install --legacy-peer-deps
```
> El `postinstall` corre `patch-package`. Si falla por peers, usar `--legacy-peer-deps`.

### 1.2 Configurar `.env`
El repo trae `.env` (no debería versionarse; aquí existe). Variables clave:
```
HOST=0.0.0.0
PORT=33432                # puerto real en dev (config/server.js default: 1337)
DATABASE_CLIENT=sqlite    # o mysql / postgres
APP_KEYS=...
ADMIN_JWT_SECRET=...
JWT_SECRET=...
AUTH0_DOMAIN=ciudadan.us.auth0.com
AUTH0_AUDIENCE=https://api.ciudadan.org
CORS_ORIGINS=http://localhost:3001,http://localhost:3000,...
STRIPE_SECRET_KEY=...
STRAPI_URL=http://localhost:33432
```
Si usas otra base, define `DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD` (ver
`config/database.js`).

### 1.3 Correr en desarrollo
```bash
npm run develop   # strapi develop — dev server con autoReload en :33432
```
- Admin panel: `http://localhost:33432/admin`
- API REST: `http://localhost:33432/api/...`

### 1.4 Build / producción
```bash
npm run build     # strapi build (compila admin panel)
npm start         # strapi start — producción, SIN autoReload
```

### 1.5 (Opcional) Sembrar datos
```bash
# Desde la raíz del backend (Node 22 puede requerir openssl-legacy-provider)
node seed-root-areas.js         # 5 áreas raíz CoWork
node seed-cowork-test-data.js   # subáreas, skills, agencias, usuarios demo, todos/tareas
node seed-ad-rewards.js         # anuncios remunerados + usuario demo
node fix-perms.js               # permisos y roles Socior/Verificador
node export-strapi-schema.js    # regenera strapi-schema-export.md
```

---

## Paso 2 — Socket Service (tiempo real + chatbot + wiki)

Proceso **independiente** del backend.

```bash
cd ciudadan_backend_26/socket-service
npm install
npm run build     # tsc -p . → dist/
npm start         # tsx server.js → escucha en :33035 (SOCKET_PORT)
```
- `.env` de socket-service: `SOCKET_PORT=33035`, `STRAPI_URL=http://localhost:33432`,
  `SOCKET_HOST`, credenciales WhatsApp y Notion, `WIKI_ROOT_PATH`.
- El chat IA (llm):
  ```bash
  node server-lmai.js          # servidor :5000 que proxya a LM Studio
  # o version Python:
  python socket-service/lmai/app.py
  ```

---

## Paso 3 — Middleware proxy (uploads/media + conductores)

```bash
cd ciudadan_backend_26/middleware
npm install
npm run start     # node src/index.js → :33010
```
- Proxy de `GET /uploads/*`, `POST /api/upload`, `GET/POST /api/*` hacia Strapi.
- Endpoints de conductores en `/api/conductores/*`.

---

## Paso 4 — Market / Vendure (comercio headless, opcional)

```bash
cd ciudadan_backend_26/market
npm install
npm run dev       # ts-node-dev → shop/admin API en :4000, Admin UI en :5001
```
- Admin UI: `http://localhost:5001/admin` (admin/admin).
- Shop API: `http://localhost:4000/shop-api`.

---

## Paso 5 — Frontend (React)

### 5.1 Instalar
```bash
cd ciudadan_frontend
npm install --legacy-peer-deps
```

### 5.2 Configurar `.env`
```
PORT=3001
REACT_APP_AUTH0_DOMAIN=ciudadan.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=...
REACT_APP_AUTH0_AUDIENCE=https://api.ciudadan.org
REACT_APP_STRAPI_URL=http://localhost:33432
REACT_APP_SOCKET_URL=http://localhost:33035
REACT_APP_GOOGLE_MAPS_API_KEY=...
REACT_APP_OPENPAY_MERCHANT_ID=...
REACT_APP_OPENPAY_PUBLIC_KEY=...
```

### 5.3 Correr en desarrollo
```bash
npm start         # craco start → http://localhost:3001
```

### 5.4 Build / producción
```bash
npm run build     # craco build → /build
```

### 5.5 Pruebas
```bash
npm test          # craco test (Jest)
```

### 5.6 Movil (Capacitor)
```bash
npx cap sync android && npx cap open android
# o: npx cap sync ios && npx cap open ios
```

---

## Paso 6 — Docker (alternativa para backend)

```bash
docker compose up -d --build      # desde ciudadan_backend_26/
```
- Levanta Strapi en `http://localhost:1337` con SQLite `/tmp/data.db`.

---

## Paso 7 — Orden de arranque completo (local)

Recomendado para desarrollo full-stack:

1. **Backend Strapi** (`npm run develop`) → `:33432`
2. **Socket service** (`npm run build && npm start`) → `:33035`
3. **Middleware** (`npm run start`) → `:33010` *(si usas el proxy de media)*
4. **Frontend** (`npm start`) → `:3001`
5. *(Opcionales)* **Market** (`npm run dev`) → `:4000/:5001` · **LLM** (`server-lmai.js`) → `:5000`

Verificación rápida:
- `curl http://localhost:33432/admin` → panel Strapi.
- Abrir `http://localhost:3001` → app.
- Revisar `http://localhost:33010/_health` → `{"ok":true}`.

---

## Paso 7b — Servicios systemd (instancias VPS)

En la instancia VPS los tres servicios viven bajo **systemd**: sobreviven a
reinicio/apagado y se auto-reinician si mueren.

| Unidad | Servicio | Puerto | Log de la app |
|---|---|---|---|
| `ciudadan-backend` | Strapi (`launcher.sh backend`) | 33032 | `~/logs/ciudadan-backend.log` |
| `ciudadan-frontend` | CRA dev server (`launcher.sh frontend`) | 3001 | `~/logs/ciudadan-frontend.log` |
| `ciudadan-socket` | Socket service (`launcher.sh socket`) | 33035 | `~/logs/ciudadan-socket.log` |

```bash
sudo systemctl status  ciudadan-backend      # estado
sudo systemctl restart ciudadan-backend      # reiniciar
sudo systemctl stop    ciudadan-frontend     # parar
journalctl -u ciudadan-backend -f           # eventos del propio systemd
tail -f ~/logs/ciudadan-backend.log         # salida de la app (append)
```

Detalles que conviene saber:

- **`ExecStart` es `launcher.sh <servicio>`**, la misma receta manual de siempre (carga nvm
  y exporta las `SOCKET_*` del `.env`). No hay dos formas de arrancar que puedan divergir.
- **`Restart=always` + `enable` en `multi-user.target`**: si la máquina se reinicia o el
  proceso muere, vuelven solos. Antes **no había ni cron `@reboot` ni unidad**: un apagado
  dejaba la instancia sin backend ni socket (502 en el túnel) hasta que alguien lo lanzara
  a mano — fue el motivo de la caída del 2026-10-07.
- **`MemoryHigh`/`MemoryMax` por unidad**: si un servicio se dispara de memoria, systemd
  reinicia *a ese servicio* en vez de dejar que el OOM killer de Linux se lleve el proceso
  de otro (nos pasó: un Jest apretado mató el dev server).
- Los logs van a los mismos ficheros de siempre (`StandardOutput=append:`), así que los
  `tail -f` de siempre siguen funcionando.
- Las unidades viven en `/etc/systemd/system/ciudadan-*.service` (son de la máquina, no del
  repo). Si cambias una: `sudo systemctl daemon-reload` antes de reiniciar.

Verificación tras arrancar:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:33032/_health   # 204
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/           # 200
curl -s http://localhost:33032/admin/init | grep -o '"hasAdmin":[a-z]*'   # ¿existe admin?
```

---

## Paso 7c — Swap + watchdog (instancias VPS) — `2026-10-09`

### Por qué existe esto

La instancia tiene 6 GB de RAM y el CRA dev server (~2.8 GB) + Strapi saturan la
memoria. El 2026-10-09 el frontend quedó **colgado en estado D** (proceso vivo
pero sin responder en `:3001`): `Restart=always` de systemd **no** lo reinicia
porque el proceso no muere, Cloudflare agotaba el timeout y devolvía
**error 524** en `frontend-adrianperez2.ciudadan.org` aunque el túnel estuviera
sano (4 conexiones) y backend/socket respondieran bien.

### Swap persistente (2 GB)

La máquina no tenía swap. Crear `/swapfile` da margen para que el kernel
mueva páginas inactivas en vez de dejar procesos en D-state:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile \
  && sudo mkswap /swapfile && sudo swapon /swapfile
grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -m   # debe mostrar Swap: 2047
```

### Watchdog: reinicia lo que *cuelgue* (no solo lo que muera)

`~/ciudadan-watchdog.sh` prueba la conectividad de cada puerto y solo reinicia
si **no hay conexión** (código `000` de curl), nunca por 4xx/5xx normales:

```bash
#!/bin/bash
# Uso: ciudadan-watchdog.sh <servicio> <puerto> <endpoint>
SVC="$1"; PORT="$2"; EP="${3:-/}"
CODE=$(timeout 10 curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}${EP}" 2>/dev/null || echo 000)
if [ "$CODE" = "000" ]; then
  logger -t ciudadan-watchdog "$SVC sin conexion en :$PORT$EP -> restart"
  /usr/bin/systemctl restart "$SVC"
fi
```

Timer `ciudadan-watchdog.timer` (cada 3 min) → `ciudadan-watchdog.service`:

```bash
# /etc/systemd/system/ciudadan-watchdog.service (Type=oneshot):
# ExecStart=/bin/bash -c "/home/ubuntu/ciudadan-watchdog.sh ciudadan-frontend 3001 /;
#   /home/ubuntu/ciudadan-watchdog.sh ciudadan-backend 33032 /_health;
#   /home/ubuntu/ciudadan-watchdog.sh ciudadan-socket 33035 /"
sudo systemctl enable --now ciudadan-watchdog.timer
systemctl list-timers ciudadan-watchdog --no-pager
sudo systemctl start ciudadan-watchdog.service   # corrida manual de prueba
```

Notas:

- Endpoints de chequeo: frontend `/`, backend `/_health`, socket `/`.
- El túnel `cloudflared` (`systemd`, `Restart=on-failure`) también se chequea
  indirectamente: si el origen cae, el watchdog lo levanta y el túnel lo
  reanuda solo. Ver sus conexiones: `journalctl -u cloudflared -n 20`.
- Como todo lo de `/etc/systemd/`, estos archivos son **de la máquina, no del
  repo**: si se recrea la instancia hay que volver a crearlos (esta sección).

---

## Paso 8 — Deploy a producción (sucinto)

### vía CI/CD (GitHub Actions)
Solo `push`/PR a **`main`** con cambios en `ciudadan_backend_26/` dispara
`.github/workflows/deploy.yml`, que en un runner self-hosted actualiza y reinicia
`strapi-ciudadan-dev`, `strapi-ciudadan-prod` y `strapi-marihuanas`.

### vía Fly.io
```bash
cd ciudadan_backend_26
flyctl deploy
```

### Manual vía SSH (emergencia)
```bash
ssh root@<IP-VPS>
cd /var/www/apps/<app>
git pull origin main
npm install --legacy-peer-deps
sudo systemctl restart <servicio>
```

---

## Resolución de problemas

| Síntoma | Causa probable / solución |
|---|---|
| `strapi develop` no arranca | Node >20: usa Node 18/20; revisa `DATABASE_CLIENT` y `.env` |
| CORS bloquea requests | Revisa `CORS_ORIGINS` en backend `.env` |
| Socket no conecta | Verifica que `SOCKET_PORT` y `REACT_APP_SOCKET_URL` coincidan |
| Webhook Stripe falla | Requiere `raw-body` (ya en `config/middlewares.js`) y `STRIPE_WEBHOOK_SECRET` |
| Scripts de seed fallan en Node 22 | `export NODE_OPTIONS=--openssl-legacy-provider` |
| 401 en `/api/users` | Debe autenticarse con token **Auth0** (rutas override) |
| Media no carga | Levanta el **middleware proxy** o apunta directo a Strapi `/uploads` |
| 524 en el túnel (frontend) | Origen colgado en estado D por falta de RAM: revisa `ss -ltn|grep 3001` + `curl -s http://127.0.0.1:3001/`; si no responde, `sudo systemctl restart ciudadan-frontend`. Ver **Paso 7c** (swap + watchdog) |

---

*Fin de la guía de instalación.*