// Genera la declaracion de la flota en git: un YAML por agente.
//
// Fuente: ~/.dsh/infrastructure/agents.yaml (inventario operativo).
// Destino: <monorepo>/fleet/agents/<agent_id>.yaml
//
// El YAML en git es la DECLARACION (identidad, nodo, runtime, tarea).
// El estado real (vivo/atascado/caido) no se escribe aqui: lo calcula el
// monitor y lo publica en la instantanea y en el tablero. Asi la declaracion
// no se ensucia con cambios cada minuto.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parseYaml } from './lib/yaml.mjs'

const ORIGEN = 'C:\\Users\\elyiz\\.dsh\\infrastructure\\agents.yaml'
const DESTINO = process.argv[2] ?? 'C:\\yii\\ciudadan_app_monorepo\\fleet\\agents'

if (!existsSync(ORIGEN)) throw new Error(`no existe el inventario origen: ${ORIGEN}`)
mkdirSync(DESTINO, { recursive: true })

const doc = parseYaml(readFileSync(ORIGEN, 'utf8'))
const agentes = doc.agents ?? []

function yamlTexto(a) {
  const estado = a.status === 'busy' ? 'activa' : (a.status === 'suspended' ? 'pausada' : 'sin_tarea')
  const l = []
  l.push(`# Declaracion del agente. Estado real: lo calcula el monitor de flota`)
  l.push(`# (C:\\yii\\tools\\fleet\\fleet.mjs) y se publica en ESTADO-FLETA.md.`)
  l.push(`# Editar a mano solo para cambiar la declaracion (nueva tarea, pausa, cierre).`)
  l.push(`agent_id: ${a.agent_id}`)
  l.push(`node: ${a.node}`)
  l.push(`runtime: ${a.type}`)
  if (a.container) l.push(`contenedor: ${a.container}`)
  if (a.project) l.push(`proyecto: ${a.project}`)
  if (a.branch) l.push(`rama: "${String(a.branch).replace(/"/g, '')}"`)
  // NO se versiona la linea ssh (IP + usuario + puerto): el repositorio es
  // publico y esa informacion vive en el config local del monitor.
  l.push(`tarea:`)
  l.push(`  estado: ${estado}`)
  l.push(`  descripcion: "${String(a.work ?? '').replace(/"/g, '').replace(/\n/g, ' ').slice(0, 300)}"`)
  l.push(`  declarada_en: "${a.last_verified ?? ''}"`)
  if (a.confidence) l.push(`confianza_inventario: ${a.confidence}`)
  if (a.notes) {
    l.push(`notas: >-`)
    for (const linea of String(a.notes).split('\n').map((x) => x.trim()).filter(Boolean)) {
      l.push(`    ${linea.replace(/:/g, '')}`)
    }
  }
  l.push('')
  return l.join('\n')
}

let n = 0
for (const a of agentes) {
  writeFileSync(join(DESTINO, `${a.agent_id}.yaml`), yamlTexto(a), 'utf8')
  n += 1
}
console.log(`escritos ${n} archivos en ${DESTINO}`)

