// Cliente de la API de sesion del DSH local (3080). Solo lo que necesita el
// monitor: listar sesiones (observar) y enviar un aviso al agente decisor.
// El token se lee del log local y NUNCA se imprime ni se persiste.

import { openSync, readSync, closeSync, fstatSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const LOG_DSH = 'C:\\Users\\elyiz\\AppData\\Local\\Ciudadan\\dsh-3080.log'

function leerLogCompartido(ruta) {
  const fd = openSync(ruta, 'r')
  try {
    const buf = Buffer.alloc(fstatSync(fd).size)
    readSync(fd, buf, 0, buf.length, 0)
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.toString('utf16le')
    return buf.toString('utf8')
  } finally { closeSync(fd) }
}

export function tokenDelDsh() {
  const crudo = leerLogCompartido(LOG_DSH)
  const ms = [...crudo.matchAll(/dsh web: http:\/\/127\.0\.0\.1:3080\/\?token=([A-Za-z0-9_-]+)/g)]
  if (ms.length === 0) throw new Error('no se encontro el token del DSH en el log local')
  return ms[ms.length - 1][1]
}

export class ClienteDsh {
  constructor({ base = 'http://127.0.0.1:3080', timeoutMs = 15000 } = {}) {
    this.base = base
    this.timeoutMs = timeoutMs
    this.cookie = ''
  }

  async conectar() {
    if (this.cookie) return true
    const token = tokenDelDsh()
    // Ojo: la respuesta con el token es 303 y la cookie se emite EN esa
    // respuesta; si se sigue la redireccion se pierde y el RPC responde 401.
    const r = await fetch(`${this.base}/?token=${token}`, { redirect: 'manual' })
    for (const c of (r.headers.getSetCookie?.() ?? [])) {
      this.cookie = this.cookie ? `${this.cookie}; ${c.split(';')[0]}` : c.split(';')[0]
    }
    return this.cookie !== ''
  }

  async rpc(metodo, request = {}) {
    if (!(await this.conectar())) throw new Error('no se pudo autenticar contra el DSH')
    const cuerpo = JSON.stringify({
      type: 'client-request',
      rpcId: randomUUID(),
      method: `session/${metodo}`,
      payload: { args: { _request: request } },
    })
    const control = new AbortController()
    const t = setTimeout(() => control.abort(), this.timeoutMs)
    try {
      const r = await fetch(`${this.base}/api/session/${metodo}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: this.cookie },
        body: cuerpo,
        signal: control.signal,
      })
      const txt = await r.text()
      let json
      try { json = JSON.parse(txt) } catch { throw new Error(`RPC ${metodo}: respuesta no JSON (${r.status})`) }
      const value = json?.result?.value
      if (value && value.ok === false) throw new Error(`RPC ${metodo}: ${value.error?.message ?? 'error'}`)
      return value ?? json?.result ?? null
    } finally { clearTimeout(t) }
  }

  async listarSesiones() {
    const v = await this.rpc('list', {})
    return v?.items ?? []
  }

  // Envia un aviso al agente decisor. Devuelve el id de la peticion si el DSH
  // la acepto (DELIVERY_ACK), que NO es lo mismo que un ACK de decision.
  async avisarDecisor(sessionId, texto) {
    const v = await this.rpc('prompt', {
      requestId: randomUUID(),
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: texto }],
    })
    return { aceptado: true, detalle: v }
  }
}
