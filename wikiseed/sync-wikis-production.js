'use strict';

/**
 * Envoltura de producción para `wikiseed/sync-wikis.js`.
 *
 * El script base resuelve correctamente el destino y mantiene la semántica
 * idempotente (SHA-256, nunca borra), pero su indexador espera encontrar
 * `wikiseed/` y `ciudadan_backend_26/socket-service/` como hermanos en un
 * checkout del monorepo. En un release de producción el layout es diferente:
 *
 *   <release>/wikiseed/
 *   <release>/ciudadan_backend_26/socket-service/
 *
 * Esta envoltura NO duplica la lógica de copia: reutiliza `main()` del script
 * base y sólo proporciona el indexador compatible con el layout del release.
 *
 * Uso:
 *   node wikiseed/sync-wikis-production.js [--dry-run] [--force]
 *
 * Variables opcionales:
 *   WIKI_SYNC_EXPECTED_MAIN / WIKI_SYNC_EXPECTED_HELP / WIKI_SYNC_EXPECTED_FAQ
 *     Conteos esperados para el gate post-sync. Si se define alguno, deben
 *     estarlo los tres; 0 desactiva ese conteo.
 *   WIKI_SYNC_VERIFY_COUNTS=main:2,help:32,faq:1
 *     Conteos esperados tomados del propio paquete en el release. Este es el
 *     modo recomendado en CI: el gate no depende de una constante manual.
 *
 * La ruta canónica se resuelve con la misma precedencia que el socket-service
 * (Strapi → `WIKI_ROOT_PATH` → default). `WIKI_ROOT_PATH` sólo actúa como
 * fallback si Strapi no está disponible durante la ejecución.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const baseSync = require('./sync-wikis');

const SECTIONS = baseSync.SECTIONS;
const RELEASE_ROOT = path.resolve(__dirname, '..');
const SOCKET_DIR = path.join(RELEASE_ROOT, 'ciudadan_backend_26', 'socket-service');
const DIST_DIR = path.join(SOCKET_DIR, 'dist');

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function listarMd(dir) {
  const salida = [];
  const caminar = (actual) => {
    if (!fs.existsSync(actual)) return;
    for (const entry of fs.readdirSync(actual, { withFileTypes: true })) {
      const completo = path.join(actual, entry.name);
      if (entry.isDirectory()) caminar(completo);
      else if (entry.isFile() && entry.name.endsWith('.md')) {
        salida.push(path.relative(dir, completo).split(path.sep).join('/'));
      }
    }
  };
  caminar(dir);
  return salida.sort();
}

/**
 * Comprueba el binding better-sqlite3 en un hijo desechable. Si el runtime no
 * es compatible, aborta antes de que el proceso principal lo use (evita el
 * SIGSEGV histórico de better-sqlite3 v13 con Node < 22).
 */
function comprobarAbiDriver() {
  const driverDir = path.join(SOCKET_DIR, 'node_modules', 'better-sqlite3');
  if (!fs.existsSync(driverDir)) {
    return { ok: false, motivo: 'sin-better-sqlite3' };
  }

  const major = Number(process.versions.node.split('.')[0]);
  if (major < 22) {
    return { ok: false, motivo: `abi-incompatible: Node ${process.versions.node} requiere Node >= 22` };
  }

  const fuente =
    `const D=require(${JSON.stringify(driverDir)});` +
    `const db=new D(':memory:');` +
    `db.exec('CREATE TABLE t(a)');` +
    `db.prepare('SELECT COUNT(*) n FROM t').get();` +
    `db.close();`;
  const hijo = spawnSync(process.execPath, ['-e', fuente], { timeout: 20000 });
  if (hijo.status === 0) return { ok: true, motivo: null };

  const detalle = hijo.signal ? `señal ${hijo.signal}` : `código ${hijo.status}`;
  return { ok: false, motivo: `abi-incompatible: prueba de uso murió con ${detalle}` };
}

/**
 * Indexador del release: usa el mismo WikiService.updateIndex que el watcher,
 * abre la BD persistente a través del symlink release-local y nunca reescribe
 * los .md (writeToDisk=false dentro de WikiService.updateIndex).
 */
