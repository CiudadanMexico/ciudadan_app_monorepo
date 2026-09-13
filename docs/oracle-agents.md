# oracle-agents.md — Ciudadan Platform

> Define el equipo de **agentes oracle** del monorepo **Ciudadan**: un conjunto fijo de
> agentes de IA con roles especializados que asisten el desarrollo y la operación de la
> plataforma. Complementa a `AGENTS.md` (guía general para agentes de IA y devs).

## Qué es el esquema oracle

El esquema **oracle** divide el trabajo en **roles fijos**, cada uno con un alcance acotado
y un criterio de éxito verificable. Un agente **solo actúa dentro de su rol** y debe reportar
su resultado en el formato definido abajo. Así se evita que un agente modifique cosas fuera
de su alcance o invoque sin evidencia.

## Roles

| Rol | Alcance | Criterio de éxito |
|-----|---------|-------------------|
| **oracle-build** | Build y arranque de `ciudadan_backend_26/` (Strapi 4.25.9) y `ciudadan_frontend/` (React 18/CRACO). | `curl` a `/admin` responde y el bundle del admin se genera sin errores. |
| **oracle-api** | Endpoints REST/GraphQL de Strapi y permisos de roles (`/users-permissions`). | `curl` a los endpoints tocados responde 200/403 según autorización esperada. |
| **oracle-db** | Modelos, migraciones y seeds de Strapi (`api/`, `extensions/`, scripts de seed de la raíz). | Los endpoints de los content-types tocados responden con los datos del seed. |
| **oracle-fe** | Componentes, páginas y estado de `ciudadan_frontend/src` (React + MUI v5/v6 + Capacitor). | La página tocada renderiza y `npm run build` del frontend termina sin errores. |
| **oracle-infra** | Puertos, servicios auxiliares (`socket-service` :33035, `middleware` :33010, `market` :4000) y variables de entorno. | Los servicios tocados escuchan en su puerto y los `.env` no contienen secretos versionados. |
| **oracle-review** | Revisión cruzada: verifica el trabajo de los otros agentes contra este documento. | Cada entrega tiene verificación independiente con evidencia (salida de comando o diff). |

## Formato de reporte

Cada agente reporta su entrega así:

```text
rol: <rol>
alcance: <archivos/rutas tocadas>
cambios: <resumen de lo que hizo>
verificación: <comando ejecutado + salida relevante o diff>
estado: ok | parcial | bloqueado
```

Si el estado no es `ok`, el agente debe indicar el bloqueo concreto (qué falló y con qué
mensaje) y **no marcar la tarea como terminada**.

## Protocolo

1. **Asignación:** un agente toma una tarea solo si corresponde a su rol.
2. **Ejecución:** el agente actúa y verifica su propio trabajo con evidencia.
3. **Reporte:** la entrega usa el formato de arriba.
4. **Revisión:** `oracle-review` verifica de forma independiente; sin revisión no se
   considera terminada.
5. **Escalado:** si una tarea cruza dos roles, se divide entre los agentes correspondientes
   y se coordina en el reporte.

## Comandos de referencia

Los comandos de build/arranque de cada subproyecto están en `AGENTS.md` y en
`01-Arquitectura.md` … `05-Instalacion-y-Ejecucion.md` de esta carpeta. Resumen:

- Backend: `npm run develop` (PORT=33432) · `npm run build`
- Frontend: `npm start` (:3001) · `npm run build`
- Servicios auxiliares: `socket-service` (:33035) · `middleware` (:33010) · `market` (:4000)

---

# RUNBOOK — Despliegue dev completo (reproducible por un agente oracle)

> Este runbook reproduce **exactamente** el despliegue dev levantado en la VPS ARM
> (Oracle Linux, 4 vCPU / ~12 GB RAM) el 2026-09-13. Un agente con el `.env` copiado
> de la instancia original + este documento debe poder dejar la otra máquina en el
> mismo estado. **No incluye clonar ni enlazar GitHub** (ya hecho en ambas máquinas).

## 0. Estado objetivo (qué debe quedar funcionando)

| Servicio | Puerto | Comando / runtime | Verificación |
|---|---|---|---|
| **Strapi backend** | `33432` | `npm run develop` con **node20** | `curl localhost:33432/_health` → 204 |
| **Frontend React** | `3002` | `npm start` (craco) con **node20** | `curl localhost:3002/` → 200 |
| **socket-service** | `33035` | **node 22 del sistema** + tsx | `curl localhost:33035/wiki/main` → 200 |
| **middleware** | `33010` | `npm start` (puerto hardcodeado en `src/index.js:163`) | `ss -tln \| grep 33010` |

