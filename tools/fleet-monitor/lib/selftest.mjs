// Pruebas de aceptacion del clasificador (criterio del consultor, 2026-10-30).
// Son pruebas de la MAQUINA DE ESTADOS: no tocan la red ni los agentes reales.

export async function selftest(cfg, evaluar, ESTADOS) {
  const u = cfg.umbrales
  let fallos = 0
  let total = 0

  function caso(nombre, agente, esperado) {
    total += 1
    const r = evaluar(agente, Date.now(), u, cfg.excepciones ?? {})
    if (r.estado !== esperado) {
      fallos += 1
      console.log(`FALLA  ${nombre}: esperado ${esperado}, obtenido ${r.estado} (${r.motivo})`)
    } else {
      console.log(`ok     ${nombre}: ${r.estado}`)
    }
  }

  const ahora = Date.now()

  caso('contenedor vivo y trabajando', {
    agent_id: 'a1', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: 1000,
    taskActiva: true, lastProgressAt: ahora - 60_000, consecutiveFailedProgressChecks: 0,
  }, ESTADOS.WORKING)

  caso('contenedor parado -> DOWN', {
    agent_id: 'a2', nodoAlcanzable: true, runtimeMuerto: true, runtimeEstado: 'exited', exitCode: 1,
    heartbeatAgeSeg: 5000, taskActiva: true, lastProgressAt: ahora - 600_000, consecutiveFailedProgressChecks: 5,
  }, ESTADOS.DOWN)

  caso('contenedor muerto por OOM -> DOWN', {
    agent_id: 'a3', nodoAlcanzable: true, runtimeMuerto: true, oomKilled: true, runtimeEstado: 'exited',
    heartbeatAgeSeg: 5000, taskActiva: true,
  }, ESTADOS.DOWN)

  caso('nodo inalcanzable -> UNOBSERVABLE (no DOWN)', {
    agent_id: 'a4', nodoAlcanzable: false, runtimeMuerto: false, heartbeatAgeSeg: 999_999,
    taskActiva: true, lastProgressAt: ahora - 999_999,
  }, ESTADOS.UNOBSERVABLE)

  caso('sin senal de vida larga -> UNOBSERVABLE', {
    agent_id: 'a5', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: (u.heartbeatNoObservableSeg + 30) * 1000,
    taskActiva: true, lastProgressAt: ahora - 999_999,
  }, ESTADOS.UNOBSERVABLE)

  caso('senal de vida debil -> SUSPECT', {
    agent_id: 'a6', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSec: 0,
    heartbeatAgeSeg: (u.heartbeatSospechosoSeg + 30) * 1000, taskActiva: true, lastProgressAt: ahora - 999_999,
    consecutiveFailedProgressChecks: 0,
  }, ESTADOS.SUSPECT)

  caso('tarea viva sin progreso y 2 checks -> STALLED', {
    agent_id: 'a7', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: 5000,
    taskActiva: true, lastProgressAt: ahora - (u.progresoSinAvanceSeg + 120) * 1000,
    consecutiveFailedProgressChecks: 2,
  }, ESTADOS.STALLED)

  caso('tarea viva sin progreso pero solo 1 check -> SOSPECHA (no STALLED todavia)', {
    agent_id: 'a8', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: 5000,
    taskActiva: true, runtimeClineActivo: true, lastProgressAt: ahora - (u.progresoSinAvanceSeg + 120) * 1000,
    consecutiveFailedProgressChecks: 1,
  }, ESTADOS.SUSPECT)

  // --- F2: senal nativa de Cline -------------------------------------------
  caso('runtime de Cline sin marcha con tarea declarada -> STALLED', {
    agent_id: 'f2a', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: 900000,
    taskActiva: true, runtimeClineActivo: false, lastProgressAt: ahora - 900000,
    consecutiveFailedProgressChecks: 2,
  }, ESTADOS.STALLED)

  caso('runtime de Cline sin marcha con tarea declarada, 1er check -> SOSPECHA', {
    agent_id: 'f2b', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: 900000,
    taskActiva: true, runtimeClineActivo: false, lastProgressAt: ahora - 900000,
    consecutiveFailedProgressChecks: 0,
  }, ESTADOS.SUSPECT)

  caso('runtime de Cline sin marcha SIN tarea declarada -> ocioso, no alerta', {
    agent_id: 'f2c', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: 900000,
    taskActiva: false, runtimeClineActivo: false, lastProgressAt: ahora - 900000,
    consecutiveFailedProgressChecks: 0,
  }, ESTADOS.IDLE)

  caso('runtime vivo y progreso reciente -> WORKING', {
    agent_id: 'f2d', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: 5000,
    taskActiva: true, runtimeClineActivo: true, lastProgressAt: ahora - 60_000,
    consecutiveFailedProgressChecks: 0,
  }, ESTADOS.WORKING)

  caso('runtime vivo pero sesion atascada -> STALLED tras 2 checks', {
    agent_id: 'f2e', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: 5000,
    taskActiva: true, runtimeClineActivo: true, lastProgressAt: ahora - 1_800_000,
    consecutiveFailedProgressChecks: 2,
  }, ESTADOS.STALLED)

  caso('espera legitima vigente -> WAITING', {
    agent_id: 'a9', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: 5000,
    taskActiva: true, lastProgressAt: ahora - 999_999, consecutiveFailedProgressChecks: 5,
    waitingReason: 'compilacion larga declarada', waitDeadline: ahora + 600_000,
  }, ESTADOS.WAITING)

  caso('sin tarea activa -> IDLE (no alerta)', {
    agent_id: 'a10', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: 5000,
    taskActiva: false,
  }, ESTADOS.IDLE)

  caso('tarea fallida -> FAILED', {
    agent_id: 'a11', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: 5000,
    taskActiva: true, taskState: 'failed',
  }, ESTADOS.FAILED)

  // Excepcion declarada: una tarea larga con umbral propio no debe alertar.
  caso('tarea larga con plazo propio no genera STALLED', {
    agent_id: 'temporal1-agent1', nodoAlcanzable: true, runtimeMuerto: false, heartbeatAgeSeg: 5000,
    taskActiva: true, lastProgressAt: ahora - 1_500_000, consecutiveFailedProgressChecks: 9,
  }, ESTADOS.WORKING)

  console.log(`\n${total - fallos}/${total} pruebas del clasificador correctas`)
  return fallos === 0
}
