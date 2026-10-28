# Triage de ramas estancadas — 2026-10-27

**Base de análisis:** `main` @ `6fe67bb` (árbol limpio, sincronizado con `origin/main` tras `git fetch origin`).
**Autor:** agente de desarrollo (triage de ramas).
**Alcance:** SOLO análisis y documentación. No se fusionó, borró ni reescribió ninguna rama.

## Resumen ejecutivo

- `git branch -r --no-merged main` devuelve **11 refs remotas**. El repo tiene dos remotos (`origin` y `github-ssh`) que apuntan al **mismo repositorio GitHub** (`CiudadanMexico/ciudadan_app_monorepo`), por eso varias ramas aparecen duplicadas.
- **En pausa por decisión del operador (NO analizadas, NO tocadas):** `origin/feature/integracion-hackabot` y `origin/integration/revision-adrian1`. Solo se mencionan aquí.
- **Espejos exactos (mismo SHA que su homónima en `origin`):** `github-ssh/feature/abraham-gana` (75fc9a9), `github-ssh/feature/coworkv2` (19d27c4), `github-ssh/feature/taxis-trips` (99b873b). La recomendación aplica a ambos refs (rama y espejo).
- **6 ramas analizadas a fondo.** Ninguna tiene más de **1 commit único** vs main y **ninguna contiene trabajo pendiente de valor: todo su contenido útil YA vive en `main`** (verificado con `git cherry` por equivalencia de parches, con el diff neto `git diff main <rama>` y con inspección directa de los archivos en main). **Recomendación: DESCARTAR las 6.**
  - `feature/abraham-gana` — punto de fusión obsoleto de `feature/blockchain-jando` (rama ya integrada en main); el fix Auth0 `offline_access`/`missing_refresh_token` ya está en main.
  - `feature/coworkv2` — snapshot pre-integración del módulo CoWork: todo ya está en main; además arrastra basura de Windows (`run_live.log` de 8603 líneas, `strapi-win.log`, `less.exe.stackdump`, `.obsidian/` y un archivo perdido llamado `main`).
  - `feature/taxis-trips` — los 4 fixes de su commit único ya están en main (rename `gettters.js`→`getters.js`, `audience` correcta en RegistroPasajero, `Authorization` con token Auth0 en PreRegistroConductor2, `STRAPI_TOKEN` en setters/getters).
  - `feature/agente1-adrian-loginredirect` — docs (flujo Auth0 §2.1 + regla de oro del deploy adrian1) ya integrados en main y superados: el diff neto de docs contra main es **+1/−1841** (solo restaría contenido).
  - `feature/frontend-daniel-sepulveda` — el fix de `CalificarCompras.jsx` está en main **idéntico byte a byte** (diff neto del archivo: 0 líneas).
  - `github-ssh/agent/temporal1-agent3` — variante residual: el trabajo real se integró a main vía `origin/agent/temporal1-agent3` (ancestro de main, commit de integración `63b0531`) y el `AGENTS.md` vigente de main ya contiene los highlights 2026-10-14 (wiki con 32 docs, 13 seeds, regla de oro Node 22).
- **Fusionar cualquiera de las 6 hoy sería destructivo** (main evolucionó 57–418 commits desde sus bases): los diffs netos van de **−18 670 a −130 263 líneas**. Ninguna es mergeable tal cual.
- ⚠️ **Observación de seguridad (hallazgo, sin acción en este triage):** `api.js` (raíz del repo) y el final de `ciudadan_backend_26/middleware/src/routes/auth0.js` contienen **bloques de código ofuscado** (patrón de ofuscación/packer JS; contenido NO reproducido en este documento). **Ya están presentes en main** y las ramas viejas cargan variantes distintas de esos bloques. Se recomienda una tarea de revisión de seguridad dedicada (proveniencia y comportamiento en runtime) antes de considerar cualquier fusión de ramas antiguas.
- **Higiene del repo (tarea aparte, fuera de alcance):** main rastrea archivos basura: `main` (archivo con un mensaje de commit perdido — además provoca la ambigüedad "main: both revision and filename" en git), `strapi-win.log`, `ciudadan_backend_26/strapi-win.log`, `less.exe.stackdump`, `ciudadan_backend_26/socket-service/run_live.log` y `buildlog.txt` (vacío).
- **Incidencias del proceso (documentadas, no bloqueantes):** git exigió `safe.directory` para el workspace (resuelto con excepción local) y el archivo rastreado llamado `main` obligó a usar `main^{commit}` en los diffs. Ningún comando de análisis falló de forma bloqueante.

## Tabla — inventario y recomendación por rama

