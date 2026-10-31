// Canales de aviso.
//   1) Agente decisor (esta sesion DSH): se le envia el aviso por la API del
//      DSH (session/prompt). El monitor registra que lo entrego, pero eso NO
//      es un ACK de decision: el ACK lo da el agente con `fleet.mjs ack`.
//   2) Humano: solo si el agente decisor no acusa recibo en el plazo. Se
//      avisa con una notificacion de Windows y se deja constancia en la
//      bandeja (inbox) y en el tablero.

import { appendFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'

export function redactar(texto) {
  // Nunca escribir secretos en avisos, bandeja ni tablero.
  return String(texto ?? '')
    .replace(/[A-Za-z0-9_-]{32,}/g, '[REDACTADO]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTADO]')
    .replace(/token=[A-Za-z0-9_-]+/gi, 'token=[REDACTADO]')
}

export function componerAviso(inc, cfg, lista) {
  const lineas = []
  if (lista && lista.length > 1) {
    // Varias incidencias en la misma pasada: un solo mensaje, no N.
    lineas.push(`[MONITOR DE FLOTA] ${lista.length} incidencias nuevas detectadas`)
    lineas.push('')
    for (const i of lista) {
      lineas.push(`- ${i.agent_id} · ${i.kind}: ${i.titulo}`)
      lineas.push(`  id=${i.incident_id}`)
      if (cfg?.incluirEvidencia !== false && i.evidencia) {
        try {
          const ev = JSON.parse(i.evidencia)
          if (Array.isArray(ev) && ev.length) {
            for (const e of ev.slice(0, cfg?.maxLineasEvidencia ?? 4)) lineas.push(`  · ${e}`)
          }
        } catch { /* evidencia no parseable */ }
      }
    }
    lineas.push('')
    lineas.push('Cuando asumas un caso: fleet.mjs ack <incident_id>  (uno por incidencia)')
    lineas.push('Detalle: C:\\yii\\tools\\ESTADO-FLETA.md')
    return redactar(lineas.join('\n'))
  }
  lineas.push(`[MONITOR DE FLOTA] Incidencia ${inc.incident_id}`)
  lineas.push(`Agente: ${inc.agent_id}`)
  lineas.push(`Estado detectado: ${inc.kind}`)
  lineas.push(`Titulo: ${inc.titulo}`)
  lineas.push(`Detalle: ${inc.detalle}`)
  if (cfg?.incluirEvidencia !== false && inc.evidencia) {
    try {
      const ev = JSON.parse(inc.evidencia)
      if (Array.isArray(ev) && ev.length) {
        lineas.push('Evidencia:')
        for (const e of ev.slice(0, cfg?.maxLineasEvidencia ?? 6)) lineas.push(`  - ${e}`)
      }
    } catch { /* evidencia no parseable: no es critico */ }
  }
  lineas.push('Accion sugerida: revisa y decide. Cuando lo asumas responde: fleet.mjs ack ' + inc.incident_id)
  return redactar(lineas.join('\n'))
}

export function avisarDecisor(cliente, sessionId, inc, cfg, lista) {
  const texto = componerAviso(inc, cfg, lista)
  return cliente.avisarDecisor(sessionId, texto).then((r) => ({ entregado: true, texto, ...r }))
    .catch((e) => ({ entregado: false, texto, error: e.message }))
}

export function dejarEnBandeja(dir, inc, destino) {
  mkdirSync(dir, { recursive: true })
  const linea = JSON.stringify({
    ts: Date.now(),
    incident_id: inc.incident_id,
    agent_id: inc.agent_id,
    kind: inc.kind,
    titulo: redactar(inc.titulo),
    detalle: redactar(inc.detalle),
    destino,
    requiere_ack: true,
    estado: destino === 'humano' ? 'escalado' : 'abierto',
  })
  appendFileSync(join(dir, 'alertas.jsonl'), linea + '\n', 'utf8')
  return join(dir, 'alertas.jsonl')
}

// Aviso al humano: notificacion de Windows (sin instalar nada) + fichero de
// bandeja legible. Si la notificacion no puede mostrarse, el fichero queda.
export function notificarHumano(inc, rutas, lista) {
  const varios = Array.isArray(lista) && lista.length > 1
  const titulo = varios
    ? `Monitor de flota: ${lista.length} agentes con problemas`
    : 'Monitor de flota: agente con problemas'
  const cuerpo = varios
    ? redactar(lista.map((i) => `${i.agent_id} (${i.kind})`).join(', '))
    : redactar(`${inc.agent_id}: ${inc.titulo}`)
  // El XML viaja en base64: sin comillas ni entities que PowerShell pueda
  // malinterpretar.
  const xml = `<toast><visual><binding template='ToastGeneric'><text>${escaparXml(titulo)}</text><text>${escaparXml(cuerpo)}</text></binding></visual></toast>`
  const b64 = Buffer.from(xml, 'utf8').toString('base64')
  const ps = `
$ErrorActionPreference='Stop'
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType=WindowsRuntime] | Out-Null
$doc = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64}'))
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($doc)
$toast = New-Object Windows.UI.Notifications.ToastNotification $xml
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Windows PowerShell').Show($toast)
`
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', ps],
      { timeout: 20000, windowsHide: true },
      (error, stdout, stderr) => resolve({ mostrado: !error, error: error ? ((stderr || '') + ' ' + error.message).toString().trim().slice(0, 300) : null }))
  })
}

function escaparXml(s) {
  // Las entidades se construyen por codigo para que ningun editor las
  // "normalice" a un ampersand suelto.
  const AMP = String.fromCharCode(38)
  return String(s)
    .split('&').join(AMP + 'amp;')
    .split('<').join(AMP + 'lt;')
    .split('>').join(AMP + 'gt;')
    .split('"').join(AMP + 'quot;')
    .split("'").join(AMP + 'apos;')
}

export function escribirPendientes(dir, incidentes) {
  mkdirSync(dir, { recursive: true })
  const ruta = join(dir, 'ALERTAS-PENDIENTES.md')
  if (incidentes.length === 0) {
    writeFileSync(ruta, '# Alertas pendientes\n\nSin incidencias abiertas.\n', 'utf8')
    return ruta
  }
  const l = ['# Alertas pendientes del monitor de flota', '']
  for (const i of incidentes) {
    l.push(`- **${i.incident_id}** · ${i.agent_id} · ${i.kind} · ${i.estado}`)
    l.push(`  - ${redactar(i.titulo)}`)
    l.push(`  - abierto: ${new Date(i.opened_at).toISOString()}`)
    if (i.acked_at) l.push(`  - acusado por ${i.ack_por} a las ${new Date(i.acked_at).toISOString()}`)
    else l.push(`  - SIN ACK: escalar al humano si se cumplen los plazos`)
    l.push('')
  }
  writeFileSync(ruta, l.join('\n'), 'utf8')
  return ruta
}
