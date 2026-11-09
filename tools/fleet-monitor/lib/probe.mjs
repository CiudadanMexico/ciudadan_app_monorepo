// Sondeo de observabilidad. SOLO LECTURA: no despliega nada en los nodos,
// no reinicia, no ejecuta comandos dentro de los contenedores con efectos y
// no expone docker.sock. Todo lo que necesita se consulta por SSH con
// comandos de solo lectura.

import { execFile } from 'node:child_process'
import net from 'node:net'

function ssh(nodo, comando, timeoutMs = 25000) {
  return new Promise((resolve) => {
    const args = [
      '-p', String(nodo.puerto ?? 22),
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=12',
      '-o', 'StrictHostKeyChecking=accept-new',
      `${nodo.user}@${nodo.host}`,
      comando,
    ]
    execFile('ssh', args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && !stdout) {
        resolve({ ok: false, error: (stderr || error.message).toString().trim().slice(0, 200), stdout: '' })
        return
      }
      resolve({ ok: true, stdout: stdout.toString(), stderr: stderr.toString() })
    })
  })
}

// Script de solo lectura que corre en el nodo. Devuelve una linea por agente:
//   contenedor|estado|running|exit|oom|inicio|fin|commit|hash|msg|logEpoch|procesos|tmux|aliveTs|sessionTs|progressTs
// Es el RESPALDO: el camino normal es leer el heartbeat que publica el nodo.
const SCRIPT_NODO = (contenedores) => `
set -u
for c in ${contenedores.map((x) => `'${x}'`).join(' ')}; do
  st=$(sudo -n docker inspect --format '{{.State.Status}}|{{.State.Running}}|{{.State.ExitCode}}|{{.State.OOMKilled}}|{{.State.StartedAt}}|{{.State.FinishedAt}}' "$c" 2>/dev/null || echo 'AUSENTE|||||')
  gitinfo=$(sudo -n docker exec "$c" sh -c 'cd /workspace/ciudadan_app_monorepo 2>/dev/null || cd /workspace; git log -1 --format="%ct|%h|%s" 2>/dev/null' 2>/dev/null | head -1)
  logf=$(sudo -n docker exec "$c" sh -c 'ls -t /workspace/logs/*.log 2>/dev/null | head -1' 2>/dev/null)
  logts=$(sudo -n docker exec "$c" sh -c 'test -n "'"$logf"'" && stat -c %Y "'"$logf"'" 2>/dev/null || echo 0' 2>/dev/null)
  procs=$(sudo -n docker exec "$c" sh -c 'pgrep -f cline 2>/dev/null | wc -l' 2>/dev/null | tr -d ' ')
  hubts=$(sudo -n docker exec "$c" sh -c 'tail -c 8000 /workspace/.cline/data/logs/hub-daemon.log 2>/dev/null | grep -o "\\"ts\\":\\"[^\\"]*\\"" | tail -1 | cut -d\\" -f4' 2>/dev/null | head -1)
  alive=0
  if [ -n "$hubts" ]; then alive=$(date -u -d "$hubts" +%s 2>/dev/null || echo 0); fi
  sessionts=$(sudo -n docker exec "$c" sh -c 'find /workspace/.cline/data/sessions -name "*.json" -printf "%T@\\n" 2>/dev/null | sort -rn | head -1 | cut -d. -f1' 2>/dev/null | head -1)
  sessionts=$(printf '%s\\n' "$sessionts" | awk '{print $1+0}')
  gepoch=$(printf '%s\\n' "$gitinfo" | cut -d'|' -f1 | awk '{print $1+0}')
  progress=0
  [ "$gepoch" -gt "$progress" ] && progress="$gepoch"
  [ "$sessionts" -gt "$progress" ] && progress="$sessionts"
  tm=$(sudo -n docker exec "$c" sh -c 'tmux ls 2>/dev/null | head -3 | cut -d: -f1 | tr "\\n" ","' 2>/dev/null | head -1)
  echo "$c|$st|$gitinfo|$logts|$procs|\${tm:-}|$alive|$sessionts|$progress"
done
`

// Lee el heartbeat que publica el propio nodo (~/.ciudadan-fleet/heartbeat.json).
// Ventaja: el estado del nodo sobrevive a la caida del colector central, y la
// lectura es barata (un cat) en vez de interrogar Docker en cada pasada.
export async function leerHeartbeat(nodo) {
  const r = await ssh(nodo, "cat ~/.ciudadan-fleet/heartbeat.json 2>/dev/null")
  if (!r.ok) return { disponible: false, motivo: r.error }
  const txt = r.stdout.trim()
  if (txt === '') return { disponible: false, motivo: 'el nodo no publica heartbeat' }
  let d
  try { d = JSON.parse(txt) } catch { return { disponible: false, motivo: 'heartbeat ilegible' } }
  return { disponible: true, ts: (d.ts ?? 0) * 1000, nodo: d.nodo ?? null, contenedores: d.contenedores ?? [] }
}

