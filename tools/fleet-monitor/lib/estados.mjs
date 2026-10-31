// Maquina de estados determinista del monitor. SIN IA: mismas entradas ->
// mismo estado. Distingue tres cosas que se confunden siempre:
//   disponibilidad (el runtime existe), actividad (hay senales) y
//   progreso (la tarea avanza).
//
// Estados: WORKING | WAITING | IDLE | SUSPECT | STALLED | DOWN |
//          UNOBSERVABLE | COMPLETED | FAILED
//
// Reglas (criterio del consultor, 2026-10-30):
//   - Ante evidencia insuficiente: UNOBSERVABLE. Nunca inventar.
//   - Un contenedor vivo NO prueba que el agente trabaje.
//   - Un lock o una reserva renovada NO prueban progreso.
//   - La decision la toma una regla, no un modelo.

export const ESTADOS = {
  WORKING: 'WORKING',
  WAITING: 'WAITING',
  IDLE: 'IDLE',
  SUSPECT: 'SUSPECT',
  STALLED: 'STALLED',
  DOWN: 'DOWN',
  UNOBSERVABLE: 'UNOBSERVABLE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
}

export const ALERTABLES = new Set([ESTADOS.STALLED, ESTADOS.DOWN, ESTADOS.FAILED])

export function evaluar(agente, ahora, umbrales, excepciones = {}) {
  const u = umbrales
  const exc = excepciones[agente.agent_id] ?? {}
  const limiteProgreso = (exc.progresoSinAvanceSeg ?? u.progresoSinAvanceSeg) * 1000
  const checks = exc.checksFallidosParaStalled ?? u.checksFallidosParaStalled
  const ev = []

  // Procedencia de los datos: si el estado viene del heartbeat del nodo o de
  // un sondeo en vivo. Es evidencia relevante para interpretar la incidencia.
  if (agente.fuenteDatos) ev.push(`fuente=${agente.fuenteDatos}`)
  if (agente.avisoHeartbeat) ev.push(agente.avisoHeartbeat)
  if (agente.evidenciaAlive) ev.push(agente.evidenciaAlive)
  if (agente.evidenciaSesion) ev.push(agente.evidenciaSesion)
  if (agente.evidenciaProgreso) ev.push(agente.evidenciaProgreso)

  // 1) No se puede observar el nodo: NO es caida, es falta de observabilidad.
  if (agente.nodoAlcanzable === false) {
    return { estado: ESTADOS.UNOBSERVABLE, motivo: 'nodo sin acceso: no se puede observar', evidencia: ['nodo_alcanzable=false'] }
  }

  // 2) Runtime confirmado muerto.
  if (agente.runtimeMuerto === true) {
    ev.push(`runtime=${agente.runtimeEstado ?? 'desconocido'}`)
    if (agente.exitCode !== undefined && agente.exitCode !== null) ev.push(`exit=${agente.exitCode}`)
    if (agente.oomKilled === true) ev.push('OOMKilled=true')
    if (agente.finishedAt) ev.push(`termino=${agente.finishedAt}`)
    return { estado: ESTADOS.DOWN, motivo: agente.motivoMuerte ?? 'runtime detenido', evidencia: ev }
  }

  // 3) Tarea declarada fallida.
  if (agente.taskState === 'failed') {
    return { estado: ESTADOS.FAILED, motivo: agente.motivoFallo ?? 'la tarea fallo', evidencia: ev }
  }

  // 4) Tarea declarada completada.
  if (agente.taskState === 'completed') {
    return { estado: ESTADOS.COMPLETED, motivo: 'tarea completada', evidencia: ev }
  }

  // 5) Espera legitima declarada y vigente: no es una caida y NO es falta de
  //    observabilidad. Se evalua ANTES que el heartbeat porque una espera
  //    declarada explica la ausencia de senal.
  if (agente.waitingReason && agente.waitDeadline && ahora < agente.waitDeadline) {
    ev.push(`espera=${agente.waitingReason}`)
    return { estado: ESTADOS.WAITING, motivo: `espera declarada: ${agente.waitingReason}`, evidencia: ev }
  }

  // 6) Heartbeat: la senal de vida del runtime.
  //    Si el runtime de Cline se sabe que NO esta en marcha, la ausencia de
  //    senal no es falta de observabilidad: es evidencia de que no trabaja.
  const edadHeartbeat = agente.heartbeatAgeSeg
  if (typeof edadHeartbeat === 'number') {
    ev.push(`heartbeat=${Math.round(edadHeartbeat)}s`)
    if (edadHeartbeat > u.heartbeatNoObservableSeg * 1000 && agente.runtimeClineActivo !== false) {
      return { estado: ESTADOS.UNOBSERVABLE, motivo: `sin senal de vida desde hace ${Math.round(edadHeartbeat / 1000)}s`, evidencia: ev }
    }
  }

  // 7) Progreso: la tarea esta activa pero no avanza. Hay dos motivos
  //    distintos de stagnation y ambos son "dejo de chambear":
  //      a) el runtime de Cline no esta en marcha (la sesion murio);
  //      b) el runtime esta vivo pero la sesion no avanza (esta atascado).
  //    En ambos casos se exigen comprobaciones consecutivas para no alertar
  //    por un tick perdido.
  const tieneTarea = agente.taskActiva === true
  let motivoStall = null
  if (tieneTarea) {
    if (agente.runtimeClineActivo === false) {
      motivoStall = 'tarea declarada activa pero el runtime de Cline no esta en marcha'
    } else if (typeof agente.lastProgressAt === 'number') {
      const sinAvance = ahora - agente.lastProgressAt
      ev.push(`sin_avance=${Math.round(sinAvance / 1000)}s`)
      if (sinAvance > limiteProgreso) {
        motivoStall = `tarea activa sin progreso verificable desde hace ${Math.round(sinAvance / 1000)}s`
      }
    }
  }
  const fallidos = agente.consecutiveFailedProgressChecks ?? 0
  const esCandidatoStall = motivoStall !== null
  if (esCandidatoStall && fallidos >= checks) {
    return { estado: ESTADOS.STALLED, motivo: motivoStall, evidencia: ev, candidatoStall: true }
  }
  // Candidato pero sin comprobaciones suficientes: queda en sospecha (no se
  // alerta todavia, pero tampoco se reporta como "trabajando").
  if (esCandidatoStall) {
    ev.push(`sospecha=${fallidos + 1}/${checks} comprobaciones`)
    return { estado: ESTADOS.SUSPECT, motivo: `${motivoStall} (pendiente de confirmar: ${fallidos + 1}/${checks})`, evidencia: ev, candidatoStall: true }
  }

  // 8) Senal de vida degradada: el runtime sigue vivo pero su senal se
  //    debilita. Si ya se sabe que el runtime de Cline no esta en marcha, no
  //    es "senal debil" sino un estado conocido (lo trata la regla 7).
  if (typeof edadHeartbeat === 'number' && edadHeartbeat > u.heartbeatSospechosoSeg * 1000 && agente.runtimeClineActivo !== false) {
    return { estado: ESTADOS.SUSPECT, motivo: `senal de vida debil (${Math.round(edadHeartbeat / 1000)}s)`, evidencia: ev, candidatoStall: esCandidatoStall }
  }

  // 9) Sin tarea asignada: disponible pero ocioso (no es una alerta).
  if (!tieneTarea) {
    return { estado: ESTADOS.IDLE, motivo: 'sin tarea activa', evidencia: ev, candidatoStall: esCandidatoStall }
  }

  ev.push('runtime vivo')
  ev.push('progreso dentro de plazo')
  return { estado: ESTADOS.WORKING, motivo: 'trabajando', evidencia: ev, candidatoStall: esCandidatoStall }
}

export function resumen(evals) {
  const cuentas = {}
  for (const e of evals) cuentas[e.estado] = (cuentas[e.estado] ?? 0) + 1
  return cuentas
}
