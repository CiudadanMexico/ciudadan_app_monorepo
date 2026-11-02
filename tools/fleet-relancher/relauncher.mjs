#!/usr/bin/env node
// Relanzador persistente de la flota.
//
// Por que existe: los watchdogs anteriores eran scripts de sesion y morian
// cuando caia la sesion DSH, dejando los agentes parados sin que nadie lo
// notara. Este script corre como TAREA PROGRAMADA de Windows, asi que sobrevive
// a la caida de la sesion.
//
// Decisiones (reglas fijas, sin IA):
//   - Solo relanza agentes con trabajo declarado pendiente en relauncher.config.json.
//   - Nunca relanza si el contenedor ya tiene una sesion Cline viva.
//   - Nunca relanza si existe el centinela DONE (trabajo entregado).
//   - Backoff exponencial entre intentos (240 s, 480 s, 960 s...) con tope.
//   - Tope de sesiones por host y por contenedor.
//   - Verifica la cuota del proveedor ANTES de lanzar (evita la avalancha 429).
//   - Escribe la tarea en /tmp/<sesion>-tarea.md y el prompt apunta a ese fichero.
//
// Salida: 0 siempre que el ciclo se complete (es un vigilante, no un job).

import { execFile } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'

const CFG = 'C:\\yii\\tools\\fleet\\relauncher.config.json'
const cfg = JSON.parse(readFileSync(CFG, 'utf8'))
const ahora = Date.now()
const raiz = dirname(CFG)

// Limite global del ciclo. Los SSH a los nodos se cuelgan de forma
// intermitente; sin este tope un ciclo puede quedarse vivo indefinidamente y
// la tarea programada de Windows queda en estado "en ejecucion" para siempre
// (resultado 267009), sin volver a lanzar nunca.
const limiteCicloMs = (cfg.tiempoMaximoCicloSeg ?? 210) * 1000
const watchdog = setTimeout(() => {
  try {
    log(`CICLO: limite global de ${cfg.tiempoMaximoCicloSeg ?? 210}s alcanzado; se corta`)
  } catch { /* log best-effort */ }
  process.exit(3)
}, limiteCicloMs)

