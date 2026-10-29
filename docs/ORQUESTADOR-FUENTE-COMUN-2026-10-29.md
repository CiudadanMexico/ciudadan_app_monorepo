# Orquestador Ciudadan — Fuente común de verdad + cards de agentes en la GUI

> **Fecha:** 2026-10-29 · **Autor:** agente principal (sesión yizuz) · **Estado:** propuesta para
> decisión ROOT · **Consultor GPT:** consulta preparada en `C:\yii\tools\consulta-gpt-orquestador.md`
> pero **NO ejecutada** (proveedor `chatgpt-web` caído; ver §8).

---

## 1. El problema, desarmado

La petición tiene **cuatro** pedidos que hoy viven revueltos en un solo archivo Markdown:

| # | Pedido | Hoy | Dónde falla |
|---|---|---|---|
| 1 | Saber **en qué tarea** trabaja cada agente | `docs/cline-hub-temporales.yaml` (declarado, estático) | Se aging: hoy dice "temporal1-agent2 → food-cotizaciones", y ese agente ya hacía cuarentena |
| 2 | **Estado vivo** (en curso / entregado / caído) | centinelas `/tmp/DONE-*` + procesos | Solo lo ve quien mira por SSH |
| 3 | **Links**: frontend del agente + diff de su rama | no existe | El puerto 31xx solo escucha en `127.0.0.1` del nodo; el subdominio no existe para todos |
| 4 | **No depender de un solo DSH** | todo vive en la sesión de yizuz | Si esa sesión muere, el estado se muere con ella |

El error de diseño actual no es la falta de datos: es que **el estado se guarda en el lugar que
resulta cómodo para quien mira**, en vez de en un lugar al que **todos** llegan.

---

## 2. Decisión recomendada: tres capas, ninguna es un servidor crítico

```
   CAPA 1  REGISTRO DECLARATIVO            CAPA 2  ACTIVIDAD (append-only)        CAPA 3  ÍNDICE + UI
   ─────────────────────────────           ───────────────────────────────         ────────────────────
   fleet/agents.yaml  (en el monorepo)     /workspace/logs/fleet-activity.jsonl     fleet-status.json  (derivado)
   identidad, puertos,                      (UN archivo por nodo, cada nodo        sirve la GUI, el CLI,
   subdominio, llave (fingerprint)          es dueño del suyo -> sin choque)        el MCP y cualquier chat
   versionado, viaja con git fetch          heartbeat lo escribe el watchdog
   NO depende de ningún DSH                 TTL -> "caido" se CALCULA, no se escribe
```

**Por qué esta gana:**

- **Capa 1 en git**: los 3 nodos, el clon operador, Dany y cualquier DSH nuevo **ya hacen
  `git fetch`** (verificado hoy: los contenedores sí pueden hacer fetch; solo el push está
  bloqueado). Git ya es el sistema distribuido de verdad del equipo, con historial, blame y
  revert. Un `fleet/agents.yaml` versionado **no puede caerse** y se revisa en un PR.
- **Capa 2 por nodo**: cada nodo escribe en **su propio** archivo → **cero contención** entre
  nodos y entre hilos. Un watchdog (que ya existe y ya sobrevive al cierre de la sesión del
  operador, porque corre como `setsid nohup` en el host) escribe un heartbeat en cada ciclo.
  El archivo es append-only: nunca se corrompe por escrituras concurrentes.
- **Capa 3 es caché, no fuente**: se puede borrar y regenerar en segundos. Si cae, nadie pierde
  información: se reconstruye con `git fetch` + 3 `ssh` + `cat`.

**Alternativas descartadas y por qué:**

| Alternativa | Por qué no |
|---|---|
| Solo git (eventos en el repo) | 13 agentes × 1/min satura el repo; los contenedores no pueden hacer push; contención de pushes |
| Solo `cline-hub` (polanco:8443) | Existe pero la flota **no está registrada**, su código no tiene remote git, la contraseña del panel está hardcodeada y atarlo a polanco crea **un solo punto de falla** (justo lo que se quiere evitar). Puede ser *destino*, no *fuente* |
| Solo `ciudadan_knowledge` (MCP) | Es append-only con hash y reservas ✓, pero está para conocimiento/decisiones; escribir el latido de 13 agentes a esa cadencia contamina la BD canónica y obliga a fencing tokens por evento |
| Un solo DSH como fuente | Prohibido por diseño: si el DSH de yizuz muere, se pierde la verdad |

