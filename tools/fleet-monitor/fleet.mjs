// Monitor programatico de la flota Ciudadan.
//
// Sin IA: la clasificacion es una maquina de estados determinista
// (lib/estados.mjs). La IA no decide si un agente esta bien; solo puede
// interpretar una incidencia despues.
//
// Uso:
//   node fleet.mjs run          ciclo completo: sondea, clasifica, abre
//                                incidencias, avisa al agente decisor,
//                                escala al humano si no hay ACK y dibuja el
//                                tablero
//   node fleet.mjs collect      solo sondeo + instantanea (sin avisos)
//   node fleet.mjs panel        vuelve a dibujar el tablero
//   node fleet.mjs alerts       lista las incidencias abiertas
//   node fleet.mjs ack <id>     acusa recibo de una incidencia (DECISION_ACK)
//   node fleet.mjs selftest     pruebas de aceptacion del clasificador

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseYaml } from './lib/yaml.mjs'
import { evaluar, ESTADOS, ALERTABLES, resumen } from './lib/estados.mjs'
import { ClienteDsh } from './lib/dsh.mjs'
import { sondearNodo, sondearServicioDsh } from './lib/probe.mjs'
import { Registro } from './lib/incidentes.mjs'
import { avisarDecisor, notificarHumano, dejarEnBandeja, escribirPendientes, redactar } from './lib/aviso.mjs'

const aqui = dirname(fileURLToPath(import.meta.url))
const cfg = JSON.parse(readFileSync(join(aqui, 'config.json'), 'utf8'))
const ahoraMs = () => Date.now()

function log(...args) {
  const linea = `[${new Date().toISOString()}] ${args.join(' ')}`
  process.stdout.write(linea + '\n')
  try {
    mkdirSync(dirname(cfg.rutas.log), { recursive: true })
    writeFileSync(cfg.rutas.log, linea + '\n', { flag: 'a', encoding: 'utf8' })
  } catch { /* el log es best-effort */ }
}

// --- Inventario canonico ---------------------------------------------------------

function leerInventario() {
  // Fuente principal: la declaracion versionada en git (fuente comun acordada).
  // Respaldo: el inventario operativo local (~/.dsh/infrastructure/agents.yaml).
  const dirGit = cfg.inventario.git
  if (dirGit && existsSync(dirGit)) {
    const archivos = readdirSync(dirGit).filter((f) => f.endsWith('.yaml')).sort()
    const agentes = []
    for (const f of archivos) {
      let d
      try { d = parseYaml(readFileSync(join(dirGit, f), 'utf8')) } catch { continue }
      if (!d || !d.agent_id) continue
      const t = d.tarea ?? {}
      agentes.push({
        agent_id: d.agent_id,
        node: d.node,
        type: d.runtime,
        container: d.contenedor ?? null,
        project: d.proyecto ?? null,
        branch: d.rama ?? null,
        work: t.descripcion || null,
        ssh: d.ssh ?? null,
        status: t.estado === 'activa' ? 'busy' : (t.estado === 'pausada' ? 'suspended' : 'available'),
        confidence: d.confianza_inventario ?? 'unknown',
        notas: d.notas ?? null,
        declaradoEn: t.declarada_en ?? null,
        fuente: 'git',
      })
    }
    if (agentes.length > 0) return agentes
  }

  const ruta = cfg.inventario.agentes
  if (!existsSync(ruta)) throw new Error(`no existe el inventario canonico: ${ruta}`)
  const doc = parseYaml(readFileSync(ruta, 'utf8'))
  const agentes = Array.isArray(doc.agents) ? doc.agents : []
  return agentes.map((a) => ({
    agent_id: a.agent_id,
    node: a.node,
    type: a.type,
    container: a.container,
    project: a.project ?? null,
    branch: a.branch ?? null,
    work: a.work ?? null,
    ssh: a.ssh ?? null,
    status: a.status ?? 'unknown',
    confidence: a.confidence ?? 'unknown',
    notas: a.notes ?? null,
    declaradoEn: a.last_verified ?? null,
    fuente: 'local',
  }))
}

// --- Sondeo ----------------------------------------------------------------------

