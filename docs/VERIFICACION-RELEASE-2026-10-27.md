# Verificación E2E del Release — 2026-10-27

- **Release verificado:** rama `main`, commit **6fe67bb** — `merge: cotizaciones de envio del modulo Food + pruebas (backend-repartidores-mvp) [integracion 2026-10-27]`
- **Ejecutada:** 2026-10-28, 04:05–04:15 UTC (hora del contenedor) · Instancia: contenedor de desarrollo (`/workspace/ciudadan_app_monorepo`)
- **Árbol de trabajo:** limpio · `## main...origin/main` (sincronizado con remoto)
- **Regla del pase:** solo verificación — si algo falla se documenta el log exacto **sin** intentar remediarlo.

## Resumen ejecutivo

Resultado global: **4 PASS / 1 FAIL** de 5 puntos verificados.

- ✅ **Suites de pruebas backend:** food-shipping **55/55** y wikiseed-sync **8/8**, con Node del contenedor (v20.20.2).
- ✅ **Wiki:** `GET http://localhost:33032/wiki/help` responde **HTTP 200** con JSON válido (`"ok":true`).
- ✅ **Rutas frontend:** `/comunidad` (→ `ComunidadRoute` → `Comunidad.jsx`) y **Plaza Tecnología** (tienda oficial servida por `/market/store/:slug` → `Tienda.jsx`) están ruteadas y sus componentes existen. *Hallazgo:* no existe ruta dedicada `/plaza-tecnologia`; el acceso es vía la ruta paramétrica del marketplace.
- ❌ **Build de producción del frontend:** FALLA en esta instancia — el proceso murió durante la compilación (`The build failed because the process exited too early…`), consistente con agotamiento de memoria: el build corrió en paralelo al dev server `craco start` (RSS ≈1.7 GB) junto con Strapi, socket-service y demás servicios, con swap 0. **No se intentó remediar en este pase** (log exacto en §Detalle 1).

**Conclusión:** el contenido del release 6fe67bb verificado por pruebas (55/55 + 8/8), rutas y wiki está íntegro. El build de producción no se completó en ESTA instancia por condiciones de memoria compartida con el dev server activo — webpack no llegó a reportar ningún error de compilación de código. Se recomienda reintentarlo en una ventana sin el dev server corriendo o con más memoria disponible; queda fuera del alcance de este pase.

## Tabla de verificación

| Punto | Resultado esperado | Resultado real | PASS/FAIL |
|---|---|---|---|
| 1. Build del frontend (`CI=false DISABLE_ESLINT_PLUGIN=true npx craco build`) | Exit 0, `Compiled successfully` | Exit **1** — `The build failed because the process exited too early…` (log exacto en §Detalle 1) | **FAIL** |
| 2. Suite food-shipping — `node --test` con `food-shipping-tarifa`, `-cotizar`, `-repartidores`, `-rutas` | 55/55 pass, exit 0 | `# tests 55 · # pass 55 · # fail 0`, exit 0 | **PASS** |
| 3. Suite wikiseed-sync — `node --test wikiseed-sync.test.js` | 8/8 pass, exit 0 | `# tests 8 · # pass 8 · # fail 0`, exit 0 | **PASS** |
| 4. Wiki por HTTP — `curl -s http://localhost:33032/wiki/help` | HTTP 200, primeros 200 chars con JSON válido | HTTP **200**; `{"ok":true,"section":"help",…}` (200 chars exactos en §Detalle 4) | **PASS** |
| 5. Rutas frontend: Plaza Tecnología y `/comunidad` | Rutas registradas y componentes existentes | `/comunidad` → `ComunidadRoute` (Routes/index.jsx:1274-1277); Plaza Tecnología → `/market/store/plaza-tecnologia` vía `path='/market/store/:slug'` → `Tienda.jsx` (Routes/index.jsx:662-664); componentes existen en disco | **PASS** (con hallazgo) |

## Entorno de la verificación

- Node del contenedor: **v20.20.2** (`/usr/bin/node`) — usado para ambas suites de pruebas. Node 22 v22.23.3 disponible en `/opt/node22/bin/node`; el socket-service corre bajo él.
- Servicios corriendo durante el pase (**ninguno fue reiniciado ni detenido**): Strapi develop (:1337), socket-service (:33032), dev server `craco start` (pts/1), frontend estático (:3001).
- Git: remotos `origin` (HTTPS) y `github-ssh` (SSH); HEAD en `6fe67bb`, árbol limpio.
- Memoria al momento del fallo del build (04:14 UTC): total 23 974 MB · usada 15 045 MB · disponible 8 929 MB · **swap 0**.

## Detalle por punto

### 1. Build del frontend — FAIL

Comando ejecutado: `cd ciudadan_frontend && CI=false DISABLE_ESLINT_PLUGIN=true npx craco build`

Log exacto y completo (`/tmp/craco-build-1027.log`):

```text
Cannot find ESLint plugin (ESLintWebpackPlugin).
Creating an optimized production build...

                    The build failed because the process exited too early.
                    This probably means the system ran out of memory or someone called
                    `kill -9` on the process.
                
EXIT_CODE=1
```

