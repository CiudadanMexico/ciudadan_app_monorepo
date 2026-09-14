# Despliegue a Producción — Ciudadán (Monorepo)

Guía reproducible para que cualquier agente (o persona) despliegue cambios en producción.
Cubre los tres frentes: **Frontend**, **Backend (Strapi)** y **Socket Service** (y lo que hay dentro de `socket-service/`).

> Servidor: `polanco-lan` = `192.168.1.7`, usuario SSH `polanco`.
> Sudo NO interactivo: `echo '<PASSWORD>' | sudo -S -p '' <comando>`.
> Los comandos remotos se ejecutan enviando un script bash en base64:
> `echo "<b64>" | base64 -d | bash` vía `ssh -o BatchMode=yes polanco-lan`.
> Instalación/build como usuario `alexander`:
> `echo '<PASSWORD>' | sudo -S -p '' -u alexander env HOME=/home/alexander PATH=/usr/bin:/opt/node22/current/bin:$PATH /bin/bash -lc '<comando>'`.

---

## 1. Arquitectura y rutas

Monorepo en el servidor: `/var/www/apps/ciudadan_monorepo/`

```
ciudadan_monorepo/
├── ciudadan_backend_26/       # Strapi (backend principal)
│   ├── .env                   # variables de entorno (NO está en git)
│   ├── socket-service/        # socket.io (servicio de tiempo real)
│   ├── middleware/            # middleware Node
│   └── market/                # Vendure (marketplace)
├── ciudadan_frontend/         # React (CRA + craco)
│   └── .env                   # variables del frontend (NO está en git)
└── docs/
```

Frontend servido: `/var/www/apps/frontend-ciudadan/build` (lo sirve nginx en `ciudadan.org`).

### Unidades de systemd

| Unit | Servicio | WorkingDirectory | Puerto |
|---|---|---|---|
| `ciudadan-backend-prod` | Strapi | `ciudadan_backend_26/` | 33332 |
| `ciudadan-socket-prod` | socket.io | `socket-service/` | 33331 |
| `ciudadan-middleware` | middleware | `middleware/` | 33010 |
| `ciudadan-market` | Vendure | `market/` | 4010 |

Todos corren como `User=alexander` y leen `EnvironmentFile=.../ciudadan_backend_26/.env`.

### Puertos (mapa final)

| Servicio | Puerto | URL pública |
|---|---|---|
| Strapi (backend) | 33332 | https://back.ciudadan.org |
| socket.io (prod) | 33331 | https://back.ciudadan.org/socket.io/ (nginx) |
| middleware | 33010 | (interno) |
| market (Vendure) | 4010 | (interno) |
| ecosistema | 4000 | NO TOCAR |

nginx:
- `back.ciudadan.org` → `location /socket.io/` → `localhost:33331`; resto → `localhost:33332`.
- `ciudadan.org` → `/var/www/apps/frontend-ciudadan/build`.

> ⚠️ 33432 = strapi-marihuanas (NO tocar). 33035 = socket dev (suele estar apagado).

### Versiones de Node

| Contexto | Node | Ruta |
|---|---|---|
| Strapi | >=18 <=20 | /usr/bin/node (v20.20.2) |
| socket / middleware / market | 22 | /opt/node22/current/bin (v22.23.2) |

---

## 2. Despliegue del FRONTEND

El frontend NO se construye en el servidor (pocos recursos). Se construye en una máquina local con Node 20 y se sube el `build/`.

### 2.1 Preparar máquina local

```powershell
nvm use 20.19.2   # CRA/react-scripts 5 NO soporta Node 22
node -v           # v20.x
```

### 2.2 Obtener el código

```powershell
$ws = "$env:USERPROFILE\ciudadan-build"
New-Item -ItemType Directory -Force $ws | Out-Null
scp -o BatchMode=yes -r "polanco-lan:/var/www/apps/ciudadan_monorepo/ciudadan_frontend/src" "$ws\src"
scp -o BatchMode=yes -r "polanco-lan:/var/www/apps/ciudadan_monorepo/ciudadan_frontend/public" "$ws\public"
scp -o BatchMode=yes "polanco-lan:/var/www/apps/ciudadan_monorepo/ciudadan_frontend/package.json" "$ws\package.json"
scp -o BatchMode=yes "polanco-lan:/var/www/apps/ciudadan_monorepo/ciudadan_frontend/craco.config.js" "$ws\craco.config.js"
```

> `package-lock.json` NO existe en el servidor; npm lo regenera.

### 2.3 `.env` del frontend

En `/var/www/apps/ciudadan_monorepo/ciudadan_frontend/.env` (y su copia local para el build). Valores de referencia:

