# CI Hardening — auditoría de `jest.config.js`, variantes del loader y endurecimiento de CI (2026-10-28)

- **Fecha:** 2026-10-28
- **Rama:** `feature/ci-hardening-1028` (creada desde `origin/main` = `56672b6`)
- **Base de la auditoría forense:** `origin/main` = **`9f4eabd`** (main ya purgado: merge de `4d1aec7` "purga urgente del backdoor" + `b9681b0` con la guardia `check-payload-ofuscado.js`). `9f4eabd` es **ancestro** de `56672b6`, que es el `origin/main` vigente al momento de este pase (ya incluye las integraciones de `feature/comunidad-feed-real-1028`, `feature/fleet-status-1028`, `feature/smoke-release-1028` y `feature/seeder-publish-fix-1028`).
- **Estado del clon de trabajo:** el clon original del agente estaba en la base vieja `6fe67bb`, donde `api.js` todavía existía en la raíz. La rama de este trabajo se **reconstruyó desde `origin/main`**; `api.js` no existe en el árbol ni en ningún commit de la rama, y el bloque ofuscado de `auth0.js` no se reintrodujo.
- **Alcance:** auditoría de `jest.config.js` (tarea 1), búsqueda de las variantes A/B/C (tarea 2), endurecimiento de CI (tarea 3), pruebas negativas (tarea 4) y este informe (tarea 5).
- **Reglas cumplidas:** no se ejecutó código sospechoso, no se imprimieron secretos, no se tocó ningún `.env` ni se hizo deploy, no se fusionó a `main`, no se borró ninguna rama y **no se commiteó ninguna muestra maliciosa** (las muestras de las pruebas son inertes y viven en `/tmp`).

## 1. Verificación del estado real de `main` (purgue)

```text
$ git fetch origin
$ git cat-file -e origin/main:api.js
fatal: path 'api.js' does not exist in 'origin/main'      # -> no existe (correcto)

$ git rev-parse origin/main:ciudadan_backend_26/middleware/src/routes/auth0.js
11ae417b9ee848000190346cbceca381b1485ae3
$ git cat-file -s origin/main:ciudadan_backend_26/middleware/src/routes/auth0.js
1347                                                    # -> blob limpio (1,347 B)
```

En el árbol de trabajo tampoco existe `api.js` (`ls api.js` → *No such file or directory*).

## 2. Auditoría de `jest.config.js` (tarea 1)

### 2.1 Contenido actual

**No existe ningún `jest.config.js` en el repositorio:**

```text
$ find . -name 'jest.config.js' -not -path '*/node_modules/*'
(sin resultados)
```

Tampoco hay configuración de Jest en ningún `package.json` (`git grep -n '"jest"' -- '*package.json'` → 0 resultados): el frontend usa el `jest` implícito de `react-scripts` (CRA) y el backend usa `node --test`. Por tanto **no hay carga dinámica sospechosa que auditar** en un `jest.config.js`: no hay `eval`, `Function`, `require` de rutas extrañas, `child_process` ni `fetch` a IPs, porque el archivo no existe.

### 2.2 Historia completa (`git log --all --full-history --follow`)

| Comando | Resultado |
|---|---|
| `git log --all --full-history --follow -- jest.config.js` | 0 líneas (exit 0, sin error) |
| `git log -S "eval(" --all -- jest.config.js` | 0 líneas |
| `git log -S "child_process" --all -- jest.config.js` | 0 líneas |
| `git rev-list --all --objects \| grep -i jest` | **0 objetos** |
| `git log --all --oneline --grep='jest' -i` | 0 commits |
| `git log --all -S '"jest"' -- '*package.json'` | 0 commits |

Cobertura de la búsqueda: **734 commits y 124 refs** (las dos remotas, `origin` y `github-ssh`, apuntan al mismo repositorio).

### 2.3 Conclusión

**El antecedente de septiembre 2026 ("loader/RAT dentro de `jest.config.js`") NO está respaldado por la historia de este monorepo.** El archivo nunca existió en ninguna rama —tampoco en las ramas remotas antiguas (`feature/*`, `github-ssh/*`, `agent/temporal*`)—, por lo que **no hay un commit que lo haya eliminado**: no hay "quién lo eliminó" porque nunca estuvo. Si el antecedente es real, pertenece a otro repositorio/proyecto o a un recuerdo no documentado; conviene confirmarlo con quien lo reportó antes de tratarlo como evidencia de este incidente.