async function sondear(inventario) {
  const clines = inventario.filter((a) => a.type === 'docker-cline')
  const porNodo = new Map()
  for (const a of clines) {
    if (!porNodo.has(a.node)) porNodo.set(a.node, [])
    porNodo.get(a.node).push(a.container)
  }

  const nodos = {}
  await Promise.all([...porNodo.entries()].map(async ([nodo, contenedores]) => {
    const cfgNodo = cfg.nodos[nodo]
    if (!cfgNodo) { nodos[nodo] = { alcanzable: false, agentes: [], motivo: 'nodo no configurado' }; return }
    nodos[nodo] = await sondearNodo(cfgNodo, contenedores)
  }))

  const servicioDsh = cfg.observacion.consultaDshSesiones ? await sondearServicioDsh() : { vivo: false, pid: null }
  let sesiones = []
  let errorDsh = null
  if (cfg.observacion.consultaDshSesiones) {
    try {
      const cliente = new ClienteDsh({ timeoutMs: cfg.observacion.timeoutDshSeg * 1000 })
      sesiones = await cliente.listarSesiones()
    } catch (e) { errorDsh = e.message }
  }
  return { nodos, sesiones, servicioDsh, errorDsh }
}

// --- Construccion de las observaciones --------------------------------------------

function observacionesCline(inventario, sondeo, registro, ahora) {
  const out = []
  for (const a of inventario.filter((x) => x.type === 'docker-cline')) {
    const nodo = sondeo.nodos[a.node]
    const obs = nodo?.agentes?.find((x) => x.contenedor === a.container)
    const fallosConsecutivos = registro ? registro.fallosConsecutivos(a.agent_id) : 0

    const base = {
      agent_id: a.agent_id,
      node_id: a.node,
      runtime: 'cline',
      contenedor: a.container,
      tarea: a.work,
      rama: a.branch,
      nodoAlcanzable: nodo?.alcanzable === true,
      runtimeMuerto: false,
      runtimeEstado: obs?.estado ?? null,
      exitCode: obs?.exitCode ?? null,
      oomKilled: obs?.oomKilled === true,
      finishedAt: obs?.fin ?? null,
      heartbeatAgeSeg: 0,
      // La edad del heartbeat solo gobierna el estado cuando los datos vienen
      // del heartbeat. Si el colector sonteo el nodo en vivo, la observacion es
      // actual por definicion (aunque el publicador este roto: se reporta).
      taskActiva: a.status === 'busy',
      taskState: null,
      lastProgressAt: null,
      consecutiveFailedProgressChecks: fallosConsecutivos,
      waitingReason: null,
      waitDeadline: null,
      commitHash: obs?.commitHash ?? null,
      commitMsg: obs?.commitMsg ?? null,
      tmux: obs?.tmux ?? null,
      procesosCline: obs?.procesosCline ?? null,
    }
    base.heartbeatAgeSeg = nodo?.fuente === 'heartbeat' ? (nodo.heartbeatAgeSeg ?? 0) : 0
    base.fuenteDatos = nodo?.fuente ?? 'desconocida'
    if (nodo?.avisoHeartbeat) base.avisoHeartbeat = nodo.avisoHeartbeat

    if (!base.nodoAlcanzable) {
      base.nodoMotivo = nodo?.motivo ?? 'nodo sin acceso'
    } else if (!obs) {
      base.runtimeMuerto = true
      base.runtimeEstado = 'AUSENTE'
      base.motivoMuerte = 'el contenedor no existe en el nodo'
    } else if (!obs.running && obs.estado !== 'running') {
      base.runtimeMuerto = true
      base.motivoMuerte = obs.oomKilled
        ? 'el contenedor fue terminado por falta de memoria (OOMKilled)'
        : `el contenedor esta ${obs.estado} (exit=${obs.exitCode})`
    } else {
      // Señal NATIVA de Cline (F2):
      //  - alive_ts: el hub emite run.heartbeat cada ~30 s mientras hay una
      //    sesion viva. Es la senal de RUNTIME activo.
      //  - progress_ts: cuando se escribio la sesion (conversacion) o el
      //    ultimo commit. Es la senal de PROGRESO real.
      // OJO: /workspace/logs/*.log NO se usa como progreso: back.log lo
      // escribe un health poll cada 60 s y haria que todo pareciera activo.
      base.aliveTs = obs.aliveTs ?? null
      base.sessionTs = obs.sessionTs ?? null
      base.progressTs = obs.progressTs ?? null
      const edadAlive = obs.aliveTs ? Math.round((ahora - obs.aliveTs) / 1000) : null
      base.heartbeatAgeSeg = edadAlive ?? (nodo?.fuente === 'heartbeat' ? (nodo.heartbeatAgeSeg ?? 0) : 0)
      base.runtimeClineActivo = obs.aliveTs ? edadAlive <= (cfg.umbrales.heartbeatNoObservableSeg * 1000) : false

      const momentos = [obs.progressTs, obs.commitEpoch].filter((x) => typeof x === 'number' && x > 0)
      base.lastProgressAt = momentos.length ? Math.max(...momentos) : null
      base.sinSenales = momentos.length === 0
      if (obs.aliveTs) base.evidenciaAlive = `hub_heartbeat hace ${edadAlive}s`
      if (obs.sessionTs) base.evidenciaSesion = `sesion Cline escrita ${Math.round((ahora - obs.sessionTs) / 1000)}s atras`
      if (obs.progressTs) base.evidenciaProgreso = `progreso nativo ${Math.round((ahora - obs.progressTs) / 1000)}s atras`
    }
    out.push(base)
  }
  return out
}