function indexarDocumento(rutaLogica, contenido) {
  if (!fs.existsSync(DIST_DIR)) {
    return { ok: false, indexado: false, motivo: 'sin-dist' };
  }

  const abi = comprobarAbiDriver();
  if (!abi.ok) return { ok: false, indexado: false, motivo: abi.motivo };

  try {
    const cwdPrevio = process.cwd();
    process.chdir(SOCKET_DIR);
    let wikiService;
    try {
      const { ConfigDatabase } = require(path.join(DIST_DIR, 'config', 'ConfigDatabase'));
      const { DocumentRepositoryImpl } = require(path.join(
        DIST_DIR,
        'repository',
        'impl',
        'DocumentRepositoryImpl'
      ));
      const { WikiService } = require(path.join(DIST_DIR, 'services', 'WikiService'));

      const db = ConfigDatabase.getConnection();
      wikiService = new WikiService(new DocumentRepositoryImpl(db));
    } finally {
      process.chdir(cwdPrevio);
    }

    return Promise.resolve(wikiService.updateIndex(rutaLogica, contenido)).then(
      (cambiado) => ({ ok: true, indexado: Boolean(cambiado), motivo: null }),
      (err) => ({ ok: false, indexado: false, motivo: err && err.message ? err.message : String(err) })
    );
  } catch (err) {
    return {
      ok: false,
      indexado: false,
      motivo: err && err.message ? err.message : String(err),
    };
  }
}

/**
 * Abre la BD persistente del release. El proceso principal ya puede tener una
 * conexión abierta; SQLite permite varias conexiones al mismo archivo.
 */
function abrirBd() {
  const cwdPrevio = process.cwd();
  process.chdir(SOCKET_DIR);
  try {
    const { ConfigDatabase } = require(path.join(DIST_DIR, 'config', 'ConfigDatabase'));
    return ConfigDatabase.getConnection();
  } finally {
    process.chdir(cwdPrevio);
  }
}

/**
 * Verifica que un documento tenga fila en `documents` sin depender del layout
 * de producción. Se usa en pruebas unitarias con una BD SQLite temporal.
 */
function pathsIndexados(db) {
  return new Set(
    db.prepare("SELECT path FROM documents WHERE path LIKE 'wiki/%'").all().map((row) => row.path)
  );
}

/**
 * Copia los seeds al release actual, pero usa el indexador local de este
 * release. `main()` conserva su contrato: dry-run no escribe y nunca borra.
 */
async function main(argv = process.argv.slice(2), deps = {}) {
  const comprobar = deps.comprobarAbiDriver || comprobarAbiDriver;
  const abi = await comprobar();
  if (!abi.ok && !argv.includes('--dry-run')) {
    throw new Error(`No se puede indexar la wiki: ${abi.motivo}`);
  }

  const resolver = deps.resolverDestino || baseSync.resolverDestino;
  const resuelto = await resolver(process.env.STRAPI_URL || '');
  const destino = resuelto.destino;
  const stats = await baseSync.main(argv, {
    ...deps,
    exigirSeccionesCompletas: true,
    resolverDestino: async () => resuelto,
    indexarDocumento: deps.indexarDocumento || indexarDocumento,
  });
  if (!argv.includes('--dry-run') && stats.sinIndexar > 0) {
    throw new Error(
      `Falló la indexación de ${stats.sinIndexar} documento(s) en SQLite; ` +
      'la sincronización no se considera completa.'
    );
  }
  return { ...stats, destino };
}

/**
 * Verifica que todos los seeds del release estén presentes byte a byte en el
 * destino vivo y que el índice SQLite contenga cada ruta lógica.
 */