Dato adicional: aunque existiera, un loader en `jest.config.js` sería inerte aquí (no hay runner de Jest en el monorepo). El vector de reinyección **verificado** en este repo es `api.js` (raíz) + `ciudadan_backend_26/middleware/src/routes/auth0.js`.

## 3. Variantes A/B/C y firmas de antivirus (tarea 2)

### 3.1 Búsqueda en `docs/` y en el historial

| Búsqueda | Resultado |
|---|---|
| `grep -ril "PolinRider\|variante\|loader\|RAT" docs/` | 30 docs, pero los hits son por "variante" en sentido genérico (documento-off, auditorías de repartidores, etc.); **ninguno** menciona un loader en `jest.config.js` |
| `grep -rn -i -e defender -e polinrider -e trojan docs/` | **0 resultados** |
| `git log --all --oneline --grep='seguridad\|security\|malware\|payload' -i` | 14 commits (relevantes: `9f3b2f4`, `3173498`, `ba55fbb`, `ed22e23`, `cbe2c96`, `cdbf239`) |
| `git log --all --oneline -S 'PolinRider'` | **0 commits** |
| `git log --all --oneline --grep='defender' -i` / `--grep='trojan' -i` | **0 commits** |

**No hay en este repositorio ningún registro (commit, doc, log o adjunto) de detecciones de Microsoft Defender ni de la firma `Trojan:NPM/PolinRider`**, y tampoco de una "variante C que evade firmas". Lo que sí es verificable en el repo son **5 generaciones de blobs** del mismo loader (mismo mecanismo: C2 por blockchain), documentadas en `docs/SEGURIDAD-OFUSCACION-2026-10-27.md` §6.2.

### 3.2 Las tres "variantes" que sí constan (mapeo por blob, no por firma de antivirus)

| Variante | Blob (`auth0.js`) | Tamaño | Marcador | Aparición | Remoción / estado | Refs |
|---|---|---|---|---|---|---|
| **A — septiembre** | `fc95572` | 8,938 B | sin marcador | `9ae9bf5` (2026-09-07) | removida en `cbe2c96` (2026-09-11) | 0 (solo historia) |
| **B — septiembre** | `72d0c85e` | 36,039 B | sin marcador | *evil merge* `9fd1717` (2026-08-24, DanielSCH952) | removida en `cdbf239` (2026-09-02) y **reinyectada** en `2bd0787` (2026-09-04) | 2 (`origin/verify_changes`) |
| **C — intermedia** | `f8ed3dbc` | 33,355 B | sin marcador | circuló 2026-09-13 → 2026-10-08 en ramas de feature | nunca llegó a `main` | 20 (`github-ssh/*` antiguas) |
| posterior — anterior | `1dc87e9` / `a3ce070d` | 16,221 / 29,057 B | `8-2791` / `8-&` | *evil merge* `54dd5f1` (2026-10-09) | sustituida por la variante actual | 53 + 22 |
| posterior — actual | `9ad71b74` / `b4ee1141` | 13,999 / 28,199 B | `8-2791` / `8-&&` | `f910a4d` (2026-10-15, `yizuz@temporal-1`) | **purgada** (`4d1aec7` → `9f4eabd`) | 11 (incl. `origin/main` antes de la purga) |

Verificado en este pase con `git cat-file -t/-s` (los 8 blobs existen en la historia con esos tamaños) y `git log --all --find-object=<blob>` (commits que introdujeron/retiraron cada variante).

### 3.3 IOCs documentados vs. informe vigente

`docs/SEGURIDAD-OFUSCACION-2026-10-27.md` ya documenta todos los indicadores que la guardia de CI usa:

- **Marcadores de packer:** `global['!']`, `while(!![]){try{`, bloque de >5 KB en una sola línea de un `.js`, constructor `Function` oculto.
- **C2:** wallets `0x1eef0849…cef3` (build actual) y `0xa322E5f3…Ef1a` (build anterior), RPC de Ethereum (`1rpc.io/eth`, `eth.drpc.org`, `ethereum-rpc.publicnode.com`, `eth-mainnet.public.blastapi.io`), indexer `eth.blockscout.com/api`, variable `ETH_RPC_URL`.
- **Transporte:** rutas `/0x/cls` y `/0x/ls`, header `X-Payload-B64`, claves XOR de etapa 2.

