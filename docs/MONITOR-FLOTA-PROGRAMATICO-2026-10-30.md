# Monitor programático de la flota (clines + DSH)

> **Estado:** v1 en operación (30-oct-2026) · programático, sin IA para decidir
> **Ubicación:** `C:\yii\tools\fleet\` · tarea programada `Ciudadan-Fleet-Monitor` (cada 1 min)
> **Tablero:** `C:\yii\tools\ESTADO-FLETA.md` · **Bandeja:** `C:\yii\tools\fleet\inbox\ALERTAS-PENDIENTES.md`

---

## 1. Encargo

> «un monitor tanto de clines como de dshs de sus tareas, pero que no sea IA, que sea
> programático y que cuando un agente deje de chambear se caiga, etc. sea el que emita
> avisos, primero a este agente que es el que decide y ya de ser necesario a mí»

Decisiones de diseño que lo cumplen:

| Requisito | Cómo se cumple |
|---|---|
| Sin IA para decidir | Clasificador determinista (`lib/estados.mjs`): mismas entradas → mismo estado. Ningún modelo participa en la decisión. |
| Cubre clines y DSH | 13 contenedores Cline (SSH, solo lectura) + las sesiones DSH vivas (API `session/list` del 3080). |
| Detecta «dejó de chambear» | Máquina de estados con señales y umbrales (§4). |
| Avisa primero al agente decisor | `POST /api/session/prompt` a la sesión raíz activa del DSH (esta sesión). |
| Escala al humano solo si hace falta | Si no hay **ACK de decisión** en 300 s (60 s si el decisor está caído): notificación de Windows + bandeja. |
| Cambios aditivos y reversibles | Todo vive en `C:\yii\tools\fleet\`. No se despliega nada en los nodos: el sondeo es por SSH con comandos de solo lectura. |

---

## 2. Criterio consultado (ChatGPT Web vía el puente)

Consulta realizada el 30-oct-2026 con el proveedor `chatgpt-web` (puente operativo tras
recargar la extensión 0.1.13). **Procedencia: inferencia arquitectónica fundamentada +
antecedentes recuperados; la implementación completa no estaba comprobada.**

CriterioReturned (resumen fiel):

1. **Separar tres condiciones** que se confunden:
   - *Disponibilidad*: el contenedor/proceso/sesión existe y responde.
   - *Actividad*: el agente opera o espera una dependencia identificable.
   - *Progreso*: la tarea avanza conforme a señales y plazos.

   > `container.running = true` **no** significa `agent.working = true`.
   > `last_git_commit > 15 min` **no** significa `agent.stalled = true`.

2. **Señales sugeridas**: host alcanzable (SSH), Docker disponible, contenedor en
   ejecución, proceso Cline vivo, heartbeat de runtime (fichero JSON), eventos de
   herramientas, progreso de tarea, reservas del ledger (TTL) y git (auxiliar, nunca única).
3. **Prohibiciones explícitas**: una reserva renovada **no** es progreso; no exponer
   `docker.sock`; el puente de Dany (3091) es de **solo lectura**; no reiniciar
   `dsh-dany.service`; el watcher de entregables y el monitor de flota son cosas distintas.
4. **Escalamiento**: incidencia → agente decisor → ACK explícito → (sin ACK) humano.
   `DELIVERY_ACK` ≠ `DECISION_ACK`. Solo la ausencia de un ACK válido escala al humano.
5. **Ledger**: registrar solo transiciones significativas (incidencia abierta, notificada,
   evils. unheard, escalada, resuelta), no cada heartbeat.

### Puntos que el consultor dejó pendientes de confirmar

- Si la API de Cline expone actividad estructurada (hoy solo hay inferencia por logs/git).
- Cuál es el canal de ACK real del decisor (aquí se resolvió: `fleet.mjs ack`).
- Duración típica de cada tipo de tarea (los umbrales son configurables por agente).
- Qué señales emite hoy el ledger como «actividad» (hoy no se usa como señal de progreso).

---

## 3. Arquitectura implementada

```
                    C:\yii\tools\fleet\fleet.mjs  (ciclo, cada 1 min)
                                  │
      ┌───────────────────────────┼────────────────────────────┐
      │                           │                            │
  Sonda Cline                 Sonda DSH                  Máquina de
  (SSH, solo lectura)     (API session/list 3080)        estados (pura)
      │                           │                            │
  temporal-1/2/3             sesiones raíz y activas      WORKING · WAITING · IDLE
  docker inspect            running / agentAvailable /    SUSPECT · STALLED · DOWN
  git log -1                updatedAt                     UNOBSERVABLE · FAILED
  mtime del log del agente                                     │
  procesos cline / tmux                                        ▼
                                                    Registro de incidencias
                                                    (SQLite + WAL)
                                                            │
                                             ┌──────────────┴──────────────┐
                                             ▼                             ▼
                                  Agente decisor (esta sesión)        Humano
                                  session/prompt + ACK                toast + bandeja
                                  (300 s sin ACK ⇒ escala)
