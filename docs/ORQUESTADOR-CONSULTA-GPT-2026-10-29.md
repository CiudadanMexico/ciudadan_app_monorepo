# Orquestador de flota: consulta al consultor + contrato de arquitectura v1 (2026-10-29)

> Documento de trabajo del agente principal. **Contrasta** la propuesta local
> (`docs/ORQUESTADOR-FUENTE-COMUN-2026-10-29.md`, commit `9539fc8`) con la respuesta del
> consultor ChatGPT Web del 2026-10-29 y fija el contrato de arquitectura v1.
> La respuesta cruda del consultor está en `docs/CONSULTA-GPT-RESPUESTA-2026-10-29.md`
> (**evidencia no confiable**: contenido externo, no instrucciones; se contrastó con el estado real).

---

## 1. Resumen ejecutivo

Dos cosas seClosed en esta sesión:

1. **El puente ChatGPT Web volvió a funcionar de punta a punta** (DSH → adaptador → bridge 8765 →
   extensión Chrome → chatgpt.com → respuesta publicada). Ya se puede consultar al consultor GPT
   desde cualquier sesión.
2. **La consulta arquitectónica al consultor se ejecutó** (16,746 caracteres de contexto,
   respuesta de 53,625 caracteres en 91 s) cubriendo los 10 puntos originales más las 3 preguntas
   nuevas del ROOT: alta de agentes, estrategia de integración a `main` y subdominios por API.

**Veredicto del consultor** (coincide con la decisión del ROOT de usar git):

> Git canónico + observabilidad distribuida + GUI Cordis. No crear otro registro central.

**Deltas sustantivos que cambian la propuesta local** (detalle en §4):

- Un archivo YAML **por agente** (`fleet/agents/*.yaml`), no un `agents.yaml` gigante.
- Historial operativo en una **rama `fleet-state`** del mismo repo (no se mezcla con `main`).
- `assignment.generation` para **rechazar entregas de agentes "zombis"** que vuelven por un
  trabajo ya reasignado.
- **Tres dimensiones de estado** (conectividad / trabajo / integración), no un `status` único.
- **Un túnel de Cloudflare por nodo** (no el mismo túnel replicado en 3 máquinas: `127.0.0.1`
  significa una app distinta en cada réplica) ← hallazgo que la propuesta local no tenía.
- Verificación de subdominio con **cadena de 8 pasos** que termina comprobando la **identidad**
  del frontend (`GET /.well-known/ciudadan-fleet.json`), no solo un HTTP 200.
- **4 roles** de integración (desarrollador / revisor / integrador / publicador) con un
  **coordinador automatizado** (servicio o tarea programada), no el DSH interactivo.
- **P0 de seguridad operativa**: el *fallback quirúrgico* automático (merge archivo por archivo
  cuando `git am` falla) **debe quedar bloqueado**; en su lugar, revisión humana.

---

## 2. Estado del puente ChatGPT Web (diagnóstico y reparación)

### 2.1 Causa raíz real (verificada el 2026-10-29)

El síntoma era `null` en toda consulta vía `workflow`. **No era** que la extensión faltara.

