// Parser de un subconjunto de YAML (mapeos, listas, escalares, comillas,
// comentarios y mapas en linea). Suficiente para agents.yaml y nodes.yaml.
// No es un parser general: falla de forma explicita ante algo que no entienda,
// para no inventar datos de un inventario.

export function parseYaml(texto) {
  const lineas = texto.split(/\r?\n/)
  const raiz = {}
  const pila = [{ indent: -1, valor: raiz, clave: null }]
  for (let i = 0; i < lineas.length; i += 1) {
    const cruda = lineas[i]
    const sinTabs = cruda.replace(/\t/g, '  ')
    const indent = sinTabs.length - sinTabs.trimStart().length
    const texto = sinTabs.trim()
    if (texto === '' || texto.startsWith('#')) continue
    while (pila.length > 1 && indent <= pila[pila.length - 1].indent) pila.pop()
    const padre = pila[pila.length - 1]
    if (texto.startsWith('- ')) {
      const item = texto.slice(2).trim()
      if (!Array.isArray(padre.valor[padre.clave])) padre.valor[padre.clave] = []
      const dos = partirPrimerClave(item)
      if (dos.clave === null) {
        padre.valor[padre.clave].push(escalar(item))
      } else {
        const obj = {}
        obj[dos.clave] = dos.valor
        padre.valor[padre.clave].push(obj)
        // Marco para que las lineas MAS indentadas que siguen (node:, type:,
        // container:...) se sumen a este mismo elemento de la lista.
        pila.push({ indent, valor: padre.valor[padre.clave], clave: '__last__', item: obj })
      }
      continue
    }
    const dos = partirPrimerClave(texto)
    if (dos.clave === null) throw new Error(`YAML no entendido en la linea ${i + 1}: ${texto.slice(0, 60)}`)
    // Destino de la clave: el elemento de lista, el mapa anidado (padre.clave)
    // o el mapa raiz.
    let destino
    if (padre.clave === '__items__' || padre.clave === '__last__') destino = padre.item
    else if (padre.clave !== null && padre.valor && typeof padre.valor[padre.clave] === 'object' && padre.valor[padre.clave] !== null) destino = padre.valor[padre.clave]
    else destino = padre.valor

    // Escalares de bloque: `|`, `|-`, `>`, `>-` (texto multilinea). El valor
    // son las lineas siguientes mas indentadas que la clave.
    if (typeof dos.valor === 'string' && /^[|>]/.test(dos.valor)) {
      const plegado = dos.valor.startsWith('>')
      const quitar = dos.valor.includes('-')
      const bloque = []
      let j = i + 1
      let indentBloque = null
      for (; j < lineas.length; j += 1) {
        const cruda2 = lineas[j]
        if (cruda2.trim() === '') { bloque.push(''); continue }
        const ind2 = cruda2.length - cruda2.trimStart().length
        if (ind2 <= indent) break
        if (indentBloque === null) indentBloque = ind2
        bloque.push(cruda2.slice(Math.min(indentBloque, ind2)))
      }
      while (bloque.length && bloque[bloque.length - 1] === '') bloque.pop()
      destino[dos.clave] = plegado ? bloque.join(' ').replace(/\s+/g, ' ') : bloque.join('\n')
      i = j - 1
      continue
    }

    if (dos.esCadenaVacia) {
      // Cadena vacia explicita ("") -> string vacio, NO un mapa anidado.
      destino[dos.clave] = ''
      continue
    }

    if (dos.valor === '' || dos.valor === null) {
      destino[dos.clave] = {}
      pila.push({ indent, valor: destino, clave: dos.clave })
    } else {
      destino[dos.clave] = dos.valor
    }
  }
  return raiz
}

function partirPrimerClave(texto) {
  const i = texto.indexOf(':')
  if (i < 0) return { clave: null, valor: null }
  const clave = texto.slice(0, i).trim()
  const resto = texto.slice(i + 1).trim()
  if (clave === '') return { clave: null, valor: null }
  // Cadena vacia explicita: "" o ''. Se distingue del valor vacio (mapa
  // anidado) porque en YAML son cosas distintas.
  if (resto === '""' || resto === "''") return { clave, valor: '', esCadenaVacia: true }
  return { clave, valor: escalar(resto) }
}

export function escalar(bruto) {
  const s = bruto.trim()
  if (s === '') return ''
  if (s.startsWith('{') && s.endsWith('}')) {
    const mapa = {}
    for (const parte of s.slice(1, -1).split(',')) {
      const t = parte.trim()
      if (t === '') continue
      const j = t.indexOf(':')
      if (j < 0) continue
      mapa[t.slice(0, j).trim().replace(/^["']|["']$/g, '')] = escalar(t.slice(j + 1))
    }
    return mapa
  }
  if (s.startsWith('[') && s.endsWith(']')) {
    return s.slice(1, -1).split(',').map((x) => escalar(x)).filter((x) => x !== '')
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  // Comentario al final de linea (respetando comillas)
  const sinComentario = quitarComentario(s)
  if (sinComentario === 'true') return true
  if (sinComentario === 'false') return false
  if (sinComentario === 'null' || sinComentario === '~') return null
  if (/^-?\d+$/.test(sinComentario)) return Number(sinComentario)
  return sinComentario
}

function quitarComentario(s) {
  let enComillas = null
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i]
    if (enComillas) {
      if (c === enComillas) enComillas = null
      continue
    }
    if (c === '"' || c === "'") { enComillas = c; continue }
    if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i).trim()
  }
  return s.trim()
}
