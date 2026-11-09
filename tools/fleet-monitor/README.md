# Monitor programático de la flota

Monitor **sin IA** de los agentes Cline (contenedores Docker) y de las sesiones
DSH. Detecta cuándo un agente "dejó de chambear", avisa **primero al agente
decisor** (la sesión DSH activa) y **solo si no hay ACK**, escala al humano.

Estado de la arquitectura y criterios: `docs/MONITOR-FLOTA-PROGRAMATICO-2026-10-30.md`
en el monorepo.

## Instalación

```bash
cp config.example.json config.json      # y ajusta hosts, rutas y excepciones
node fleet.mjs selftest                  # 17/17 antes de tocar nada
node fleet.mjs collect                   # un ciclo de observación
node fleet.mjs panel                    # imprime el tablero
```

En Windows, para que corra cada minuto sin ventana: `run-fleet.vbs` +
`run-fleet.cmd` y la tarea `task-fleet-monitor.xml` (modelada sobre una tarea
exportada del sistema, porque el XML escrito a mano no es válido para el
Programador de tareas).

## En cada nodo (heartbeat propio)

```bash
scp fleet-heartbeat.sh instalar-heartbeat.sh usuario@host:~/.ciudadan-fleet/
ssh usuario@host 'bash ~/.ciudadan-fleet/instalar-heartbeat.sh'
```

El script es de **solo lectura**: `docker inspect`, `docker exec` de `tmux`/`ps`,
lectura del log del hub y del estado de sesión, y `git log` del repo del
contenedor. Publica `~/.ciudadan-fleet/heartbeat.json` de forma atómica
(`flock` + validación JSON previa + `mv`). El monitor lee ese fichero (ciclo de
2 s) y cae al sondeo directo por SSH si el heartbeat envejrece.

## Señales

| Señal | Qué significa | Dónde sale |
|---|---|---|
| `alive_ts` | el **runtime** de Cline está en marcha | `run.heartbeat` del hub (cada ~30 s) |
| `session_ts` | cuándo se escribió el estado de la sesión | `.cline/data/sessions/<id>/<id>.json` |
| `progress_ts` | **progreso real** | `max(session_ts, último commit)` |

> `/workspace/logs/*.log` **no** sirve como señal de progreso: lo escribe un
> *health poll* cada 60 s y haría que ningún agente pudiese detectarse parado.

## Estados

`WORKING` · `WAITING` · `IDLE` · `SUSPECT` · `STALLED` · `DOWN` · `FAILED` ·
`UNOBSERVABLE`.

`STALLED` exige **dos comprobaciones consecutivas** (columna
`stalled_candidato` en la tabla `muestras`): un tick perdido no genera alerta.

## Avisos

- Una pasada con varias incidencias genera **un solo mensaje** al decisor.
- El reintento al decisor está limitado a uno; después escala al humano a los
  300 s sin ACK (60 s si el decisor es el que está caído).
- ACK: `node fleet.mjs ack <incident_id>` · cerrar: `node fleet.mjs resolver <incident_id>`.

## Inventario

El monitor lee `fleet/agents/*.yaml` del monorepo (fuente común en git) y usa
`~/.dsh/infrastructure/agents.yaml` como respaldo. El YAML es **declaración**
(identidad, nodo, tarea); el estado real se publica en el tablero y en la
instantánea, no en git.
