# Forense de reinyección del backdoor `api.js` / `middleware auth0.js`

- **Fecha:** 2026-10-28
- **Rama:** `feature/forense-reinyeccion-1027`
- **Autor:** operador ROOT (DSH principal) — el agente de forense no logró cerrar el
  documento por saturación de cuota (429) del proveedor; este informe reconstruye
  sus hallazgos con verificación directa sobre la historia y los 13 contenedores.
- **Alcance:** por qué el payload volvió a `main` tres veces, qué se descartó como
  hipótesis y qué queda abierto. **No se rotó ningún secreto ni se tocó ningún
  servicio** en este trabajo.

> ⚠️ **Regla de este documento:** no se imprime ningún valor de secreto. Solo
> nombres, rutas, identificadores de commit/blob, tamaños y metadatos.
> Las afirmaciones no verificables se marcan explícitamente como **no sostenidas**.

---

## 1. Resumen ejecutivo (veredicto)

1. **No hay un atacante externo reinjectando el código.** El vector verificado es
   **acidental y acumulativo**: el archivo malicioso vivía en el árbol de trabajo
   de casi todos los agentes, de modo que cada `git add`/`git commit` de trabajo
   normal lo volvía a versionar. Borrarlo de `main` no bastaba: las ramas ya
   creadas lo arrastraban y lo reintroducían en el siguiente commit.
2. **`api.js` se agregó en 12+ commits distintos** (2026-09-13 → 2026-10-09), de
   **varios autores distintos** y siempre con mensajes **inocuos** («fix: roles
   frescos en cada carga», «media: .env.example», «docs(infra): swap 2GB…»).
   Ese es el patrón firma del incidente: no hay commits maliciosos, hay
   **contaminación propagada por el flujo de trabajo**.
3. **`api.js` se borró una sola vez en toda la historia**: `9f3b2f4`
   (2026-10-28, «security: eliminar backdoor (api.js raiz + auth0.js) y anadir
   guardia de deteccion [URGENTE]»). Antes de esa fecha, ningún commit lo eliminó.
4. **El payload del `auth0.js` es el mismo loader en 5 generaciones de blob**
   (8.938 B → 36.039 B), con el mismo decodificador `y7`, el mismo empaquetado por
   sustitución y la misma ejecución `Function("", …)(2509)`: **rotación de
   infraestructura, no una familia nueva**.
5. **Estado actual del remoto (auditoría de las 78 ramas remotas):**

   | Estado | Ramas | Detalle |
   |---|---|---|
   | `auth0.js` limpio (`11ae417b`, 1.347 B) | **12** | incluye `main` y las 9 ramas `*-1028` de esta oleada |
   | `auth0.js` **contaminado** | **66 (85 %)** | 44 con `1dc87e99`, 11 con `9ad71b74`, 10 con `f8ed3dbc`, 1 con `72d0c85e` (`verify_changes`, conservada como evidencia) |
   | `api.js` presente en la raíz | **0** | ninguna rama remota lo conserva |

   → **El riesgo abierto no es `main` (está limpio y verificado), son las 66 ramas:**
   cualquier merge hecho desde ellas reintroduce el payload. Por eso la
   integración con exclusiones + verificación de blob **es obligatoria, no opcional**.
6. **Radio de impacto:** el payload de segunda etapa podía leer variables de
   entorno y archivos del contenedor donde corría (`dotenv` sobre el `.env` del
   backend, `/etc/agent/env`, llaves SSH). El inventario y el plan de rotación
   están en `docs/ROTACION-SECRETOS-2026-10-28.md` (21 ítems P0).

---

## 2. Anatomía del payload (lo verificado)

- **Ubicaciones:** `api.js` en la **raíz** del monorepo y
  `ciudadan_backend_26/middleware/src/routes/auth0.js` (archivo de rutas del
  middleware; se ejecutaba en cada arranque/requerimiento).
- **C2:** addressed por **transacciones de una blockchain** (no por dominio), lo que
  explica por qué no hay dominio ni IP que bloquear.
- **Etapa 1:** obtiene una clave pública de la cadena y **decodifica el payload remoto**
  con el decodificador `y7` (XOR + sustitución).