---

## 3. Modelo de datos

### 3.1 `fleet/agents.yaml` (capa declarativa, en el monorepo)

```yaml
schema_version: 1
updated: "2026-10-29T16:20:00-06:00"
agents:
  - id: temporal1-agent4
    node: temporal-1
    container: temporal1-agent4
    project: ciudadan_app_monorepo
    ports: { ssh: 2204, frontend: 3104, backend: 4104, socket: 5104 }
    public:
      subdomain: frontend-temporal1-agent4.ciudadan.org   # null = pendiente de configurar
      state: pendiente                                 # listo | pendiente | no_responde
      checked_at: "2026-10-29T16:20:00-06:00"
      checked_by: fleet-status.mjs
    llm:
      provider: nvidia
      model: minimaxai/minimax-m3.1-flash
      key_fingerprint: 5891d41f        # NUNCA el valor
    task:                                # null = sin asignar
      title: "Integración de Hackabot"
      file: /tmp/t-wip1.md
      declared_by: operador
      branch: feature/integracion-hackabot
      repo: CiudadanMexico/ciudadan_app_monorepo
    links:
      diff: "https://github.com/CiudadanMexico/ciudadan_app_monorepo/compare/main...feature/integracion-hackabot"
      log: "/workspace/logs/wip-hackabot.log"
      frontend_local: "http://127.0.0.1:3104"   # desde el propio nodo
      frontend_tunnel: "http://160.34.219.124:3104"  # vía túnel SSH si no hay subdominio
```

### 3.2 `fleet-activity.jsonl` (capa de actividad, un archivo por nodo)

Una línea por ciclo del watchdog. **Contrato mínimo**, escrito por el watchdog, no por el LLM
(disciplina del agente no es una garantía de infraestructura):

```json
{"ts":"2026-10-29T16:20:07Z","agent":"temporal1-agent4","node":"temporal-1","task":"Integración de Hackabot","task_file":"/tmp/t-wip1.md","branch":"feature/integracion-hackabot","commit":"9eb80bb","phase":"editando","session_alive":true,"files_changed":2,"session_pid":4821,"watchdog":"alive"}
```

`phase`: `iniciando | leyendo | editando | compilando | esperando | entregado | bloqueado`

### 3.3 Derive: estado mostrado en la card

| Campo | Cómo se obtiene | Por qué no se escribe a mano |
|---|---|---|
| `en_curso` | último heartbeat con `ts` < 180 s | evita que "caído" dependa de que alguien lo marque |
| `hace_N_min` | `now - ts` del último heartbeat | |
| `caído` | `now - ts > 180 s` **calculado** | el agente que muere no avisa: el silencio ES la señal |
| `rama`, `commit` | del heartbeat, contrastado con `git` del nodo | |
| `archivos cambiados` | heartbeat + `git status` | |
| `subdominio listo` | chequeo HTTP activo (5 s) | "configurado" ≠ "funcionando" |
| `tarea` | declarada en YAML **y** declarada por el agente | se muestran las dos, con su procedencia |

### 3.4 Declarado vs verificado (la distinción que evita mentiras)

Cada dato lleva su procedencia y se muestra con una marca visual:

- 🔵 **declarado** — lo escribió el operador (YAML, o el `tarea.md` del contenedor)
- 🟢 **verificado** — lo comprobó el sistema (proceso vivo, HTTP 200, blob, fingerprint, commit)
- 🟡 **stale** — verificado hace > 15 min
- 🔴 **conflicto** — dos fuentes se contradicen (ej. el heartbeat dice rama A, `git` dice rama B)

Nunca se muestra un dato verificado y declarado como si fueran lo mismo. Es la misma disciplina
que ya aplicamos con `confidence: verified | historical | inferred` en los inventarios.

---

## 4. Protocolo: quién escribe, quién lee

### 4.1 El que escribe (sin depender del operador)

1. El **watchdog** (que ya corre desacoplado en cada nodo) escribe el heartbeat en cada ciclo y
   el centinela `DONE-*` al terminar. **Cero cambios de disciplina del agente.**
2. El **operador** declara tareas en `fleet/agents.yaml` (PR) o deja `/tmp/t-*.md` en el contenedor.
3. El **watcher central** (el que ya existe: `tools/vigilar-entregables.ps1`) agregue todo y
   escribe `fleet-status.json`.

