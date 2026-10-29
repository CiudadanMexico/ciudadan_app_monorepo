# Build de producción del frontend — evidencia sobre `main` (2026-10-29)

Tarea T5: producir la **evidencia de que `main` compila** (build de producción del frontend)
y dejar documentada la **ventana de build** que necesita el operador.

> Alcance: solo evidencia. **No se modificó código fuente, `package.json` ni `package-lock.json`.**
> Único archivo añadido a la rama: este documento. No se hizo push ni deploy.

---

## 1. Commit de base

| Dato | Valor |
|---|---|
| Rama de trabajo | `feature/build-produccion-1029` (creada desde `origin/main`) |
| Commit de base (`HEAD`) | **`0e5f6c1`** |
| Título | `merge: feature/food-cotizaciones-frontend [integracion 2026-10-28]` |
| Fecha del commit | 2026-10-28 16:50:38 -0600 |
| `origin/main` local | `0e5f6c1` — **idéntico al `HEAD`** |

**¿Corresponde al `main` más reciente?** **Sí, con una salvedad menor.**

- `git fetch origin main` **sí funcionó** (salida: `From https://github.com/CiudadanMexico/ciudadan_app_monorepo
  * branch main -> FETCH_HEAD`). No hubo problema de credenciales.
- Por tanto el build se ejecutó sobre el `origin/main` **recién descargado**, no sobre una copia local
  obsoleta. No aplica la salvedad de "build sobre un `origin/main` local que puede no ser el más reciente".
- **Salvedad:** el remoto `github-ssh/main` apunta a `3bb36bb` (más antiguo) y no se actualizó con
  `fetch` en esta corrida. `origin/main` (`0e5f6c1`) es el que se usó y es el ref de `origin/HEAD`.

```bash
git fetch origin main && git checkout -B feature/build-produccion-1029 origin/main
```

## 2. Entorno y estado inicial

| Dato | Valor |
|---|---|
| Node | `v20.20.2` |
| npm | `10.8.2` |
| react-scripts | `5.0.1` |
| CRACO | `@craco/craco` (config en `ciudadan_frontend/craco.config.js`) |
| CPUs (`nproc`) | **2** |
| `node_modules` | Ya instalado (no se requirió `npm install`) |

### 2.1 Estado inicial de memoria (cgroup)

```
$ free -m
               total        used        free      shared  buff/cache   available
Mem:           11925        7318        2674           5        2161        4607

$ cat /sys/fs/cgroup/memory.max
4194304000          # <-- 3.906 GiB  (NO 4.75 GiB)

$ cat /sys/fs/cgroup/memory.current
1878589440          # ~1.75 GiB ya en uso antes de compilar
```

**Dato crítico:** el tope real del cgroup de este contenedor es **4 194 304 000 bytes = 3.906 GiB**,
no los "~4.75 GiB" que menciona el enunciado de la tarea. Ver §5.

### 2.2 Procesos node/craco vivos al inicio

```
 73 244128 node .../ciudadan_backend_26/node_modules/.bin/strapi develop
120 188816 /usr/lib/node_modules/cline/bin/.cline --cline-hub-daemon ...
174  21308 .../esbuild-loader/.../esbuild --service=0.16.17 --ping
494   1472 bash -c while true; do set -a; . /etc/agent/env/services.env; ... npm start ...   # watchdog socket
512   1136 sh -c node -e "..." && tsx server.js
520  14708 node .../socket-service/node_modules/.bin/tsx server.js
531  69916 /opt/node22/bin/node --require .../tsx/dist/loader.mjs server.js
192265 1460 sh -c craco start                                                             # <-- dev server frontend
192266 27660 node .../ciudadan_frontend/node_modules/.bin/craco start
192273 1829280 node .../ciudadan_frontend/node_modules/@craco/craco/dist/scripts/start.js  # <-- ~1.75 GiB RSS
192321 75688 .../fork-ts-checker-webpack-plugin/.../TypeScriptReporterRpcService.js
192322 74776 .../fork-ts-checker-webpack-plugin/.../TypeScriptReporterRpcService.js
```

Había **un dev server de craco vivo (PID 192273, ~1.75 GiB RSS)** y **dos procesos de
fork-ts-checker** (~150 MiB RSS). También había un watchdog que lo relanzaba.

## 3. Detención de los dev servers (paso obligatorio)

```bash
pkill -f craco/dist/scripts/start.js
```

Después de la detención se confirmó con `ps -eo pid,rss,args | grep -E 'craco|react-scripts'`:

```
--- fin lista procesos craco ---
```

**Cero dev servers de craco vivos.** También se detuvieron (temporalmente) los servicios co-tenant
del mismo contenedor que compiten por el mismo cgroup:

- `strapi develop` (backend) — ~480 MiB RSS entre el proceso y su hijo,
- `socket-service` (tsx server.js) — ~85 MiB RSS,
- sus dos watchdogs `while true; ... sleep 5`.

> **Los servicios fueron restaurados al terminar** (mismos comandos y misma forma de watchdog).
> Ver §7.

## 4. Resultado del build

### 4.1 Veredicto: **OK** ✅

| Métrica | Valor |
|---|---|
| **Código de salida** | **`0`** |
| **Duración real** | **125 s** (2 min 05 s) |
| Ventana de reloj | `2026-10-29T08:47:42Z` → `2026-10-29T08:49:47Z` |
| Tope de memoria (cgroup `memory.max`) | `4194304000` bytes (3.906 GiB) |
| **Pico de memoria (cgroup `memory.current`)** | **`3536740352` bytes = 3.294 GiB (84.3 % del tope)** |
| Pico de memoria del proceso de build (RSS) | `1994980` KiB = 1.903 GiB |
| Pico de memoria anónima (`memory.stat: anon`) | `2616496128` bytes = 2.437 GiB |
| Memoria al final del build | `1444159488` bytes = 1.345 GiB |
| Muestras tomadas | 42 (cada 3 s) |

**Comando exacto usado (el que terminó bien):**

```bash
cd /workspace/ciudadan_app_monorepo/ciudadan_frontend
CI=false DISABLE_ESLINT_PLUGIN=true GENERATE_SOURCEMAP=false NODE_OPTIONS=--max-old-space-size=1024 npx craco build
```

> Ver §5: con `--max-old-space-size=3584` (el valor de la receta original del enunciado) el build
> **no cabe** en este cgroup y muere por OOM. El valor `1024` es el que deja el build dentro del
> presupuesto de memoria. Las demás flags son idénticas a la receta original.

### 4.2 Artefacto generado (verificado)

| Dato | Valor |
|---|---|
| `build/index.html` | **existe** — 1310 bytes, generado 08:49 |
| Tamaño total de `build/` | **104 896 642 bytes (101 MiB)** |
| Número de archivos | **122** |
| `build/static/js/main.1b4438af.js` | 5 414 313 bytes (1.52 MB gzip) |
| `build/static/css/main.fdbdefd4.css` | 102 445 bytes (20.18 kB gzip) |

El build **no se borró**. `build/` está en `.gitignore` (`ciudadan_frontend/.gitignore:5:/build`),
por lo que el árbol de trabajo sigue limpio (`git status --short` vacío).

### 4.3 Advertencias del build (no solo errores)

El build **compiló sin errores y sin warnings de ESLint** (el plugin de ESLint está desactivado por
`DISABLE_ESLINT_PLUGIN=true`, y CRA confirma `Cannot find ESLint plugin (ESLintWebpackPlugin).`).
Las advertencias que CRA emite son de tamaño de bundle, no de código:

1. **`The bundle size is significantly larger than recommended.`**
   `build/static/js/main.1b4438af.js` = 1.52 MB gzip. CRA sugiere *code splitting*
   (<https://goo.gl/9VhYWB>) y analizar dependencias (<https://goo.gl/LeUzfb>).
   **No bloquea el build**, pero es la causa raíz de que el build consuma tanta memoria: sin
   *code splitting*, webpack + terser deben mantener el bundle completo en el heap a la vez.
2. **`The project was built assuming it is hosted at /.`** — informativo; se controla con el
   campo `homepage` de `package.json`. No es un problema mientras el frontend se sirva en la raíz.
3. **`Cannot find ESLint plugin (ESLintWebpackPlugin).`** — informativo, consecuencia directa de
   `DISABLE_ESLINT_PLUGIN=true` (el plugin no está instalado en `node_modules`). Los errores de
   ESLint que bloquean el build en otros flujos quedan **fuera de la evidencia de este build**.

> **Nota sobre ESLint:** al estar el plugin desactivado, este build **no valida el lint del código**.
> La evidencia cubre exclusivamente que **el bundle de producción se genera sin errores**. Cualquier
> error de lint sigue siendo responsabilidad del flujo de CI que corra ESLint por separado.

## 5. Diagnóstico: por qué la receta original (`--max-old-space-size=3584`) falla

Antes del build exitoso se hicieron varios intentos controlados. **Todos los fallos fueron OOM del
cgroup (no errores de código).** La evidencia:

| # | Heap cap | Servicios co-tenant | Build concurrente | Resultado | Pico `memory.current` |
|---|---|---|---|---|---|
| 1 | 3584 MB | dev server craco **vivo** (~1.75 GiB) | no | ❌ OOM | 4 194 250 752 (tope) |
| 2 | 3584 MB | detenidos | no | ❌ OOM | 4 194 238 464 (tope) |
| 3 | 2048 MB | detenidos | no | ❌ OOM | 4 194 238 464 (tope) |
| 4 | 1536 MB | detenidos | no | ❌ OOM | 4 194 291 712 (tope) |
| 5 | 3072 MB | detenidos | no | ❌ OOM | 4 194 263 040 (tope) |
| 6 | **1024 MB** | detenidos | no | ❌ OOM | 4 166 008 832 — *contaminado por build de un agente par* |
| 7 | **1024 MB** | detenidos | **no** | ✅ **OK (125 s)** | **3 536 740 352 (84.3 % del tope)** |

**Prueba de que es OOM y no un error de código** — contadores del cgroup durante las corridas:

```
$ cat /sys/fs/cgroup/memory.events
low 0
high 0
max 55538          # <-- eventos por alcanzar memory.max
oom 9              # <-- veces que el cgroup quedó sin memoria
oom_kill 9         # <-- procesos MATADOS por el OOM killer

$ cat /sys/fs/cgroup/memory.peak
4196405248         # <-- pico por encima de memory.max (4194304000)
```

`oom_kill` se incrementó en cada intento fallido, y `memory.peak` superó `memory.max`: el kernel
mató el proceso de build. El mensaje de CRA fue siempre el mismo:

```
                    The build failed because the process exited too early.
                    This probably means the system ran out of memory or someone called
                    `kill -9` on the process.
```

### Causa raíz

**El enunciado de la tarea subestima el tope del cgroup y el tamaño real del build.**

1. `memory.max` real = **3.906 GiB**, no ~4.75 GiB.
2. El build necesita ~**2.6–2.9 GiB** de RSS en el proceso (webpack + terser en *worker threads*,
   o sea un solo proceso; `terser-webpack-plugin` 5.6.1 con `numWorkers = min(assets, cores-1)`).
3. Con los servicios co-tenant vivos (~1.5 GiB) **no queda espacio**: el build muere al tocar el tope.
4. Un `--max-old-space-size` **alto es contraproducente**: le permite a V8 crecer hasta el tope en
   lugar de collectedor de basura (GC) agresivamente y liberar memoria. Con `1024` el GC es más
   frecuente y el pico se queda en **3.29 GiB**, dejando margen.

### Nota operativa: concurrencia en el contenedor

Durante la corrida se detectaron **agentes pares ejecutando builds de forma concurrente** sobre el
mismo cgroup (procesos `run-build*.sh` ajenos y archivos `*.peer*` en `/tmp`). Eso:

- contaminó la medición de memoria del intento 6 (por eso se repitió la medición final sin
  builds concurrentes), y
- **es un riesgo real de OOM para el operador**: dos builds simultáneos en este cgroup no caben.

Los logs de los intentos fallidos quedaron preservados en `/tmp/build-produccion*.log` y
`/tmp/build-mem-samples*.log`; el log completo del build exitoso en
**`/tmp/build-produccion.log`** y la muestra de memoria en `/tmp/build-mem-samples.log`.

## 6. Ventana de build recomendada para el operador

| Parámetro | Valor |
|---|---|
| **Duración real** | **125 s** (~2 min) |
| **Margen recomendado** | **×3 → ~6 min (360 s)** |
| **Ventana total a reservar** | **10 min** (incluye arranque, `npx`, y frenado de servicios) |
| **Memoria libre a garantizar** | **≥ 3.5 GiB disponibles** en el cgroup antes de arrancar |

**Qué hay que detener ANTES de compilar** (en este orden):

1. **Todos los dev servers de craco:** `pkill -f craco/dist/scripts/start.js`
   (consumían ~1.75 GiB RSS + ~150 MiB de fork-ts-checker).
2. **Los watchdogs que los relanzan** (si existen): son bucles `while true; ... sleep 5` que
   arrancan `npm start` otra vez a los 5 s. Si no se detienen, el dev server reaparece y se
   reproduce el OOM. Verificar con `ps -eo pid,args | grep craco` hasta que no salga nada.
3. **Los servicios co-tenant del mismo contenedor** (backend `strapi develop` y `socket-service`),
   si van a compartir cgroup: ~565 MiB RSS entre ambos. Detener sus watchdogs **primero**,
   porque los procesos hijos se relanzan solos.
4. **Verificar que no haya otro build en curso** (`pgrep -af 'craco/dist/scripts/build.js'`):
   dos builds concurrentes en este cgroup no caben.

**Orden de parada verificado en esta corrida:**

```bash
# 1) watchdogs primero (si no, los hijos se relanzan)
pkill -f 'while true; do NODE_OPTIONS=--max-old-space-size=1500 npm run develop'
pkill -f 'while true; do set -a; . /etc/agent/env/services.env'
# 2) despues los procesos
pkill -f craco/dist/scripts/start.js
pkill -f 'ciudadan_backend_26/node_modules/.bin/strapi develop'
pkill -f 'socket-service/node_modules/.bin/tsx server.js'
# 3) confirmar que no queda nada
ps -eo pid,rss,args | grep -E 'craco|react-scripts|strapi develop|socket-service' | grep -v grep
```

## 7. Receta reproducible (en una caja)

```bash
# 0) una medida de seguridad: si falta node_modules, reportar y NO instalar masivamente desde la red
ls ciudadan_frontend/node_modules >/dev/null 2>&1 || echo "FALTAN node_modules: se requiere 'npm ci'"

# 1) DETENER: dev servers de craco + watchdogs que los relanzan + servicios co-tenant
pkill -f 'while true; do NODE_OPTIONS=--max-old-space-size=1500 npm run develop' 2>/dev/null
pkill -f 'while true; do set -a; . /etc/agent/env/services.env' 2>/dev/null
pkill -f craco/dist/scripts/start.js
pkill -f 'ciudadan_backend_26/node_modules/.bin/strapi develop'
pkill -f 'socket-service/node_modules/.bin/tsx server.js'

# 2) CONFIRMAR que no queda ninguno (y que no hay otro build en curso)
ps -eo pid,rss,args | grep -E 'craco|react-scripts|strapi develop|socket-service' | grep -v grep
pgrep -af 'craco/dist/scripts/build.js'    # debe salir vacio

# 3) BUILD (desde ciudadan_frontend/)
cd ciudadan_frontend
CI=false DISABLE_ESLINT_PLUGIN=true GENERATE_SOURCEMAP=false NODE_OPTIONS=--max-old-space-size=1024 npx craco build

# 4) VERIFICAR
test -f build/index.html && echo "OK: build/index.html existe"
du -sh build && find build -type f | wc -l

# 5) RESTAURAR los servicios detenidos
```

Flags y su efecto (los mismos del build exitoso):

| Flag | Efecto |
|---|---|
| `CI=false` | No convierte warnings en errores; el build no se detiene por avisos. |
| `DISABLE_ESLINT_PLUGIN=true` | Evita el plugin de ESLint (no instalado) y el build no se rompe por lint. **Consecuencia: este build no valida lint.** |
| `GENERATE_SOURCEMAP=false` | Elimina la generación de source maps: ahorra memoria y tiempo. |
| `NODE_OPTIONS=--max-old-space-size=1024` | **El flag crítico en este contenedor.** Limita el heap de V8 para que el GC libere memoria antes de tocar el tope del cgroup. |

> Si en otro contenedor el tope de cgroup es de ~4.75 GiB (como supone el enunciado), entonces
> `--max-old-space-size=3584` sí cabe y da un build más rápido. **El valor correcto depende del
> `memory.max` real del contenedor**: elegir `min(3584, memory.max/4 - margen)`.

## 8. Conclusión

- **`main` (`0e5f6c1`) compila.** Build de producción **OK**, código de salida `0`, artefacto
  `build/index.html` generado, 101 MiB / 122 archivos, bundle principal 1.52 MB gzip.
- El frontend **no tiene errores de compilación**; las únicas advertencias son de **tamaño de bundle**.
- La receta original del enunciado (`--max-old-space-size=3584`) **no es viable en este contenedor**
  porque el tope real es 3.906 GiB, no ~4.75 GiB. Con `1024` el build pasa con 16 % de margen.
- **Ventana para el operador: 10 min** (125 s reales + margen), parando antes el dev server de craco,
  sus watchdogs, los servicios co-tenant del mismo cgroup, y garantizando que no haya otro build
  en curso.
- **No se modificó código fuente ni dependencias**; el único cambio en la rama es este documento.