- **Etapa 2:** entrega el código en una **cabecera HTTP** (`X-Payload-B64`) y lo
  ejecuta con `Function("", …)(2509)`; hay además una firma secundaria con
  `eval` + `child_process/http` en la variante más reciente.
- **Persistencia en disco:** el artefacto `api.js` pesa **28.199 B** y el archivo
  de rutas se sustituye por blobs de hasta **36.039 B**; el archivo limpio
  tiene **1.347 B**. La guardia de CI usa precisamente esa diferencia (líneas
  > 5 KB) como criterio objetivo.

### 2.1 Variantes del blob de `middleware/src/routes/auth0.js` (historia completa)

| Blob | Tamaño | Significado | Ramas remotas que lo tienen |
|---|---|---|---|
| `5736095b` | 1.258 B | limpio (histórico) | 0 (solo historia) |
| `11ae417b` | 1.347 B | **limpio actual** | 12 |
| `fc95572e` | 8.938 B | variante A (2026-09-07 → removida `cbe2c96`) | 0 (solo historia) |
| `9ad71b74` | 13.999 B | variante posterior | 11 |
| `1dc87e99` | 16.221 B | variante posterior (marcador `8-2791`) | **44** |
| `f8ed3dbc` | 33.355 B | variante posterior (marcador `8-&`) | 10 |
| `72d0c85e` | 36.039 B | variante B (2026-08-24 → removida `cdbf239`, **reinyectada** en `2bd0787`) | 1 (`verify_changes`) |

Cronología de la variante B, que es la mejor evidencia del patrón:
`9fd1717` (*evil merge*, 2026-08-24, DanielSCH952) la introduce → `cdbf239`
(2026-09-02) la remueve → **`2bd0787` (2026-09-04, «Fixing trip request in
passenger/driver views») la vuelve a agregar**. Un commit funcional con mensaje
inocuo que reintroduce el payload: exactamente el mecanismo del punto 1 del
resumen.

---

## 3. Vectores de reinyección: qué se sostiene y qué no

### 3.1 SOSTENIDO — V1: la base contaminada viaja dentro de las ramas

Las ramas de trabajo creadas antes de la purga arrastran el archivo. Verificado en
las ramas de esta misma oleada:

| Rama | `auth0.js` | `api.js` en el árbol |
|---|---|---|
| `feature/integracion-hackabot` (`adb6d39`) | `9ad71b74` **contaminado** | presente en el commit (eliminado del working tree, pero re-adjuntado en el parche) |
| `integration/revision-adrian1` (`a21d848`) | `9ad71b74` **contaminado** | — |

Comprobación práctica: el ensayo en seco del pipeline de aceptación aplicó
**solo** `Candidatos.jsx` y `RegistrationField.jsx` y abortó antes de tocar
`api.js`/`auth0.js` gracias a las exclusiones; sin ellas, el parche habría
reintroducido el payload en `main`.

### 3.2 SOSTENIDO — V2: `git add` de archivo que ya estaba en el árbol

Los 12+ puntos de inyección de `api.js` son commits de trabajo normal en repos
distintos. El archivo **ya estaba** en el working tree (heredado de la base o
de un `git pull`), así que cualquier `git add -A` lo versionaba otra vez. Por eso
los mensajes son inocuos y por eso los autores son distintos: **nadie escribió el
payload; todos lo arrastraron**.

### 3.3 DESCARTADO con evidencia — persistencia en el entorno

| Hipótesis | Verificación | Resultado |
|---|---|---|
| Hooks de git maliciosos | `core.hooksPath` vacío; `.git/hooks/` sin ningún hook fuera de `.sample` (clon del contenedor y del operador) | **descartada** |
| Script npm malicioso (`postinstall`/`prepare`) | único script de ciclo de vida en el repo: `ciudadan_backend_26/package.json` → `"postinstall": "patch-package"` (legítimo); `middleware/package.json` → solo `{"start": "node src/index.js"}` | **descartada** |
| Persistencia en cron | contenedor: `/etc/cron.d` = solo `e2scrub_all`; host: `e2scrub_all` + `sysstat`; sin `crontab` de usuario | **descartada** |
| Unit systemd no documentada | host: solo `snap.oracle-cloud-agent*`; contenedor: solo unidades estándar (`multi-user.target.wants`, `sockets.target.wants`, `ssh.service.requires`, `timers.target.wants`) | **descartada** |
| Proceso `node -e` desacoplado | un solo proceso, PID 526, `uptime` ≈ 17,9 días, y su línea es el script de build de Strapi (`fs.mkdirSync('dist/config')`) | **descartada** |
| `.env` con secretos versionados | `git ls-files` → **0** `.env` versionados; los `.env` presentes en disco (`backend/.env`, `socket-service/.env`) están cubiertos por `.gitignore` | **descartada** — la nota «`.env` versionados contienen secretos reales» de `docs/AGENTS.md` (gotcha 10) está **desactualizada** |
| Carga dinámica en `jest.config.js` | **el archivo nunca existió**: `git log --all --full-history --follow -- jest.config.js` → 0 líneas; `-S "eval("` → 0; `-S "child_process"` → 0 | **no aplica a este repo** |