### 4.2 El que lee

| Consumidor | Cómo lee | Latencia |
|---|---|---|
| GUI del orquestador (cards) | `GET /fleet/status` del plugin host-half → snapshot | 5-30 s (SSE después) |
| Otro agente / otro chat | `node scripts/fleet-status.mjs --json` o tool MCP `fleet_status` | inmediata |
| Dany (instancia remota) | lee el snapshot por el puente read-only, o `git fetch` + SSH | según caso |
| Operador sin sesión | `curl` al snapshot en el repo o al plugin de otra instancia | inmediata |

**Requisito de no depender de un DSH**: cualquiera de esas cuatro filas debe poder responder
**sin que ningún DSH esté vivo**. Por eso el origen es git + SSH, y el snapshot es caché.

### 4.3 Consultarlo desde "otra charla o otro agente"

Dos puntos de entrada, ambos sin GUI:

- **MCP `ciudadan_knowledge`**: nueva tool `fleet_status(agente? , project?)` que lee el snapshot
  del repo y devuelve la card en JSON. Un agente en cualquier máquina con el MCP pregunta
  "¿qué hace temporal2-agent4?" y recibe respuesta estructurada.
- **CLI**: `node scripts/fleet-status.mjs --json --agent temporal2-agent4` (el script ya existe;
  se le agrega la capa de actividad).

---

## 5. La card en la GUI

### 5.1 Cómo se implementa (patrón ya probado en este DSH)

El GUI es un bundle **cordis**. El perfil del operador es `~/.dsh/profiles/web/`:
`package.json` (bundles) + `cordis.patch.yml` (filas de plugin). Ya existe el plugin
`dsh-custom-logo`, que hace exactamente lo que necesitamos:

- **mitad host** (`lib/index.js`): sirve rutas propias (`/fleet/*`) y sirve el snapshot.
- **mitad client** (`lib/client.js`): agrega un panel/página en el sidebar del GUI.

Un plugin nuevo `dsh-fleet-panel` se registra en `cordis.patch.yml` → **sobrevive a las
actualizaciones de DSH** (es un patch del perfil de usuario, no del paquete).

> El plugin **no** habla SSH con los nodos: lee el snapshot que produce el watcher. Así el
> mismo plugin funciona en yizuz, en Dany y en cualquier DSH futuro, aunque esa instancia no
> tenga acceso a la flota (muestra el último snapshot con su edad → "degradado", no "caído").

### 5.2 Anatomía de la card

```
┌──────────────────────────────────────────────────────────────────────┐
│ ● temporal1-agent4            temporal-1 · 160.34.219.124           │
│ Integración de Hackabot                          [en curso · 4 min]  │
│ 🔵 declarada: reescritura de Candidatos.jsx + build del frontend    │
│ 🟢 verificado: sesión Cline viva (pid 4821) · 2 archivos modificados │
│                                                                      │
│ rama  feature/integracion-hackabot            commit 9eb80bb         │
│ [ver diff en GitHub] [ver log] [pedir estado]                       │
│                                                                      │
│ frontend  https://frontend-temporal1-agent4.ciudadan.org             │
│           🟢 responde (HTTP 200, verificado 16:20)                   │
│ backend   🟡 pendiente de subdominio  →  [checklist de 3 pasos]      │
│                                                                      │
│ llave  nvidia · minimaxai/minimax-m3.1-flash · fingerprint 5891d41f  │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 Estados visuales y acciones

| Estado | Se ve | Significado |
|---|---|---|
| `en curso` | punto verde pulsante + "hace N min" | heartbeat reciente |
| `entregado` | check + commit | centinela `DONE-*` presente |
| `en pausa` | ámbar | sin sesión y sin heartbeat, pero declarado en pausa |
| `libre` | gris | declarado sin tarea |
| `caído` | rojo + "sin señal desde N min" | heartbeat vencido (TTL 180 s) |
| `conflicto` | naranja + detalle | heartbeat y `git` no coinciden |
| `subdominio pendiente` | gris + checklist | sin hostname configurado |

Acciones: **abrir frontend**, **ver diff**, **ver log**, **pedir estado** (sondear ahora),
**copiar resumen para otro chat** (markdown listo para pegar en cualquier conversación).

---

## 6. Subdominios: el hoyo real

### 6.1 Por qué faltan

`cloudflared` corre en modo **token** (`tunnel run --token-file /etc/cloudflared/token`): el
ingress se define en el **panel de Cloudflare**, no en el host. Por eso `/etc/cloudflared/config.yml`
está vacío y no hay forma de versionar los hostnames en git. Cada agente que falta es un clic
manual forgotten en el panel.

### 6.2 Lo que se puede hacer hoy (sin tocar nada del cluster)

1. **Chequeo activo**: el watcher hace `GET https://<subdominio>` con 5 s de timeout y clasifica
   `listo | no_responde | sin_configurar`. Con eso, la card muestra la verdad y el checklist
   aparece solo donde falta.