function observacionesDsh(sondeo, registro, ahora) {
  if (!cfg.observacion.consultaDshSesiones) return []
  const out = []
  const dshVivo = sondeo.servicioDsh.vivo && sondeo.errorDsh === null
  // Solo se siguen las sesiones RELEVANTES: las raiz (el agente decisor), las
  // que estan corriendo y las que se movieron hace poco. Rastrear las 170
  // sesiones historicas solo produciria ruido.
  const ventanaMs = (cfg.observacion.ventanaSesionMin ?? 30) * 60 * 1000
  for (const s of sondeo.sesiones) {
    const p = s.projections?.values ?? {}
    const edadMs = s.updatedAt ? ahora - s.updatedAt : Number.POSITIVE_INFINITY
    const raiz = !s.parentSessionId
    const relevante = raiz || s.running === true || edadMs <= ventanaMs
    if (!relevante) continue
    const fallosConsecutivos = registro ? registro.fallosConsecutivos(s.sessionId) : 0
    const edad = s.updatedAt ? edadMs : null
    const activa = s.running === true
    out.push({
      agent_id: s.sessionId,
      node_id: 'dsh-local',
      runtime: 'dsh-session',
      origen: s.origin ?? null,
      titulo: p.title ?? null,
      cwd: s.cwd ?? null,
      parentSessionId: s.parentSessionId ?? null,
      nodoAlcanzable: dshVivo,
      runtimeMuerto: false,
      // En el DSH `running` significa "sesion abierta", NO "agente trabajando"
      // (misma trampa que un contenedor vivo). Una sesion abierta sin actividad
      // reciente esta ESPERANDO (al usuario o a una dependencia), no caida.
      // Una sesion con una herramienta larga sigue actualizando su registro, asi
      // que la ausencia de actividad es una senal fiable de espera.
      heartbeatAgeSeg: activa ? edad : 0,
      taskActiva: activa,
      taskState: null,
      lastProgressAt: activa ? (s.updatedAt ?? null) : null,
      consecutiveFailedProgressChecks: fallosConsecutivos,
      waitingReason: activa && edadMs > (cfg.umbrales.heartbeatSospechosoSeg * 1000) ? 'sesion abierta sin actividad reciente' : null,
      waitDeadline: activa && edadMs > (cfg.umbrales.heartbeatSospechosoSeg * 1000) ? ahora + (cfg.umbrales.escalamientoHumanoSeg * 1000) : null,
    })
  }
  return out
}

function esSesionDecisora(s) {
  return s.runtime === 'dsh-session' && !s.parentSessionId && s.titulo !== null
}

// El agente decisor es la sesion RAIZ activa del DSH local. Si hay varias
// raices (sesiones viejas de pruebas), se prefiere la que esta corriendo y,
// en su defecto, la mas recientemente actualizada.
function elegirDecisor(evals) {
  const raices = evals.filter(esSesionDecisora)
  const activa = raices.find((e) => e.taskActiva)
  if (activa) return activa
  return raices.slice().sort((a, b) => (b.lastProgressAt ?? 0) - (a.lastProgressAt ?? 0))[0] ?? null
}