```
REACT_APP_MAIN_DOMAIN=https://ciudadan.org
REACT_APP_AUTH0_DOMAIN=ciudadan.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=za265MeRdxMKuPqzdPSTL7lHL0yyg5bd
REACT_APP_AUTH0_AUDIENCE=https://api.ciudadan.org
REACT_APP_STRAPI_URL=https://back.ciudadan.org
REACT_APP_SOCKET_URL=https://back.ciudadan.org
REACT_APP_AI_URL=https://llmciudadan.org
REACT_APP_PLACES_KEY=<places>
REACT_APP_GOOGLE_MAPS_API_KEY=<maps>
REACT_APP_GOOGLE_MAPS_KEY=<maps>            # mismo valor (el código usa ambos)
REACT_APP_GEOCODING_KEY=<geocoding>
REACT_APP_STRAPI_TOKEN=                     # vacío si no hay token en texto plano
REACT_APP_PRESENTATION_VIDEO=https://www.youtube.com/watch?v=XqOLFhVQENk
REACT_APP_OPENPAY_MERCHANT_ID=<id>
REACT_APP_OPENPAY_PUBLIC_KEY=<pk>
REACT_APP_WHATSAPP_NUMBER=5559099956
REACT_APP_APP_ENV=production
```

> ⚠️ STRAPI_URL NO es localhost:33432 (marihuanas). Producción = https://back.ciudadan.org.
> SOCKET_URL = https://back.ciudadan.org (NO socks-prod, no resuelve DNS).

### 2.4 Build

```powershell
Push-Location $ws
nvm use 20.19.2
$env:CI = "false"
$env:GENERATE_SOURCEMAP = "false"
npm install --legacy-peer-deps --no-audit --no-fund
npm run build
```

> ⚠️ Error `Can't resolve '../services/wikiService'` → falta `tsconfig.json`. Crear uno con
> `jsx: "react-jsx"`, `allowJs: true`, `isolatedModules: true`, `exclude: ["src/**/*.example.ts"]`.

### 2.5 Subir y desplegar

```powershell
ssh -o BatchMode=yes polanco-lan "rm -rf /tmp/frontend-build-new; mkdir -p /tmp/frontend-build-new"
scp -o BatchMode=yes -r "$ws\build\*" "polanco-lan:/tmp/frontend-build-new/"
```

En servidor (sudo):

```bash
DEST=/var/www/apps/frontend-ciudadan/build
TS=$(date +%Y%m%d_%H%M%S)
sudo mv $DEST /var/www/apps/frontend-ciudadan/build_backup_$TS
sudo mv /tmp/frontend-build-new $DEST
sudo chown -R alexander:alexander $DEST
sudo find $DEST -type d -exec chmod 755 {} \;   # CRITICO: evita 403/página en blanco
sudo find $DEST -type f -exec chmod 644 {} \;
sudo nginx -t && sudo systemctl reload nginx
```

### 2.6 Verificar

```bash
curl -s -o /dev/null -w "html %{http_code}\n" https://ciudadan.org/
curl -s https://ciudadan.org/ | grep -oE "main\.[a-f0-9]+\.js"
curl -s -o /dev/null -w "js %{http_code}\n" https://ciudadan.org/static/js/main.<hash>.js
curl -s -o /dev/null -w "css %{http_code}\n" https://ciudadan.org/static/css/main.<hash>.css
```

Todos 200. Si JS/CSS da 403 → permisos de directorio (paso 2.5).

---

## 3. Despliegue del BACKEND (Strapi)

Ruta: `/var/www/apps/ciudadan_monorepo/ciudadan_backend_26/`, unit `ciudadan-backend-prod.service`, puerto 33332.

### 3.1 Traer cambios

```bash
cd /var/www/apps/ciudadan_monorepo
git config --global --add safe.directory /var/www/apps/ciudadan_monorepo
sudo -u alexander git -C /var/www/apps/ciudadan_monorepo pull
```

### 3.2 Instalar

```bash
echo '<PASS>' | sudo -S -p '' -u alexander env HOME=/home/alexander PATH=/usr/bin:/opt/node22/current/bin:$PATH \
  /bin/bash -lc 'cd /var/www/apps/ciudadan_monorepo/ciudadan_backend_26 && npm install --legacy-peer-deps'
```

> ⚠️ `--legacy-peer-deps` por stripe@18 vs stripe@13 (Vendure).

### 3.3 `.env` (claves)

`/var/www/apps/ciudadan_monorepo/ciudadan_backend_26/.env` (alexander, 600):

```
HOST=0.0.0.0
PORT=33332
DATABASE_CLIENT=postgres / HOST=localhost / PORT=5432
DATABASE_NAME=strapi_ciudadan_prod
DATABASE_USERNAME=strapi_ciudadan_user
DATABASE_PASSWORD=<redacted> / SSL=false
NODE_ENV=production
STRAPI_URL=http://localhost:33332
SOCKET_PORT=33331
CHATBOT_WEBHOOK_PORT=33334
STRAPI_API_TOKEN=<redacted>
APP_KEYS / API_TOKEN_SALT / ADMIN_JWT_SECRET / TRANSFER_TOKEN_SALT
```

