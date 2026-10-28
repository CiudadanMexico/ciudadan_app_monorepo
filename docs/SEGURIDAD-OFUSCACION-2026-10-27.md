# SEGURIDAD — Bloques ofuscados: `api.js` y `middleware/src/routes/auth0.js` (análisis estático)

- **Fecha:** 2026-10-27 · **Informe:** SEGURIDAD-OFUSCACION-2026-10-27
- **Rama de trabajo:** `feature/seguridad-ofuscacion-1027` (creada desde `main` = `6fe67bb`; **local, sin push**)
- **Analista:** Agente de seguridad — revisión estática
- **Objetos:** `api.js` (raíz del monorepo) y `ciudadan_backend_26/middleware/src/routes/auth0.js` — ambos **ya presentes en `main`**
- **Origen del pedido:** el triage de ramas (`feature/triage-ramas-1027`, doc ya en remoto) reportó bloques ofuscados (patrón packer/ofuscación JS) en ambos archivos.

**Reglas cumplidas durante el análisis:** el código ofuscado **no se ejecutó bajo ningún medio** (ni `node`, ni REPL, ni consola de navegador, ni `eval`/`Function`); el descifrado se realizó **reimplementando en Python** las rutinas de decodificación (procesamiento puro de texto, equivalente a decodificar a mano); no se imprimió ningún secreto ni token de la plataforma; no se modificó ni borró archivo alguno del repositorio (este documento es el único cambio); no se realizó ninguna petición de red hacia la infraestructura del atacante.

---

## 1. Resumen ejecutivo

**VEREDICTO PRELIMINAR: MALIGNO** — *backdoor / loader de segunda etapa* que resuelve sus servidores de C2 (comando y control) **a través de la blockchain de Ethereum** y luego **descarga y ejecuta código remoto arbitrario** (`eval` en proceso + proceso `node` desacoplado y oculto). **Nivel de certeza: muy alto.**

Hechos clave:

1. Ambos archivos portan **el mismo payload exacto** tras el descifrado: 16,674 caracteres de JavaScript legible, **idénticos byte a byte** entre `api.js` y `auth0.js`.
2. **No es minificación legítima** de librería alguna: no hay créditos ni licencias, no corresponde a ningún bundler conocido, y usa evasión deliberada (`eval`/`Function` ocultos, cero literales legibles, relleno de tabuladores, marcadores de versión, inyección en merges).
3. El historial del propio repo **ya lo había clasificado como malicioso dos veces** — removido en `cdbf239` (2026-09-02, *"payload ofuscado (bot minero ETH)"*) y en `cbe2c96` (2026-09-11, *"backdoor que resuelve su C2 via una transaccion de Ethereum y ejecuta un payload remoto descargado"*) — y **volvió a entrar** varias veces después.
4. La variante actual y la anterior difieren **únicamente en la dirección Ethereum del C2** (rotación de infraestructura de la campaña).
5. La auditoría `docs/REPARTIDORES-MVP-FASE-A-AUDITORIA.md` (2026-10-22) ya lo había señalado como hallazgo 🔴 (`routes/auth0.js:56`).

**Recomendación: QUITAR** (eliminar `api.js` de la raíz y restaurar `routes/auth0.js` a su versión limpia), junto con forense del entorno que genera los commits, rotación de secretos y controles de CI. Detalle en §8.

---

## 2. Archivos y líneas exactas afectadas

### 2.1 `api.js` (raíz del monorepo) — TODO el archivo es el bloque ofuscado

| Propiedad | Valor |
|---|---|
| Líneas afectadas | **Línea 1 (única línea del archivo)** |
| Tamaño | 28,199 bytes, 1 línea, sin salto de línea final |
| Estructura | 235 tabuladores de relleno; el código inicia en el **byte 236** |
| Blob git en `main` | `b4ee11414b3c62c3f6b3975924cf2484fcfa9a52` |
| Marcador de versión embebido | `'8-&&'` (guardado en `global['!']`) |
| Referencias en el repo | **Ninguna** (nada lo importa ni lo invoca). En toda la historia **nunca existió una versión legítima** de este archivo: nació infectado en el merge `54dd5f1` (2026-10-09) |

### 2.2 `ciudadan_backend_26/middleware/src/routes/auth0.js` — bloque pegado al final