## 1. Runtimes de Node (crítico: cada servicio exige su versión)

- **Node 20** en `~/node20/bin` (v20.20.2): para **Strapi** y **frontend**.
  ⚠️ Node 22 rompe Strapi (`Cannot find module './lib/compat'`).
- **Node 22 del sistema** (`/usr/bin/node`, v22.23.2): **solo** para `socket-service`
  (con `--import tsx`). Node 20.20.2 tiene un bug del loader de addons NAPI en ARM
  que hace segfault a `better-sqlite3` → el socket corre con node 22.

## 2. Shim de compilador para better-sqlite3 (evita OOM)

El build nativo de `better-sqlite3` (en `socket-service/node_modules/`) consume tanta RAM
con `-O3` + LTO que el servidor se queda sin memoria. Se creó un shim:

`/home/opc/bin/cc-lowmem`:
```bash
#!/bin/bash
# Reduce pico de RAM (-O3 -> -O1, sin LTO) para compilar better-sqlite3 en
# servidores con poca memoria. Los args se re-pasan intactos.
args=()
for a in "$@"; do
  case "$a" in
    -O3|-O2) args+=("-O1") ;;
    -flto*|-ffat-lto*|-fuse-linker-plugin) : ;;  # descartar
    *) args+=("$a") ;;
  esac
done
exec /usr/bin/gcc "${args[@]}"
```

```bash
chmod +x /home/opc/bin/cc-lowmem
```

**Regla de oro:** si `node_modules` del socket-service se reinstala, recompilar así:
```bash
cd ciudadan_backend_26/socket-service
PATH=/home/opc/bin:/home/opc/node20/bin:$PATH npm run build-release
```
(El shim va en `PATH` **antes** de gcc para interceptar la compilación. OJO: el
`node-addon-api` anidado de `sharp` también compila; si falla por OOM, repetir el build.)

## 3. Directorios fuera del repo

```bash
sudo mkdir -p /var/www/apps/wikis   # raíz de wikis servidas por socket-service
```
(Debe existir o el socket-service falla al servir wikis.)

## 4. Variables de entorno

Copiar los `.env` de la instancia original (fuera de Git, el `.gitignore` los excluye):

- `ciudadan_backend_26/.env` — claves que importan:
  - `HOST=0.0.0.0`, `PORT=33432`
  - `DATABASE_CLIENT=sqlite`, `DATABASE_FILENAME=.tmp/data.db`
  - `CORS_ORIGINS=http://localhost:3001,http://localhost:3000,http://localhost:3002,http://<IP_VPS>:3001,https://<IP_VPS>:3001`
  - `AUTH0_DOMAIN=ciudadan.us.auth0.com`, `AUTH0_AUDIENCE=https://api.ciudadan.org`
  - `SOCKET_PORT=33035`, `SOCKET_HOST=http://localhost`
- `ciudadan_backend_26/socket-service/.env`:
  - `SOCKET_PORT=33035`
  - `CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:33432,http://localhost:33032,http://<IP_VPS>:3001,https://<IP_VPS>:3001`
  - `WIKI_ROOT_PATH=/var/www/apps/wikis`
- `ciudadan_frontend/.env` — claves que importan:
  - `PORT=3002` (puerto del dev server React)
  - `REACT_APP_STRAPI_URL=http://localhost:33432`
  - `REACT_APP_SOCKET_URL=http://localhost:33035`
  - `REACT_APP_AUTH0_DOMAIN=ciudadan.us.auth0.com`
  - `REACT_APP_AUTH0_CLIENT_ID=za265MeRdxMKuPqzdPSTL7lHL0yyg5bd`
  - `REACT_APP_AUTH0_AUDIENCE=https://api.ciudadan.org`
  - `REACT_APP_MAIN_DOMAIN=https://ciudadan.org` (para backlinks al dominio prod)

⚠️ Tras copiar los `.env`, **reemplazar la IP** `160.34.214.224` (la de la VPS original)
por la IP pública de la nueva máquina en los `CORS_ORIGINS` del backend y del socket.

## 5. Config del frontend (craco)

`ciudadan_frontend/craco.config.js` — devServer simplificado (sin HTTPS, host abierto):
```js
const path = require("path");
module.exports = {
  webpack: { alias: { "@": path.resolve(__dirname, "src") } },
  devServer: { host: "0.0.0.0", port: 3002, allowedHosts: "all" }
};
```

## 6. Parche auth0-spa-js (origen inseguro en HTTP)