| Rama | Commits únicos vs main (máx. 20) | Archivos principales tocados | ¿Contenido ya en main? | Recomendación | Justificación (1 línea) |
|---|---|---|---|---|---|
| `origin/feature/abraham-gana` (= espejo `github-ssh/feature/abraham-gana`) | **1**: `75fc9a9` "Merge remote-tracking branch 'origin/feature/blockchain-jando'" (Ciudadan, 2026-10-08) | Merge real (vs 1er padre): `CrearBilleteraCentralWld.jsx` (+16), `api.js`, `auth0.js`. Diff `main...rama`: 63 archivos, +5632/−135 (inflado por bases de fusión cruzadas; incluye docs `tarea-lideres-verdes.md`, `oracle-agents.md`, `despliege_produccion.md`, `scripts/set-roles.js`, `seed/site-settings.js`) | **SÍ** — `blockchain-jando` ya está fusionada en main (no aparece en `--no-merged`); el fix `offline_access`/`missing_refresh_token` está en main (`CrearBilleteraCentralWld.jsx` líneas 26/29); docs y scripts existen en main | **DESCARTAR** | Punto de fusión obsoleto: `blockchain-jando` ya vive en main y la rama va 418 commits atrás; fusionarla hoy borraría ~130 263 líneas. |
| `origin/feature/coworkv2` (= espejo `github-ssh/feature/coworkv2`) | **1**: `19d27c4` "Merge remote-tracking branch 'origin/main' into feature/coworkv2" (rowanabisaiutp, 2026-10-08) | Diff `main...rama`: 236 archivos, +35043/−2987. Destaca basura: `run_live.log` (+8603), `strapi-win.log`, `less.exe.stackdump`, `.obsidian/*`, archivo `main`. Código: `socket-service/server.js` (+182), `routes/mercadopago.js` (+519), `testTrip.js`, `aceptarViaje.js` | **SÍ** — `git cherry` sin parches únicos; `mercadopago.js` y el resto del socket-service ya están en main | **DESCARTAR** | Snapshot pre-integración sin contenido único (todo ya en main) que además arrastra logs y basura; fusionarla borraría ~93 996 líneas. |
| `origin/feature/taxis-trips` (= espejo `github-ssh/feature/taxis-trips`) | **1**: `99b873b` "Fixing driver verification module" (adrian77BRO, 2026-10-08) | 10 archivos, +70/−60: `PreRegistroConductor2.jsx`, `RegistroPasajero.jsx`, `DriverVerificationPage.jsx`, `ConductoresAgencia.jsx`, `Routes/index.jsx`, rename `gettters.js`→`getters.js`, `setters.js`, `components.d.ts` (regenerado) | **SÍ** — los 4 fixes ya están en main: import `getters` (`DriverVerificationPage.jsx` línea 33), `audience: "https://api.ciudadan.org"` (`RegistroPasajero.jsx` línea 178), `getAccessTokenSilently` + `Authorization` en el PUT (`PreRegistroConductor2.jsx` líneas 664/707), `STRAPI_TOKEN` por defecto (`setters.js`) y header en `getValidationReviewBundle` (`getters.js`) | **DESCARTAR** | Los fixes reales ya viven en main; lo único no fusionado es cosmético (espacios) y churn del archivo generado. |

| `origin/feature/agente1-adrian-loginredirect` | **1**: `127176c` "docs: conocimiento completo para agentes — regla de oro deploy adrian1 (build estático, push no despliega), trampas Auth0 verificadas, enfoques revertidos y estado vigente" (Ciudadan MX, 2026-10-14) | 7 archivos, +86/−11: `docs/03-Frontend.md` (+22), `docs/deploy-adrian1-local.md` (+43/−11), `docs/AGENTS.md` (+23), `docs/06-Ramas-y-Git.md` (+4), `docs/README.md` (+1), `api.js`, `auth0.js` | **SÍ** — main ya tiene la §2.1 del flujo Auth0 (returnTo / logoutAqui / Allowed Logout URLs, `docs/03-Frontend.md` líneas 87–117), el runbook `docs/deploy-adrian1-local.md` y highlights equivalentes en `AGENTS.md`; diff neto de docs vs main: **+1/−1841** | **DESCARTAR** | Conocimiento documental ya integrado y superado en main; fusionar la rama solo restaría docs más nuevos (−1841 líneas). |
| `origin/feature/frontend-daniel-sepulveda` | **1**: `cd57e09` "fix(frontend): CalificarCompras — getToken/authHeaders como props de CalificarItem (build del runner roto tras merge adrian: no-undef)" (Daniel Sepulveda Chiguils, 2026-10-15) | 3 archivos, +5/−3: `MarketPlace/CalificarCompras.jsx` (+4: props `getToken`/`authHeaders` a `CalificarItem`), `api.js`, `auth0.js` | **SÍ** — idéntico byte a byte: main ya declara las props (línea 61) y las pasa (líneas 297–298); diff neto del archivo contra main: **0 líneas** | **DESCARTAR** | El fix ya está en main exactamente; solo restan el `api.js`/`auth0.js` con blobs ofuscados que NO deben propagarse. |
| `github-ssh/agent/temporal1-agent3` (sin espejo útil en `origin`: `origin/agent/temporal1-agent3` ya es ancestro de main) | **1**: `b90e5c8` "docs(agents): destacar la wiki operativa, seeds verificados y la regla de oro Node 22" (yizuz, 2026-10-15) | 2 archivos, +46/−2: `AGENTS.md` raíz (+29), `docs/AGENTS.md` (+19) | **SÍ** — el trabajo se integró a main vía `origin/agent/temporal1-agent3` (ancestro de main; commit de integración `63b0531` "merge: wiki operativa + seeds verificados + tipos regenerados") y el `AGENTS.md` de main ya contiene los highlights 2026-10-14 (wiki 32 docs, 13 seeds, regla Node 22, gotchas 14–15); diff neto de `AGENTS.md` vs main: +2/−28 | **DESCARTAR** | Variante residual del mismo trabajo ya fusionado por otra vía; su contenido fue superado por el AGENTS.md vigente de main. |
| `origin/feature/integracion-hackabot` | — | — | — | **EN PAUSA** | Decisión del operador: no se analiza ni se toca en este triage. |
| `origin/integration/revision-adrian1` | — | — | — | **EN PAUSA** | Decisión del operador: no se analiza ni se toca en este triage. |