function verificar(sync = baseSync, destinoResuelto = null) {
  const destino = path.resolve(
    destinoResuelto || process.env.WIKI_ROOT_PATH || '/var/www/apps/wikis'
  );
  const faltantes = [];
  const distintos = [];
  let total = 0;

  for (const seccion of SECTIONS) {
    const origenDir = path.join(__dirname, seccion);
    for (const relativo of listarMd(origenDir)) {
      total += 1;
      const origen = path.join(origenDir, relativo);
      const destinoArchivo = path.join(destino, seccion, relativo);
      if (!fs.existsSync(destinoArchivo)) {
        faltantes.push(`${seccion}/${relativo}`);
      } else if (sha256(origen) !== sha256(destinoArchivo)) {
        distintos.push(`${seccion}/${relativo}`);
      }
    }
  }

  let indice = { total: 0, main: 0, help: 0, faq: 0 };
  let indiceFaltantes = [];
  let indexError = null;
  try {
    const abi = comprobarAbiDriver();
    if (!abi.ok) throw new Error(abi.motivo);
    const cwdPrevio = process.cwd();
    process.chdir(SOCKET_DIR);
    try {
      const db = abrirBd();
      const contar = (prefijo) => Number(
        db.prepare('SELECT COUNT(*) AS n FROM documents WHERE path LIKE ?').get(`${prefijo}%`).n
      );
      indice = {
        total: contar('wiki/'),
        main: contar('wiki/main/'),
        help: contar('wiki/help/'),
        faq: contar('wiki/faq/'),
      };

      // Verifica que cada seed tenga fila en `documents`. Comparar sólo
      // conteos no detecta un seed faltante compensado por otro documento.
      const indexados = pathsIndexados(db);
      const faltantesIndice = [];
      for (const seccion of SECTIONS) {
        for (const relativo of listarMd(path.join(__dirname, seccion))) {
          const rutaLogica = `wiki/${seccion}/${relativo}`;
          if (!indexados.has(rutaLogica)) faltantesIndice.push(rutaLogica);
        }
      }
      indiceFaltantes = faltantesIndice;
    } finally {
      process.chdir(cwdPrevio);
    }
  } catch (err) {
    indexError = err && err.message ? err.message : String(err);
  }

  const esperado = {
    main: Number(process.env.WIKI_SYNC_EXPECTED_MAIN || 0),
    help: Number(process.env.WIKI_SYNC_EXPECTED_HELP || 0),
    faq: Number(process.env.WIKI_SYNC_EXPECTED_FAQ || 0),
  };
  let esperadasDefinidas = ['WIKI_SYNC_EXPECTED_MAIN', 'WIKI_SYNC_EXPECTED_HELP', 'WIKI_SYNC_EXPECTED_FAQ']
    .every((name) => {
      const value = process.env[name];
      return value !== undefined && /^\d+$/.test(value);
    });
  const hayAlgunoEsperado = [
    'WIKI_SYNC_EXPECTED_MAIN',
    'WIKI_SYNC_EXPECTED_HELP',
    'WIKI_SYNC_EXPECTED_FAQ',
  ].some((name) => process.env[name] !== undefined);
  if (hayAlgunoEsperado && !esperadasDefinidas) {
    throw new Error(
      'Los conteos esperados de wiki deben definir main, help y faq juntos'
    );
  }

  // Gate dinámico: `WIKI_SYNC_VERIFY_COUNTS=main:2,help:32,faq:1`.
  // Tiene prioridad sobre las variables individuales.
  const conteosDinamicos = process.env.WIKI_SYNC_VERIFY_COUNTS || '';
  if (conteosDinamicos.trim()) {
    const parsed = {};
    for (const parte of conteosDinamicos.split(',')) {
      const [seccion, valor] = parte.split(':').map((item) => item.trim());
      if (!(seccion in SECTIONS) || !/^\d+$/.test(valor || '')) {
        throw new Error(`WIKI_SYNC_VERIFY_COUNTS inválido: ${conteosDinamicos}`);
      }
      parsed[seccion] = Number(valor);
    }
    if (!SECTIONS.every((seccion) => Object.prototype.hasOwnProperty.call(parsed, seccion))) {
      throw new Error(`WIKI_SYNC_VERIFY_COUNTS debe incluir main, help y faq: ${conteosDinamicos}`);
    }
    Object.assign(esperado, parsed);
    esperadasDefinidas = true;
  }

  // El índice puede conservar documentos editados en vivo que no pertenecen al
  // seed. Por eso el gate exige al menos los conteos versionados y una fila
  // para cada seed; no exige que el índice sólo contenga el seed.
  const conteosOk = !esperadasDefinidas || (
    indice.main >= esperado.main &&
    indice.help >= esperado.help &&
    indice.faq >= esperado.faq
  );

  const ok = faltantes.length === 0 &&
    distintos.length === 0 &&
    indiceFaltantes.length === 0 &&
    !indexError &&
    indice.total >= total &&
    conteosOk;

  return {
    ok,
    destino,
    total,
    faltantes,
    distintos,
    indiceFaltantes,
    indice,
    indexError,
    esperado: esperadasDefinidas ? esperado : null,
  };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const soloVerificar = argv.includes('--verify');

  if (soloVerificar) {
    baseSync.resolverDestino(process.env.STRAPI_URL || '').then(
      ({ destino }) => {
        const resultado = verificar(baseSync, destino);
        console.log(JSON.stringify(resultado, null, 2));
        if (!resultado.ok) process.exitCode = 1;
      },
      (err) => {
        console.error(`✗ no se pudo resolver la raíz canónica de la wiki: ${err && (err.stack || err.message || err)}`);
        process.exitCode = 1;
      }
    );
  } else {
    main().then(
      (stats) => {
        const resultado = verificar(baseSync, stats.destino);
        console.log(JSON.stringify(resultado, null, 2));
        if (!resultado.ok) {
          console.error('✗ verificación post-sync falló');
          process.exitCode = 1;
        }
      },
      (err) => {
        console.error(`✗ sync-wikis de producción falló: ${err && (err.stack || err.message || err)}`);
        process.exitCode = 1;
      }
    );
  }
}

module.exports = {
  main,
  baseSync,
  verificar,
  comprobarAbiDriver,
  indexarDocumento,
  abrirBd,
  pathsIndexados,
  RELEASE_ROOT,
  SOCKET_DIR,
};
