#!/usr/bin/env node
/**
 * Guardia de seguridad CI: detecta payloads ofuscados / backdoors en el arbol del repo.
 *
 * Contexto: api.js (raiz) y ciudadan_backend_26/middleware/src/routes/auth0.js fueron
 * portadores de un backdoor (C2 via blockchain, payload remoto XOR) que se reinyecto
 * varias veces entre 2026-08 y 2026-10 (ver docs/SEGURIDAD-OFUSCACION-2026-10-27.md).
 *
 * Uso:  node ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js
 * Salida: 0 = limpio; 1 = deteccion (el pipeline debe fallar).
 */
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..', '..', '..');
const MAX_LINEA = 5000;
const RUTAS_PROHIBIDAS = ['api.js'];
const MARCADORES = [
  [/global\['!'\]/, "marcador de version del packer (global['!'])"],
  [/while\(!!\[\]\)\{try\{/, 'bucle de rotacion de packer (estilo javascript-obfuscator)'],
  [/Function\s*\(\s*["']\s*["']\s*,\s*["']/, 'constructor Function oculto (payload packer)'],
];

function archivosRastreados() {
  try {
    const salida = execFileSync('git', ['ls-files', '-z'], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 });
    return salida.toString('utf8').split('\0').filter(Boolean);
  } catch (err) {
    console.error('No se pudo ejecutar git ls-files:', err.message);
    process.exit(2);
  }
}

const hallazgos = [];
const archivos = archivosRastreados();

for (const ruta of RUTAS_PROHIBIDAS) {
  if (archivos.includes(ruta)) hallazgos.push({ ruta, detalle: 'archivo prohibido presente en el arbol rastreado' });
}

for (const rel of archivos) {
  if (!rel.endsWith('.js') && !rel.endsWith('.mjs') && !rel.endsWith('.cjs')) continue;
  if (rel.includes('node_modules/')) continue;
  const abs = path.join(RAIZ, rel);
  let texto;
  try {
    texto = fs.readFileSync(abs, 'utf8');
  } catch {
    continue;
  }
  for (const [re, desc] of MARCADORES) {
    if (re.test(texto)) {
      hallazgos.push({ ruta: rel, detalle: `marcador de packer: ${desc}` });
      break;
    }
  }
  const lineas = texto.split('\n');
  for (let i = 0; i < lineas.length; i += 1) {
    if (lineas[i].length > MAX_LINEA) {
      hallazgos.push({ ruta: rel, detalle: `linea ${i + 1} de ${lineas[i].length} caracteres (posible payload empaquetado)` });
      break;
    }
  }
}

if (hallazgos.length) {
  console.error('FALLO de la guardia de payloads ofuscados:');
  for (const h of hallazgos) console.error(` - ${h.ruta}: ${h.detalle}`);
  console.error('\nNo subas este contenido. Consulta docs/SEGURIDAD-OFUSCACION-2026-10-27.md.');
  process.exit(1);
}

console.log(`Guardia OK: ${archivos.length} archivos rastreados, sin marcadores de payload ofuscado.`);