```

**Separación deliberada del watcher de entregables:** `vigilar-entregables.ps1` integra
ramas de git cada 5 min; `fleet.mjs` vigila *vida y progreso* de los agentes cada 1 min.
No comparten estado, ni worktree, ni base de datos.

---

## 4. Señales, umbrales y estados

### 4.1 Estados

| Estado | Significado | ¿Alerta? |
|---|---|---|
| `WORKING` | Runtime vivo, tarea activa y progreso dentro de plazo | no |
| `WAITING` | Espera legítima declarada (p. ej. sesión DSH abierta sin actividad = esperando al usuario) | no |
| `IDLE` | Disponible, sin tarea activa | no |
| `SUSPECT` | Señal de vida degradada (> 90 s) | no (observación) |
| `STALLED` | Tarea activa, runtime vivo, sin progreso verificable y **2 comprobaciones consecutivas** | **sí** |
| `DOWN` | Runtime confirmado muerto (contenedor parado, `exited`/`dead`, `OOMKilled`, exit code) | **sí** |
| `FAILED` | La tarea se declara fallida | **sí** |
| `UNOBSERVABLE` | Falta evidencia suficiente (nodo inalcanzable, sin señal de vida) | **no** — nunca se infiere una caída |

Principio: **ante evidencia insuficiente, `UNOBSERVABLE`; nunca inventar una caída.**

### 4.2 Umbrales (`config.json`, ajustables por agente)

| Umbral | Valor | Nota |
|---|---|---|
| Heartbeat sospechoso | 90 s | `SUSPECT` |
| Heartbeat no observable | 180 s | `UNOBSERVABLE` |
| Progreso sin avance | 900 s (15 min) | `STALLED` si además hay 2 checks consecutivos |
| Checks para `STALLED` | 2 | evita falsos positivos por un tick perdido |
| Escalamiento al humano | 300 s sin ACK | 60 s si el propio decisor está caído |
| Reintento de aviso al decisor | 180 s | evita spam en la sesión |

Excepciones por agente en `config.excepciones` (p. ej. tareas largas declaradas).

### 4.3 Señales por tipo de agente

**Contenedor Cline** (SSH al nodo, solo lectura):
- `docker inspect` → estado, running, exit code, `OOMKilled`, inicio/fin.
- `git log -1` dentro de `/workspace` → timestamp del último commit.
- mtime del log del agente (`/workspace/logs/*.log`) → última actividad de la herramienta.
- `pgrep cline` y `tmux ls` → proceso y sesión viva.

> El progreso es `max(último commit, última escritura del log)`. **El contenedor vivo no
> prueba progreso**, por eso un contenedor en marcha sin señales de avance acaba en
> `STALLED`, no en `WORKING`.

**Sesión DSH** (API local `session/list`):
- `running`, `agentAvailable`, `updatedAt`, `origin`, `parentSessionId`, `cwd`, título,
  `projections.inbox`, `contextPressure`.

> En el DSH `running` significa *sesión abierta*, no *agente trabajando*. Una sesión
> abierta sin actividad reciente está **esperando** (`WAITING`), no caída. Una sesión con
> una herramienta larga sigue escribiendo su registro, así que la ausencia de actividad es
> una señal fiable de espera, no de cuelgue.

---

## 5. Ciclo de avisos

1. **Detección**: el clasificador produce un estado alertable (`STALLED`/`DOWN`/`FAILED`).
2. **Apertura de incidencia** (SQLite, deduplicada por `agente|tipo`): sobrevive a reinicios.
3. **Aviso al agente decisor**: `session/prompt` a la sesión raíz activa del DSH. Se
   registra `DELIVERY_ACK` (entregado), que **no** cancela el escalamiento.
4. **ACK de decisión**: `node C:\yii\tools\fleet\fleet.mjs ack <incident_id>`. Es lo que
   detiene el escalamiento.
5. **Escalamiento al humano**: sin ACK en el plazo → notificación de Windows + entrada en
   la bandeja + registro en el tablero.
6. **Resolución**: `fleet.mjs resolver <incident_id>`.

Comandos: `run` · `collect` (sin avisos) · `panel` · `alerts` · `ack <id>` ·
`resolver <id>` · `simular <down|stalled> <agent_id> [--escalar]` · `selftest`.

---

## 6. Verificación realizada (30-oct-2026)

| Prueba | Resultado |
|---|---|
| `selftest` del clasificador (12 casos: vivo, parado, OOM, nodo caído, sin señal, espera legítima, idle, fallo, tarea con plazo propio…) | **12/12** |
| Ciclo real sobre la flota (3 nodos, 13 contenedores + 170 sesiones DSH filtradas) | 7 s; `WORKING=9 IDLE=94 WAITING=1`; **0 falsas alarmas** |
| Simulación `DOWN` → apertura de incidencia | correcto |
| Simulación `DOWN` → entrega del aviso al agente decisor | **entregado** (mensaje recibido en esta sesión) |
| Escalamiento al humano (toast de Windows) | mostrado |
| `ack` → detiene el escalamiento | correcto |
| `resolver` → cierra y limpia la bandeja | correcto |
| Tarea programada `Ciudadan-Fleet-Monitor` (cada 1 min, `wscript` sin ventana) | registrada y ejecutándose |

La simulación **no toca ningún agente real**: `simular` inyecta una observación sintética.

---

## 7. Qué NO hace (límites deliberados)

- No reinicia, detiene ni reconfigura contenedores.
- No escribe en los nodos: todo el sondeo es por SSH con comandos de solo lectura.
- No usa `docker.sock` ni expone APIs de escritura del DSH de Dany (3091 es solo lectura).
- No usa el puente de Dany para nada de este monitor.
- No decide con IA: el modelo, si interviene, solo puede interpretar una incidencia ya
  detectada por regla.

## 8. Siguientes fases (pendientes de OK)

| # | Fase | Qué falta |
|---|---|---|
| F1 | Heartbeat por agente en los nodos | Hoy el heartbeat se deriva del sondeo central; falta que cada nodo publique su propio heartbeat (fichero JSON) para sobrevivir a una caída del colector. Requiere desplegar un script de solo lectura en los 3 nodos → **necesita OK**. |
| F2 | Señal de progreso nativa de Cline | Hoy el progreso se infiere de git + logs. Falta el evento estructurado de la API de Cline. |
| F3 | `fleet/agents/*.yaml` en el monorepo | Mover el inventario a git (fuente común acordada) y versionarlo. |
| F4 | Panel DSH en la GUI (`dsh-fleet-panel`) | Mostrar el estado dentro del DSH en vez de solo en Markdown. |
| F5 | `.well-known/ciudadan-fleet.json` | Exposición pública del estado de la flota (solo lectura, sin datos sensibles). |

Riesgos a vigilar: el umbral de 15 min puede generar falsos positivos en tareas de
compilación larga → por eso las excepciones por agente son configurables y la regla exige
2 comprobaciones consecutivas antes de declarar `STALLED`.
