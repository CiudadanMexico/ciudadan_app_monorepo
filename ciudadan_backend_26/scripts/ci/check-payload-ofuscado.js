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
 * Salida: 0 = limpio; 1 = deteccion (el pipeline debe fallar); 2 = error de uso/lectura.
 */
'use strict';
const { execFileSync, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ_CANONICA = path.resolve(__dirname, '..', '..', '..');
const RAIZ = path.resolve(process.env.GUARDIA_ROOT || RAIZ_CANONICA);
const ES_REPO_CANONICO = path.resolve(RAIZ) === RAIZ_CANONICA;
const MAX_LINEA_BYTES = 5000;

// Formatos que pueden contener o ejecutar JavaScript, shell, configuracion activa
// o markup con script. La extension se normaliza a minusculas para no evadir el
// scanner usando `.JS`, `.Json`, etc.
const EXTENSIONES = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx',
  '.sh', '.bash', '.zsh', '.cmd', '.bat', '.ps1',
  '.py', '.rb', '.php', '.pl', '.lua',
  '.json', '.json5', '.yml', '.yaml', '.html', '.htm', '.xml',
  '.css', '.scss', '.sass', '.less', '.java', '.gradle',
  '.properties', '.toml', '.config', '.env', '.vue', '.svelte',
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

// Datos JSON legitimos minificados que ya tienen una linea mayor a 5 KB. Se
// permiten solo por ruta + SHA-256 exacto; cualquier cambio debe pasar por review.
const ARCHIVOS_LINEA_LARGA_PERMITIDOS = new Map([
  ['ciudadan_frontend/src/data/geo/mx/states.geo.json', '20fcfae406e10945c3a692b6f6272d5edabaa789530d3c080cd0af73d69f5ef7'],
  ['ciudadan_frontend/public/al.json', '81ca8e096c8d9204eb48a64113c6029766dab3232f2ce13f7145821be4f6d326'],
  ['ciudadan_frontend/public/dos.json', '49316211cf2d1fd212e5c03f34d453c68d597c35165f1e3c0b3efb7595ca8861'],
  ['ciudadan_frontend/public/editado.json', '742965d02ab6d5fd365dc6f1d092ae39b7ca59ea4d019329417d49dce2d36d80'],
  ['ciudadan_frontend/public/editadote.json', 'ed87ab945126ba9ad05c40a63356c02bf99a80ce0167e9e528575d678b48e5de'],
  ['ciudadan_frontend/public/iii.json', '10fdab76c34c522f3f6730fe9222ce562cd828c1abf10814a8be8d482bdf80d5'],
  ['ciudadan_frontend/public/iiii.json', '93a69c13e277135beb180c60e06dab6c0086222a176502ccb96d442c63e327da'],
  ['ciudadan_frontend/public/initialPattern.json', '49316211cf2d1fd212e5c03f34d453c68d597c35165f1e3c0b3efb7595ca8861'],
  ['ciudadan_frontend/public/o.json', '52e59aafb275db4d6983b2b39d246c4d20892c02334c19b1d58182b43f151cf3'],
  ['ciudadan_frontend/public/para.json', '4272dce7838613fc4881449bd3f87591bf286e134f6b682fed82fc96101ebc12'],
  ['ciudadan_frontend/public/random.json', '742965d02ab6d5fd365dc6f1d092ae39b7ca59ea4d019329417d49dce2d36d80'],
  ['ciudadan_frontend/public/randomize.json', '742965d02ab6d5fd365dc6f1d092ae39b7ca59ea4d019329417d49dce2d36d80'],
]);

// Los patrones se construyen por concatenacion para que el fuente de la
// guardia no contenga literalmente los marcadores que busca. Asi la propia
// guardia puede analizarse sin una excepcion de autoexclusion.
const MARCADORES = [
  [new RegExp('global' + "\\s*\\[\\s*['\"]!['\"]\\s*\\]"), 'marcador de version del packer'],
  [new RegExp('while' + '\\s*\\(\\s*!!\\s*\\[\\s*\\]\\s*\\)\\s*\\{\\s*try\\s*\\{'), 'bucle de rotacion de packer (estilo javascript-obfuscator)'],
  [new RegExp('Function' + '\\s*\\(\\s*["\']\\s*["\']\\s*,\\s*["\']'), 'constructor Function oculto (payload packer)'],
];

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sha256LineasNormalizadas(buffer) {
  return sha256(Buffer.from(buffer.toString('utf8').replace(/\r\n/g, '\n'), 'utf8'));
}

function rutaPosix(rel) {
  return rel.split(path.sep).join('/');
}

function extensionNormalizada(rel) {
  return path.posix.extname(rutaPosix(rel)).toLowerCase();
}

function esRelacionado(rel) {
  const extension = extensionNormalizada(rel);
  // Los lanzadores `init` son JavaScript ejecutable pero no tienen extension.
  // Analizar tambien los archivos sin extension evita que un payload se oculte
  // en un script ejecutable con extension vacia.
  return EXTENSIONES.has(extension) || extension === '';
}

function esInit(rel) {
  return path.posix.basename(rutaPosix(rel)).toLowerCase() === 'init';
}

function esApiProhibida(rel) {
  const posix = rutaPosix(rel);
  return posix.includes('/') === false && posix.toLowerCase() === 'api.js';
}

// --- Analisis ----------------------------------------------------------------

function analizarBuffer(rel, buffer, hallazgos, origen, hashesDenegados = new Set([BLOB_MALICIOSO_SHA256])) {
  const hash = sha256(buffer);
  if (hashesDenegados.has(hash)) {
    hallazgos.push({ ruta: rel, detalle: `blob malicioso conocido (${origen})` });
    return hash;
  }

  if (!esRelacionado(rel)) return hash;

  const texto = buffer.toString('utf8');
  for (const [re, desc] of MARCADORES) {
    if (re.test(texto)) {
      hallazgos.push({ ruta: rel, detalle: `marcador de packer (${origen}): ${desc}` });
      break;
    }
  }

  // La longitud se mide en bytes, no en unidades UTF-16. Se cuentan CR como
  // parte de la linea para que la deteccion sea independiente de la plataforma.
  const hashNormalizado = sha256LineasNormalizadas(buffer);
  const permitido = ARCHIVOS_LINEA_LARGA_PERMITIDOS.get(rutaPosix(rel)) === hashNormalizado;
  if (!permitido) {
    let inicio = 0;
    let numero = 1;
    for (let i = 0; i <= buffer.length; i += 1) {
      if (i === buffer.length || buffer[i] === 0x0a) {
        const longitud = i - inicio;
        if (longitud > MAX_LINEA_BYTES) {
          hallazgos.push({
            ruta: rel,
            detalle: `linea ${numero} de ${longitud} bytes en ${origen} (posible payload empaquetado)`,
          });
          break;
        }
        inicio = i + 1;
        numero += 1;
      }
    }
  }
  return hash;
}

function firmaStat(stat) {
  return [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs].join(':');
}

function leerArchivoSeguro(abs, rel, hallazgos, origen = 'worktree') {
  let descriptor = null;
  try {
    const enlace = fs.lstatSync(abs);
    if (!enlace.isFile()) {
      hallazgos.push({ ruta: rel, detalle: `el worktree no contiene un archivo regular; no fue inspeccionado (${origen})` });
      return null;
    }

    descriptor = fs.openSync(abs, 'r');
    const antes = fs.fstatSync(descriptor);
    if (!antes.isFile()) {
      hallazgos.push({ ruta: rel, detalle: `el descriptor no corresponde a un archivo regular (${origen})` });
      return null;
    }
    const buffer = fs.readFileSync(descriptor);
    const despues = fs.fstatSync(descriptor);
    if (firmaStat(antes) !== firmaStat(despues) || buffer.length !== antes.size) {
      hallazgos.push({ ruta: rel, detalle: `el archivo cambió durante la lectura (${origen}); no se puede verificar de forma consistente` });
      return null;
    }
    return { buffer, firma: firmaStat(despues) };
  } catch (err) {
    hallazgos.push({
      ruta: rel,
      detalle: `archivo rastreado no legible (${err.code || 'ERROR'}) en ${origen}; no se puede verificar su contenido`,
    });
    return null;
  } finally {
    if (descriptor !== null) {
      try { fs.closeSync(descriptor); } catch { /* el hallazgo de lectura ya es fail-closed */ }
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

// --- Modo directorio ---------------------------------------------------------

// Recorre un arbol cualquiera (modo <directorio>): se usa para las pruebas
// negativas, donde las muestras inertes viven en un temporal fuera del repo.
function archivosEnDirectorio(base) {
  const encontrados = [];
  const caminar = (dir) => {
    let entradas;
    try {
      entradas = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      throw new Error(`no se pudo leer el directorio ${dir}: ${err.code || err.message}`);
    }
    for (const entrada of entradas) {
      const completo = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        if (IGNORAR_DIRS.has(entrada.name)) continue;
        caminar(completo);
      } else if (entrada.isFile()) {
        encontrados.push(completo);
      } else {
        throw new Error(`se encontro una entrada no regular en ${completo}`);
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

  let archivos;
  try {
    archivos = archivosEnDirectorio(base);
  } catch (err) {
    console.error(`No se pudo recorrer el arbol de forma completa: ${err.message}`);
    process.exit(2);
  }

  const hallazgos = [];

  for (const abs of archivos) {
    const rel = rutaPosix(path.relative(base, abs) || path.basename(abs));
    if (esApiProhibida(rel)) {
      hallazgos.push({ ruta: rel, detalle: 'archivo prohibido presente en el arbol rastreado' });
    }
    const lectura = leerArchivoSeguro(abs, rel, hallazgos, 'directorio');
    if (!lectura) continue;
    analizarBuffer(rel, lectura.buffer, hallazgos, 'directorio');
  }

  reportar(
    hallazgos,
    `Guardia OK: ${archivos.length} archivos analizados en ${base}, sin marcadores de payload ofuscado.`
  );
}

// --- Modo repo ---------------------------------------------------------------

function indiceBruto() {
  return execFileSync('git', ['ls-files', '--stage', '-z'], {
    cwd: RAIZ,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function entradasIndice(bruto) {
  const registros = bruto.toString('utf8').split('\0').filter(Boolean);
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
    // El repo contiene ~200 MB de blobs; el limite deja margen para cabeceras.
    maxBuffer: 384 * 1024 * 1024,
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
    const tipo = partes[1];
    const size = Number(partes[2]);
    if (tipo !== 'blob' || !Number.isSafeInteger(size) || size < 0) {
      throw new Error(`cabecera invalida al leer blob ${oid}`);
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

function archivosNoRastreados() {
  const salida = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
    cwd: RAIZ,
    maxBuffer: 64 * 1024 * 1024,
  });
  return salida.toString('utf8').split('\0').filter(Boolean);
}

function escanearRepo() {
  const hallazgos = [];
  let brutoInicial;
  let entradas;
  try {
    brutoInicial = indiceBruto();
    entradas = entradasIndice(brutoInicial);
  } catch (err) {
    console.error('No se pudo leer el indice Git:', err.message);
    process.exit(2);
  }

  const firmasWorktree = new Map();
  const rutasIndice = new Set(entradas.map((entrada) => entrada.rel));

  for (const entrada of entradas) {
    if (esApiProhibida(entrada.rel)) {
      hallazgos.push({ ruta: entrada.rel, detalle: 'archivo prohibido presente en el arbol rastreado' });
    }
    if (esInit(entrada.rel) && !INIT_REVISADOS.has(entrada.rel)) {
      hallazgos.push({ ruta: entrada.rel, detalle: 'lanzador init fuera de la allowlist exacta de rutas' });
    }
  }

  // En el repositorio canonico los cuatro lanzadores deben existir; no basta con
  // que un atacante borre uno para evitar la comparacion de allowlist.
  if (ES_REPO_CANONICO) {
    for (const rel of INIT_REVISADOS.keys()) {
      if (!rutasIndice.has(rel)) {
        hallazgos.push({ ruta: rel, detalle: 'lanzador allowlisted ausente del indice Git' });
      }
    }
  }

  const entradasRegulares = entradas.filter((entrada) => MODOS_REGULARES.has(entrada.modo));
  let blobs = new Map();
  try {
    blobs = leerBlobsIndice(entradasRegulares.map((entrada) => entrada.oid));
  } catch (err) {
    hallazgos.push({ ruta: '<indice-git>', detalle: `no se pudieron leer los blobs: ${err.message}` });
  }

  for (const entrada of entradas) {
    const { rel, oid, modo, stage } = entrada;

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

    const blob = blobs.get(oid);
    if (!blob) {
      hallazgos.push({ ruta: rel, detalle: 'blob del indice Git no legible; no se puede verificar su contenido' });
      continue;
    }
    const hashIndice = analizarBuffer(rel, blob, hallazgos, 'indice Git');
    if (initRevisado && hashIndice !== initRevisado.sha256) {
      hallazgos.push({ ruta: rel, detalle: 'el SHA-256 del blob del indice no coincide con el allowlist limpio' });
    }

    // El worktree se revisa aparte para detectar modificaciones no staged.
    const abs = path.join(RAIZ, rel);
    const lectura = leerArchivoSeguro(abs, rel, hallazgos, 'worktree');
    if (!lectura) continue;
    firmasWorktree.set(rel, lectura.firma);
    const hashWorktree = analizarBuffer(rel, lectura.buffer, hallazgos, 'worktree');
    if (initRevisado && hashWorktree !== initRevisado.sha256) {
      hallazgos.push({ ruta: rel, detalle: 'el lanzador del worktree no coincide con el hash limpio allowlisted' });
    }
  }

  // Los archivos no rastreados no forman parte de un commit, pero pueden ser
  // ejecutados por npm scripts o runners locales. Se inspeccionan igual.
  let noRastreados = [];
  try {
    noRastreados = archivosNoRastreados();
  } catch (err) {
    hallazgos.push({ ruta: '<worktree>', detalle: `no se pudo listar los archivos no rastreados: ${err.message}` });
  }
  for (const rel of noRastreados) {
    if (esApiProhibida(rel)) {
      hallazgos.push({ ruta: rel, detalle: 'archivo prohibido presente en el worktree' });
    }
    if (esInit(rel) && !INIT_REVISADOS.has(rel)) {
      hallazgos.push({ ruta: rel, detalle: 'lanzador init no rastreado fuera de la allowlist exacta de rutas' });
    }
    const abs = path.join(RAIZ, rel);
    const lectura = leerArchivoSeguro(abs, rel, hallazgos, 'worktree no rastreado');
    if (!lectura) continue;
    firmasWorktree.set(rel, lectura.firma);
    analizarBuffer(rel, lectura.buffer, hallazgos, 'worktree no rastreado');
  }

  // Snapshot check: el indice no debe cambiar mientras se analiza. Del mismo
  // modo, cada archivo regular revisado conserva la misma firma stat al final.
  try {
    const brutoFinal = indiceBruto();
    if (!crypto.timingSafeEqual(crypto.createHash('sha256').update(brutoInicial).digest(), crypto.createHash('sha256').update(brutoFinal).digest())) {
      hallazgos.push({ ruta: '<indice-git>', detalle: 'el indice Git cambió durante el escaneo; resultado no confiable' });
    }
  } catch (err) {
    hallazgos.push({ ruta: '<indice-git>', detalle: `no se pudo revalidar el indice Git: ${err.message}` });
  }
  for (const [rel, firma] of firmasWorktree) {
    try {
      const actual = fs.lstatSync(path.join(RAIZ, rel));
      if (!actual.isFile() || firmaStat(actual) !== firma) {
        hallazgos.push({ ruta: rel, detalle: 'el archivo cambió después de ser inspeccionado; resultado no confiable' });
      }
    } catch (err) {
      hallazgos.push({ ruta: rel, detalle: `el archivo desapareció o dejó de ser legible tras la inspección: ${err.code || 'ERROR'}` });
    }
  }

  reportar(
    hallazgos,
    `Guardia OK: ${entradas.length} archivos rastreados y ${noRastreados.length} no rastreados, sin marcadores de payload ofuscado.`
  );
}

if (process.argv[2]) escanearDirectorio(process.argv[2]);
else escanearRepo();