// --- Ciclo principal --------------------------------------------------------------

async function ciclo({ notificar = true } = {}) {
  const ahora = ahoraMs()
  const inventario = leerInventario()
  const registro = new Registro(cfg.rutas.estado)

  const sondeo = await sondear(inventario)
  const observaciones = [
    ...observacionesCline(inventario, sondeo, registro, ahora),
    ...observacionesDsh(sondeo, registro, ahora),
  ]

  const evals = observaciones.map((o) => {
    const r = evaluar(o, ahora, cfg.umbrales, cfg.excepciones ?? {})
    return { ...o, ...r }
  })

  registro.registrarMuestras(evals.map((e) => ({ ts: ahora, agent_id: e.agent_id, estado: e.estado, motivo: e.motivo, evidencia: e.evidencia, stalledCandidato: e.candidatoStall === true })))

  // --- Incidencias ---------------------------------------------------------------
  const incidencias = []
  const nuevas = []
  for (const e of evals) {
    if (!ALERTABLES.has(e.estado)) continue
    const titulo = `${e.agent_id}: ${e.estado}`
    const detalle = e.motivo
    const { incidente, nuevo } = registro.abrirIncidente({
      agentId: e.agent_id,
      kind: e.estado,
      titulo,
      detalle,
      evidencia: e.evidencia,
      ahora,
    })
    incidencias.push(incidente)
    if (nuevo) nuevas.push(incidente)
  }

  // Aviso al agente decisor: UN SOLO MENSAJE por pasada con todas las
  // incidencias nuevas. Mandar un mensaje por incidencia convertia una
  // deteccion multiple en ruido para el decisor.
  if (notificar && nuevas.length > 0) {
    for (const inc of nuevas) log(`INCIDENCIA ${inc.incident_id} ${inc.agent_id} ${inc.kind}: ${inc.detalle}`)
    const decisor = elegirDecisor(evals)
    if (decisor) {
      const cliente = new ClienteDsh({ timeoutMs: cfg.observacion.timeoutDshSeg * 1000 })
      const r = await avisarDecisor(cliente, decisor.agent_id, nuevas[0], cfg.notificacion, nuevas)
      for (const inc of nuevas) {
        registro.marcarNotificado(inc.incident_id, ahora, r.entregado)
        dejarEnBandeja(cfg.rutas.inbox, inc, 'decisor')
      }
      log(`  aviso al agente decisor ${decisor.agent_id}: ${r.entregado ? 'entregado' : 'FALLO ' + (r.error ?? '')} (${nuevas.length} incidencia/s)`)
    } else {
      log('  no hay sesion decisora identificable: los avisos quedan en la bandeja')
      for (const inc of nuevas) dejarEnBandeja(cfg.rutas.inbox, inc, 'decisor')
    }
  }

  // --- Escalamiento por falta de ACK ---------------------------------------------
  if (notificar) {
    const abiertos = registro.abiertos()
    const aEscalar = []
    for (const inc of abiertos) {
      const edad = ahora - inc.opened_at
      const decisoArriba = inc.kind === ESTADOS.DOWN && inc.agent_id === cfg.notificacion.agenteDecisor
      const plazo = decisoArriba ? cfg.umbrales.escalamientoCriticoSeg * 1000 : cfg.umbrales.escalamientoHumanoSeg * 1000
      const necesitaAviso = (inc.envios ?? 0) <= 1 && inc.ultima_notificacion !== null && ahora - inc.ultima_notificacion >= cfg.umbrales.reintentoNotificacionSeg * 1000

      if (inc.acked_at) continue
      if (edad >= plazo && !inc.escalado_humano) {
        aEscalar.push(inc)
      } else if (necesitaAviso && edad >= cfg.umbrales.reintentoNotificacionSeg * 1000) {
        // Un unico reintento de aviso al decisor; despues, el escalamiento.
        const decisor = elegirDecisor(evals)
        if (decisor) {
          const cliente = new ClienteDsh({ timeoutMs: cfg.observacion.timeoutDshSeg * 1000 })
          const r = await avisarDecisor(cliente, decisor.agent_id, inc, cfg.notificacion)
          registro.marcarNotificado(inc.incident_id, ahora, r.entregado)
          log(`  reintento de aviso al decisor ${inc.incident_id}: ${r.entregado ? 'entregado' : 'FALLO'}`)
        }
      }
    }
    // Un SOLO aviso al humano con todas las incidencias a escalar (n toasts
    // por n agentes seria ruido y el aviso perderia sentido).
    if (aEscalar.length > 0) {
      const t = await notificarHumano(aEscalar[0], cfg.rutas, aEscalar)
      for (const inc of aEscalar) {
        registro.marcarEscalado(inc.incident_id, ahora)
        dejarEnBandeja(cfg.rutas.inbox, inc, 'humano')
      }
      log(`ESCALADO al humano: ${aEscalar.length} incidencia/s sin ACK tras ${Math.round((ahora - aEscalar[0].opened_at) / 1000)}s · toast=${t.mostrado ? 'ok' : 'no'}`)
    }
  }

  // --- Instantanea y tablero -----------------------------------------------------
  const instantanea = {
    ts: ahora,
    generado_por: 'fleet-monitor',
    esquema: 'ciudadan-fleet-snapshot-v1',
    conteos: resumen(evals),
    inventario: { fuente: inventario[0]?.fuente ?? 'desconocida', agentes: inventario.length },
    servicioDsh: sondeo.servicioDsh,
    errorDsh: sondeo.errorDsh,
    nodos: Object.fromEntries(Object.entries(sondeo.nodos).map(([k, v]) => [k, {
      alcanzable: v.alcanzable,
      motivo: v.motivo ?? null,
      contenedores: v.agentes.length,
      fuente: v.fuente ?? null,
      heartbeatAgeSeg: v.heartbeatAgeSeg ?? null,
      aviso: v.avisoHeartbeat ?? null,
    }])),
    agentes: evals.map((e) => ({
      agent_id: e.agent_id,
      node_id: e.node_id,
      runtime: e.runtime,
      contenedor: e.contenedor ?? null,
      estado: e.estado,
      motivo: e.motivo,
      tarea: e.tarea ?? e.titulo ?? null,
      rama: e.rama ?? null,
      evidencia: e.evidencia,
      lastProgressAt: e.lastProgressAt ?? null,
      heartbeatAgeSeg: e.heartbeatAgeSeg ?? null,
    })),
    incidentes: registro.abiertos().map((i) => ({ incident_id: i.incident_id, agent_id: i.agent_id, kind: i.kind, estado: i.estado, titulo: redactar(i.titulo), abierto: i.opened_at, acked: i.acked_at ?? null })),
  }
  mkdirSync(cfg.rutas.estado, { recursive: true })
  writeFileSync(join(cfg.rutas.estado, 'fleet-snapshot.json'), JSON.stringify(instantanea, null, 2), 'utf8')
  escribirTablero(evals, instantanea, registro)
  escribirPendientes(cfg.rutas.inbox, registro.abiertos())

  log(`ciclo completado · ${Object.entries(instantanea.conteos).map(([k, v]) => `${k}=${v}`).join(' ')} · incidencias abiertas=${registro.abiertos().length}`)
  registro.cerrar()
  return instantanea
}