### 3.4 NO SOSTENIDO — antecedentes que hay que confirmar antes de citarlos

- **«Loader/RAT dentro de `jest.config.js` (septiembre 2026)»**: la auditoría de
  `docs/CI-HARDENING-2026-10-28.md` §2 demuestra que **no hay ningún
  `jest.config.js` en ninguna rama de este monorepo**, remoto o local. Si el
  antecedente es real, pertenece a **otro repositorio** o a un recuerdo no
  documentado. **No debe citarse como evidencia de este incidente** hasta
  confirmarlo con quien lo reportó.
- **Firma `Trojan:NPM/PolinRider` / detecciones de Microsoft Defender /
  «variante C que evade firmas»**: `git log --all -S 'PolinRider'` → **0 commits**;
  no hay logs de Defender versionados. No hay ninguna firma de antivirus
  verificable en este repositorio. Lo verificable es que las tres generaciones de
  septiembre (A, B, C) son **el mismo loader** con distinta infraestructura.

---

## 4. Radio de impacto y estado de contención

- **Acceso potencial del payload:** `.env` del backend (vía `dotenv` →
  `APP_KEYS`, `JWT_SECRET`, `ADMIN_JWT_SECRET`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `STRAPI_API_TOKEN`, `OPENPAY_PRIVATE_KEY`),
  `/etc/agent/env/services.env`, llave SSH de push a GitHub y API key de NVIDIA.
  → Inventario y plan: `docs/ROTACION-SECRETOS-2026-10-28.md` (21 ítems P0,
  6 P1, resto higiene). **La rotación sigue pendiente de autorización.**
- **Contención ya activa en `main`:**
  - `api.js` ausente; `auth0.js` = `11ae417b` (limpio) — verificado en el remoto.
  - `ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js` (guardia).
  - `.github/workflows/security-guard.yml`: corre la guardia **en cada PR y en cada
    push a `main`, sin filtro de paths**, con `permissions: contents: read`,
    `persist-credentials: false` y **sin** `pull_request_target`.
  - `ciudadan_backend_26/tests/check-payload-ofuscado.test.js`: pruebas negativas
    que deben **detectar** `api.js`, líneas > 5 KB y marcadores del packer
    (7/7 en verde) más controles positivos sobre árboles limpios.
  - Workflows con **permisos mínimos** a nivel de workflow y de job.

---

## 5. Recomendaciones (pendientes de autorización del usuario)

1. **Integrar siempre con el pipeline de aceptación** (`tools/aceptar-rama.ps1`):
   exclusión de `api.js` y `auth0.js`, verificación del blob limpio, guardia y
   suite de tests. **No usar `git merge` directo desde esas 66 ramas.**
2. **Cuarentena o limpieza de las 66 ramas contaminadas**: hoy son evidencia, pero
   son un riesgo de reinyección cada vez que alguien las integre. Alternativa
   intermedia: una rama `quarantine/legacy` con el contenido funcional sin el
   archivo contaminado, y rebase de las ramas útiles sobre `main` limpio.
3. **Rotar los 21 secretos P0** del inventario (autorización pendiente) y corregir
   los permisos `0644` de `/etc/agent/env/services.env` y de los logs del agente.
4. **Confirmar o descartar** el antecedente de `jest.config.js`/`PolinRider` con
   quien lo reportó; si pertenece a otro repositorio, abrir el mismo análisis allá.