function log(line) {
  const ts = new Date().toISOString()
  try { appendFileSync(cfg.rutas.log, `${ts} ${line}\n`, 'utf8') } catch { /* log best-effort */ }
  console.log(`${ts} ${line}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function sshOnce(nodo, comando, timeoutMs) {
  return new Promise((resolve) => {
    const args = [
      '-p', String(nodo.puerto ?? 22),
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=12',
      '-o', 'StrictHostKeyChecking=accept-new',
      `${nodo.user}@${nodo.host}`,
      comando,
    ]
    execFile('ssh', args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      // Un comando que no produce salida sigue siendo correcto si SSH no
      // reporto error: `ok` no puede depender de que stdout tenga contenido.
      resolve({ ok: !error, stdout: stdout.toString(), stderr: stderr.toString(), error: error ? error.message : null })
    })
  })
}

// Los SSH a los nodos de la flota se cuelgan de forma intermitente (el
// servidor deja de responder y la conexion muere por timeout). Un unico
// intento hace que el relanzador se quede a medias; se reintenta con
// backoff corto antes de darla por fallida.
async function ssh(nodo, comando, timeoutMs = 30000, intentos = 2) {
  let ultimo = null
  for (let i = 0; i < intentos; i++) {
    ultimo = await sshOnce(nodo, comando, timeoutMs)
    if (ultimo.ok) return ultimo
    if (i < intentos - 1) await sleep(2000 * (i + 1))
  }
  return ultimo
}

// Sube un script auxiliar al nodo (idempotente, una vez por nodo y ciclo).
async function subirHelper(nodo, nombre, contenidoB64) {
  const r = await ssh(nodo, `echo '${contenidoB64}' | base64 -d > /tmp/${nombre}; chmod +x /tmp/${nombre}`)
  if (!r.ok) {
    // El stderr del remoto explica el fallo; el error de execFile solo repite
    // el comando entero.
    const detalle = (r.stderr || r.error || 'sin detalle').trim().slice(0, 200)
    log(`AVISO helper ${nombre} en ${nodo.host}: ${detalle}`)
  }
  return r.ok
}

const probeB64 = readFileSync(join(raiz, 'probe-cont.sh')).toString('base64')
const launchB64 = readFileSync(join(raiz, 'launch-cont.sh')).toString('base64')
const watchB64 = readFileSync(join(raiz, 'hb-watch.sh')).toString('base64')
const activarB64 = readFileSync(join(raiz, 'activar-heartbeat.sh')).toString('base64')
const asegurarB64 = readFileSync(join(raiz, 'hb-ensure-nodo.sh')).toString('base64')

// Estado persistente: intentos por agente y momento del ultimo lanzamiento.
const estadoPath = join(cfg.rutas.estado, 'relauncher-estado.json')
mkdirSync(dirname(estadoPath), { recursive: true })
let estado = { intentos: {}, ultimoLanzamiento: {} }
if (existsSync(estadoPath)) {
  try { estado = JSON.parse(readFileSync(estadoPath, 'utf8')) } catch { /* estado ilegible: se reinicia */ }
}
estado.intentos ??= {}
estado.ultimoLanzamiento ??= {}

function guardarEstado() {
  try { writeFileSync(estadoPath, JSON.stringify(estado, null, 2), 'utf8') } catch { /* best-effort */ }
}

async function sondear(nodo, cont) {
  const r = await ssh(nodo, `bash /tmp/fleet-probe.sh '${cont}'`)
  if (!r.ok && !r.stdout) return null
  const out = r.stdout || ''
  const tmux = [...out.matchAll(/tmux=(\S+)/g)].map((x) => x[1])
  const mHeadless = out.match(/headless=(\d+)/)
  const cfgs = [...out.matchAll(/cfg=(\w+)\|(\S+)/g)].map((x) => ({ usuario: x[1], dir: x[2] }))
  const gits = [...out.matchAll(/git=(\w+)/g)].map((x) => x[1])
  const done = [...out.matchAll(/done=(\S+)/g)].map((x) => x[1])
  return {
    tmux,
    headless: mHeadless ? Number(mHeadless[1]) : null,
    configs: cfgs,
    gits,
    centinelas: done,
  }
}

// Verifica la cuota del proveedor desde dentro del contenedor (la llave no sale).
async function verificarCuota(nodo, cont, cfgDir) {
  const py = [
    "import json,urllib.request,urllib.error",
    `d=json.load(open('${cfgDir.dir}/data/settings/providers.json'))`,
    "key=None",
    "for k,v in (d.get('providers') or d).items():",
    "    st=v.get('settings') or {}",
    "    if st.get('apiKey'): key=st['apiKey']; break",
    "if not key: print('SIN_LLAVE'); raise SystemExit",
    "body=json.dumps({'model':'minimaxai/minimax-m3.1-flash','messages':[{'role':'user','content':'ok'}],'max_tokens':4}).encode()",
    "req=urllib.request.Request('https://integrate.api.nvidia.com/v1/chat/completions',data=body,headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})",
    "try:",
    "    with urllib.request.urlopen(req,timeout=45) as r: print('HTTP',r.status)",
    "except urllib.error.HTTPError as e: print('HTTP',e.code)",
    "except Exception as e: print('ERR',type(e).__name__)",
  ].join('\n')
  const b64 = Buffer.from(py, 'utf8').toString('base64')
  // Sin supresion de stderr y con &&: si algo falla, el error real llega al
  // log en vez de desaparecer. La llave nunca sale del contenedor.
  const cmd = `echo '${b64}' | base64 -d > /tmp/_cuota.py && sudo -n docker cp /tmp/_cuota.py '${cont}':/tmp/_cuota.py && sudo -n docker exec -u ${cfgDir.usuario} '${cont}' python3 /tmp/_cuota.py`
  const r = await ssh(nodo, cmd, 120000)
  const salida = (r.stdout || '').trim()
  if (!salida) {
    log(`AVISO cuota: sin salida (${(r.stderr || r.error || 'sin detalle').trim().slice(0, 160)})`)
  }
  return salida
}

// ---------------------------------------------------------------- ciclo
let lanzados = 0
let omitidos = 0
const porHost = {}

// El estado del monitor se pide UNA vez por ciclo. Preguntarlo por agente
// multiplicaba las conexiones SSH y el ciclo se comia el limite de tiempo.
let overviewCache = null
async function obtenerOverview() {
  if (overviewCache !== null) return overviewCache
  overviewCache = { agentes: [] }
  const monitor = cfg.monitor
  if (!monitor?.nodo || !monitor?.ruta) return overviewCache
  const r = await ssh(cfg.nodos[monitor.nodo], `curl -s --max-time 25 ${monitor.ruta}`, 40000, 2)
  if (!r.ok) {
    log(`AVISO monitor: no se pudo leer el estado (${(r.stderr || r.error || 'sin detalle').trim().slice(0, 120)})`)
    return overviewCache
  }
  try {
    const doc = JSON.parse(r.stdout || '{}')
    overviewCache.agentes = doc.agents || []
  } catch (err) {
    log(`AVISO monitor: respuesta ilegible (${String(err).slice(0, 80)})`)
  }
  return overviewCache
}

// Prepara los helpers en cada nodo usado. Solo se suben cuando cambian: el
// ciclo tiene que caber en su intervalo, y subir cinco ficheros a tres nodos
// en cada vueltaSlow consumia la mayor parte del tiempo.
const helperHashPath = join(cfg.rutas.estado, 'helper-hashes.json')
let helperHashes = {}
try { helperHashes = JSON.parse(readFileSync(helperHashPath, 'utf8')) } catch { /* primera vuelta */ }
const hashDe = (b64) => createHash('sha256').update(b64).digest('hex').slice(0, 16)

const nodosUsados = [...new Set(cfg.agentes.map((a) => a.nodo))]
for (const idNodo of nodosUsados) {
  const nodo = cfg.nodos[idNodo]
  if (!nodo) continue
  const helpers = [
    ['fleet-probe.sh', probeB64],
    ['fleet-launch.sh', launchB64],
    ['hb-watch.sh', watchB64],
    ['activar-heartbeat.sh', activarB64],
    ['hb-ensure-nodo.sh', asegurarB64],
  ]
  const clave = `${idNodo}:${hashDe(helpers.map((h) => h[1]).join('|'))}`
  if (helperHashes[idNodo] === clave) continue
  let bien = true
  for (const [nombre, b64] of helpers) {
    if (!await subirHelper(nodo, nombre, b64)) bien = false
  }
  if (bien) {
    helperHashes[idNodo] = clave
    try { writeFileSync(helperHashPath, JSON.stringify(helperHashes, null, 2), 'utf8') } catch { /* best-effort */ }
  } else {
    log(`AVISO ${idNodo}: no se pudieron subir los helpers al nodo`)
  }
}

for (const ag of cfg.agentes) {
  const nodo = cfg.nodos[ag.nodo]
  if (!nodo) { log(`SKIP ${ag.agent_id}: nodo ${ag.nodo} no configurado`); omitidos++; continue }

  const tareaPath = join(cfg.rutas.tareas, ag.tareaArchivo)
  if (!existsSync(tareaPath)) { log(`SKIP ${ag.agent_id}: no existe la tarea ${ag.tareaArchivo}`); omitidos++; continue }

  const info = await sondear(nodo, ag.contenedor)
  if (!info) { log(`SKIP ${ag.agent_id}: nodo ${ag.nodo} no responde`); omitidos++; continue }

  // 1) Centinela DONE: el trabajo ya se entrego, no se relanza.
  const centinelaEsperado = ag.centinela.split('/').pop()
  if (info.centinelas.some((c) => c.includes(centinelaEsperado))) {
    log(`SKIP ${ag.agent_id}: centinela ${centinelaEsperado} presente (trabajo entregado)`)
    omitidos++
    continue
  }

  // 2) Estado real segun el MONITOR. El monitor es la autoridad: mide el
  //    heartbeat nativo del runtime y el progreso real de la tarea.
  //    - WORKING / WAITING  -> hay trabajo, no se toca.
  //    - STALLED / DOWN      -> el agente dejo de chambear: se mata la sesion
  //                             colgada y se relanza.
  //    - IDLE sin entrega    -> se relanza (nunca avanzo y no entrego).
  const usados = porHost[ag.nodo] ?? 0
  const monitor = cfg.monitor
  let estadoMonitor = null
  if (monitor?.nodo && monitor?.ruta) {
    const overview = await obtenerOverview()
    const mon = overview.agentes.find((a) => a.name === ag.contenedor || a.name === ag.agent_id)
    if (mon) {
      estadoMonitor = { estado: mon.estado_programatico, motivo: mon.estado_motivo || null }
    } else {
      log(`AVISO monitor: ${ag.contenedor} no aparece en el overview`)
    }
  }

  // 3) Sesion viva: nunca relanzar encima de una sesion en curso, salvo que
  //    el monitor la declare colgada.
  //    Sin monitor disponible se aplica la regla local equivalente: si la
  //    sesion tmux NO existe, el agente no esta corriendo y hay que
  //    relanzarlo; si existe, no se toca (no se puede afirmar que este muerto).
  const sesionViva = info.tmux.includes(ag.sesion)
  const colgado = estadoMonitor && ['STALLED', 'DOWN', 'UNOBSERVABLE'].includes(estadoMonitor.estado)
  const sinSesion = !sesionViva
  let reiniciando = false
  if (!estadoMonitor && sinSesion && (info.headless ?? 0) === 0) {
    log(`ACTUA ${ag.agent_id}: el monitor no respondio y no hay sesion '${ag.sesion}'; se relanza por regla local`)
    reiniciando = true
    // No es un fallo del agente: no consume intentos de backoff.
    estado.intentos[ag.agent_id] = { intentos: 0, ultimo: 0 }
  }
  if (sesionViva && !colgado) {
    log(`SKIP ${ag.agent_id}: la sesion '${ag.sesion}' esta viva (monitor=${estadoMonitor?.estado ?? 'sin datos'})`)
    omitidos++
    continue
  }
  if (colgado) {
    log(`ACTUA ${ag.agent_id}: monitor declara ${estadoMonitor.estado} (${estadoMonitor.motivo ?? 'sin motivo'}); se reinicia la sesion`)
    // Se mata la sesion colgada: el relanzador NO puede seguir asi.
    await ssh(nodo, `sudo -n docker exec '${ag.contenedor}' tmux kill-session -t '${ag.sesion}' >/dev/null 2>&1; true`)
    for (const p of (await ssh(nodo, `sudo -n docker exec '${ag.contenedor}' sh -c 'ps -eo pid,args | grep "[c]line --config" | grep -v " -i " | cut -d" " -f1' 2>/dev/null`)).stdout.split(/\s+/).filter(Boolean)) {
      await ssh(nodo, `sudo -n docker exec '${ag.contenedor}' kill -9 ${p} >/dev/null 2>&1; true`)
    }
    // El reinicio no consume un intento nuevo de backoff: no es un fallo del
    // agente, es una caida detectada por el monitor.
    estado.intentos[ag.agent_id] = { intentos: 0, ultimo: 0 }
    reiniciando = true
  }
  const headless = info.headless ?? 0
  if (headless > 0 && !reiniciando) {
    log(`SKIP ${ag.agent_id}: el contenedor ya tiene ${headless} sesion(es) headless`)
    omitidos++
    continue
  }

  // 4) Tope por host.
  if (usados >= cfg.topes.maxSesionesPorHost) {
    log(`SKIP ${ag.agent_id}: host ${ag.nodo} ya tiene ${usados} sesion(es) (tope ${cfg.topes.maxSesionesPorHost})`)
    omitidos++
    continue
  }

  // 4) Backoff entre intentos.
  const prev = estado.intentos[ag.agent_id] ?? { intentos: 0, ultimo: 0 }
  const intentos = prev.intentos ?? 0
  if (intentos >= cfg.backoff.maxIntentos) {
    if (ahora - (prev.ultimo ?? 0) < cfg.backoff.reinicioPorDia * 1000) {
      log(`SKIP ${ag.agent_id}: alcanzo ${intentos} intentos; espera el reinicio diario`)
      omitidos++
      continue
    }
    estado.intentos[ag.agent_id] = { intentos: 0, ultimo: 0 }
  }
  const esperaMs = cfg.backoff.primeroSeg * 1000 * Math.pow(2, intentos)
  const desdeUltimo = ahora - (prev.ultimo ?? 0)
  if (prev.ultimo && desdeUltimo < esperaMs) {
    log(`SKIP ${ag.agent_id}: backoff, faltan ${Math.ceil((esperaMs - desdeUltimo) / 1000)}s`)
    omitidos++
    continue
  }
  const ultimoHost = estado.ultimoLanzamiento[ag.nodo] ?? 0
  if (ultimoHost && ahora - ultimoHost < cfg.topes.minSegundosEntreLanzamientosPorHost * 1000) {
    log(`SKIP ${ag.agent_id}: host ${ag.nodo} lanzo hace ${Math.ceil((ahora - ultimoHost) / 1000)}s`)
    omitidos++
    continue
  }

  // 5) Config del proveedor: se prefiere el usuario declarado si puede leerla.
  const elegido = info.configs.find((c) => c.usuario === ag.usuario) ?? info.configs[0]
  if (!elegido) {
    log(`SKIP ${ag.agent_id}: no hay config de proveedor legible`)
    omitidos++
    continue
  }

  // 6) Cuota del proveedor. Sin cuota no se lanza (evita la avalancha 429).
  const cuota = await verificarCuota(nodo, ag.contenedor, elegido)
  if (!/^HTTP 2/.test(cuota)) {
    log(`SKIP ${ag.agent_id}: cuota no disponible (${cuota})`)
    estado.intentos[ag.agent_id] = { intentos: intentos + 1, ultimo: ahora }
    guardarEstado()
    omitidos++
    continue
  }

  // 7) Lanzar.
  const tareaB64 = Buffer.from(readFileSync(tareaPath, 'utf8'), 'utf8').toString('base64')
  const r = await ssh(nodo, `bash /tmp/fleet-launch.sh '${ag.contenedor}' '${ag.sesion}' '${tareaB64}' '${elegido.usuario}' '${elegido.dir}'`)
  if (!/launch_rc=0/.test(r.stdout || '')) {
    log(`FALLO ${ag.agent_id}: ${(r.stdout || r.stderr || '').trim().slice(0, 160)}`)
    estado.intentos[ag.agent_id] = { intentos: intentos + 1, ultimo: ahora }
    guardarEstado()
    omitidos++
    continue
  }

  porHost[ag.nodo] = usados + 1
  estado.intentos[ag.agent_id] = { intentos: 0, ultimo: ahora }
  estado.ultimoLanzamiento[ag.nodo] = ahora
  guardarEstado()
  lanzados++
  if (reiniciando) {
    log(`RELANZADO ${ag.agent_id} tras ${estadoMonitor.estado} (${estadoMonitor.motivo ?? 'sin motivo'}) sesion=${ag.sesion} usuario=${elegido.usuario}`)
  } else {
    log(`LANZADO ${ag.agent_id} (${ag.nodo}) sesion=${ag.sesion} usuario=${elegido.usuario} cfg=${elegido.dir} cuota=${cuota}`)
  }
}

// El heartbeat es el sensor del monitor. Si su vigilante muere (reinicio del
// contenedor, OOM, kill manual), el sensor se queda mudo. Se repone en cada
// ciclo: es idempotente y no toca al agente.
for (const idNodo of nodosUsados) {
  const nodo = cfg.nodos[idNodo]
  if (!nodo) continue
  const contenedores = cfg.agentes.filter((a) => a.nodo === idNodo).map((a) => a.contenedor)
  if (!contenedores.length) continue
  const r = await ssh(nodo, `bash /tmp/hb-ensure-nodo.sh ${contenedores.map((c) => `'${c}'`).join(' ')}`, 120000)
  const lineas = (r.stdout || '').trim().split('\n').filter(Boolean)
  for (const linea of lineas) log(`HB ${idNodo}: ${linea.trim()}`)
  if (!r.ok) log(`AVISO ${idNodo}: no se pudieron reponer los vigilantes de heartbeat`)
}

log(`CICLO: lanzados=${lanzados} omitidos=${omitidos}`)
clearTimeout(watchdog)
process.exit(0)