Contexto: durante la compilación corría en paralelo el dev server `craco start` (PID 883845, RSS ≈1.7 GB, iniciado 04:10) con 2 workers `TypeScriptReporterRpcService` (`--max-old-space-size=2048`), además de Strapi develop (x2), socket-service (Node 22) y cline daemon. `dmesg` vacío (sin registro de kernel accesible en el contenedor), por lo que el oom-kill no se puede confirmar desde el kernel log. No se reintentó el build ni se ajustó configuración — regla del pase.

### 2. Suite food-shipping — PASS (55/55)

Comando: `node --test ciudadan_backend_26/tests/food-shipping-tarifa.test.js ciudadan_backend_26/tests/food-shipping-cotizar.test.js ciudadan_backend_26/tests/food-shipping-repartidores.test.js ciudadan_backend_26/tests/food-shipping-rutas.test.js`

Resumen exacto de la salida (TAP):

```text
1..55
# tests 55
# suites 0
# pass 55
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 664.640806
```

Exit code: **0**.

### 3. Suite wikiseed-sync — PASS (8/8)

Comando: `node --test ciudadan_backend_26/tests/wikiseed-sync.test.js`

Resumen exacto de la salida (TAP):

```text
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 331.814979
```

Exit code: **0**. (La suite usa tempdirs de `os.tmpdir()` con resolver inyectado — no toca `ciudadadan.db`.)

### 4. Wiki por HTTP — PASS

Comando: `curl -s http://localhost:33032/wiki/help | head -c 200`

Primeros 200 caracteres exactos:

```text
{"ok":true,"section":"help","title":"Explorador de Archivos - HELP","nodes":[{"name":"ayuda","type":"file","path":"wiki/help/ayuda.md","documentId":"doc_e52893be-aa4e-401a-b0ec-95a692d7b72e","createdA
```

Código HTTP: **200**.

### 5. Rutas frontend — PASS (con hallazgo)

**/comunidad** — ruta registrada en `ciudadan_frontend/src/Routes/index.jsx:1273-1277`:

```jsx
{/* Comunidad */}
<Route
  path='/comunidad'
  element={<ComunidadRoute />}
/>
```

Cadena de componentes completa y existente en disco:

- `src/Pages/ComunidadRoute.jsx` (import en Routes/index.jsx:26) → renderiza `Comunidad`
- `src/components/Comunidad/Comunidad.jsx`
- Rutas derivadas presentes: `/comunidad/ciudadaneando`, `/comunidad/feed`, `/comunidad/chats`, `/comunidad/nuevo-anuncio-programado`, `/comunidad/mis-anuncios`.

**Plaza Tecnología** — es una **tienda oficial del marketplace** (slug `plaza-tecnologia`; seed en `ciudadan_backend_26/seed/plaza-tecnologia/`, mergeado en main: commit `224a021`, PR #21, `isOfficial`). Se sirve por la ruta paramétrica de tiendas en `ciudadan_frontend/src/Routes/index.jsx:662-664`:

```jsx
<Route
  path='/market/store/:slug'
  element={<Tienda />}
>
```

- Componente: `src/Pages/MarketPlace/Tienda.jsx` (import en Routes/index.jsx:90; resuelve la tienda con `useParams().slug`) → URL efectiva: `/market/store/plaza-tecnologia`.
- Listado de tiendas oficiales: `/market/tiendas-oficiales` → `src/Pages/MarketPlace/MarketPage.jsx` (Routes/index.jsx:642-645).
- **Hallazgo (no bloqueante):** no existe una ruta dedicada tipo `/plaza-tecnologia`; el acceso es vía la ruta paramétrica del marketplace.

## Registro de entrega (git)

- Rama creada: `feature/verificacion-release-1027` a partir de `main` (`6fe67bb`).
- Commit: `docs(verificacion): E2E del release 6fe67bb` — 1 archivo (este documento).
- **Push a `origin` — FALLÓ** (credenciales HTTPS no disponibles en el contenedor). Log exacto:

```text
fatal: could not read Username for 'https://github.com': terminal prompts disabled
```

(exit 128; ejecutado con `GIT_TERMINAL_PROMPT=0` para no bloquear el pase esperando credenciales)

- Diagnóstico (solo lectura): sin `credential.helper` ni credenciales HTTPS almacenadas; el repositorio es público y accesible por red (HTTP 200), por lo que el fetch anónimo de `origin` funciona — el push en cambio requiere autenticación. Existe el remoto alternativo `github-ssh` (mismo repositorio, transporte SSH, clave `id_ed25519_github_ciudadan` del usuario `yizuz`); **no se utilizó en este pase** conforme a la regla de no remediar (el agente corre como `root`, sin acceso a dichas claves). La rama con el commit quedó lista localmente para su push en un pase posterior.

## Notas finales

- Este documento es la única modificación del repositorio en este pase (el build escribe en `ciudadan_frontend/build/`, que está en `.gitignore`; el árbol quedó limpio).
- No se reinició ni detuvo ningún servicio, no se borraron archivos del entorno y no se modificó código de producto.
- Logs completos de las corridas disponibles en `/tmp/`: `craco-build-1027.log`, `food-tests-1027.log`, `wikiseed-1027.log`.