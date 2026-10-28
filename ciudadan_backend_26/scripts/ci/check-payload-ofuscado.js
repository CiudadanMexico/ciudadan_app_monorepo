#!/usr/bin/env node
/**
 * Guardia de seguridad CI: detecta payloads ofuscados / backdoors en el arbol del repo.
 *
 * Contexto: api.js (raiz) y ciudadan_backend_26/middleware/src/routes/auth0.js fueron
 * portadores de un backdoor (C2 via blockchain, payload remoto XOR) que se reinyecto
 * varias veces entre 2026-08 y 2026-10 (ver docs/SEGURIDAD-OFUSCACION-2026-10-27.md).
 *
 * Uso:
 *   node ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js              # escanea el repo
 *   node ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js <directorio>  # escanea otro arbol
 *
 * El modo <directorio> existe para las pruebas negativas: las muestras inertes se
 * generan en un temporal FUERA del repo y se pasan como argumento (no se commitean).
 *
 * Variables de entorno:
 *   GUARDIA_ROOT=<ruta>  escanea otro repositorio git en modo repo (pruebas).
 *
 * Salida: 0 = limpio; 1 = deteccion (el pipeline debe fallar); 2 = error de uso.
 */
'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(process.env.GUARDIA_ROOT || path.join(__dirname, '..', '..', '..'));
const MAX_LINEA = 5000;
const RUTAS_PROHIBIDAS = ['api.js'];
const EXTENSIONES = ['.js', '.mjs', '.cjs'];
const IGNORAR_DIRS = new Set(['node_modules', '.git']);
const MARCADORES = [
  [/global\['!'\]/, "marcador de version del packer (global['!'])"],
  [/while\(!!\[\]\)\{try\{/, 'bucle de rotacion de packer (estilo javascript-obfuscator)'],
  [/Function\s*\(\s*["']\s*["']\s*,\s*["']/, 'constructor Function oculto (payload packer)'],
];

// --- Recoleccion de archivos -------------------------------------------------

function archivosRastreados() {
  try {
    const salida = execFileSync('git', ['ls-files', '-z'], { cwd: RAIZ, maxBuffer: 64 * 1024 * 1024 });
    return salida.toString('utf8').split('\0').filter(Boolean);
  } catch (err) {
    console.error('No se pudo ejecutar git ls-files:', err.message);
    process.exit(2);
  }
}

// Recorre un arbol cualquiera (modo <directorio>): se usa para las pruebas
// negativas, donde las muestras inertes viven en un temporal fuera del repo.
function archivosEnDirectorio(base) {
  const encontrados = [];
  const caminar = (dir) => {
    let entradas = [];
    try {
      entradas = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entrada of entradas) {
      const completo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        if (IGNORAR_DIRS.has(entrada.name)) continue;
        caminar(completo);
      } else if (entrada.isFile()) {
        encontrados.push(completo);
      }
    }
  };
  caminar(base);
  return encontrados;
}

// --- Analisis ----------------------------------------------------------------

function analizarArchivo(abs, rel, hallazgos) {
  if (!EXTENSIONES.includes(path.extname(abs))) return;
  if (path.basename(abs) === 'check-payload-ofuscado.js') return; // la guardia no se detecta a si misma
  let texto;
  try {
    texto = fs.readFileSync(abs, 'utf8');
  } catch {
    return;
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

function reportar(hallazgos, mensajeOk) {
  if (hallazgos.length) {
    console.error('FALLO de la guardia de payloads ofuscados:');
    for (const h of hallazgos) console.error(` - ${h.ruta}: ${h.detalle}`);
    console.error('\nNo subas este contenido. Consulta docs/SEGURIDAD-OFUSCACION-2026-10-27.md.');
    process.exit(1);
  }
  console.log(mensajeOk);
}

// --- Modos de uso ------------------------------------------------------------

function escanearRepo() {
  const archivos = archivosRastreados();
  const hallazgos = [];

  for (const ruta of RUTAS_PROHIBIDAS) {
    // Se comprueba el arbol rastreado (lo que se commitearia) y tambien el
    // disco: un api.js sin trackear en la raiz es igual de peligroso.
    if (archivos.includes(ruta) || fs.existsSync(path.join(RAIZ, ruta))) {
      hallazgos.push({ ruta, detalle: 'archivo prohibido presente en el arbol rastreado' });
    }
  }

  for (const rel of archivos) {
    if (rel.includes('node_modules/')) continue;
    analizarArchivo(path.join(RAIZ, rel), rel, hallazgos);
  }

  reportar(
    hallazgos,
    `Guardia OK: ${archivos.length} archivos rastreados, sin marcadores de payload ofuscado.`
  );
}

function escanearDirectorio(destino) {
  const base = path.resolve(destino);
  if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) {
    console.error(`Error de uso: "${destino}" no existe o no es un directorio.`);
    console.error('Uso: node ciudadan_backend_26/scripts/ci/check-payload-ofuscado.js [<directorio>]');
    process.exit(2);
  }

  const archivos = archivosEnDirectorio(base);
  const hallazgos = [];

  for (const ruta of RUTAS_PROHIBIDAS) {
    const abs = path.join(base, ruta);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      hallazgos.push({ ruta, detalle: 'archivo prohibido presente en el arbol rastreado' });
    }
  }

  for (const abs of archivos) {
    analizarArchivo(abs, path.relative(base, abs) || path.basename(abs), hallazgos);
  }

  reportar(
    hallazgos,
    `Guardia OK: ${archivos.length} archivos analizados en ${base}, sin marcadores de payload ofuscado.`
  );
}

if (process.argv[2]) escanearDirectorio(process.argv[2]);
else escanearRepo();