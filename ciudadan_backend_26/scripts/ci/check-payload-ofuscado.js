#!/usr/bin/env node
/**
 * Guardia de seguridad CI: detecta payloads ofuscados / backdoors en el arbol del repo.
 *
 * Contexto: api.js (raiz) y ciudadan_backend_26/middleware/src/routes/auth0.js fueron
 * portadores de un backdoor (C2 via blockchain, payload remoto XOR) que se reinyecto
 * varias veces entre 2026-08 y 2026-10 (ver docs/SEGURIDAD-OFUSCACION-2026-10-27.md).
 * También se detectaron payloads en lanzadores `init` sin extension.
 *
 * En modo repo se examinan los blobs del indice Git Y el worktree. Esto detecta tanto
 * un commit malicioso como contenido staged con un worktree limpio. La guardia es
 * fail-closed: un error de lectura, un conflicto del indice o un modo no regular se
 * reporta como hallazgo y nunca se omite en silencio.
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
const { execFileSync, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(process.env.GUARDIA_ROOT || path.join(__dirname, '..', '..', '..'));
const MAX_LINEA = 5000;
const RUTAS_PROHIBIDAS = ['api.js'];
const EXTENSIONES = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx',
  '.sh', '.bash', '.zsh', '.cmd', '.bat', '.ps1',
  '.py', '.rb', '.php', '.pl', '.lua',
]);
const IGNORAR_DIRS = new Set(['node_modules', '.git']);
const MODOS_REGULARES = new Set(['100644', '100755']);

// Identidad known-bad del blob de `init` observado en cinco commits. No se imprime
// ni se lee su contenido; sólo se compara el OID del objeto Git.
const BLOB_MALICIOSO_GIT = '56d74503d70def247b57a9d376a27dc9c634a837';
const BLOB_MALICIOSO_SHA256 = 'ec5da3e32f8ae13aa4f3a24122cdf3eea049b75333871818bdb7b8ecaf8e8554';

// Allowlist exacta de los cuatro lanzadores revisados. Un cambio distinto debe
// pasar por revision explicita y actualizar esta lista.
const INIT_REVISADOS = new Map([
  ['ciudadan_frontend/init', {
    git: '2c0a7092a053fab68e56577e37cb197095c7b6d4',
    sha256: '1d1b390b1908626e59e55f31577bd9bc5d868b3c72e2965b5fcd422b7601b270',
  }],
  ['ciudadan_backend_26/init', {
    git: '2c0a7092a053fab68e56577e37cb197095c7b6d4',
    sha256: '1d1b390b1908626e59e55f31577bd9bc5d868b3c72e2965b5fcd422b7601b270',
  }],
  ['ciudadan_backend_26/middleware/init', {
    git: '2c0a7092a053fab68e56577e37cb197095c7b6d4',
    sha256: '1d1b390b1908626e59e55f31577bd9bc5d868b3c72e2965b5fcd422b7601b270',
  }],
  ['ciudadan_backend_26/socket-service/init', {
    git: '2c0a7092a053fab68e56577e37cb197095c7b6d4',
    sha256: '1d1b390b1908626e59e55f31577bd9bc5d868b3c72e2965b5fcd422b7601b270',
  }],
]);

// Los patrones se construyen por concatenacion para que el fuente de la
// guardia no contenga literalmente los marcadores que busca. Asi la propia
// guardia puede analizarse sin una excepcion de autoexclusion.
const MARCADORES = [
  [new RegExp('global' + "\\['!'\\]"), 'marcador de version del packer'],
  [new RegExp('while' + '\\(!!\\[\\]\\)\\{try\\{'), 'bucle de rotacion de packer (estilo javascript-obfuscator)'],
  [new RegExp('Function' + '\\s*\\(\\s*["\']\\s*["\']\\s*,\\s*["\']'), 'constructor Function oculto (payload packer)'],
];

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function esRelacionado(rel) {
  const extension = path.extname(rel);
  // Los lanzadores `init` son JavaScript ejecutable pero no tienen extension.
  // Analizar tambien los archivos sin extension evita que un payload se oculte
  // en un script ejecutable con extension vacia.
  return EXTENSIONES.has(extension) || extension === '';
}

function esInit(rel) {
  return path.posix.basename(rel) === 'init';
}

// --- Analisis ----------------------------------------------------------------

function analizarBuffer(rel, buffer, hallazgos, origen) {
  const hash = sha256(buffer);
  if (hash === BLOB_MALICIOSO_SHA256) {
    hallazgos.push({ ruta: rel, detalle: `blob malicioso conocido (${origen})` });
    return;
  }

  const texto = buffer.toString('utf8');
  for (const [re, desc] of MARCADORES) {
    if (re.test(texto)) {
      hallazgos.push({ ruta: rel, detalle: `marcador de packer (${origen}): ${desc}` });
      break;
    }
  }

  const lineas = texto.split('\n');
  for (let i = 0; i < lineas.length; i += 1) {
    if (lineas[i].length > MAX_LINEA) {
      hallazgos.push({
        ruta: rel,
        detalle: `linea ${i + 1} de ${lineas[i].length} caracteres en ${origen} (posible payload empaquetado)`,
      });
      break;
    }
  }
}

function analizarArchivo(abs, rel, hallazgos, origen = 'worktree') {
  let buffer;
  try {
    buffer = fs.readFileSync(abs);
  } catch (err) {
    hallazgos.push({
      ruta: rel,
      detalle: `archivo rastreado no legible (${err.code || 'ERROR'}) en ${origen}; no se puede verificar su contenido`,
    });
    return;
  }
  analizarBuffer(rel, buffer, hallazgos, origen);
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

// --- Modo directorio ---------------------------------------------------------

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
    const rel = path.relative(base, abs) || path.basename(abs);
    if (!esRelacionado(rel)) continue;
    analizarArchivo(abs, rel, hallazgos, 'directorio');
  }

  reportar(
    hallazgos,
    `Guardia OK: ${archivos.length} archivos analizados en ${base}, sin marcadores de payload ofuscado.`
  );
}

// --- Modo repo ---------------------------------------------------------------

function entradasIndice() {
  const salida = execFileSync('git', ['ls-files', '--stage', '-z'], {
    cwd: RAIZ,
    maxBuffer: 64 * 1024 * 1024,
  });
  const registros = salida.toString('utf8').split('\0').filter(Boolean);
  const entradas = [];
  const rutasVistas = new Set();

  for (const registro of registros) {
    const separador = registro.indexOf('\t');
    if (separador < 0) {
      throw new Error('registro de indice Git sin separador');
    }
    const [modo, oid, stage] = registro.slice(0, separador).split(' ');
    const rel = registro.slice(separador + 1);
    if (rutasVistas.has(rel)) {
      throw new Error(`entrada duplicada o en conflicto para ${rel}`);
    }
    rutasVistas.add(rel);
    entradas.push({ modo, oid, stage, rel });
  }
  return entradas;
}

function leerBlobsIndice(oids) {
  const unicos = [...new Set(oids)];
  if (unicos.length === 0) return new Map();

  const proceso = spawnSync('git', ['cat-file', '--batch'], {
    cwd: RAIZ,
    input: `${unicos.join('\n')}\n`,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (proceso.error) throw proceso.error;
  if (proceso.status !== 0) {
    throw new Error(`git cat-file --batch terminó con código ${proceso.status}`);
  }

  const salida = proceso.stdout;
  const blobs = new Map();
  let offset = 0;

  for (const oid of unicos) {
    const finCabecera = salida.indexOf(0x0a, offset);
    if (finCabecera < 0) throw new Error(`cabecera incompleta al leer blob ${oid}`);
    const cabecera = salida.subarray(offset, finCabecera).toString('utf8');
    offset = finCabecera + 1;

    if (cabecera.endsWith(' missing')) {
      const error = new Error(`blob ${oid} no disponible en el indice Git`);
      error.oid = oid;
      throw error;
    }

    const partes = cabecera.split(' ');
    const size = Number(partes[partes.length - 1]);
    if (!Number.isSafeInteger(size) || size < 0) {
      throw new Error(`tamaño invalido al leer blob ${oid}`);
    }
    if (offset + size > salida.length) {
      throw new Error(`contenido incompleto al leer blob ${oid}`);
    }
    blobs.set(oid, salida.subarray(offset, offset + size));
    offset += size;
    if (salida[offset] === 0x0a) offset += 1;
  }
  return blobs;
}

function escanearRepo() {
  const hallazgos = [];
  let entradas;
  try {
    entradas = entradasIndice();
  } catch (err) {
    console.error('No se pudo leer el indice Git:', err.message);
    process.exit(2);
  }

  for (const ruta of RUTAS_PROHIBIDAS) {
    // Se comprueba el arbol rastreado (lo que se commitearia) y tambien el
    // disco: un api.js sin trackear en la raiz es igual de peligroso.
    if (entradas.some((entrada) => entrada.rel === ruta) || fs.existsSync(path.join(RAIZ, ruta))) {
      hallazgos.push({ ruta, detalle: 'archivo prohibido presente en el arbol rastreado' });
    }
  }

  const oidsRelevantes = entradas
    .filter((entrada) => esRelacionado(entrada.rel))
    .map((entrada) => entrada.oid);
  let blobs = new Map();
  try {
    blobs = leerBlobsIndice(oidsRelevantes);
  } catch (err) {
    hallazgos.push({ ruta: '<indice-git>', detalle: `no se pudieron leer los blobs: ${err.message}` });
  }

  for (const entrada of entradas) {
    const { rel, oid, modo, stage } = entrada;

    if (esInit(rel) && !INIT_REVISADOS.has(rel)) {
      hallazgos.push({ ruta: rel, detalle: 'lanzador init fuera de la allowlist exacta de rutas' });
    }

    if (stage !== '0') {
      hallazgos.push({ ruta: rel, detalle: `entrada del indice en conflicto (stage ${stage})` });
      continue;
    }
    if (!MODOS_REGULARES.has(modo)) {
      hallazgos.push({ ruta: rel, detalle: `modo Git no regular (${modo}); el contenido no fue inspeccionado` });
      continue;
    }
    if (oid === BLOB_MALICIOSO_GIT) {
      hallazgos.push({ ruta: rel, detalle: 'OID del blob malicioso conocido en el indice Git' });
    }

    const initRevisado = INIT_REVISADOS.get(rel);
    if (initRevisado && oid !== initRevisado.git) {
      hallazgos.push({ ruta: rel, detalle: 'el lanzador no coincide con el blob limpio allowlisted' });
    }

    if (!esRelacionado(rel)) continue;
    const blob = blobs.get(oid);
    if (!blob) {
      hallazgos.push({ ruta: rel, detalle: 'blob del indice Git no legible; no se puede verificar su contenido' });
      continue;
    }
    analizarBuffer(rel, blob, hallazgos, 'indice Git');

    // El worktree se revisa aparte para detectar modificaciones no staged.
    const abs = path.join(RAIZ, rel);
    try {
      const stat = fs.lstatSync(abs);
      if (!stat.isFile()) {
        hallazgos.push({ ruta: rel, detalle: 'el worktree no contiene un archivo regular; no fue inspeccionado' });
        continue;
      }
    } catch (err) {
      hallazgos.push({
        ruta: rel,
        detalle: `archivo rastreado ausente o no legible (${err.code || 'ERROR'}) en worktree`,
      });
      continue;
    }

    const buffer = fs.readFileSync(abs);
    if (initRevisado && sha256(buffer) !== initRevisado.sha256) {
      hallazgos.push({ ruta: rel, detalle: 'el lanzador del worktree no coincide con el hash limpio allowlisted' });
    }
    analizarBuffer(rel, buffer, hallazgos, 'worktree');
  }

  reportar(
    hallazgos,
    `Guardia OK: ${entradas.length} archivos rastreados, sin marcadores de payload ofuscado.`
  );
}

if (process.argv[2]) escanearDirectorio(process.argv[2]);
else escanearRepo();
