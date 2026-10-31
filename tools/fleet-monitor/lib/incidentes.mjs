// Registro duradero de incidencias del monitor. SQLite con WAL: las
// incidencias sobreviven a reinicios y el collector puede seguir funcionando
// aunque nadie este mirando.
//
// Ciclo de vida de una incidencia:
//   opened -> notified (al agente decisor) -> acknowledged (DECISION_ACK)
//          -> resolved
//   opened -> notified -> escalated (al humano, por falta de ACK) -> resolved
//
// DELIVERY_ACK (el mensaje se entrego) NO es lo mismo que DECISION_ACK (alguien
// esta viendo el caso). Solo el segundo detiene el escalamiento.

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export class Registro {
  constructor(dir) {
    mkdirSync(dir, { recursive: true })
    this.db = new DatabaseSync(join(dir, 'fleet-incidentes.sqlite'))
    this.db.exec('PRAGMA journal_mode=WAL')
    this.db.exec('PRAGMA busy_timeout=5000')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS incidents (
        incident_id TEXT PRIMARY KEY,
        dedup_key   TEXT NOT NULL,
        agent_id    TEXT NOT NULL,
        kind        TEXT NOT NULL,
        estado      TEXT NOT NULL,
        titulo      TEXT NOT NULL,
        detalle     TEXT NOT NULL,
        evidencia   TEXT NOT NULL,
        opened_at   INTEGER NOT NULL,
        notified_at INTEGER,
        delivered   INTEGER DEFAULT 0,
        acked_at    INTEGER,
        ack_por     TEXT,
        escalated_at INTEGER,
        escalado_humano INTEGER DEFAULT 0,
        resolved_at INTEGER,
        ultima_notificacion INTEGER,
        envios INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_inc_open ON incidents(resolved_at, dedup_key);
      CREATE TABLE IF NOT EXISTS muestras (
        ts INTEGER NOT NULL,
        agent_id TEXT NOT NULL,
        estado TEXT NOT NULL,
        motivo TEXT NOT NULL,
        evidencia TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_muestras ON muestras(agent_id, ts);
    `)
    // Migracion ligera: columna para marcar los candidatos a STALLED (una
    // comprobacion aislada no debe alertar, hacen falta varias seguidas).
    try { this.db.exec('ALTER TABLE muestras ADD COLUMN stalled_candidato INTEGER DEFAULT 0') } catch { /* ya existe */ }
    // Contador de envios: limita los reintentos de aviso para no inundar.
    try { this.db.exec('ALTER TABLE incidents ADD COLUMN envios INTEGER DEFAULT 0') } catch { /* ya existe */ }
  }

  cerrar() { try { this.db.close() } catch { /* ya cerrado */ } }

  registrarMuestras(muestras) {
    const ins = this.db.prepare('INSERT INTO muestras (ts, agent_id, estado, motivo, evidencia, stalled_candidato) VALUES (?, ?, ?, ?, ?, ?)')
    this.db.exec('BEGIN')
    try {
      for (const m of muestras) ins.run(m.ts, m.agent_id, m.estado, m.motivo, JSON.stringify(m.evidencia ?? []), m.stalledCandidato ? 1 : 0)
      this.db.exec('COMMIT')
    } catch (e) { this.db.exec('ROLLBACK'); throw e }
  }

  // Numero de comprobaciones CONSECUTIVAS que marcaron al agente como
  // candidato a STALLED. Es el contador que evita alertar por un tick perdido.
  fallosConsecutivos(agentId, limite = 8) {
    const filas = this.db.prepare('SELECT stalled_candidato FROM muestras WHERE agent_id = ? ORDER BY ts DESC LIMIT ?').all(agentId, limite)
    let n = 0
    for (const f of filas) {
      if (f.stalled_candidato) n += 1
      else break
    }
    return n
  }

  // Abre (o reutiliza) la incidencia logica de un par agente+tipo.
  abrirIncidente({ agentId, kind, titulo, detalle, evidencia, ahora }) {
    const dedupKey = `${agentId}|${kind}`
    const existente = this.db.prepare('SELECT * FROM incidents WHERE dedup_key = ? AND resolved_at IS NULL').get(dedupKey)
    if (existente) {
      this.db.prepare('UPDATE incidents SET titulo = ?, detalle = ?, evidencia = ? WHERE incident_id = ?')
        .run(titulo, detalle, JSON.stringify(evidencia ?? []), existente.incident_id)
      return { incidente: { ...existente, titulo, detalle, evidencia }, nuevo: false }
    }
    const id = `inc_${randomUUID()}`
    this.db.prepare(`INSERT INTO incidents (incident_id, dedup_key, agent_id, kind, estado, titulo, detalle, evidencia, opened_at)
      VALUES (?, ?, ?, ?, 'opened', ?, ?, ?, ?)`)
      .run(id, dedupKey, agentId, kind, titulo, detalle, JSON.stringify(evidencia ?? []), ahora)
    const creado = this.db.prepare('SELECT * FROM incidents WHERE incident_id = ?').get(id)
    return { incidente: creado, nuevo: true }
  }

  marcarNotificado(incidentId, ahora, entregado) {
    this.db.prepare(`UPDATE incidents SET estado = 'notified', notified_at = COALESCE(notified_at, ?), ultima_notificacion = ?, delivered = ?, envios = COALESCE(envios, 0) + 1 WHERE incident_id = ?`)
      .run(ahora, ahora, entregado ? 1 : 0, incidentId)
  }

  acusar(incidentId, quien, ahora) {
    const info = this.db.prepare(`UPDATE incidents SET estado = 'acknowledged', acked_at = ?, ack_por = ? WHERE incident_id = ? AND resolved_at IS NULL`)
      .run(ahora, quien ?? 'dsh-decisor', incidentId)
    if (info.changes === 0) return null
    return this.db.prepare('SELECT * FROM incidents WHERE incident_id = ?').get(incidentId)
  }

  marcarEscalado(incidentId, ahora) {
    this.db.prepare(`UPDATE incidents SET estado = 'escalated', escalated_at = ?, escalado_humano = 1 WHERE incident_id = ?`)
      .run(ahora, incidentId)
  }

  resolver(incidentId, ahora) {
    this.db.prepare(`UPDATE incidents SET estado = 'resolved', resolved_at = ? WHERE incident_id = ?`).run(ahora, incidentId)
    return this.db.prepare('SELECT * FROM incidents WHERE incident_id = ?').get(incidentId)
  }

  abiertos() {
    return this.db.prepare('SELECT * FROM incidents WHERE resolved_at IS NULL ORDER BY opened_at ASC').all()
  }

  porId(incidentId) {
    return this.db.prepare('SELECT * FROM incidents WHERE incident_id = ?').get(incidentId) ?? null
  }

  ultimos(limite = 20) {
    return this.db.prepare('SELECT * FROM incidents ORDER BY opened_at DESC LIMIT ?').all(limite)
  }

  // Historial de estados por agente (para el panel y la deteccion de
  // comprobaciones fallidas consecutivas).
  historico(agentId, limite = 20) {
    return this.db.prepare('SELECT ts, estado FROM muestras WHERE agent_id = ? ORDER BY ts DESC LIMIT ?').all(agentId, limite)
  }
}