// Convierte segundos en una duracion legible (para el tablero).
function humanTiempo(seg) {
  if (!Number.isFinite(seg)) return '?'
  if (seg < 90) return `${Math.round(seg)}s`
  if (seg < 5400) return `${Math.round(seg / 60)}min`
  if (seg < 172800) return `${Math.round(seg / 3600)}h`
  return `${Math.round(seg / 86400)}d`
}

function escribirTablero(evals, instantanea, registro) {
  const l = []
  l.push('# Estado de la flota Ciudadan')
  l.push('')
  l.push(`Actualizado: ${new Date(instantanea.ts).toISOString()} · generado por \`fleet.mjs\` (programático, sin IA)`)
  l.push('')
  l.push(`**Resumen:** ${Object.entries(instantanea.conteos).map(([k, v]) => `\`${k}=${v}\``).join(' · ')}`)
  l.push('')

  const clines = evals.filter((e) => e.runtime === 'cline')
  l.push('## Agentes cline (contenedores)')
  l.push('')
  l.push('| Agente | Nodo | Contenedor | Tarea | Estado | Motivo | Último progreso |')
  l.push('|---|---|---|---|---|---|---|')
  const ahoraTablero = Date.now()
  for (const e of clines) {
    const tarea = redactar(e.tarea ?? '—').slice(0, 58)
    // La edad del progreso es la magnitud diagnostica: un timestamp sin fecha
    // no dice si el agente lleva 3 dias parado o 3 minutos.
    let prog = '—'
    if (e.lastProgressAt) {
      const seg = Math.round((ahoraTablero - e.lastProgressAt) / 1000)
      const iso = new Date(e.lastProgressAt).toISOString().slice(0, 16).replace('T', ' ')
      prog = `hace ${humanTiempo(seg)} (${iso}Z)`
    }
    l.push(`| ${e.agent_id} | ${e.node_id} | ${e.contenedor} | ${tarea} | **${e.estado}** | ${redactar(e.motivo)} | ${prog} |`)
  }
  l.push('')

  const sesiones = evals.filter((e) => e.runtime === 'dsh-session')
  const activas = sesiones.filter((e) => e.taskActiva || e.estado !== 'IDLE')
  const inactivas = sesiones.length - activas.length
  l.push('## Sesiones DSH')
  l.push('')
  if (activas.length === 0) l.push('Ninguna sesion activa.')
  else {
    l.push('| Sesión | Origen | Título | Estado | Motivo |')
    l.push('|---|---|---|---|---|')
    for (const e of activas) {
      l.push(`| \`${e.agent_id.slice(0, 12)}\` | ${e.origen ?? 'raíz'} | ${redactar(e.titulo ?? '—').slice(0, 40)} | **${e.estado}** | ${redactar(e.motivo)} |`)
    }
  }
  if (inactivas > 0) l.push('')
  if (inactivas > 0) l.push(`_${inactivas} sesiones inactivas (sin tarea) omitidas del tablero._`)
  l.push('')

  const inc = registro.abiertos()
  l.push('## Incidencias abiertas')
  l.push('')
  if (inc.length === 0) l.push('Ninguna.')
  else {
    l.push('| Incidente | Agente | Tipo | Estado | ACK | Antigüedad |')
    l.push('|---|---|---|---|---|---|')
    for (const i of inc) {
      l.push(`| ${i.incident_id} | ${i.agent_id} | ${i.kind} | ${i.estado} | ${i.acked_at ? i.ack_por : 'sin ACK'} | ${Math.round((instantanea.ts - i.opened_at) / 1000)}s |`)
    }
  }
  l.push('')
  l.push('_Estados: WORKING · WAITING · IDLE · SUSPECT · STALLED · DOWN · UNOBSERVABLE · COMPLETED · FAILED_')
  l.push('')
  l.push('_Avisos: primero al agente decisor (esta sesión DSH). Si no hay ACK en el plazo, se escala al humano._')
  writeFileSync(cfg.rutas.tablero, l.join('\n'), 'utf8')
}

