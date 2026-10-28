# Estado de la flota OCI — Ciudadan

Script que resume, en una sola vista, el estado de los **13 contenedores** de la
flota temporal (3 máquinas OCI). Antes de esto, consultar "qué está corriendo y
en qué rama está cada agente" exigía varios SSH manuales.

## Cómo ejecutarlo

```bash
node scripts/fleet-status.mjs          # tabla legible
node scripts/fleet-status.mjs --json   # documento JSON
node scripts/fleet-status.mjs --help   # ayuda
```

No requiere credenciales embebidas: usa SSH con la llave del usuario local
(`~/.ssh/id_ed25519` por defecto) y entra al host por el puerto 22; dentro del
host usa `sudo -n docker` para hablar con los contenedores.

## Columnas

| Columna | Qué significa |
|---|---|
| `HOST` | Máquina OCI (temporal-1/2/3) |
| `CONTENEDOR` | Nombre del contenedor |
| `EST` | `UP` / `DOWN` |
| `HOSTNAME` | Hostname dentro del contenedor |
| `CONT.UP` | Tiempo que lleva arriba el contenedor |
| `DISCO` | % de disco usado **en la máquina** |
| `RAM` | RAM libre en la máquina |
| `TMUX` | Sesiones tmux del usuario `yizuz`; `*` marca las que detectan Cline |
| `RAMA` | Rama git actual del repo dentro del contenedor |
| `COMMIT` | Último commit (hash + mensaje) |
| `SUCIOS` | Archivos modificados/no versionados (`git status --porcelain`) |
| `ULT.ERROR` | Último error de build en el log del contenedor, o avisos de recolección |

Debajo de la tabla se resume el uptime de cada host.

## Configuración

Copia `scripts/fleet-status.env.example` a `scripts/fleet-status.env` (queda
ignorado por git) si cambian los hosts o contenedores. Las variables de entorno
tienen prioridad sobre ese archivo.

| Variable | Por defecto |
|---|---|
| `FLEET_SSH_USER` | `yizuz` |
| `FLEET_TEMPORAL_1_HOST` / `_2_` / `_3_` | `160.34.219.124` / `163.192.153.145` / `159.54.133.219` |
| `FLEET_TEMPORAL_1_CONTAINERS` / `_2_` / `_3_` | lista de contenedores por host |
| `FLEET_REPO_PATH` | `/workspace/ciudadan_app_monorepo` |
| `FLEET_DOCKER_USER` | `yizuz` (usuario dentro del contenedor para git y tmux) |
| `FLEET_DOCKER_SUDO` | `true` → usa `sudo -n docker` (el usuario no está en el grupo docker) |
| `FLEET_TMUX_SOCKET_TEMPLATE` | `/tmp/tmux-%s/default` (`%s` = uid) |
| `FLEET_SSH_KEY` | llave por defecto del usuario; si se omite, la usa SSH |
| `FLEET_DEBUG` | `true` → vuelca la salida SSH cruda en stderr (diagnóstico) |

## Interpretación

- `EST=DOWN` con `ULT.ERROR` = "no existe o Docker no responde" → el contenedor
  no está en ese host o el host no responde.
- `SUCIOS` alto → el agente dejó cambios sin commitear: recuperarlos ANTES de
  que el contenedor se recree.
- `TMUX` con `*` → sesión de Cline viva (trabajo en curso).
- El código de salida es `0` solo si no hay contenedores caídos ni errores de
  recolección; `1` en cualquier otro caso.

## Qué NO hace

- No reinicia, no entra en modo interactivo y **no modifica nada** en la flota:
  solo lee (`docker inspect`, `docker logs`, `tmux ls`, `git status`).
- No ejecuta comandos dentro de las sesiones tmux ni envía teclas.
- No empuja ni commitea nada.
- No comprueba la salud de los servicios internos (Strapi, socket, cloudflared);
  solo que el contenedor esté arriba.
- No reporta los agentes Cline que corren fuera de estos contenedores
  (por ejemplo, `adrian-dev1` en la máquina de Adrián): ese vive en el hub.