`@auth0/auth0-spa-js` lanza un error en el check "secure origin" en HTTP no estándar;
el parche cambia el `throw` por `console.warn`. **Ya está aplicado y verificado en el
bundle servido**, pero **se pierde si se reinstalan `node_modules`**. Para reaplicar
tras un `npm install`:

```bash
# localizar los archivos que contienen el check (dist/* de auth0-spa-js y las copias
# empaquetadas dentro de @auth0/auth0-react/dist/*.js, incluido cjs):
grep -rln 'must run on a secure origin' ciudadan_frontend/node_modules/@auth0/
# en cada archivo: cambiar el 'throw' previo al mensaje por console.warn
```

Verificación: el bundle servido debe contener `console.warn` junto al string
`'must run on a secure origin'`.

## 7. Instalación de dependencias

```bash
cd ciudadan_backend_26 && npm install --legacy-peer-deps
cd ../ciudadan_frontend   && npm install --legacy-peer-deps
cd ../ciudadan_backend_26/socket-service && npm install --legacy-peer-deps
# ↑ tras instalar, recompilar better-sqlite3 con el shim (ver sección 2)
cd ../middleware && npm install
```

## 8. Arranque (orden y comandos exactos)

```bash
mkdir -p ~/logs

# 1) Strapi backend (node20)
cd ciudadan_backend_26
setsid env PATH=/home/opc/node20/bin:$PATH npm run develop </dev/null \
  > ~/logs/backend-develop.log 2>&1 &

# 2) socket-service (node 22 del sistema, con tsx)
cd ../ciudadan_backend_26/socket-service
setsid /usr/bin/node --import tsx server.js </dev/null \
  > ~/logs/socket-service.log 2>&1 &

# 3) middleware (Express puro; el puerto va hardcodeado en src/index.js)
cd ../middleware
setsid npm start </dev/null > ~/logs/middleware.log 2>&1 &

# 4) frontend React (node20) — limpiar cache de webpack si falla
cd ../../ciudadan_frontend
setsid env PATH=/home/opc/node20/bin:$PATH npm start </dev/null \
  > ~/logs/frontend-start.log 2>&1 &
```

**Tiempos esperados:** Strapi tarda ~60-90 s en escuchar (la primera vez compila el
admin). El frontend emite `webpack compiled` cuando está listo. El socket-service y el
middleware levantan en <10 s.

## 9. Verificación final (checklist del agente)

```bash
# puertos: los 4 deben aparecer
ss -tln | grep -E ':(3002|33432|33035|33010)\b'

# backend
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:33432/_health   # 204
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:33432/admin     # 200

# frontend + URLs inyectadas en el bundle
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3002/           # 200
curl -s http://localhost:3002/static/js/bundle.js -o /tmp/b.js
grep -c 'localhost:33432' /tmp/b.js   # > 0 (URL Strapi)
grep -c 'localhost:33035' /tmp/b.js   # > 0 (URL socket)

# socket-service
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:33035/wiki/main # 200

# CORS con el origen del navegador
curl -s -D - -o /dev/null -H 'Origin: http://localhost:3002' http://localhost:33432/ \
  | grep -i access-control-allow-origin   # debe devolver el origen
```

## 10. Acceso externo vía túnel SSH (dev)

Todo localhost = origen seguro → no se necesitan certificados ni HTTPS:

```bash
# en la máquina del desarrollador
ssh -L 3002:localhost:3002 -L 33432:localhost:33432 -L 33035:localhost:33035 opc@<IP_VPS>
```
Luego abrir `http://localhost:3002` en el navegador.

## 11. Auth0 (tenant `ciudadan.us.auth0.com`)

1. App SPA `za265MeRdxMKuPqzdPSTL7lHL0yyg5bd` ("Ciudadan"):
   - **Allowed Callback URLs** debe incluir `http://localhost:3002`
   - **Allowed Web Origins** ídem · **Allowed Origins (CORS)** ídem
   - **Allowed Logout URLs** ídem
   - ⚠️ **"Application Login URI"** (`initiate_login_uri`) debe estar **VACÍO** —
     si apunta a un dominio muerto (ej. `*.tunnelmole.net`) el login falla con
     "Oops!, something went wrong" para TODOS los orígenes.
2. Flujo del login: Auth0 → redirect a `localhost:3002` → `getAccessTokenSilently`
   (audience `api.ciudadan.org`) → `POST localhost:33432/api/auth/auth0-login`
   (controller en `src/api/auth/controllers/auth.js`, verifica JWT vía JWKS) →
   crea el usuario si no existe (rol `authenticated`) y devuelve JWT de Strapi.
3. El endpoint `GET /api/users` debe devolver `[]` (no `403`) con permisos correctos.