| # | Hallazgo | Evidencia | Acción |
|---|---|---|---|
| 1 | `b3d\config-b3d.json` no existía → la recuperación del supervisor fallaba ("DEGRADADO") | log del monitor 3080 | **Restaurado** desde `migracion-3080\respaldo-preparacion-20261023-171856\config\`; 8767/8768/8769 ahora **ACTIVO** y `/health` OK |
| 2 | Modo B10 en `aprobaciones` → cada prompt exigía aprobación manual | `consultar-modo-b10.ps1` | **Cambiado a `full`** (mecanismo documentado, reversible) |
| 3 | La extensión **sí** estaba conectada (Chrome → 8765, WS establecido) | `verificar-extension-8765.mjs` → HTTP 409 = ranura única ocupada | Ninguna: era un falso positivo del diagnóstico previo |
| 4 | **El adaptador v0.1 rechaza `GenerateOptions` con `purpose`/`reasoningEffort`/`temperature`** y el camino de subagente **siempre** manda `purpose` → el subagente muere antes de despachar | `src/dsh-chatgpt-web/src/adapter.ts:64-81` | **Chat directo funciona**; el camino subagente requiere parche (ver 2.3) |

### 2.2 Cómo consultar ahora (repetible)

```powershell
node C:\yii\tools\consultar-gpt-web.mjs "TU PREGUNTA" --timeout 900 [--json]
```

El cliente (`C:\yii\tools\consultar-gpt-web.mjs`): lee el token del DSH del log local (nunca lo
imprime), crea una sesión, selecciona `chatgpt-web/auto`, envía el prompt y espera el evento
`assistant-response` en `pruebas-b3b2\eventos-b3b2.jsonl`.

Detalles que costaron tiempo y quedan documentados en el propio script:

- El log `dsh-3080.log` está en **UTF-16LE con BOM** (no UTF-8) y lo tiene abierto el proceso DSH
  → hay que abrirlo con `FileShare.ReadWrite`.
- La URL con token responde **303** y la cookie de sesión se emite **en esa respuesta**: si se
  sigue la redirección, la cookie se pierde y el RPC devuelve 401 → usar `redirect: 'manual'`.
- El gateway typert exige los campos del método dentro de `args.request`.
- El evento de respuesta tiene `kind = "assistant-response"` (no `generation-complete`).

### 2.3 Pendiente del puente (decisión ROOT)

`~/.dsh/AGENTS.md` exige consultar a GPT **como subagente** vía `workflow`. Ese camino **no
funciona** con este adaptador. Para habilitarlo hay que:

1. Parchear el adaptador para **tolerar `purpose`/`reasoningEffort`** (o enrutar a `chatgpt-web`
   sin esos campos), en `C:\yii\ciudadan-chatgpt-bridge\src\dsh-chatgpt-web` (paquete enlazado
   localmente al perfil web).
2. **Reiniciar el DSH 3080** para que cargue el plugin parcheado → eso corta la sesión actual
   (el GUI es este proceso), por lo que requiere ventana y OK explícito.

Alternativa sin parche: dejar la regla de AGENTS.md satisfecha con el cliente directo
(`consultar-gpt-web.mjs`), que ya produce respuestas completas y auditables.

---

## 3. Recomendación del consultor (resumen estructurado)

| Tema | Recomendación |
|---|---|
| **Decisión de arquitectura** | 3 capas: (1) registro canónico en git, (2) actividad operativa (watchdogs + `cline-hub`), (3) visualización/consulta (plugin Cordis + CLI + MCP). **No** crear `fleet-registry` |
| **Organización en el repo** | `fleet/agents/*.yaml` (uno por agente), `fleet/nodes/*.yaml`, `fleet/tasks/`, `fleet/assignments/`, `fleet/schemas/*.json`, `fleet/README.md`; scripts `fleet.mjs`, `fleet-validate.mjs`, `fleet-observe.mjs`, `fleet-cloudflare.mjs` |
| **Ramas** | `main` = identidades/nodos/asignaciones; `fleet-state` = historial operativo (transiciones y snapshots). **Nunca** se fusionan automáticamente entre sí |
| **Entidades** | `Node`, `Agent`, `Task`, `Observation` + `Assignment` (con `generation`) |
| **Fuentes de verdad** | 3 diferenciadas: declaración del operador (alta), autorregistro del agente (media), observación independiente (alta para los hechos observados) |
| **Estados** | 3 dimensiones: conectividad (`online/degraded/stale/unreachable/unknown`), trabajo (`idle/assigned/working/paused/delivered/failed`), integración (`not_submitted/reviewing/rejected/approved/integrated`) |
| **TTL** | ≤45 s reciente · 46–90 s degradando · >90 s stale · 3 sondeos fallidos → unreachable · red caída → unknown. Guardar `lastVerifiedAt`, `lastProgressAt`, `lastHeartbeatAt` por separado |
| **Publicación** | Doble: el agente publica transiciones; el watchdog **sondea** de forma independiente. Cola local (`outbox`) + publicador git como **servicio/tarea programada** (no depende del GUI) |
| **Consulta universal** | CLI único `node scripts/fleet.mjs status [--json|--offline-ok]`, `agent show <id>`, `tasks --active`, `sync`; MCP con 8 herramientas de **solo lectura** |
| **P1 Alta de agentes** | Onboarding **declarativo y autorizado** (`fleet agent add`) + **descubrimiento condicionado**: un contenedor desconocido aparece como `UNREGISTERED` y se revisa, pero **nadie se auto-registra con permisos**. DSH nuevos: `observability.mode: read-only`, `permissions: {observe, dispatch, cancel}` separadas |
| **P2 Integración** | 4 roles; **coordinador automatizado** (servicio/tarea programada) con revisores sustituibles; `main` con branch protection. Antes de empezar: `git fetch origin main` + `git switch -c task/<ID> origin/main` + registrar `baseCommit` (**nunca `git pull` a ciegas**). Antes de entregar: `git fetch` + `git merge-base HEAD origin/main` + validar en **worktree desechable**. Base atrasada ≠ rechazo automático (advertir a partir de ~20 commits o 24 h). Lotes en `integration/batch-<fecha>-<n>` → CI → `main` → deploy |
| **P3 Subdominios** | `fleet.mjs subdomain apply|verify <agente>` con la API de Cloudflare: `GET/PUT /client/v4/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations` y `POST /client/v4/zones/{zone_id}/dns_records` (CNAME a `<TUNNEL_ID>.cfargotunnel.com`). **El PUT reemplaza toda la configuración**: obligatorio leer → fusionar → publicar → releer → comprobar que no se perdió ninguna regla ajena. **Un túnel por nodo**. Verificación en 8 pasos que termina en **identidad** (`/.well-known/ciudadan-fleet.json`). Tokenes con mínimo privilegio y **separados** (lectura / gestión / ejecución); el token de ejecución **no** se reparte a los 13 contenedores |
| **Fases** | F0 seguridad y compatibilidad → F1 registro canónico → F2 observaciones y TTL → F3 plugin Cordis → F4 Cloudflare y onboarding → F5 integración coordinada |
| **Certeza declarada** | Alta en: git canónico, separación declaración/observación, API de Cloudflare (docs oficiales), protección de ramas. Media en: rama `fleet-state`, reutilización de `cline-hub`, topología de túneles. Media-baja en: tiempos y complejidad (sin inspeccionar el código) |

---

## 4. Contraste: propuesta local ↔ consultor (y decisión)

| Tema | Propuesta local (`9539fc8`) | Consultor GPT | **Decisión** |
|---|---|---|---|
| Forma del registro | `fleet/agents.yaml` único | un archivo por agente + `nodes/` + `tasks/` + `assignments/` + `schemas/` | **GPT**: evita conflictos de edición con varios autores |
| Historial operativo | `fleet-activity.jsonl` (uno por nodo) | rama `fleet-state` en git; el JSONL queda como **cola local** del publicador | **GPT**: git es la fuente persistente ya aprobada; el JSONL se conserva como outbox |
| Estado | `status` + procedencias | 3 dimensiones calculadas | **GPT** (más fiel: "conectado" ≠ "trabajando") |
| Entregas obsoletas | no contemplado | `assignment.generation` | **GPT**: adoptarlo (evita que un agente entregue trabajo ya reasignado) |
| Alta de agentes | canonizar inventario a mano | onboarding autorizado + descubrimiento condicionado (`UNREGISTERED`) | **GPT**: automatiza sin abrir la puerta a la suplantación |
| CLI | `scripts/fleet-status.mjs` | un CLI `fleet.mjs` con subcomandos | **GPT**: evolucionar `fleet-status.mjs` → `fleet.mjs` (mantener el nombre viejo como alias) |
| MCP | 1 tool (`fleet_status`) | 8 tools de solo lectura | **GPT**: mismas, desglosadas |
| Subdominios | A/B/C + chequeo activo | CLI con API + verificación de identidad + **1 túnel por nodo** | **GPT**: el hallazgo de "1 túnel por nodo" es **nuevo y crítico** (localhost ≠ localhost entre réplicas) |
| Integración | watcher automático con fallback quirúrgico | 4 roles + coordinador protegido + **bloquear el fallback automático** | **GPT**: el watcher se degrada a **revisor automático**; el merge lo autoriza un integrador |
| Identidad del origen | no contemplado | `/.well-known/ciudadan-fleet.json` | **GPT**: barato y verificable; añade un endpoint mínimo al frontend |
| Verificación de subdominio | booleano | 8 estados (`not_configured` → `ready`) con evidencia y TTL 120 s | **GPT**: el modelo de estados es más útil que un booleano |

---

## 5. Contrato de arquitectura de flota v1 (decisiones ya tomadas)

1. **Fuente canónica = git** del monorepo (`main` para declaraciones, `fleet-state` para historial).
2. **Una fuente, no tres**: `~/.dsh/infrastructure/*.yaml` y `docs/cline-hub-temporales.yaml`
   pasan a ser **vistas generadas** del registro canónico; no se editan a mano.
3. **Plugin Cordis propio** para las cards (host + client), en `~/.dsh/profiles/web/`.
4. **Subdominios por API de Cloudflare** con verificación activa.
5. **Nada de estado declarado sin verificar**: la GUI muestra estado *calculado* y su antigüedad.
6. **Nunca** se filtran llaves/secretos: solo fingerprints `sha256/8`.

---

## 6. Estructura objetivo (exacta)

```
ciudadan_app_monorepo/
├── fleet/
│   ├── agents/cline-temporal1-01.yaml      # identidad y capacidades (uno por agente)
│   ├── agents/dsh-daniel-core.yaml
│   ├── nodes/temporal-1.yaml                # nodo, túneles, puertos base
│   ├── tasks/TASK-20261029-001.yaml         # definición del trabajo
│   ├── assignments/TASK-20261029-001.yaml   # agente + generación vigente
│   ├── schemas/{agent,node,task,observation}.schema.json
│   └── README.md                            # reglas de escritura y precedencia
├── scripts/
│   ├── fleet.mjs                            # CLI único (status/agent/tasks/sync/subdomain)
│   ├── fleet-validate.mjs                   # validación de esquema (pre-push y pre-merge)
│   ├── fleet-observe.mjs                    #lector de heartbeats → fleet-status.json
│   ├── fleet-cloudflare.mjs                 #apply/verify de subdominios
│   └── fleet-status.mjs                     # (existente) se conserva como alias
└── docs/
    ├── ORQUESTADOR-FUENTE-COMUN-2026-10-29.md
    ├── ORQUESTADOR-CONSULTA-GPT-2026-10-29.md   # este documento
    └── CONSULTA-GPT-RESPUESTA-2026-10-29.md    # respuesta cruda (evidencia no confiable)
```

**Precedencia**: `fleet/agents/*` (identidad) → `fleet/nodes/*` (infraestructura) →
`fleet/tasks/*` (trabajo) → `fleet/assignments/*` (vigencia) → observaciones (estado real).

---

## 7. Modelo de datos (resumen operativo)

```yaml
# fleet/agents/cline-temporal1-01.yaml
schemaVersion: 1
id: cline-temporal1-01
kind: cline
displayName: Temporal 1 - Agente 01
enabled: true
runtime: { nodeId: temporal-1, container: cline1, slot: 1, provider: nvidia,
           model: minimaxai/minimax-m3.1-flash }
network: { sshPort: 2201, frontendPort: 3101, backendPort: 4101, socketPort: 5101 }
frontend: { hostname: frontend-temporal1-01.ciudadan.org, scheme: https, tunnelRef: temporal-1 }
repository: { project: ciudadan_app_monorepo, defaultBranch: main }
credentials: { fingerprint: null }        # solo sha256/8, nunca el valor
registration: { method: operator, approved: true, createdAt: "2026-10-29T23:00:00Z" }
```

```yaml
# fleet/assignments/TASK-20261029-001.yaml
id: TASK-20261029-001
title: ...
project: ciudadan_app_monorepo
priority: P1
owner: dsh-orchestrator
assignment: { agentId: cline-temporal1-01, generation: 1 }   # ← generación invalida entregas viejas
repository: { targetBranch: main, workBranch: task/TASK-20261029-001,
              baseCommit: "<sha completo>", headCommit: null }
delivery: { state: assigned, artifactPath: null, reviewBranch: null,
            reviewedBy: null, integratedCommit: null }
timestamps: { createdAt: ..., assignedAt: ..., startedAt: null,
              deliveredAt: null, integratedAt: null }
```

**Observación** (evento append-only, nunca sobreescribe hechos):

```json
{ "schemaVersion": 1, "eventId": "<ulid>", "agentId": "cline-temporal1-01",
  "taskId": "TASK-20261029-001", "assignmentGeneration": 1,
  "type": "task.progress",
  "source": { "kind": "watchdog", "id": "watchdog-temporal-1", "method": "authenticated-local-probe" },
  "execution": { "processAlive": true, "taskState": "working",
                 "branch": "task/TASK-20261029-001", "baseCommit": "<sha>", "headCommit": null },
  "observedAt": "...", "receivedAt": "...", "sequence": 142, "ttlSeconds": 90 }
```

Regla: **un heartbeat no demuestra que se esté programando** → distinguir `working` de
`running_without_progress` (proceso vivo, sin avance verificable).

---

## 8. Reglas operativas de integración (propuesta del consultor, adoptada)

### 8.1 Antes de empezar una tarea (obligatorio)

```bash
git fetch origin main
git rev-parse origin/main
git switch -c task/TASK-<id> origin/main
# registrar: taskId, agentId, assignmentGeneration, baseCommit, branch, startedAt
```

**No** `git pull` indiscriminado: `fetch` actualiza referencias sin fusionar sobre un árbol de
trabajo con cambios. En la flota, los contenedores **no pueden hacer push** (sí `fetch`): el
patrón sigue siendo `format-patch` → base64 → scp → `git am` en el clon operador.

### 8.2 Antes de entregar

```bash
git fetch origin main
git merge-base HEAD origin/main
# registrar: baseCommit, headCommit, currentMainCommit, changedFiles, testsPassed, deliveryArtifact
```

Validar el entregable **contra el `main` actual en un worktree desechable** (no rebase
destructivo sobre el directorio original).

**Política de antigüedad de base**: no rechazar automáticamente por número de commits (no prueba
incompatibilidad). Advertir a partir de ~20 commits o 24 h. Rechazo automático solo si: conflicto,
pruebas distintas, base fuera de la historia esperada, o archivos de seguridad tocados.

### 8.3 Integración por lotes

```
main ─┬─ task/A ─┐
      ├─ task/B ─┼─► integration/batch-20261029-01 ─► CI + guardias ─► main ─► deploy
      └─ task/C ─┘
```

- La rama de integración **absorbe `main` con merge** (nunca rebase) para no reescribir historia.
- `main` entra **solo** por el flujo de integración, con branch protection y checks obligatorios.
- El publicador git nunca usa `--force`; ante rechazo, re-consulta, reconcilia y reintenta con tope.
- **P0**: el *fallback quirúrgico* automático (merge archivo por archivo cuando `git am` falla)
  queda **bloqueado**: ese caso pasa a revisión humana con evidencia.

### 8.4 Guardias obligatorias (en orden)

1. `node ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js` (payload ofuscado)
2. `node --test tests/food-shipping-{tarifa,cotizar,repartidores,rutas}.test.js` (55 tests)
3. Validación de esquema del registro (`fleet-validate.mjs`)
4. Build de producción (≈125 s, pico 3.29 GiB) — fuera del hot path, en lote.

### 8.5 Coordinación sin punto único de falla

- Reserva transaccional con recurso lógico `git:ciudadan_app_monorepo:integration` (MCP
  `reservation_acquire`), **como complemento**, no como garantía única: antes de publicar se
  comprueba que el commit remoto de `main` sigue siendo el esperado; si avanzó, el candidato se
  re-valida.
- La autoridad final es la **rama remota protegida**, no la memoria de una conversación.

---

## 9. Alta de agentes (P1)

**Declarativo y autorizado** (nadie se auto-registra con permisos):

```bash
node scripts/fleet.mjs agent add --kind cline --node temporal-1 --slot 5 --name cline-temporal1-05
node scripts/fleet.mjs agent add --kind dsh   --node daniel-core --name dsh-daniel-02
```

El comando: consulta el inventario vigente → valida nodo/slot → calcula puertos desde la convención
(`2200+i`, `3100+i`, `4100+i`, `5100+i`) → comprueba colisiones → genera el manifiesto → valida
esquema → publica por el flujo git autorizado.

**Descubrimiento condicionado**: si el watchdog detecta un contenedor desconocido, aparece como
`UNREGISTERED` en una sección de "descubiertos" y **no** recibe permisos de trabajo ni de integración.

**Agentes DSH remotos** (p. ej. el de Dany) se registran como observadores de solo lectura:

```yaml
observability: { mode: read-only, adapter: dany-bridge, endpointRef: dsh-dany-bridge }
permissions: { observe: true, dispatch: false, cancel: false }
```

Observar **no** implica poder enviarle instrucciones (respeta el puente de Dany: solo lectura).

---

## 10. Subdominios por API de Cloudflare (P3)

### 10.1 Herramientas

```bash
node scripts/fleet.mjs subdomain apply cline-temporal1-01   # modifica (autorizado)
node scripts/fleet.mjs subdomain verify cline-temporal1-01  # solo lectura
```

Endpoints de la API (documentación oficial de Cloudflare):

```http
GET  /client/v4/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations
PUT  /client/v4/accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations
POST /client/v4/zones/{zone_id}/dns_records
```

- El `PUT` **reemplaza** la configuración completa del túnel → procedimiento obligatorio:
  **leer → fusionar la regla propia → conservar el resto y la regla final de fallback → publicar →
  releer → comprobar que no se perdió ninguna regla ajena**.
- El DNS es un **CNAME** a `<TUNNEL_ID>.cfargotunnel.com`.
- Reserva por `tunnelId` (política de escritor único para la config del túnel).

### 10.2 Un túnel por nodo (hallazgo crítico)

Las réplicas de un mismo túnel deben enrutar a los mismos orígenes. Con `127.0.0.1:3101`, tres
réplicas en máquinas distintas servirían **tres aplicaciones distintas** bajo el mismo hostname.
Corolario: **un túnel por nodo** (`tunnel-temporal-1`, `tunnel-temporal-2`, `tunnel-temporal-3`),
con sus hostnames de agentes. Antes de aplicar: identificar los túneles existentes y comprobar si
alguno ya enruta entre hosts.

### 10.3 Verificación real (8 pasos → evidencia)

```
manifiesto válido → túnel identificado → ingress coincide → DNS coincide →
conector disponible → origen responde → URL externa responde → IDENTIDAD verificada
```

El último paso distingue "el frontend correcto" de "un 200 de cualquier cosa": el frontend expone

```http
GET /.well-known/ciudadan-fleet.json
→ { "agentId": "...", "taskId": "...", "buildCommit": "...", "healthy": true }
```

Estados del subdominio: `not_configured · dns_pending · ingress_pending · origin_unreachable ·
access_required · verifying · ready · degraded · unknown`. TTL de la evidencia: **120 s**; si la
sonda falla se conserva la última válida y se marca degradado/desconocido según la causa.

### 10.4 Token (mínimo privilegio)

| Credencial | Permisos |
|---|---|
| Lectura Cloudflare | consultar DNS y configuración de túneles |
| Gestión Cloudflare | modificar DNS de `ciudadan.org` y configs de túneles autorizados |
| Ejecución cloudflared | conectar **su** túnel |

El token de ejecución **no** es el token administrativo y **no** se reparte a los 13 contenedores.
Vive en `~/.dsh/secrets/` (o en el almacén OpenBao previsto), se rota, y la herramienta registra
**resultados y referencias**, nunca el valor.

---

## 11. Plugin GUI (Cordis)

Plugin propio `dsh-fleet-panel` (host + client) servido por el host, sin SSH desde el navegador:

```http
GET /fleet/api/agents            GET /fleet/api/agents/:id
GET /fleet/api/agents/:id/activity   GET /fleet/api/agents/:id/logs
GET /fleet/api/agents/:id/diff  GET /fleet/api/tasks
GET /fleet/api/tasks/:id         GET /fleet/api/health
GET /fleet/api/events            # SSE, con fallback a polling
```

El host hace el **polling** a los observadores (15–30 s) y la GUI recibe SSE. No se abren 13
conexiones SSH desde el navegador. Los endpoints requieren autenticación y **no** exponen logs ni
diffs públicamente. Los diffs se renderizan **escapados** (nunca HTML ejecutable): una rama
contaminada es un vector de ataque, no solo un problema de higiene.

---

## 12. Plan por fases

| Fase | Contenido | Criterio de aceptación |
|---|---|---|
| **F0** Seguridad y compatibilidad | Bloquear el fallback quirúrgico automático; registrar `baseCommit`/`headCommit` en cada entregable; guardar la respuesta del consultor como evidencia | Un entregable con `git am` fallido **queda para revisión**, no se mergea solo |
| **F1** Registro canónico | `fleet/{agents,nodes,tasks,assignments,schemas}/` + `fleet-validate.mjs`; los 13 agentes importados; inventarios DSH como vista generada | Inventario nuevo y legacy resuelven las mismas identidades |
| **F2** Observaciones | Heartbeats del watchdog + cola outbox + `fleet-observe.mjs` → `fleet-status.json` con TTL y las 3 dimensiones | Un agente caído se marca **sin intervención** del operador |
| **F3** Plugin GUI | `dsh-fleet-panel` con cards, filtros, enlaces, diffs y logs | Cerrar el GUI **no** detiene el registro |
| **F4** Cloudflare + onboarding | Token localizado, `subdomain apply/verify`, alta de agentes, `.well-known/ciudadan-fleet.json` | Alta de un contenedor nuevo = **una operación autorizada**, sin editar YAML ni el panel a mano |
| **F5** Integración coordinada | Rol de integrador, lotes `integration/*`, protección de `main`, separación revisar/integrar/publicar | Dos hilos entregan en paralelo sin sobrescribirse ni publicar sin validar |

---

## 13. P0 inmediato

1. **Rotar 4 credenciales que quedaron expuestas en la transcripción de esta sesión** por un
   descuido al filtrar un YAML (el filtro leyó valores completos). fingerprints `sha256/8`:
   `3463c9f7` (usada por `DEEPSEEK_API_KEY`, `NVIDI_API_KEY`, `MI_NVIDIA_API_KEY`),
   `94a2c07e` (`TERNURITAS_API_KEY`), `623e7647` (`TNVIDIA_API_KEY`), `4c6853c0` (`MINIMAXX_API_KEY`).
   **Ninguna de ellas pertenece a la flota rotada** (verificado: los 8 fingerprints de la flota no
   coinciden) → la flota de contenedores **no está comprometida**. Afecta al harness local.
   Además, el secreto de sesión del harness quedó visible en la misma salida.
2. **Revocar la llave NVIDIA vieja** `af772e0c` (pendiente de ROOT desde el ciclo anterior).
3. **Bloquear el fallback quirúrgico automático** del watcher (F0).
4. **Localizar el token de API de Cloudflare** (siguiente acción) y verificar su alcance real.

---

## 14. Decisiones que requieren ROOT

| Decisión | Recomendación | Estado |
|---|---|---|
| Fuente canónica | Git del monorepo | **Ya decidido** |
| Historial operativo | Rama `fleet-state` | **Pendiente de OK** |
| Forma del inventario | Un archivo por agente | **Pendiente de OK** |
| Alta de agentes | Declarativa + descubrimiento condicionado | **Pendiente de OK** |
| Un túnel por nodo | Separar `tunnel-temporal-{1,2,3}` | **Pendiente de OK** (implica reconfigurar Cloudflare) |
| Integración | Revisor + integrador + publicador; `main` protegida | **Pendiente de OK** |
| Telemetría en git | Transiciones y snapshots, **no** cada heartbeat | **Pendiente de OK** |
| Parche del adaptador + reinicio del DSH 3080 | Habilitar consultas GPT como subagente | **Pendiente de OK** (corta la sesión) |
| Rotación de las 4 llaves expuestas | Rotar en el harness local | **Pendiente de OK** |

---

## 15. Riesgos y trampas

1. **Ramas contaminadas (66/78)**: no ejecutar código de ramas sin revisar; el diff es un vector de
   ataque, no solo un problema de higiene → renderizado escapado + revisión obligatoria.
2. **Archivos `.patch`**: pueden alterar rutas de auth, CI, dependencias o arranque. La extensión
   `.patch` no concede inocencia.
3. **Logs**: filtrar tokens y cabeceras; el contenido de logs no debe poder inyectar contenido
   ejecutable en la GUI.
4. **Frontends públicos**: exponer datos de prueba y endpoints administrativos → proteger con
   Cloudflare Access (la sonda debe usar una identidad de servicio; un redirect a login **no**
   significa caída).
5. **Suplantación de agente**: el `id` declarado no es autenticación → verificar el origen del
   evento con una credencial de transporte por agente/nodo.
6. **Saturación de git**: un commit por heartbeat destruye la usabilidad → transiciones y snapshots.
7. **Estado engañoso**: conectado ≠ trabajando → `running_without_progress`.
8. **Dependencias compartidas**: `cline-hub`, git remoto, OpenBao y Cloudflare siguen siendo
   puntos únicos de falla aunque la GUI deje de depender de un DSH.
9. **Overwrite de Cloudflare**: el `PUT` de configuración borra reglas ajenas si no se fusiona bien
   → reservar por túnel y releer después de publicar.

---

## 16. Estado real de los subdominios (verificado por API el 2026-10-29)

El token de API de Cloudflare que el operador había creado fue **localizado**
(`C:\Users\elyiz\Downloads\tolen_autodeployer_cloudflare.docx`), **instalado** en
`~/.dsh/secrets/cloudflare-api-token.txt` con ACL sin herencia (solo `YIZUZ\elyiz` y `SYSTEM`) y
**verificado** con `GET /user/tokens/verify` → `active`, id `db06cd5c…`, **sin expiración**.

Cliente: `C:\yii\tools\cloudflare-api.mjs` (lee el token del archivo de secretos; **nunca** por
argv ni por variables de entorno, para que no aparezca en `ps`).

```bash
node C:\yii\tools\cloudflare-api.mjs verify|accounts|zones|tunnels|config <id>|routes|dns [filtro]
```

### 16.1 Hallazgos que corrigen/supervisan la premisa

| Premisa | Realidad verificada |
|---|---|
| «A algunos agentes falta configurarle el subdominio» | **Los 13 tienen todo**: ingress en el túnel + CNAME en DNS, para frontend, backend y socket (39 hostnames) |
| «Hay que decidir A/B/C de subdominios» | Ya hay **un túnel por nodo** (`temporal-1/2/3`, healthy, 4 conexiones) → la recomendación de GPT de separar por nodo **ya se cumple**; no hay que rehacer nada |
| «El token/API ya existía» | Existía en `Downloads` como `.docx`, no en el almacén de secretos; ya instalado con ACL |

Identificadores canónicos (no secretos):

- account `9a00f494de172e969c6498971bcdc3aa`
- zone `ciudadan.org` = `ebdaa743538f55296d6edad8a85d260f`
- túneles de la flota: `temporal-1` `e76638b0-99a2-4d8f-9d45-e2f5d7195809` ·
  `temporal-2` `826e8e51-5402-4385-ace7-efbb996ed0b9` ·
  `temporal-3` `30291f10-edc9-42b1-8345-76d2a10317a0`
- patrón de puertos ya presente en la configuración: frontend `3100+i`, backend `4100+i`, socket `5100+i`

### 16.2 Chequeo activo de los 13 frontends (HEAD, 2026-10-29 ~18:40)

| Agente | Estado |
|---|---|
| temporal1-agent1..4 | 200 OK |
| temporal2-agent1 | **502** (origen no responde en `3101`; túnel sano) |
| temporal2-agent2..6 | 200 OK |
| temporal3-agent1 | 200 OK |
| temporal3-agent2 | **502** (origen no responde en `3101`) |
| temporal3-agent3 | 200 OK |

**11/13 sirven.** Los 2 con 502 son el caso exacto del estado `origin_unreachable` del modelo de
GPT: el DNS y el ingress están bien; **falta el proceso en el contenedor**. La card debe mostrar
eso como "origen caído", no como "subdominio sin configurar" (que sería un diagnóstico falso).

### 16.3 Riesgos del token

1. **Sin expiración**: un token de API sin caducidad es una deuda de seguridad; conviene fijarle
   expiración (o rotarlo por calendario).
2. **Alcance excesivo**: el token ve las **5 zonas** de la cuenta (`ciudadan.org`,
   `elotromundial.mx`, `guematrialab.online`, `independientes.mx`, `marihuanas.club`). La
   recomendación de mínimo privilegio (solo `ciudadan.org`, solo DNS + Tunnel) implica recrear el
   token con permisos acotados.
3. **Copia en `Downloads`**: el `.docx` original sigue en `C:\Users\elyiz\Downloads\` con el
   secreto en claro. No se borró (no hay orden de limpieza de disco), pero conviene eliminarlo o
   moverlo al almacén.

---

## 17. Decisiones del ROOT de esta ronda y cambios aplicados (2026-10-29 ~19:00)

| Decisión | ROOT | Estado |
|---|---|---|
| Rotar las 4 credenciales del harness expuestas en la transcripción | **No rotar (riesgo aceptado)** | Deuda de seguridad **registrada y aceptada explícitamente**. Hecho comprobable: la flota (8 fingerprints) **no** está afectada; el alcance es el harness local |
| Parchar el adaptador para que GPT funcione como subagente (`workflow`) + reiniciar el DSH 3080 | **Sí, ahora** | Aplicado (§17.2) |
| Bloquear el fallback quirúrgico automático del watcher (P0 del consultor) | **Sí, ya** | Aplicado (§17.1) |

### 17.1 P0 aplicado: el fallback quirúrgico automático queda BLOQUEADO

`C:\yii\tools\integrar-quirurgico.ps1` gana un modo `-SoloEvidencia` que **no** modifica el repo,
**no** commitea, **no** mergea y **no** pushea: calcula qué archivos aplicaría la integración
quirúrgica y cuáles quedarían fuera (porque `main` los cambió desde la base) y deja el reporte en
`C:\yii\tools\revision-<rama>.md`.

`C:\yii\tools\vigilar-entregables.ps1` deja de invocar el merge automático: cuando `git am` falla,
genera la evidencia y marca el entregable como **"pendiente de revisión manual"** en
`C:\yii\tools\ESTADO-AGENTES.md`.

Motivo (del consultor, y confirmado por el estado real del día): `main` se movió **4 veces** el
29-oct por hilos distintos; un merge archivo por archivo sin revisión humana puede pisar trabajo
ajeno. El flujo `git am` (parche limpio) **sigue siendo automático** cuando aplica: solo se bloquea
el camino que reescribe archivos.

### 17.2 Parche del adaptador `dsh-chatgpt-web`

**Problema**: `assertSupportedRequest` (src/adapter.ts) rechazaba la petición completa si
`GenerateOptions` traía `purpose`, `reasoningEffort`, `temperature`, `maxTokens` o `stop`. El
harness **siempre** manda `purpose`, así que **todo** subagente con proveedor `chatgpt-web` moría
antes de despachar (por eso las sondas devolvían `null`).

**Cambio**: esos campos se **ignoran** (la UI de ChatGPT decide sus propios parámetros) y se avisa
**una sola vez por combinación** en el log del plugin. Se mantienen los errores reales:
`sessionId` obligatorio, modelo distinto de `auto`, e imágenes.

Verificación: `npx tsx --test test/adapter.test.ts` → **11/11 OK** (el test actualizado comprueba
que la petición llega al transporte y termina en `finish`); `tsc --noEmit` sin errores; `npm run
build` genera `lib/adapter.js` con el parche. El perfil web enlaza el paquete por
`link:C:/yii/ciudadan-chatgpt-bridge/src/dsh-chatgpt-web`, así que el reinicio carga el código nuevo.

> Nota operativa: `npx tsx --test test/*.test.ts` (suite completa) **se queda colgado** por un
> handle abierto — hay procesos `tsx --test` vivos desde el 23-oct. No es efecto de este parche:
> se valida archivo por archivo.

### 17.3 Reinicio del DSH 3080 (procedimiento)

`C:\Users\elyiz\AppData\Local\Ciudadan\iniciar-dsh-3080.ps1` es un **supervisor en loop**: si el
puerto 3080 está libre, arranca `dsh web --port 3080`; si no, espera 5 s. Por eso el reinicio es
**terminar el proceso** y no tocar la tarea programada.

Verificación posterior (el token nuevo se lee del log; el cliente toma **el último** que encuentra):

```powershell
node C:\yii\tools\consultar-gpt-web.mjs "Responde solo: OK"   # chat directo
# y la sonda de subagente, que es la que antes fallaba:
#   workflow -> agent(p, { provider: 'chatgpt-web', model: 'auto' })
```

Si la extensión Chrome pierde la conexión durante el reinicio, reconecta sola (el WS al 8765 se
re-establece desde el service worker); si no, recargar la pestaña de `chatgpt.com` lo fuerza.

---

## 18. Estado del vigilante de entregables tras el P0 (2026-10-30 ~05:30)

El P0 quedo **probado en produccion**, no solo escrito:

| Entregable | Resultado |
|---|---|
| `feature/integracion-hackabot` (t1a4) | **INTEGRADO en main** (`33fea80`, modo parche limpio `git am`) — la via automatica se conserva |
| `feature/rotacion-secretos-proc-1029` (t2a4) | **NO integrado**: el parche no aplica sobre `main` (rama con base vieja) -> queda **pendiente de revision manual** con evidencia en `C:\yii\tools\revision-feature_rotacion-secretos-proc-1029.md` |
| `feature/cuarentena-ramas-1029` (t1a2) | en curso |

Eso es exactamente el comportamiento pedido: **nunca** se reescriben archivos de `main` a ciegas;
cuando el parche no aplica, el entregable se documenta para que una persona lo decida.

### 18.1 Correcciones al modo evidencia (tres bugs reales)

1. `git archive` **aborta entero** si algun path del diff no existe en ese ref (p. ej. `anuncio.txt`,
   borrado por la rama): no habia tar y el reporte salia vacio. El modo evidencia ya **no descarga
   tar**: consulta en el contenedor el blob-id de cada archivo en la rama y en la base
   (`git rev-parse --verify --quiet`) y lo compara con el de `origin/main` en el clon local.
2. `git rev-parse` **imprime el argumento en stdout** cuando no resuelve el objeto, y eso partia la
   linea de salida en dos. Con `--verify --quiet` la salida es limpia (`AUSENTE` cuando no existe).
3. El script se ejecutaba en el **host** del nodo, no dentro del contenedor (el repo vive en
   `/workspace` del contenedor). Ahora viaja por `docker exec -i` con el script en base64.

Ademas, el vigilante ya no reintenta lo que **ya** esta integrado: comprueba
`git merge-base --is-ancestor origin/<rama> origin/main` antes de integrar (el centinela `DONE`
sigue en el contenedor aunque el entregable ya este en `main`).

### 18.2 El vigilante vive como tarea programada

`C:\yii\tools\vigilar-entregables.ps1`murio con el primer reinicio del DSH (era hijo de su arbol de
procesos). Ahora corre como **tarea programada** `Ciudadan-Vigilante-Entregables`
(wrapper `C:\yii\tools\run-vigilante.cmd`, log `C:\yii\tools\logs\vigilar-entregables.log`), igual
que el propio DSH: sobrevive a los reinicios y se relanza con `schtasks /run`.

### 18.3 El puente: el parche funciono, pero la pagina de ChatGPT se quedo colgada

Tras el reinicio, el parche quedo **vivo y verificado** en el log del DSH:

```
[dsh-chatgpt-web] GenerateOptions sin equivalente en la UI de ChatGPT, se ignoran: maxTokens,purpose
```

O sea: la peticion **ya no se rechaza** (era la causa del `null` en los subagentes). Lo que quedo
pendiente fue del lado del navegador:

- La extension **si** quedo conectada (WS + `hello` al puente nuevo) y recibio la orden.
- El content script respondio `accepted: true` al instante; el cuelgue estaba en
  `observeGeneration` (la pagina de ChatGPT no empezo a generar) y **la senal de error nunca
  llego al puente**: ni el plugin registraba errores ni el publicador escribia mas que exitos.
- Recuperacion aplicada: recargar la extension en `chrome://extensions`.

Mejoras aplicadas al plugin para que esto no vuelva a ser invisible:

- `console.log` de la **etapa** del puente (`navigating`, `ready`, `sent`, `generating`).
- `console.error` del **error del puente** (`WORKER_NAVIGATION`, `WORKER_BUSY`, `BRIDGE_*`).
- **Watchdog de 5 min**: si el puente no responde, se aborta la generacion y se libera la extension
  (antes el cuelgue era infinito y dejaba el `activeRequest` de la extension ocupado, de modo que
  todo lo demas respondia `WORKER_BUSY`).

Tests: `test/adapter.test.ts` **11/11 OK**, `tsc --noEmit` limpio, `npm run build` OK.

### 18.4 El vigilante, operativo y sin carreras (2026-10-30 ~06:30)

Cuatro problemas reales encontrados al poner el P0 en produccion, con su correccion:

1. **Carrera de repositorio**: el vigilante y la sesion principal usaban el mismo clon
   (`C:\yii\ciudadan_app_monorepo`); una sesion que commitea mientras el vigilante hace
   `checkout -B aceptacion/<rama>` se lleva por delante el commit (pasó: un commit de docs
   acabo en la rama de aceptacion). Ahora el vigilante tiene su propio **worktree**:
   `C:\yii\ciudadan_app_monorepo-vigilante` (`git worktree add --detach ... origin/main`).
2. **El vigilante murio con el DSH**: era hijo del arbol de procesos del DSH. Ahora corre como
   **tarea programada** `Ciudadan-Vigilante-Entregables` (cada 5 minutos, en modo `-UnaVez`:
   una pasada y sale), que ejecuta el Scheduler y no el DSH. Cada pasada escribe en su propio
   log `C:\yii\tools\logs\vigilante-<timestamp>.log` y hay un **cerrojo** (`vigilante.lock`)
   que impide pasadas solapadas.
3. **Captura anidada que rompe los comandos nativos**: invocar `& script.ps1` (en el mismo
   proceso) con su stdout redirigido hace que, dentro del script, cualquier comando nativo
   falle con `StandardOutputEncoding is only supported when standard output is redirected`
   (se perdia el inventario de archivos). El invoker del modo evidencia ahora lo lanza como
   **proceso hijo** (`pwsh -NoProfile -File ...`) y la salida de `git`/`ssh` va a archivos.
4. **Reintentos de lo ya integrado**: el centinela `DONE` sigue en el contenedor aunque el
   entregable ya este en `main`. Ahora, antes de integrar, se consulta el marcador explicito
   `C:\yii\tools\integrados-vigilante.json` y las referencias **remotas** (`origin/aceptacion/<rama>`,
   `origin/<rama>`); ademas el modo evidencia devuelve codigo 10 cuando el contenido de la rama
   ya esta en `main`. Tras integrar, la rama de aceptacion **se publica en el remoto** (deja
   constancia de que se integro).

Estado actual del tablero (`C:\yii\tools\ESTADO-AGENTES.md`):

| Entregable | Estado |
|---|---|
| hackabot (Candidatos.jsx + build) | ya integrado en main (`33fea80`, modo parche) |
| plan de cuarentena de las 66 ramas | en curso |
| runbook de rotacion de los 20 P0 | **pendiente de revision manual** (P0 activo) con evidencia en `C:\yii\tools\revision-feature_rotacion-secretos-proc-1029.md` |

### 19. El limite real del puente: el prompt no cabe en el compositor (2026-10-30 ~09:30)

Con el parche del adaptador vivo (la peticion ya no se rechaza: "GenerateOptions ... se ignoran"), los subagentes `chatgpt-web` **respondieron bien** ("SUBAGENTE_OK", "SUBAGENTE_OK_2"), pero el cliente directo seguia colgado. La traza nueva (longitudes, sin contenido) dio la causa:

```
[dsh-chatgpt-web] peticion: plan=new prompt=50938 chars tools=40 toolSection=31256 chars
```

**El prompt pesaba 50 938 caracteres**, muy por encima del limite del compositor de ChatGPT (~32 k). La causa era que el presupuesto de transporte (32 KB) recortaba **el historial**, pero la seccion de herramientas (31 KB: el JSON Schema completo de 40 herramientas) se anadia **despues**, fuera del presupuesto. Contexto, en tres correcciones:

1. **La seccion de herramientas se reserva antes de construir el prompt** (`plan(..., reserveChars)`): el historial se recorta en consecuencia y el prompt total respeta el limite.
2. **Catalogo compacto**: cada herramienta se describe con nombre, proposito y parametros (tipo/obligatoriedad/enum) en vez del JSON Schema completo. La seccion paso de 31 256 a **14 017** chars y el prompt total de 50 938 a **27 343** chars (ya dentro del limite). El esquema completo sigue validandose en el lado DSH al ejecutar el contrato.
3. **Pagina**: antes de escribir se limpia el compositor (se quitan adjuntos pegados y se vacia el editor) y para texto grande se usa ProseMirror en vez del pegado sintetico. Motivo: el pegado de ChatGPT convierte el texto en un adjunto "Texto pegado(...).txt" y deja el compositor vacio; ademas ese adjunto **queda pegado** y ensucia los intentos siguientes (por eso, tras fallar el cliente directo, tambien fallo el subagente). Si el texto no llega al compositor, ahora se falla de inmediato con `composer did not accept the prompt text` en vez de esperar 120 s a que "no empiece la generacion".

Version de la extension: **0.1.12** (recargar en `chrome://extensions` para que tombe el arreglo de pagina).

Ademas, el vigilante de entregables dejo de abrir una ventana de consola cada 5 minutos: la tarea usaba un `.cmd` directo con `LogonType=Interactive` (el `<Hidden>true</Hidden>` del XML solo oculta la tarea en el programador, NO la consola). Ahora la tarea ejecuta `wscript.exe` con un lanzador `.vbs` de estilo de ventana 0, como las demas tareas propias del DSH.