| Propiedad | Valor |
|---|---|
| Líneas legítimas | 1–55 (1,324 bytes): ruta Express `POST /auth0-login` con `verifyAuth0Token` — sin hallazgos |
| **Línea afectada** | **56** — 12,674 caracteres: `export default router;` + relleno de tabuladores + bloque ofuscado. El bloque inicia en el **byte 1,682 del archivo** con `global['!'] = '8-2791'` |
| Tamaño total | 13,999 bytes (1,324 legítimos + 12,675 del bloque) |
| Blob git en `main` | `9ad71b74387ee50b17f23e474a14c7fdbf65d941` |
| Versión limpia de referencia | blob `11ae417b9ee848000190346cbceca381b1485ae3` (1,347 bytes) — estado tras las remociones de septiembre |
| ¿Se importa hoy? | **No** — `middleware/src/index.js` solo monta `./routes/conductores.js`; grep de importaciones en todo el repo: 0 resultados |

**Barrido del árbol de trabajo** (excluyendo `node_modules`): los **únicos** archivos con marcadores del packer son `api.js` y `middleware/src/routes/auth0.js` (más la mención textual en `docs/REPARTIDORES-MVP-FASE-A-AUDITORIA.md:19`). `middleware/src/auth0.js` (helper de verificación RS256), `proxy.js`, `strapiService.js`, `index.js` y `routes/conductores.js` están limpios.

## 3. Anatomía del empaquetado (qué es, sin reproducir el código)

Es un packer **multicapa a medida** — misma lógica, mismos parámetros numéricos y misma clave de ejecución (`2509`) en ambos archivos — con dos "sabores":

- **`api.js` — sabor array de strings** (estilo *javascript-obfuscator* / obfuscator.io, customizado): array de 23 cadenas codificadas en **hex + XOR de un byte** (clave derivada con aritmética ofuscada; valor efectivo 70), decodificador con caché y **IIFE de rotación** con checksum aritmético — patrón `while(!![]){try{...}}` — que rota el array hasta cuadrar una ecuación. Firma clásica de obfuscator.io.
- **`auth0.js` — sabor literales**: las mismas piezas, pero con strings y parámetros como literales con **escapes unicode** (p. ej. `\u006C\u0065\u006E...` equivale a `length`).

Capas comunes a ambos:

1. **Decodificador propio `y7`**: permutación determinista tipo Fisher-Yates sobre los caracteres del string, parametrizada con 6 números. Lógicamente idéntico en ambos archivos y en las variantes viejas.
2. **Preparación del entorno**: una cadena de `split/join` reconstruye la lista `['r','object','m']` y ejecuta `global['r'] = require` y `global['m'] = module` — el payload correrá construido con `Function`, **sin alcance CommonJS**, y necesitará `require`/`module`.
3. **`Function` oculto**: el nombre de propiedad se descifra como `"constructor"` (recorte `slice(0,11)` de un string descifrado) y se toma `s8["constructor"]` → `Function`. Por eso **no aparece ni un solo literal** de `eval(`, `Function(`, `atob(`, `document.write`, `String.fromCharCode`, `setTimeout(`, ni URLs, IPs o dominios en claro (conteos verificados en 0 en ambos archivos).
4. **Packer de sustitución tipo Dean Edwards (`/packer/`)**: en runtime se construye una función (`Function("", <890 caracteres descifrados>)`) que decodifica el payload final (9,682 caracteres cifrados) mediante sustitución de tokens con **diccionario embebido** + pases de escapes.
5. **Ejecución final**: `Function("", <payload>)(2509)` — el payload corre con un argumento numérico (2509, ofuscado como XOR aritmético).
6. **Marcador de versión** en `global['!']`: `'8-2791'` (auth0.js actual), `'8-&&'` (api.js actual), `'8-&'` (api.js de la variante anterior). El payload lo lee para construir su ID de build (`"A" + global['!']`).

## 4. Comportamiento del payload descifrado (descripción)

IIFE `async` de Node.js (16,674 caracteres) que se ejecuta **en el momento de importarse el archivo**:

1. Recupera `require`/`module` de `global`; importa `http`, `https`, `zlib`, `url`, `child_process.spawn`; fija su ID de build en `global['_V']`.
2. **Resolución de C2 vía blockchain** (sin dominios, sin DNS, resistente a takedowns):
   - Vigila las transacciones salientes de la dirección **`0x1eef0849eda15d87f64e51c73c8442cf3c8bcef3`** (build actual; el build anterior usaba `0xa322E5f3D311D3080e6f0121063e9aDC2490Ef1a`).
   - Consulta RPC públicos de Ethereum — `https://1rpc.io/eth`, `https://eth.drpc.org`, `https://ethereum-rpc.publicnode.com`, `https://eth-mainnet.public.blastapi.io` (más override por `process.env.ETH_RPC_URL`) — y como respaldo el indexer `https://eth.blockscout.com/api`.
   - Localiza la última transacción del emisor con **búsqueda binaria de nonce** (12 sondas en paralelo, bloques candidatos alrededor de múltiplos de 1000) y **decodifica el destinatario `tx.to` (20 bytes) como dos direcciones IPv4**. Al operador le cuesta **una sola transacción** rotar sus servidores C2.
3. Publica endpoints en `global`: `http://<ip1>:80`, `http://<ip2>:80`, `http://<ip1>:443` — esquema `http://` contra puerto 443 (deliberado).
4. **Descarga código de segunda etapa** desde `http://<ip1>:443/0x/cls` y `http://<ip1>:443/0x/ls`:
   - `GET` y, como fallback, `HEAD` leyendo el header **`X-Payload-B64`**; el cuerpo se decodifica con **XOR de clave repetida** (`q4FZkxX{!h,Sr3=@` y `y-p_>d$0B&@^1aQk`).
   - Se hace pasar por Chrome 131 en Windows (User-Agent) y envía un header propio `Sec-V` con su ID de build.
5. **Ejecuta el código descargado** de dos formas: (a) `eval()` en el propio proceso (etapa `/0x/cls`), y (b) `spawn('node', ['-e', <env + código>], {detached: true, stdio: 'ignore', windowsHide: true}).unref()` — **proceso hijo desacoplado, oculto y sin rastro en disco**. Todos los errores se silencian.
6. El contenido de las etapas remotas es **desconocido** (durante este análisis no se descargó ni ejecutó nada); por los antecedentes (`cdbf239`: "bot minero ETH") corresponde presumiblemente al minero/bot real.

### Tabla de IOCs (indicadores de compromiso)

| Tipo | Valor |
|---|---|
| Dirección ETH de C2 (build actual, en `main` hoy) | `0x1eef0849eda15d87f64e51c73c8442cf3c8bcef3` |
| Dirección ETH de C2 (build anterior) | `0xa322E5f3D311D3080e6f0121063e9aDC2490Ef1a` |
| RPC Ethereum | `1rpc.io/eth` · `eth.drpc.org` · `ethereum-rpc.publicnode.com` · `eth-mainnet.public.blastapi.io` |
| Indexer | `eth.blockscout.com/api` |
| Variable de entorno usada | `ETH_RPC_URL` |
| Rutas de segunda etapa | `/0x/cls` y `/0x/ls` sobre `http://<ip>:443` |
| Header de transporte | `X-Payload-B64` |
| Claves XOR de etapa 2 | `q4FZkxX{!h,Sr3=@` · `y-p_>d$0B&@^1aQk` |
| Marcadores del packer (grep) | `global['!'] = '8-2791'` · `global['!']='8-&&'` · `while(!![]){try{` · bloque de >5 KB en una sola línea de un `.js` |

## 5. Veredicto y nivel de certeza

**MALIGNO — backdoor/loader de segunda etapa con C2 por blockchain. Certeza: muy alta (≈98 %).**

Evidencia que sustenta el veredicto:

1. **Descifrado estático completo** (capas del §3): el resultado es inequívocamente un loader de C2; no admite lectura como "minificación de dependencia legítima".
2. **Coincide con las dos caracterizaciones previas del propio equipo**: `cdbf239` (2026-09-02, "bot minero ETH") y `cbe2c96` (2026-09-11, que describe exactamente este mecanismo).
3. **Reinyección por *evil merges***: el contenido infectado aparece en merges cuyo resultado **no existe en ninguno de los dos padres** — `9fd1717` (2026-08-24), `54dd5f1` (2026-10-09) y `dc616e5` (2026-10-26). Un bundle legítimo no "nace" en un merge.
4. **Camuflaje**: los cambios de payload viajan dentro de commits con mensajes ajenos al cambio ("docs(agents)…", "fix(frontend)…", "[WIP-retoma]…").
5. **Evasión técnica deliberada**: `Function`/`eval` ocultos, cero literales, relleno de tabuladores, marcadores de versión y rotación de la wallet C2 entre builds.
6. La **única diferencia** entre el payload anterior y el actual es la dirección Ethereum del C2 (rotación de infraestructura).

