# Despliegue local — `frontend-adrian1.ciudadan.org` (instancia agente adrian1)

> Runbook de **cómo se despliega realmente el frontend de la instancia adrian1**
> (dominio de pruebas de agentes). Documentado el **2026-10-14** tras depurar una
> sesión larga de login/logout con Auth0. Complementa `docs/05-Instalacion-y-Ejecucion.md`
> (instancias VPS, frontend con dev server) — **esta instancia es diferente**: aquí el
> frontend es un **build estático** servido por systemd.

## 1. Cadena de red

```
frontend-adrian1.ciudadan.org
  → cloudflared (túnel 6f31d2f2-e647-4609-94e5-e7a82906de94; /etc/cloudflared/config.yml)
  → http://localhost:3001
  → systemd `ciudadan-frontend.service`  (ExecStart: serve -s build -l 3001)
  → /home/ubuntu/ciudadan_app_monorepo/ciudadan_frontend/build/
```

Servicios de la misma máquina (mismo túnel cloudflared):

| Hostname | Puerto local | Unidad systemd |
|---|---|---|
| `frontend-adrian1.ciudadan.org` | 3001 | `ciudadan-frontend.service` (`serve -s build -l 3001`) |
| `backend-adrian1.ciudadan.org` | 33032 | `strapi-ciudadan-dev.service` (Strapi) |
| `socket-adrian1.ciudadan.org` | 33035 | `socket-service.service` |

## 2. GitHub Actions NO despliega este frontend

El workflow de la raíz `.github/workflows/deploy.yml` ("Deploy Ciudadan (monorepo →
Daniel canary → Polanco)") despliega por SSH a las instancias **Daniel/Polanco**, **no**
a `frontend-adrian1`, y ha estado fallando en las últimas corridas (verificado vía API
de Actions, `head_sha` reciente con `conclusion: failure`).
**Un `git push` a `main` NO actualiza el frontend de adrian1.**

## 3. Cómo actualizar el frontend de adrian1

```bash
cd /home/ubuntu/ciudadan_app_monorepo/ciudadan_frontend

# 1. Construir (DISABLE_ESLINT_PLUGIN evita que ESLint bloquee el build — ver §4)
CI=false DISABLE_ESLINT_PLUGIN=true npx craco build

# 2. Reiniciar el servidor estático (serve lee build/ del disco en cada request)
sudo systemctl restart ciudadan-frontend.service

# 3. Verificar
systemctl is-active ciudadan-frontend.service
curl -s -o /dev/null -w '%{http_code}\n' https://frontend-adrian1.ciudadan.org/
```

Persistencia tras reboot: `sudo systemctl enable ciudadan-frontend.service`.

> ⚠️ Durante un `craco build` el directorio `build/` se limpia y recrea → la web
> responde 502 / archivos ausentes hasta que termina. No interrumpas builds a medias.

## 4. Bloqueo conocido del build: ESLint de archivos ajenos

`craco build` falla por errores de ESLint en archivos de otros módulos (pendientes de
arreglar por sus dueños):

- `src/Pages/Coowork/Coowork.jsx` — `setTab` / `setSubTab` no definidos (`no-undef`)
- `src/components/MarketPlace/DetalleProducto.jsx` — imports en cuerpo del módulo (`import/first`)

Mientras se arreglan, `DISABLE_ESLINT_PLUGIN=true` permite construir (solo omite la
validación de lint durante el build; no cambia el runtime).

## 5. Verificar qué está desplegado (sin abrir navegador)

```bash
# hash del bundle servido
NEWJS=$(curl -s https://frontend-adrian1.ciudadan.org/ | grep -oE 'static/js/main[^"]+\.js' | head -1)
curl -s "https://frontend-adrian1.ciudadan.org/$NEWJS" -o /tmp/live.js

# marcadores útiles (comprobados 2026-10-14):
grep -o 'logoutParams:{returnTo:window.location.origin}' /tmp/live.js | wc -l   # logout original (≥1)
grep -o 'appState:{returnTo:window.location.pathname' /tmp/live.js | wc -l      # login página actual
```

El hash del bundle (`main.<hash>.js`) cambia en cada build → compararlo con el de
`build/index.html` local confirma que el sitio sirve el build recién hecho.

## 6. Síntoma "502 en frontend-adrian1"

Casi siempre es el servicio systemd caído (no el túnel): `sudo systemctl restart
ciudadan-frontend.service`. Diagnóstico: `ss -ltnp | grep :3001` (sin listener = servicio
muerto).
