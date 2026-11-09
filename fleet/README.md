# Flota Ciudadan — declaración de agentes

Este directorio es la **fuente común en git** de la flota: un YAML por agente
con su identidad, su ubicación y la tarea que tiene declarada.

- `agents/<agent_id>.yaml` — un archivo por agente (18 a 2026-10-31).
- Los archivos los genera `C:\yii\tools\fleet\generar-inventario-git.mjs` a
  partir del inventario operativo local (`~/.dsh/infrastructure/agents.yaml`),
  pero a partir de ahora se editan **a mano en git** y el generador solo se
  usa como volcado inicial.

## Qué es declaración y qué es estado real

| Campo | Qué significa | Quién lo mantiene |
|---|---|---|
| `agent_id`, `node`, `runtime`, `contenedor` | identidad y ubicación | operador |
| `tarea.descripcion` | qué tiene que hacer el agente | operador / quien se lo asignó |
| `tarea.estado` | `activa` · `pausada` · `sin_tarea` | operador |
| `tarea.declarada_en` | cuándo se declaró la tarea | operador |

El **estado real** (vivo, atascado, caído, ocioso) no se escribe aquí: lo
calcula el monitor programático (`C:\yii\tools\fleet\fleet.mjs`) y se publica
en:

- `C:\yii\tools\ESTADO-FLETA.md` — tablero legible.
- `C:\yii\tools\fleet\estado\fleet-snapshot.json` — instantánea para máquinas.

Motivo: el estado real cambia cada minuto; meterlo en git ensuciaría el
historial con ruido y abriría conflictos en cada pasada del monitor.

## Estados y reglas

- `tarea.estado: activa` + runtime sin actividad → el monitor marca `STALLED`
  tras 2 comprobaciones consecutivas y avisa al agente decisor.
- `tarea.estado: pausada` o `sin_tarea` → el agente aparece `IDLE`, sin alerta.
- Cambiar `tarea.estado` es la forma de **cerrar o pausar una tarea** y con
  ella cesa el aviso correspondiente.

## Señal nativa usada para el progreso

El monitor **no** usa `/workspace/logs/*.log` como señal de progreso: esos
ficheros los escribe un *health poll* cada 60 s y harían que todo pareciera
activo para siempre. Usa la señal nativa de Cline:

- `alive_ts` — el hub de Cline emite `run.heartbeat` cada ~30 s mientras hay
  una sesión viva. Indica que el **runtime** está en marcha.
- `session_ts` — mtime del estado de sesión
  (`/workspace/.cline/data/sessions/<id>/<id>.json`).
- `progress_ts` — máximo entre `session_ts` y el último commit del repo.
  Indica **progreso real**.

Publicados por el heartbeat del nodo (`~/.ciudadan-fleet/heartbeat.json`) y,
en caso de fallo, por el sondeo directo del monitor.