Descartado expresamente: **no** es minificación/uglificación de librería conocida, **no** es bundle de terceros, **no** es código del equipo, **no** es un test de seguridad interno.

## 6. Proveniencia completa (arqueología git)

### 6.1 Cronología verificada (commits que introdujeron/retiraron los bloques)

| Fecha | Commit | Autor | Evento |
|---|---|---|---|
| 2026-07-02 | `06f8fe5` | rowanabisaiutp | Import del monorepo. `routes/auth0.js` **limpio** (blob `5736095b`, 1,258 B). No existe `api.js` en raíz. |
| 2026-08-24 | `9fd1717` | DanielSCH952 (merge PR #8 `verify_changes`) | **Primera infección — evil merge**: ambos padres tienen `auth0.js` limpio; el merge entrega el blob `72d0c85e` (36,039 B, generación sin marcador). La rama `verify_changes` **sigue en el remoto** con esa variante. |
| 2026-09-02 | `cdbf239` | Ciudadan | **Remoción #1**: "security: remover payload ofuscado (bot minero ETH) inyectado en middleware auth0" → blob limpio `11ae417b`. |
| 2026-09-04 | `2bd0787` | adrian77BRO | **Reinyección** del mismo `72d0c85e` en un commit funcional ("Fixing trip request…"), con el padre limpio. |
| 2026-09-07 | `9ae9bf5` | Ciudadan | Aparece la variante `fc95572` (8,938 B) en el commit de limpieza de node_modules (citado por `cbe2c96` como punto de reinyección en origin/main). |
| 2026-09-11 | `cefd01b` | Ciudadan | Mantiene/reinyecta `fc95572` (mismo día, horas antes de la remoción). |
| 2026-09-11 | `cbe2c96` | rowanabisaiutp | **Remoción #2**: su mensaje describe el backdoor (C2 vía transacción Ethereum + payload remoto) y la hipótesis de que "una dependencia npm comprometida lo reinyecta en cada instalación" → blob limpio `11ae417b`. |
| 2026-09-13 → 10-08 | `edb83c0`, `4323fdc`, `3419082`, `942b36b`, `144fb3a`, `515ed9b`, `99b873b`, `a318365`, `a1adf52`, `a28c390`, `dd72f8c`, `24b7786`, `f0d883a`, `365ef2b`, … | varios | Circulan en líneas de feature la variante intermedia `f8ed3dbc` (33,355 B) y la familia con marcador: `1dc87e9` (auth0.js, 16,221 B) + `a3ce070d` (api.js, 29,057 B, marcador `'8-&'`), en commits funcionales ajenos al cambio. |
| 2026-10-09 | `54dd5f1` | Ciudadan MX | **Segundo evil merge**: ambos padres **sin** `api.js` y con `auth0.js` **limpio**; el merge **crea `api.js` en raíz** (`a3ce070d`) y re-infecta `routes/auth0.js` (`1dc87e9`). `main` queda infectado. |
| 2026-10-14/15 | `127176c` (Ciudadan MX), `cd57e09` (Daniel S. Chiguils), **`f910a4d` (yizuz \<yizuz@temporal-1\>)** | varios | **Cambio a la variante actual**: api.js `a3ce070d`→`b4ee1141` y auth0.js `1dc87e9`→`9ad71b74` (wallet C2 nueva), en commits con mensajes de docs/fix. **`f910a4d` es ancestro de `main`** — por ahí entró la variante actual a la línea principal. |
| 2026-10-22 | doc `REPARTIDORES-MVP-FASE-A-AUDITORIA.md` | (auditoría) | Documenta el blob actual en `routes/auth0.js:56` como hallazgo 🔴 "en el árbol desde ≥2026-09-30". |
| 2026-10-26 | `a21d848`, `adb6d39`, luego **`dc616e5`** | ciudadanmx / Ciudadan | `dc616e5` ("[retoma] integrar origin/main … con la linea local") deja `main` con los blobs actuales aunque **ambos padres tenían la variante vieja** — tercera resolución de merge que no coincide con ningún padre. |
| 2026-10-27 | `6fe67bb` (HEAD de `main`) | Ciudadan | `main` conserva la infección actual: api.js `b4ee1141` + auth0.js `9ad71b74`. Verificado también en el árbol de trabajo (hashes idénticos). |

### 6.2 Variantes y ramas remotas (108 refs escaneadas) — **sí traen variantes distintas**

| Generación (blobs api.js / auth0.js) | Tamaños | Marcador | Wallet C2 del payload | Refs remotas |
|---|---|---|---|---|
| **Actual** `b4ee1141` / `9ad71b74` | 28,199 / 13,999 B | `8-&&` / `8-2791` | `0x1eef0849…cef3` | **11** — incl. `origin/main`, `feature/triage-ramas-1027`, `feature/wiki-contenido-1027`, `feature/ci-pruebas`, `feature/backend-repartidores-mvp`, `agent/temporal1-agent3`, … |
| **Anterior** `a3ce070d` / `1dc87e9` | 29,057 / 16,221 B | `8-&` / `8-2791` | `0xa322E5f3…Ef1a` | **53** (ambos archivos) + **22** (solo auth0.js) — ramas de feature antiguas de ambos remotos |
| Intermedia — / `f8ed3dbc` | 33,355 B | sin marcador | no decodificada (fuera de main) | **20** (github-ssh/* antiguas) |
| Septiembre — / `72d0c85e` | 36,039 B | sin marcador | no decodificada | **2** (`verify_changes`) |
| Septiembre — / `fc95572` | 8,938 B | sin marcador | removida 2026-09-11 | 0 (solo historia) |

Cada generación inyecta **el mismo payload en ambos archivos** (verificado: el payload de `a3ce070d` es idéntico al de `1dc87e9`; el de `b4ee1141` al de `9ad71b74`). **Ningún merge desde ramas viejas es seguro** sin revisar estos dos archivos.

### 6.3 Observaciones de autoría

Las reinyecciones aparecen en commits de **muchos autores distintos** (adrian77BRO, Ciudadan, Ciudadan Dev Agent, ciudadanmx, Daniel Sepulveda Chiguils, yizuz@temporal-1…) con mensajes ajenos al cambio. El patrón — blobs que aparecen en merges sin existir en ningún padre, swaps silenciosos en commits no relacionados y reinyecciones repetidas durante dos meses — apunta a un **entorno de desarrollo comprometido que reescribe estos dos archivos al momento de commitear**, no a autores malintencionados. Es consistente con la hipótesis ya escrita en `cbe2c96` ("probablemente una dependencia npm comprometida que lo reinyecta en cada instalación").

Nota forense: el commit que trajo la variante actual a la línea de main (`f910a4d`, 2026-10-15) lleva la identidad `yizuz <yizuz@temporal-1>` (una instancia de agente); la identidad configurada en esta máquina es `yizuz@temporal-2`. Vale la pena auditar **todas** las instancias "temporal-*" y las máquinas que generan commits.

## 7. Exposición real actual

- **Hoy no se ejecuta con el wiring actual**: `middleware/src/index.js` solo importa `./routes/conductores.js`; `routes/auth0.js` no se importa en ningún punto del repo y `api.js` de raíz no tiene referencias. La auditoría de repartidores (2026-10-22) además describe el flujo del middleware como roto/no recomendado.
- **Pero es una amenaza latente de severidad CRÍTICA**: el payload se ejecuta **en el momento de la importación del módulo**. Cualquier refactor futuro que monte `POST /auth0-login` (la ruta legítima de las líneas 1–55, documentada en `docs/04-Servicios-Auxiliares.md` §3 como helper del middleware) dispararía el backdoor completo, con acceso a `require` y a **todo el entorno del proceso** (el `.env` del middleware contiene `STRAPI_API_TOKEN` y configuración de Auth0).
- **El mecanismo de reinyección sigue activo**: entre 2026-08-24 y 2026-10-26 hay más de 20 eventos registrados de inyección/reinyección/cambio de variante en main y ramas. Un cleanup que no encuentre el vector solo repite el ciclo — ya ocurrió dos veces (septiembre) y la infección volvió en octubre.

## 8. Recomendación: **QUITAR** (y remediar)

**No dejar el código ofuscado ni "reemplazarlo": eliminar.** Este informe no toca los archivos (la eliminación requiere autorización); pasos propuestos:

1. **Eliminar el artefacto**: borrar `api.js` de la raíz (nunca fue un archivo legítimo) y restaurar `routes/auth0.js` al blob limpio `11ae417b` (estado de `cbe2c96`). Commit dedicado de seguridad + PR a main con revisión de los dos hashes resultantes.
2. **Forense del entorno que genera commits**: auditar las máquinas/instancias de agentes (en particular las identidad `yizuz@temporal-*`): hooks de git (`.git/hooks`, `core.hooksPath`), scripts `postinstall`/`prepare` en `middleware/package.json` y diferencias del lockfile contra el `middleware/node_modules` del disco (presente desde el 2026-10-10), procesos `node -e` desacoplados, units de systemd no documentadas, crontabs. Hipótesis de trabajo (de `cbe2c96`): dependencia npm comprometida o infección local que reescribe estos dos archivos antes de cada commit/merge.
3. **Rotar TODOS los secretos** del backend/middleware/socket (STRAPI_API_TOKEN, APP_KEYS, JWT secrets, credenciales de BD, Stripe, OpenPay, Cloudflare, Auth0) asumiendo que el payload pudo haberse ejecutado en algún despliegue histórico (el nombre "bot minero ETH" del 2026-09-02 sugiere que sí llegó a correr).
4. **Verificar los VPS**: procesos `node -e` ocultos, conexiones salientes hacia los RPC/indexers del §4, consumo anómalo de CPU, units/crontab desconocidos.
5. **CI/CD (prevenir la reinyección)**: fallar el pipeline si (a) el resultado de un merge contiene blobs que no existen en ningún padre (detector de *evil merge*), (b) aparecen los marcadores del §4 (`while(!![]){try{`, `global['!']`, líneas de >5 KB en `.js` fuera de `node_modules`), (c) reaparece un `api.js` en la raíz del repo.
6. **Ramificación**: no borrar las ramas viejas (son evidencia); marcarlas en cuarentena y bloquear merges que toquen `api.js` o `middleware/src/routes/auth0.js` sin revisión de seguridad.
7. **Vigilancia de red**: alertas para conexiones de los servidores de app hacia los RPC/indexers del §4 y para tráfico `http://` con puerto destino 443.
8. **Memoria del repo**: agregar a `AGENTS.md` una nota de que `api.js` (raíz) y `middleware/src/routes/auth0.js` han sido portadores repetidos de un backdoor y deben verificarse en cada integración.

## 9. Método, límites y materiales

- **Qué se hizo**: inspección estática de bytes/líneas/estructura; conteo de tokens; parseo de literales con escapes; **reimplementación en Python** (scripts propios en `/tmp`) de las rutinas de descifrado (`y7` y el packer de sustitución) para obtener el texto del payload — equivalente a decodificar a mano; escaneo de IOCs con regex; arqueología git (`--follow`, `--full-history`, `--find-object`, pickaxe `-S`, comparación de blobs por rama, análisis de padres de merges).
- **Qué NO se hizo**: no se ejecutó nada del código ofuscado (ni `node`, ni REPL, ni navegador); no se usó ningún runtime JS para decodificar; no se hicieron peticiones de red al C2; no se imprimieron secretos de la plataforma (los valores del §4 son IOCs del atacante, no credenciales propias); no se modificó ni borró archivo del repositorio.
- **Límites**: las etapas remotas (`/0x/cls`, `/0x/ls`) no fueron descargadas ni analizadas (su contenido depende del C2 activo en el momento); las variantes de septiembre (`72d0c85e`, `fc95572`, `f8ed3dbc`) solo se tipificaron (tamaño/marcador/rama), no se decodificaron por completo — están fuera de `main`. El veredicto preliminar es por tanto sobre el loader; el impacto final depende de lo que sirva el C2.
- **Materiales para seguimiento** (fuera del repo, en `/tmp` de la máquina de análisis): textos de los payloads descifrados (actual y anterior) y scripts de decodificación reutilizables.