// --- CLI ---------------------------------------------------------------------------

// --- Modo de prueba ---------------------------------------------------------------
// Inyecta una incidencia sintetica para verificar el circuito completo
// (deteccion -> aviso al decisor -> ACK -> escalamiento) SIN tocar los agentes
// reales. Solo para pruebas; no cambia el estado de ningun contenedor.
async function simular(tipo, agentId) {
  const ahora = ahoraMs()
  const registro = new Registro(cfg.rutas.estado)
  const cliente = new ClienteDsh({ timeoutMs: cfg.observacion.timeoutDshSeg * 1000 })
  const sesiones = await cliente.listarSesiones()
  const decisor = sesiones.filter((s) => !s.parentSessionId).sort((a,b)=>(b.updatedAt??0)-(a.updatedAt??0))[0] ?? null

  const { incidente, nuevo } = registro.abrirIncidente({
    agentId,
    kind: tipo.toUpperCase(),
    titulo: `${agentId}: ${tipo.toUpperCase()} (SIMULACION DE PRUEBA)`,
    detalle: 'incidencia sintetica generada por `fleet.mjs simular` para verificar el circuito de avisos',
    evidencia: ['simulacion=true', 'origen=fleet.mjs simular', `ts=${new Date(ahora).toISOString()}`],
    ahora,
  })
  log(`SIMULACION: incidencia ${incidente.incident_id} (${tipo}) para ${agentId} · nueva=${nuevo}`)

  if (decisor) {
    const r = await avisarDecisor(cliente, decisor.sessionId, incidente, cfg.notificacion)
    registro.marcarNotificado(incidente.incident_id, ahora, r.entregado)
    dejarEnBandeja(cfg.rutas.inbox, incidente, 'decisor')
    log(`  aviso entregado al agente decisor ${decisor.sessionId}: ${r.entregado ? 'SI' : 'NO ' + (r.error ?? '')}`)
  } else {
    log('  no hay agente decisor identificable')
  }

  if (process.argv.includes('--escalar')) {
    const t = await notificarHumano(incidente, cfg.rutas)
    registro.marcarEscalado(incidente.incident_id, ahora)
    dejarEnBandeja(cfg.rutas.inbox, incidente, 'humano')
    log(`  escalado al humano (toast=${t.mostado ? 'mostrado' : 'no se pudo mostrar: ' + (t.error ?? '')})`)
  }
  escribirPendientes(cfg.rutas.inbox, registro.abiertos())
  log(`  ACK pendiente: node fleet.mjs ack ${incidente.incident_id}`)
  registro.cerrar()
  return incidente.incident_id
}