// Convierte el JSON del heartbeat al mismo formato que produce el sondeo directo.
function desdeHeartbeat(hb) {
  return hb.contenedores.map((c) => ({
    contenedor: c.contenedor,
    estado: c.estado,
    running: c.running === true,
    exitCode: c.exit_code === null || c.exit_code === undefined ? null : Number(c.exit_code),
    oomKilled: c.oom === true,
    iniciado: c.inicio || null,
    fin: c.fin || null,
    commitEpoch: c.commit_epoch ? Number(c.commit_epoch) * 1000 : null,
    commitHash: c.commit_hash || null,
    commitMsg: null,
    logEpoch: c.log_epoch ? Number(c.log_epoch) * 1000 : null,
    procesosCline: Number(c.procesos_cline ?? 0),
    tmux: c.tmux || null,
    // Señal nativa de Cline (F2): alive = el runtime emite; progress = la
    // conversacion o el commit avanzan.
    aliveTs: c.alive_ts ? Number(c.alive_ts) * 1000 : null,
    sessionTs: c.session_ts ? Number(c.session_ts) * 1000 : null,
    progressTs: c.progress_ts ? Number(c.progress_ts) * 1000 : null,
  }))
}

export async function sondearNodo(nodo, contenedores, opciones = {}) {
  if (contenedores.length === 0) return { alcanzable: true, agentes: [], motivo: 'sin contenedores declarados' }
  const maxEdadMs = (opciones.maxEdadHeartbeatSeg ?? 180) * 1000

  // 1) Heartbeat del nodo (preferido: barato y persistente).
  const hb = await leerHeartbeat(nodo)
  if (hb.disponible) {
    const edad = Date.now() - hb.ts
    if (edad <= maxEdadMs) {
      return {
        alcanzable: true,
        agentes: desdeHeartbeat(hb),
        motivo: null,
        fuente: 'heartbeat',
        heartbeatAgeSeg: Math.round(edad / 1000),
        heartbeatTs: hb.ts,
      }
    }
    // Heartbeat viejo: el nodo puede seguir vivo pero su publicador esta roto.
    const directo = await sondearDirecto(nodo, contenedores)
    return {
      ...directo,
      fuente: 'sondeo-directo',
      heartbeatAgeSeg: Math.round(edad / 1000),
      avisoHeartbeat: `heartbeat del nodo con ${Math.round(edad / 1000)}s de antiguedad`,
    }
  }

  // 2) Respaldo: sondeo directo por SSH (tampoco depende del publicador).
  const directo = await sondearDirecto(nodo, contenedores)
  return { ...directo, fuente: 'sondeo-directo', heartbeatAgeSeg: null, motivoHeartbeat: hb.motivo ?? null }
}

async function sondearDirecto(nodo, contenedores) {
  const r = await ssh(nodo, SCRIPT_NODO(contenedores))
  if (!r.ok) return { alcanzable: false, agentes: [], motivo: r.error }
  const agentes = []
  for (const linea of r.stdout.split(/\r?\n/)) {
    const t = linea.trim()
    if (t === '') continue
    const p = t.split('|')
    if (p.length < 8) continue
    const [contenedor, estado, running, exitCode, oom, iniciado, fin, gitinfo, logEpoch, procs, tmux, aliveTs, sessionTs, progressTs] = p
    const g = (gitinfo ?? '').split('|')
    agentes.push({
      contenedor,
      estado: estado || 'DESCONOCIDO',
      running: running === 'true',
      exitCode: exitCode === '' ? null : Number(exitCode),
      oomKilled: oom === 'true',
      iniciado: iniciado || null,
      fin: fin || null,
      commitEpoch: g[0] ? Number(g[0]) * 1000 : null,
      commitHash: g[1] ?? null,
      commitMsg: (g[2] ?? '').trim(),
      logEpoch: logEpoch && logEpoch !== '0' ? Number(logEpoch) * 1000 : null,
      procesosCline: Number(procs || 0),
      tmux: tmux || null,
      aliveTs: aliveTs ? Number(aliveTs) * 1000 : null,
      sessionTs: sessionTs ? Number(sessionTs) * 1000 : null,
      progressTs: progressTs ? Number(progressTs) * 1000 : null,
    })
  }
  return { alcanzable: true, agentes, motivo: null }
}

// Salud del servicio DSH local (disponibilidad del servicio, no de las
// sesiones). Se comprueba con una conexion TCP directa: enumerar los sockets
// del sistema con PowerShell es lento y puede agotar el timeout, lo que
// producia falsos "UNOBSERVABLE" de toda la flota local.
export function sondearServicioDsh({ host = '127.0.0.1', port = 3080, timeoutMs = 3000 } = {}) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    let settled = false
    const cerrar = (vivo) => {
      if (settled) return
      settled = true
      try { socket.destroy() } catch { /* ya destruido */ }
      resolve({ vivo, pid: null })
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => cerrar(true))
    socket.once('timeout', () => cerrar(false))
    socket.once('error', () => cerrar(false))
  })
}