2. **Fallback utilizable hoy**: cada agente ya expone su frontend en `127.0.0.1:31xx` del nodo.
   Con un túnel SSH (o Tailscale) se puede abrir `http://<nodo>:31xx` aunque no exista el
   subdominio → la card trae siempre un enlace que funciona, aunque sea por túnel.
3. **Inventario de pendientes**: 13 hostnames, de los cuales los del `adrian1/adrianperez2` ya
   existen; falta crearlos para la flota temporal, apuntando a `http://localhost:31xx` del nodo
   correcto (recordando: el ingress debe apuntar al **puerto del host**, no al del contenedor).

### 6.3 Decisión de mediano plazo (requiere ROOT)

**Opción A — seguir con Cloudflare manual**: 13 hostnames creados a mano en el panel. Barato,
pero no versionable y se olvida.

**Opción B — proxy inverso por nodo (RECOMENDADA)**: un nginx por nodo con `server_name
agente-X.<dominio>` y certificados de Cloudflare; los hostnames quedan **declarados en git** y el
watcher puede **crear/verificar** cada uno sin panel. Un dominio, N hostnames, todo auditable.
Costo: un nginx y un certificado por nodo (~1 día, touching 3 máquinas).

**Opción C — `config.yml` de ingress en vez de modo token**: cloudflared admite ingress local con
`--config`; permite versionar los hostnames en git y recargar sin panel. Cambia el modo de
operación del túnel en 3 máquinas → requiere OK y ventana.

---

## 7. Migración por fases

| Fase | Qué | Esfuerzo | Valor | Depende de ROOT |
|---|---|---|---|---|
| **F0** | El watcher actual empieza a producir `fleet-status.json` con los campos de la card (tarea, rama, commit, links, chequeo de subdominio) | bajo | **Alto**: el tablero deja de ser texto muerto | no |
| **F1** | `fleet/agents.yaml` canónico en el monorepo + heartbeat del watchdog por nodo. Depreciar `docs/cline-hub-temporales.yaml` y `~/.dsh/infrastructure/agents.yaml` (dejan de ser fuente, quedan como espejo) | medio | Alto: una sola identidad de agente, versionada | sí (dónde vive el canónico) |
| **F2** | Plugin `dsh-fleet-panel` (host + client) en `~/.dsh/profiles/web/` → cards en el GUI | medio | Alto: la parte gráfica que pide el usuario | sí (rebuild del bundle + replicar en Dany) |
| **F3** | Checklist de subdominios + verificación activa + elegir A/B/C | medio | Medio | sí (opción de subdominios) |
| **F4** | Tool `fleet_status` en el MCP `ciudadan_knowledge` → cualquier agente/chat pregunta | bajo | Alto: fulfills "que otro agente sepa" | sí (API del banco) |
| **F5** | SSE en vez de polling + push de heartbeat por Tailscale (menos SSH) | medio | Bajo-medio | no |

**Lo que se puede hacer hoy sin reescribir nada**: F0 entero. El watcher ya existe, ya sabe
leer centinelas y ya sabe hablar con los 3 nodos por SSH; solo hay que añadirle 5 campos y
volcar JSON.

---

## 8. Estado de la consulta al consultor (GPT)

La consulta completa está en `C:\yii\tools\consulta-gpt-orquestador.md` (contexto íntegro del día,
estructura de datos, protocolo, UI, subdominios, migración, riesgos y preguntas).

**No se pudo ejecutar**: el proveedor `chatgpt-web` devolvió `null` incluso con una sonda mínima
("OK, puedes responder..."). Diagnóstico verificado:

- El supervisor del puente (`:8768`) está **vivo** (`{"vivo":true,"pendientes":0}`) y los puertos
  8765/8766/8767/8769 están escuchando.