> Si se clonó limpio, el .env NO viene en git: restaurar del backup.

### 3.4 Build + arrancar

```bash
sudo -u alexander mkdir -p /var/www/apps/ciudadan_monorepo/ciudadan_backend_26/public/uploads
echo '<PASS>' | sudo -S -p '' -u alexander env HOME=/home/alexander PATH=/usr/bin:/opt/node22/current/bin:$PATH \
  /bin/bash -lc 'cd /var/www/apps/ciudadan_monorepo/ciudadan_backend_26 && strapi build'
echo '<PASS>' | sudo -S -p '' systemctl restart ciudadan-backend-prod
echo '<PASS>' | sudo -S -p '' systemctl enable ciudadan-backend-prod
```

### 3.5 Verificar

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://back.ciudadan.org/_health   # 204
curl -s -o /dev/null -w "%{http_code}\n" https://back.ciudadan.org/admin    # 200
systemctl is-active ciudadan-backend-prod                                    # active
journalctl -u ciudadan-backend-prod -n 50 --no-pager
```

---

## 4. Despliegue del SOCKET SERVICE (y contenido de socket-service/)

Ruta: `.../ciudadan_backend_26/socket-service/`, unit `ciudadan-socket-prod.service`, puerto 33331, Node 22.

Estructura: `server.js` (socket.io, lee SOCKET_PORT), `chatbot.js` (proveedor, lee PORT/CHATBOT_WEBHOOK_PORT), `src/` → `dist/` (tsc).

### 4.1 Instalar y compilar

```bash
echo '<PASS>' | sudo -S -p '' -u alexander env HOME=/home/alexander PATH=/usr/bin:/opt/node22/current/bin:$PATH \
  /bin/bash -lc 'cd /var/www/apps/ciudadan_monorepo/ciudadan_backend_26/socket-service && npm install --legacy-peer-deps && npm run build'
sudo cp .../socket-service/config/schema.sql .../socket-service/dist/config/schema.sql
```

### 4.2 Fixes OBLIGATORIOS (re-aplicar si un pull los revierte)

1. `server.js` ~línea 69: `require("./routes/WikiRouter")` → `require("./dist/routes/WikiRouter")`.

2. `chatbot.js` ~línea 69: agregar
   ```js
   const CHATBOT_WEBHOOK_PORT = Number(process.env.CHATBOT_WEBHOOK_PORT || 33334);
   ```
   y en `createProvider(...)` pasar `port: CHATBOT_WEBHOOK_PORT` (evita chocar con PORT=33332).

### 4.3 Reiniciar y verificar

```bash
echo '<PASS>' | sudo -S -p '' systemctl restart ciudadan-socket-prod
echo '<PASS>' | sudo -S -p '' systemctl enable ciudadan-socket-prod
curl -s "http://localhost:33331/socket.io/?EIO=4&transport=polling"          # 0{"sid":...}
curl -s -o /dev/null -w "%{http_code}\n" "https://back.ciudadan.org/socket.io/?EIO=4&transport=polling"  # 200
```

---

## 5. Middleware y Market

```bash
echo '<PASS>' | sudo -S -p '' systemctl restart ciudadan-middleware   # 33010
echo '<PASS>' | sudo -S -p '' systemctl restart ciudadan-market       # 4010 (NO 4000=ecosistema)
```

---

## 6. Trampas / errores conocidos

| Síntoma | Causa | Fix |
|---|---|---|
| Página en blanco, JS/CSS 403 | scp deja dirs sin o+x | find build -type d -exec chmod 755 |
| Can't resolve '../services/wikiService' | falta tsconfig.json | crearlo (react-jsx, allowJs) |
| ERR_OSSL_EVP_UNSUPPORTED | Node 22 en CRA | nvm use 20 |
| upload folder public/uploads doesn't exist | falta carpeta | mkdir -p public/uploads |
| EADDRINUSE :::33332 (socket) | chatbot usa PORT | fix chatbot.js (CHATBOT_WEBHOOK_PORT) |
| EADDRINUSE :::4000 (market) | 4000 = ecosistema | usar 4010/5010 |
| Cannot find module ./dist/config/ConfigDatabase | no se compiló | npm run build + copiar schema.sql |
| nginx conflicting server name | .bak dentro de sites-enabled | moverlo fuera |
| systemctl tras sudo -u alexander falla | requiere root directo | sudo -S systemctl |

---

## 7. Rollback

- Frontend: `sudo mv build build_bad_<ts>; sudo mv build_backup_<ts> build; systemctl reload nginx`.
- Backend/socket: git + `systemctl restart` del unit.

---

## 8. Orden recomendado

1. Backend (Strapi) → `_health`.
2. Socket + middleware + market → handshake.
3. Frontend → build → subir → permisos 755 → verificar 200.

FIN