const cmd = process.argv[2] ?? 'run'

if (cmd === 'run') {
  await ciclo({ notificar: true })
} else if (cmd === 'collect') {
  await ciclo({ notificar: false })
} else if (cmd === 'panel') {
  const registro = new Registro(cfg.rutas.estado)
  const snapPath = join(cfg.rutas.estado, 'fleet-snapshot.json')
  if (!existsSync(snapPath)) { log('no hay instantanea; ejecuta run o collect primero'); process.exit(1) }
  const snap = JSON.parse(readFileSync(snapPath, 'utf8'))
  const evals = snap.agentes.map((a) => ({ ...a, evidencia: a.evidencia ?? [] }))
  escribirTablero(evals, snap, registro)
  log('tablero escrito')
} else if (cmd === 'alerts') {
  const registro = new Registro(cfg.rutas.estado)
  for (const i of registro.abiertos()) {
    log(`${i.incident_id} | ${i.agent_id} | ${i.kind} | ${i.estado} | ${redactar(i.titulo)}`)
  }
  registro.cerrar()
} else if (cmd === 'ack') {
  const id = process.argv[3]
  if (!id) { log('uso: fleet.mjs ack <incident_id>'); process.exit(2) }
  const registro = new Registro(cfg.rutas.estado)
  const inc = registro.acusar(id, 'dsh-decisor', ahoraMs())
  if (!inc) { log(`no hay incidencia abierta con id ${id}`); process.exit(1) }
  log(`ACK registrado para ${id} (${inc.agent_id}, ${inc.kind}). No se escalara al humano.`)
  escribirPendientes(cfg.rutas.inbox, registro.abiertos())
  registro.cerrar()
} else if (cmd === 'resolver') {
  const id = process.argv[3]
  if (!id) { log('uso: fleet.mjs resolver <incident_id>'); process.exit(2) }
  const registro = new Registro(cfg.rutas.estado)
  const inc = registro.resolver(id, ahoraMs())
  if (!inc) { log(`no se encontro la incidencia ${id}`); process.exit(1) }
  log(`incidencia ${id} resuelta (${inc.agent_id}, ${inc.kind})`)
  escribirPendientes(cfg.rutas.inbox, registro.abiertos())
  registro.cerrar()
} else if (cmd === 'simular') {
  const tipo = process.argv[3] ?? 'down'
  const agentId = process.argv[4] ?? 'temporal1-agent1'
  await simular(tipo, agentId)
} else if (cmd === 'selftest') {
  const { selftest } = await import('./lib/selftest.mjs')
  const ok = await selftest(cfg, evaluar, ESTADOS)
  process.exit(ok ? 0 : 1)
} else {
  log('comandos: run | collect | panel | alerts | ack <id> | selftest')
  process.exit(2)
}