- El puente lo mueve una **extensión de Chrome** en el navegador del operador; el **último evento
  registrado es del 2026-10-28 03:37** → la extensión no está conectada.
- El monitor registra "DEGRADADO" por un config del tier `b3d` (instancia 3081, obsoleta tras la
  migración a 3080): falta `C:\yii\ciudadan-chatgpt-bridge\b3d\config-b3d.json` (hay 3
  respaldos en `migracion-3080\respaldo-*`). **No es la causa del fallo del proveedor**, pero
  ensucia la señal de salud.

**Acción para ROOT**: abrir Chrome con la extensión del puente activa y una pestaña de ChatGPT →
la extensión reconecta → la consulta se puede reintentar en un paso. Esta propuesta **no depende**
de esa respuesta: está construida con evidencia local comprobada (repositorio, inventarios, protocolo
del puente, arquitectura cordis del GUI) y la respuesta del consultor serviría para contrastarla,
no para habilitarla.

---

## 9. Riesgos y trampas

| Riesgo | Mitigación |
|---|---|
| **"Abrir diff" como vector de ataque**: hay 66 ramas contaminadas y un backdoor reinyectado 3 veces | Las cards **nunca renderizan contenido de una rama no verificada**: solo enlaces a GitHub y al log. La guardia de payloads (`check-payload-ofuscado.js`) sigue siendo obligatoria antes de cada merge (ya está en el pipeline) |
| **Filtrar llaves** | Solo fingerprints `sha256/8`; el snapshot nunca incluye `providers.json` ni valores; el panel no tiene acceso al config del contenedor |
| **Depender de un DSH vivo** | La verdad está en git + archivos por nodo; el snapshot es caché reconstruible |
| **El registro se vuelve el punto único de falla** | Sin servidor central: git ya es distribuido y replicado; los heartbeats son archivos locales |
| **Que el estado se declare sin verificar** | Marcas de procedencia (declarado/verificado/stale/conflicto) y TTL calculado |
| **Multi-hilo: dos sesiones reportando el mismo agente** | Cada escritor tiene su archivo; el merge toma el evento más reciente **y marca `conflicto`** si hay empate en el mismo minuto, en vez de elegir a ciegas |
| **Puertos 220x públicos** ⚠ | Ya documentado en `capabilities.yaml`; **no** exponerlos por los subdominios: los hostnames apuntan solo a 31xx/41xx |
| **Duplicidad de fuentes** (3 YAMLs con lo mismo) | F1 canoniza; los otros dos quedan como espejo con puntero al canónico |
| **El panel se rompe al actualizar DSH** | El plugin es un patch del perfil de usuario (`cordis.patch.yml`), no del paquete: sobrevive upgrades |

---

## 10. Decisiones que pide ROOT

1. **Fuente común**: ¿solo git + heartbeats por nodo (recomendado), o además un servicio central
   tipo `fleet-registry`/cline-hub reanimado? *Recomendación: git + heartbeats; cline-hub queda
   como destino opcional para un panel fuera de DSH.*
2. **Subdominios**: ¿A (Cloudflare manual), **B (proxy inverso por nodo, versionado en git)** o
   C (ingress local de cloudflared)? *Recomendación: B.*
3. **Plugin de GUI**: ¿se autoriza `dsh-fleet-panel` en `~/.dsh/profiles/web/` (con rebuild del
   bundle) y replicarlo en Dany?
4. **Canonización del inventario**: ¿se adopta `fleet/agents.yaml` en el monorepo como fuente
   única y se deprecian `~/.dsh/infrastructure/agents.yaml` + `docs/cline-hub-temporales.yaml`?
5. **API del banco**: ¿se autoriza la tool `fleet_status` en `ciudadan_knowledge` para que
   cualquier agente/chat consultes la flota sin GUI?
6. **Consulta al consultor**: ¿se deja para cuando la extensión de Chrome vuelva, o se decide
   esta propuesta sin ella?

---

## 11. Resumen en una línea

**Hoy**: el estado de la flota vive en archivos que solo ve quien mira por SSH.
**Propuesta**: la verdad en **git** (identidad) + **heartbeats por nodo** (vida), el snapshot como
caché, y las cards en el GUI como un **plugin cordis** que las muestra con estado real, enlace al
frontend (con checklist cuando falta el subdominio) y enlace al diff de la rama.
**Y ninguna de las tres capas depende de que un DSH siga encendido.**
