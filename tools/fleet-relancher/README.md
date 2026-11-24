# Relanzador persistente de la flota de agentes

Mecanismo **programático** (sin IA) que mantiene trabajando a los agentes Cline
de los nodos temporales. Sobrevive a la muerte de la sesión del DSH porque corre
como **tarea programada de Windows**, no como script de sesión.

## Piezas

| Fichero | Función |
|---|---|
| `relauncher.mjs` | Ciclo principal. Decide qué relanzar y lo lanza. Node 22, sin dependencias. |
| `relauncher.config.json` | **NO se versiona**: contiene hosts e IPs de los nodos. Vive solo en local. |
| `launch-cont.sh` | Lanza una sesión Cline en un contenedor. Sube al nodo como `fleet-launch.sh`. |
| `probe-cont.sh` | Sonda de solo lectura del contenedor (sesiones tmux, headless, centinelas, config). |
| `hb-watch.sh` | **Vigilante de heartbeat**: escribe la señal de vida del runtime. |
| `activar-heartbeat.sh` | Engancha el vigilante al PID de Cline de una sesión. Idempotente. |
| `hb-ensure-nodo.sh` | Repone los vigilantes de todos los contenedores de un nodo. |
| `test-taxonomia.py` | 16 pruebas de coherencia de la taxonomía de estados del monitor. |
| `relanzar-agente.sh`, `verificar-agente.sh`, `limpiar-huerfanos.sh` | Utilidades de operación puntual. |

## El ciclo

```
monitor (programático)  ──estado──▶  relanzador  ──lanza──▶  Cline
      ▲                                                        │
      └──────────── heartbeat nativo ◀── vigilante hb-watch ───┘
```

1. El **monitor** mide el heartbeat nativo y el progreso real de cada agente.
   Es la autoridad: no se relanza a un agente que está trabajando.
2. El **relanzador** lee `/api/v1/overview` del monitor. Si un agente está en
   `STALLED`, `DOWN` o `UNOBSERVABLE`, mata la sesión colgada y la relanza.
   Si está en `WORKING` o `WAITING`, no lo toca.
3. El **watchdog de heartbeat** (vigilante) escribe cada 15 s en
   `hub-daemon.log` la línea que el monitor lee:

   ```json
   {"ts":"<ISO-8601>","event":"run.heartbeat","session":"<id>","bytes":<n>}
   ```

   `bytes` es el tamaño del `messages.json`: si no crece, el agente está vivo
   pero no avanza.

## Por qué el heartbeat lo emite el runtime

El hub de Cline **no lo emite** en estos contenedores: el proceso del hub corre
pero `hub-daemon.log` se queda en 0 bytes, porque el runtime no se conecta al
hub (`compatible_hub_unavailable` → *falling back to local runtime host*). Sin
señal, el monitor no puede distinguir "trabajando" de "colgado" y acaba
declarando `UNOBSERVABLE` o `STALLED` a agentes sanos.

## Reglas fijas (sin IA)

- Solo relanza agentes con trabajo declarado pendiente.
- Nunca relanza si el centinela `DONE` está presente (trabajo entregado).
- Nunca relanza encima de una sesión en curso, salvo que el monitor la declare caída.
- Tope de sesiones por host y un intervalo mínimo entre lanzamientos en un mismo host.
- Backoff exponencial entre intentos de un mismo agente.
- Verifica la cuota del proveedor **antes** de lanzar (evita la avalancha 429).
- La llave del proveedor nunca sale del contenedor: la comprobación se hace
  dentro y solo devuelve el código HTTP.

## Arranque de Cline: tres fallos que hay que conocer

1. **`--id <id>` no se usa.** En Cline significa *"resume an existing session by
   ID"*: con un id nuevo entra en modo reanudación, arranca con `hasPrompt:false`
   y se queda horas en *"Ask anything..."* sin trabajar.
2. **El prompt va en un fichero.** `tmux new-session` re-ensambla sus argumentos
   y parte el prompt en palabras; el wrapper lo lee con
   `"$(cat /tmp/<ses>-prompt.txt)"` para que llegue como un único argumento.
3. **`git config --global --add safe.directory /workspace/ciudadan_app_monorepo`**
   para el usuario con el que corre la sesión: si no, Cline registra
   `workspace.init_error` por *"detected dubious ownership"*.

Resultado correcto: `{"interactive":false,"hasPrompt":true}` y sesión nueva.

## Configuración local

`relauncher.config.json` (no versionado) necesita:

- `nodos`: host, usuario y puerto de cada nodo, más el nodo del monitor.
- `monitor.nodo` y `monitor.ruta`: dónde leer `/api/v1/overview`.
- `agentes`: `agent_id`, `nodo`, `contenedor`, `sesion`, `tareaArchivo`,
  `centinela` y `usuario` (el usuario debe poder leer el `providers.json`).

Tarea programada de Windows: `Ciudadan-Fleet-Relanzador` (cada 4 min) →
`run-relauncher.vbs` → `relauncher.mjs`.