**No se hallaron firmas adicionales fuera del informe** ni una "variante C" con comportamiento distinto: las tres generaciones de septiembre (A, B, C) **no se decodificaron por completo** (no tienen wallet C2 conocida), por lo que la hipótesis "una tercera variante evade las firmas de Defender" **no puede confirmarse ni desmentirse con la evidencia del repo** (no hay log de Defender versionado). Lo que sí puede afirmarse es que las tres son **el mismo loader** (mismo decodificador `y7`, mismo packer de sustitución, misma ejecución `Function("", …)(2509)`), lo que apunta a rotación de infraestructura y no a una familia nueva.

## 4. Endurecimiento de CI (tarea 3)

### 4.1 Inventario y auditoría

| Workflow | Trigger (antes) | `pull_request_target` | `permissions` (antes) | Hallazgo |
|---|---|---|---|---|
| `.github/workflows/tests.yml` | PR + push a main con filtro `paths: ciudadan_backend_26/**` | no | **ninguno** (heredaba el default del repo) | la guardia no corría si el cambio era fuera del backend (p. ej. un `api.js` nuevo en la raíz) |
| `.github/workflows/deploy.yml` | push a main + `workflow_dispatch` | no | **ninguno** | despliegue sin gate de payloads: un árbol infectado podía llegar a producción |
| `.github/workflows/security-guard.yml` | **nuevo** (este pase) | no | `contents: read` | cubre todo PR y todo push a main sin filtro de paths |

Verificaciones: `grep -rn 'pull_request_target' .github/workflows/` → **0 coincidencias**; ningún workflow hace checkout de código no confiable con privilegios (el deploy solo usa `push` a `main` y `workflow_dispatch`, y sus secretos viajan por SSH, no por la API de GitHub); `grep -rn 'git push\|gh \|GITHUB_TOKEN' .github/workflows/deploy.yml` → **0 coincidencias** (el workflow no escribe en el repo).

### 4.2 Cambios aplicados

1. **Permisos mínimos** `permissions: contents: read` a nivel de **workflow** y de **job** en los 3 workflows (7 jobs: `tests`, `guardia`, `p4-arbiter-gate`, `build-and-gate`, `canary-daniel`, `deploy-polanco`, `reporte`).
2. **Paso de la guardia de payloads** (`node ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js`):
   - `tests.yml` (job `tests`): guardia + pruebas negativas.
   - `security-guard.yml` (job `guardia`): guardia + pruebas negativas en **cada PR y cada push a main, sin filtro de paths** → cubre archivos de la raíz (`api.js`) y de cualquier carpeta.
   - `deploy.yml` (job `build-and-gate`): la guardia corre **antes** de construir/desplegar → un árbol con packer no llega ni a Daniel ni a Polanco.
3. **Filtro de paths ampliado** en `tests.yml`: `'*.js'`, `'*.mjs'`, `'*.cjs'` (archivos sueltos en la raíz) y `.github/workflows/security-guard.yml`.
4. **Checkout sin credenciales persistidas** (`persist-credentials: false`) en `tests.yml` y `security-guard.yml`.
5. **Guardia con modo `<directorio>`** (`ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js`): escanea un árbol arbitrario (temporal de pruebas) manteniendo el modo repo con `git ls-files`. Códigos de salida: **0** limpio · **1** detección · **2** error de uso.

### 4.3 Matriz de cobertura

| Escenario | Quién lo cubre |
|---|---|
| PR que toca `ciudadan_backend_26/**` | `tests.yml` + `security-guard.yml` |
| PR que añade `api.js` en la raíz | `security-guard.yml` (sin paths) + `tests.yml` (patrón `*.js`) |
| PR que añade un `.js` con línea >5 KB en cualquier carpeta | `security-guard.yml` |
| Push a `main` (cualquier cambio) | `security-guard.yml` + `deploy.yml` (gate previo al deploy) |
| Push a `main` con cambio en el backend | `tests.yml` + `security-guard.yml` + `deploy.yml` |

## 5. Pruebas negativas (tarea 4)

Archivo: `ciudadan_backend_26/tests/check-payload-ofuscado.test.js` (estilo `node --test`, como el resto de suites del backend).

```bash
node --test ciudadan_backend_26/tests/check-payload-ofuscado.test.js
```