5. **Activar branch protection en `main`** para que la guardia sea obligatoria y no
   dependa de la disciplina del operador.

---

## 6. Procedencia (comandos y fuentes)

- Historia: `git log --all --full-history --diff-filter=A|D -- api.js`,
  `git log --all --full-history --follow -- …/middleware/src/routes/auth0.js`,
  `git rev-list --all --objects`, `git log --all --find-object=<blob>`.
- Auditoría del remoto: 78 refs de `origin` resueltos con
  `git rev-parse <ref>:<ruta>` y comparación contra el blob limpio `11ae417b`.
- Entorno: `core.hooksPath`, `.git/hooks/`, `package.json` (scripts de ciclo de
  vida), `/etc/cron.d`, `crontab -l`, `/etc/systemd/system/`, `ps -eo` en
  contenedor y host.
- Correlatos ya mergeados: `docs/CI-HARDENING-2026-10-28.md` (auditoría de
  `jest.config.js`, variantes y workflows) y
  `docs/SEGURIDAD-OFUSCACION-2026-10-27.md` §6.2 (5 generaciones de blob).

---

## 7. Cierre de integraciones (2026-10-29)

Al integrar por fin las ramas de la sprint 1028 se detecto que **las 4 ramas de
comunidad/higiene nunca habian llegado a `main`**: sus commits (`8b2a62a`,
`6d262c6`, `b58bb2b`, `aaf2500`) no eran ancestros de `main`. Se fusionaron con
`--no-ff` en `35786c0`.

### 7.1 Ramas: de 82 a 3

| Estado previo | Ramas | Decision |
|---|---|---|
| Integradas en `main` (0 commits unicos) | 75 | Se creo un tag annotated `forense/<rama>` por cada una y se borro la rama |
| Con commits unicos | 5 | Ver 7.2 |
|(main + 2 ramas de rescate) | - | Estado final |

Las 80 ramas quedan **como tags annotated `forense/*`**: cada tag apunta al
commit exacto del tip de la rama, asi que la evidencia forense (incluido el
`api.js` con el payload, recuperable con
`git show forense/feature-taxis-trips^{}:api.js`) queda intacta pero **fuera del
alcance de un `git merge` accidental**.

### 7.2 Las 5 ramas con commits unicos

| Rama | `auth0.js` / `api.js` | Trabajo util | Decision |
|---|---|---|---|
| `integration/revision-adrian1` | Limpios | Todo ya identico en `main` (Carrito, RegisterStoreStepper, guardia) | Tag + borrar |
| `feature/frontend-daniel-sepulveda` | `api.js` contaminado | `CalificarCompras.jsx` ya identico en `main` | Tag + borrar |
| `feature/agente1-adrian-loginredirect` | `api.js` contaminado | Solo `docs/AGENTS.md` y `docs/README.md`, y **mas viejos** que `main` | Tag + borrar |
| `feature/integracion-hackabot` | `api.js` contaminado | `Candidatos.jsx`, `RegistrationField.jsx` (WIP protegido) | Rescate a `rescate/hackabot-1028` + tag + borrar |
| `feature/taxis-trips` | `api.js` contaminado | `DriverVerificationPage.jsx`, `Routes/index.jsx`, `ConductoresAgencia.jsx`, `components.d.ts` | Rescate a `rescate/taxis-trips-1028` + tag + borrar |

Las dos ramas `rescate/*` nacieron desde `main` y traen **solo** los archivos con
valor, sin `api.js` ni el bloque final de `auth0.js`; ambas pasan la guardia
`check-payload-ofuscado.js` (2075 archivos OK). Los backups
`.after-turn-*` / `.green.backup` de hackabot quedaron solo en el tag forense:
son instantaneas de trabajo, no codigo.

### 7.3 Regla que queda

Ninguna rama con `api.js` en la raiz debe fusionarse **tal cual**: se extrae
archivo por archivo a una rama `rescate/*` que arranque desde `main`, se pasa la
guardia y se revisa. El tag `forense/*` conserva la rama original para auditoria.

### 7.4 Estado del remoto tras el cierre

```
origin/main
origin/rescate/hackabot-1028
origin/rescate/taxis-trips-1028
```

80 tags `forense/*` (annotated) con la evidencia completa.