## Detalle — qué implicaría fusionar cada rama hoy

Datos: commits atrás de main (`rev-list --count rama..main`) y diff neto `git diff main^{commit} <rama>` (lo que cambiaría el árbol si se fusionara/resolviera sobre main actual).

| Rama | Commits atrás | Diff neto vs main | Lectura |
|---|---|---|---|
| `origin/feature/abraham-gana` | 418 | 960 archivos, +17788/−130263 | Destructor: revertiría wiki, seeds y semanas de integración. |
| `origin/feature/coworkv2` | 361 | 754 archivos, +15249/−93996 | Destructor: además reinyectaría logs y basura de Windows. |
| `origin/feature/taxis-trips` | 358 | 746 archivos, +15304/−93542 | Destructor; el 100 % del valor ya está en main. |
| `origin/feature/agente1-adrian-loginredirect` | 123 | 266 archivos, +1731/−22739 | Restaría docs/infra nueva (wiki, repartidores, etc.). |
| `origin/feature/frontend-daniel-sepulveda` | 62 | 155 archivos, +369/−19161 | Restaría casi todo lo integrado en octubre. |
| `github-ssh/agent/temporal1-agent3` | 57 | 142 archivos, +265/−18670 | Restaría gotchas y docs vigentes de main. |

Notas de verificación clave (evidencia):

- `git cherry main <rama>`: **vacío** para `abraham-gana` y `coworkv2` (ningún parche único; sus commits únicos son merges de contenido ya fusionado). Con `+` (parche no equivalente) para `taxis-trips` (99b873b), `agente1` (127176c), `daniel` (cd57e09) y `temporal1` (b90e5c8) — pero en los cuatro casos el contenido útil ya existe en main en otra forma (ver tabla).
- `feature/blockchain-jando` existe como rama remota pero **no aparece en `--no-merged`** → ya está fusionada en main.
- El archivo rastreado llamado `main` (raíz) contiene un mensaje de commit perdido ("merge: fix logout + duplicado de usuarios -"); está en main y en coworkv2.
- Los diffs `main...rama` de `abraham-gana` y `coworkv2` reportan bases de fusión múltiples ("multiple merge bases") — por eso sus stats de 3 puntos están inflados con versiones viejas de archivos que main ya superó; el dato accionable es el diff neto de arriba.

## Ramas en pausa (solo mención)

- `origin/feature/integracion-hackabot` — **en pausa** por decisión del operador. No analizada, no modificada.
- `origin/integration/revision-adrian1` — **en pausa** por decisión del operador. No analizada, no modificada.

## Metodología

Comandos usados (todos de solo lectura sobre refs; ningún `merge`, `rebase`, `reset`, `push --delete` ni edición de ramas):

```bash
git fetch origin
git branch -r --no-merged main
git log main..<rama> --oneline | head -20        # commits únicos (todas tuvieron 1)
git diff --stat main...<rama>                     # archivos tocados (3-dot)
git diff --stat main^{commit} <rama>              # diff neto vs main actual
git rev-list --count main..<rama> / <rama>..main  # únicos / atrás
git cherry main <rama>                            # equivalencia de parches
git show main^{commit}:<archivo> | grep ...       # verificación de contenido en main
git merge-base --is-ancestor <ref> main           # integración previa (temporal1)
git show -s --format='%h | %an | %ci | %s' <sha>  # autoría/fechas
```

## Estado final

- Rama de trabajo: `feature/triage-ramas-1027` (creada desde `main` @ `6fe67bb`), único cambio: este documento.
- No se fusionó nada, no se borró ninguna rama (local o remota), no se tocaron las ramas en pausa, no se reiniciaron servicios ni se modificó el entorno.
- Próximos pasos sugeridos (decisiones del operador, fuera de este triage): (1) borrar los refs indicados como DESCARTAR cuando se confirme; (2) abrir tarea de revisión de seguridad para `api.js` y `auth0.js`; (3) abrir tarea de higiene para des-rastrear logs/basura; (4) retomar las dos ramas en pausa cuando el operador lo decida.