Las muestras se generan en un temporal del sistema **fuera del repo** (`os.tmpdir()`), son **inertes** (no contienen código de ataque: `module.exports = {}`, una cadena de 6,000 caracteres, el marcador literal del packer y el bucle literal del packer) y **se borran al terminar** (`fs.rmSync`). Ninguna muestra se commitea.

| Caso | Qué verifica | Resultado |
|---|---|---|
| (a) `api.js` en la raíz del árbol | la guardia falla con exit 1 y reporta "archivo prohibido" | PASS |
| (b) línea de 6,000 caracteres | reporta "linea N de 6xxx caracteres" | PASS |
| (c) marcador de versión del packer | reporta "marcador de packer" | PASS |
| (d) bucle de rotación del packer | reporta "bucle de rotacion" | PASS |
| control positivo | un árbol limpio pasa con exit 0 y "Guardia OK" | PASS |
| repo actual | el árbol del repo pasa la guardia | PASS |
| uso incorrecto | directorio inexistente → exit 2 | PASS |

Salida local (Node v20.20.2): `# tests 7 · # pass 7 · # fail 0`, exit 0.

**Los marcadores se arman por concatenación** (`'global' + "['!']"` y `'while(!!' + '[]){try{'`) para que el propio archivo de pruebas no sea detectado por la guardia (que escanea los `.js` del repo).

## 6. Comandos de verificación (reproducibles)

```bash
# estado real de main
git fetch origin
git cat-file -e origin/main:api.js            # debe fallar (no existe)
git rev-parse origin/main:ciudadan_backend_26/middleware/src/routes/auth0.js
# -> 11ae417b9ee848000190346cbceca381b1485ae3 (1,347 B, limpio)

# guardia y pruebas negativas
node ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js
node --test ciudadan_backend_26/tests/check-payload-ofuscado.test.js
```

## 7. Qué queda pendiente (fuera del alcance de este pase)

1. **Rotación de secretos** (crítico): `STRAPI_API_TOKEN`, `APP_KEYS`, `JWT_SECRET`/`ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, credenciales de BD, Stripe, OpenPay, Cloudflare, Auth0 y la llave SSH de deploy — asumiendo que el payload pudo ejecutarse en algún despliegue histórico.
2. **Branch protection en `main`**: rama protegida, push directo bloqueado, *required checks* incluyendo `Guardia — payloads ofuscados` y revisión obligatoria para `ciudadan_backend_26/middleware/src/routes/auth0.js` y para cualquier archivo nuevo en la raíz.
3. **Detector de *evil merge***: fallar el pipeline si un merge introduce blobs que no existen en ninguno de sus padres (recomendación §8.5 del informe del 2026-10-27) — la guardia actual detecta marcadores, no fusiones maliciosas con payload no marcado.
4. **Forense del vector de reinyección**: hooks de git (`core.hooksPath`), scripts `postinstall`/`prepare` del `middleware`, procesos `node -e` desacoplados, crontabs y units systemd no documentadas, y auditoría de todas las instancias `temporal-*` (la variante actual entró por `f910a4d`, firmado `yizuz@temporal-1`).
5. **Confirmar el antecedente de `jest.config.js`** con quien lo reportó (no hay evidencia en este repo) y, si pertenece a otro repositorio, abrir el mismo análisis allá.
6. **Registro externo de IOCs**: wallets ETH, IPs resueltas, rutas `/0x/*`, header `X-Payload-B64` y claves XOR en la lista de bloqueo del proveedor de nube/antivirus; aviso al equipo de seguridad.
7. **Playbook de respuesta**: qué hacer ante una reinyección (cuarentena de ramas sin borrar historia, publicación de IOCs, rotación, revisión de VPS).

## 8. Límites del pase

- No se ejecutó ningún código sospechoso (ni `api.js`, ni los blobs ofuscados, ni sus etapas remotas); el análisis fue estático y por metadatos de git.
- No se imprimieron secretos de la plataforma (las wallets ETH y URLs de C2 son IOCs del atacante).
- No se tocó ningún `.env`, no se reinició ningún servicio, no se hizo deploy.
- No se fusionó nada a `main`, no se borró ninguna rama (las ramas con variantes siguen sirviendo como evidencia).
- No se commiteó ninguna muestra maliciosa: las muestras de las pruebas son inertes, se generan en `/tmp` y se eliminan al terminar.

