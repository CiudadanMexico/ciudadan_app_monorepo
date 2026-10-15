'use strict';

/**
 * sync-wikis.js — Sincroniza los .md de ejemplo (wikiseed/) hacia la carpeta
 * física donde vive la wiki fuera del proyecto Y los indexa para la wiki.
 *
 * - Origen: `wikiseed/{main,help,faq}/` junto a este script (resuelto por
 *   `__dirname`; funciona desde cualquier carpeta). Solo se sincronizan las 3
 *   secciones conocidas; nunca `.obsidian/` ni archivos sueltos.
 * - Destino: `site-setting.wikis_path` leído por HTTP de Strapi
 *   (`GET /api/wiki/public-config`), con fallback a `WIKI_ROOT_PATH` y luego
 *   al default de plataforma (misma precedencia que WikiRootProvider).
 * - Solo copia lo que falte o cambie (compara SHA-256 del contenido);
 *   NUNCA borra nada del destino — lo editado en vivo se conserva.
 * - Flags: `--dry-run` (reporta sin escribir), `--force` (re-copia todo).
 *
 * ── POR QUÉ TAMBIÉN INDEXA EN LA BASE DE DATOS ────────────────────────────
 * La wiki NO lista archivos del disco: el árbol de navegación sale de la tabla
 * `documents` de SQLite (`ciudadadan.db`), que lee `WikiService.getWikiSection`
 * vía `DocumentRepositoryImpl.findAllForTree()`. Escribir el `.md` en disco NO
 * era suficiente: el archivo quedaba invisible en el listado y sólo era legible
 * por URL directa (gracias al fallback a disco de `getDocumentByPath`).
 *
 * Copiar sin indexar producía exactamente eso: el sync reportaba éxito mientras
 * el artículo no aparecía en la wiki. Por eso este script, tras copiar, indexa
 * con el MISMO servicio que usa el watcher (`WikiService.updateIndex`):
 *   - idempotente por SHA-256 del contenido → sincronizar repetido NO duplica;
 *   - escribe SOLO la BD (`writeToDisk: false`), no reescribe el archivo;
 *   - reutiliza el código real en vez de duplicar SQL aquí.
 *
 * El índice sólo se toca si el archivo quedó copiado/actualizado, así que un
 * `--dry-run` no modifica nada y un sync sin cambios no reescribe la BD.
 *
 * Uso:
 *   node wikiseed/sync-wikis.js [--dry-run] [--force]
 *
 * ⚠ IMPORTANTE — Node correcto: el indexado carga `better-sqlite3` del
 * socket-service, un binario nativo compilado con el Node de ese servicio
 * (Node 22 en las instancias del agente). Ejecutar el sync con otro Node
 * (p. ej. el 20 del shell) mataba el proceso con SIGSEGV a mitad de copia;
 * ahora un pre-vuelo en proceso hijo lo detecta y reporta 'abi-incompatible'
 * sin crashear (los .md se copian igual; el watcher indexa al arrancar).
 * En la instancia: /opt/node22/bin/node (el mismo Node del watchdog).
 *
 * Sale con código 1 si falla algo (destino irresoluble, error de red fatal,
 * fallo de escritura o de indexado).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');

const SEED_DIR = path.resolve(__dirname);
const SECTIONS = ['main', 'help', 'faq'];
const REQUEST_TIMEOUT_MS = Number(process.env.WIKI_CONFIG_TIMEOUT_MS) || 5000;

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function listarMd(dir) {
  const salida = [];
  const caminar = (actual) => {
    for (const entry of fs.readdirSync(actual, { withFileTypes: true })) {
      const completo = path.join(actual, entry.name);
      if (entry.isDirectory()) {
        caminar(completo);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        salida.push(path.relative(dir, completo).split(path.sep).join('/'));
      }
    }
  };
  caminar(dir);
  return salida.sort();
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const cliente = url.startsWith('https:') ? https : http;
    const req = cliente.get(url, { timeout: REQUEST_TIMEOUT_MS }, (res) => {
      let cuerpo = '';
      res.on('data', (chunk) => { cuerpo += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode} en ${url}`));
          return;
        }
        try {
          resolve(JSON.parse(cuerpo));
        } catch (err) {
          reject(new Error(`Respuesta no-JSON de ${url}: ${err.message}`));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error(`timeout de ${REQUEST_TIMEOUT_MS}ms en ${url}`)));
    req.on('error', reject);
  });
}

/**
 * Pre-vuelo de ABI del driver nativo `better-sqlite3` del socket-service.
 *
 * El paquete se compila con node-gyp usando el Node que instaló las
 * dependencias del socket-service (Node 22 en las instancias del agente).
 * Requerirlo desde OTRO runtime (p. ej. Node 20) no lanza un error
 * capturable: el proceso muere con SIGSEGV y el sync se caía a mitad de
 * la copia, dejando la siembra a medias y sin explicación.
 *
 * Para evitarlo, se carga el driver UNA vez en un proceso hijo desechable:
 * si el hijo revienta, este proceso sigue vivo, se saltan los indexados con
 * un motivo claro ("abi-incompatible") y los `.md` ya quedan copiados (el
 * watcher del socket-service los indexa al arrancar con su propio Node).
 */
let abiCache;
function comprobarAbiDriver() {
  if (abiCache !== undefined) return abiCache;
  const socketDir = path.resolve(__dirname, '..', 'ciudadan_backend_26', 'socket-service');
  const driverDir = path.join(socketDir, 'node_modules', 'better-sqlite3');
  if (!fs.existsSync(driverDir)) {
    abiCache = { ok: false, motivo: 'abi: falta better-sqlite3 en el socket-service (falta npm install del servicio)' };
    return abiCache;
  }

  const incompatible = (como) => ({
    ok: false,
    motivo:
      `abi-incompatible (${como}): este proceso corre Node ${process.version}, ` +
      `pero el better-sqlite3 del socket-service exige un Node mayor ` +
      `(ver node_modules/better-sqlite3/package.json → engines.node). ` +
      `Ejecuta el sync con el MISMO Node del socket-service (en la instancia: ` +
      `/opt/node22/bin/node). Los .md se copian igual; el watcher los indexará ` +
      `al arrancar el servicio.`,
  });

  // 1) Chequeo estático: engines.node del paquete vs el runtime actual.
  //    better-sqlite3 v13 declara ">=22": con Node 20 el `require` NO falla
  //    (prebuild N-API de ABI estable) pero USAR el binding revienta con
  //    SIGSEGV, señal no capturable en JS. Este chequeo lo detecta a tiempo.
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(driverDir, 'package.json'), 'utf8'));
    const requisito = pkg && pkg.engines && typeof pkg.engines.node === 'string' ? pkg.engines.node : null;
    const minimo = requisito ? (requisito.match(/>=\s*(\d+)/) || [])[1] : null;
    const actual = Number(process.versions.node.split('.')[0]);
    if (minimo && actual < Number(minimo)) {
      abiCache = incompatible(`engines ${requisito} vs Node ${process.versions.node}`);
      return abiCache;
    }
  } catch (_) { /* sin package.json legible: se prueba dinámicamente */ }

  // 2) Prueba dinámica: EJERCITAR el driver (require + abrir :memory: +
  //    query) dentro de un proceso hijo desechable. El require solo no basta
  //    (ver arriba); si el uso del binding crashea, el hijo muere y este
  //    proceso sigue vivo para reportarlo en vez de caerse a mitad de copia.
  const { spawnSync } = require('node:child_process');
  const fuente = `const D=require(${JSON.stringify(driverDir)});` +
    `const db=new D(':memory:');` +
    `db.exec('CREATE TABLE t(a)');` +
    `db.prepare('SELECT COUNT(*) n FROM t').get();` +
    `db.close();`;
  const hijo = spawnSync(process.execPath, ['-e', fuente], { timeout: 20000 });
  if (hijo.status === 0) {
    abiCache = { ok: true, motivo: null };
    return abiCache;
  }
  const detalle = hijo.signal ? `señal ${hijo.signal}` : `código ${hijo.status}`;
  abiCache = incompatible(`prueba de uso en proceso hijo murió con ${detalle}`);
  return abiCache;
}

/**
 * Indexa un documento en la BD de la wiki para que aparezca en el listado.
 *
 * Reutiliza `WikiService.updateIndex` (el mismo que usa `WikiWatcherService`),
 * que es idempotente por SHA-256: si el contenido no cambió, no hace nada, así
 * que sincronizar varias veces NO duplica documentos.
 *
 * Devuelve { ok, indexado, motivo }:
 *   - ok: false y motivo 'sin-dist' si el socket-service no está compilado
 *     (`dist/`) o le faltan dependencias. En ese caso NO se considera fallo del
 *     sync: los `.md` quedaron copiados y el watcher los indexará cuando el
 *     servicio arranque. Se reporta para que no quede oculto.
 *   - ok: false y motivo 'abi-incompatible...' si el Node que ejecuta este
 *     script no es el mismo con el que se compiló `better-sqlite3` del
 *     socket-service (ver `comprobarAbiDriver`). Ídem: no es fallo del sync.
 */
function indexarDocumento(rutaLogica, contenido) {
  const distDir = path.resolve(__dirname, '..', 'ciudadan_backend_26', 'socket-service', 'dist');
  if (!fs.existsSync(distDir)) {
    return { ok: false, indexado: false, motivo: 'sin-dist' };
  }

  const abi = comprobarAbiDriver();
  if (!abi.ok) {
    return { ok: false, indexado: false, motivo: abi.motivo };
  }

  try {
    // El servicio abre `ciudadadan.db` relativo al CWD, como en producción.
    const cwdPrevio = process.cwd();
    const socketDir = path.resolve(__dirname, '..', 'ciudadan_backend_26', 'socket-service');
    process.chdir(socketDir);
    let ws;
    try {
      const { ConfigDatabase } = require(path.join(distDir, 'config', 'ConfigDatabase'));
      const { DocumentRepositoryImpl } = require(path.join(
        distDir,
        'repository',
        'impl',
        'DocumentRepositoryImpl'
      ));
      const { WikiService } = require(path.join(distDir, 'services', 'WikiService'));

      const db = ConfigDatabase.getConnection();
      ws = new WikiService(new DocumentRepositoryImpl(db));
    } finally {
      process.chdir(cwdPrevio);
    }

    // `updateIndex` es async aunque sólo escriba en BD.
    return Promise.resolve(ws.updateIndex(rutaLogica, contenido)).then(
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

function validarDestino(raw) {
  const valor = typeof raw === 'string' ? raw.trim() : '';
  if (!valor) throw new Error('wikis_path vacío: no hay destino configurable.');
  if (valor.includes('..')) throw new Error(`destino inválido (contiene ".."): ${valor}`);
  if (!path.isAbsolute(valor)) {
    throw new Error(`el destino debe ser una ruta absoluta, no relativa: ${valor}`);
  }
  return path.normalize(valor);
}

/**
 * Resuelve el destino con la misma precedencia del socket-service:
 * Strapi (site-setting.wikis_path) → WIKI_ROOT_PATH (.env) → default Linux.
 * Devuelve { destino, origen } para logging. Lanza solo si NADA es válido.
 */
async function resolverDestino(strapiUrl) {
  const base = (strapiUrl || '').replace(/\/$/, '');
  if (base) {
    try {
      const data = await getJson(`${base}/api/wiki/public-config`);
      if (data && typeof data.wikisPath === 'string' && data.wikisPath.trim()) {
        return { destino: validarDestino(data.wikisPath), origen: 'strapi' };
      }
    } catch (err) {
      console.warn(`⚠ no se pudo leer wikis_path de Strapi (${err.message}); se usa el fallback.`);
    }
  }
  if (process.env.WIKI_ROOT_PATH) {
    return { destino: validarDestino(process.env.WIKI_ROOT_PATH), origen: 'env' };
  }
  return { destino: '/var/www/apps/wikis', origen: 'default' };
}

async function main(argv = process.argv.slice(2), deps = {}) {
  const dryRun = argv.includes('--dry-run');
  const force = argv.includes('--force');
  const strapiUrl = process.env.STRAPI_URL || '';
  const leerDestino = deps.resolverDestino || resolverDestino;

  const stats = { copiados: 0, sinCambios: 0, omitidos: 0, indexados: 0, sinIndexar: 0 };
  const { destino, origen } = await leerDestino(strapiUrl);
  console.log(`Destino: ${destino} (origen: ${origen})${dryRun ? ' [dry-run]' : ''}`);

  for (const seccion of SECTIONS) {
    const dirOrigen = path.join(SEED_DIR, seccion);
    if (!fs.existsSync(dirOrigen)) {
      console.warn(`⚠ falta la sección de ejemplo: ${dirOrigen} (se omite)`);
      stats.omitidos += 1;
      continue;
    }
    const dirDestino = path.join(destino, seccion);
    if (!dryRun) fs.mkdirSync(dirDestino, { recursive: true });

    for (const relativo of listarMd(dirOrigen)) {
      const fuente = path.join(dirOrigen, relativo);
      const meta = path.join(dirDestino, relativo);
      const existe = fs.existsSync(meta);
      if (existe && !force && sha256(fuente) === sha256(meta)) {
        stats.sinCambios += 1;
        continue;
      }
      if (!dryRun) {
        fs.mkdirSync(path.dirname(meta), { recursive: true });
        fs.copyFileSync(fuente, meta);
      }
      stats.copiados += 1;
      console.log(`${dryRun ? 'copiaría' : 'copiado'}: ${seccion}/${relativo}`);

      // El listado de la wiki sale de la BD, no del disco: sin indexar, el
      // archivo copiado NO aparece en el árbol. Idempotente por hash.
      if (!dryRun) {
        const rutaLogica = `wiki/${seccion}/${relativo}`;
        const res = await indexarDocumento(rutaLogica, fs.readFileSync(meta, 'utf-8'));
        if (res.ok && res.indexado) {
          stats.indexados += 1;
          console.log(`   indexado: ${rutaLogica}`);
        } else if (res.ok) {
          console.log(`   ya indexado (sin cambios): ${rutaLogica}`);
        } else {
          stats.sinIndexar += 1;
          console.warn(
            `   ⚠ no se pudo indexar ${rutaLogica} (${res.motivo}). ` +
              'El archivo quedó copiado; el watcher lo indexará al arrancar el socket-service.'
          );
        }
      }
    }
  }

  console.log(
    `Listo: ${stats.copiados} copiados, ${stats.sinCambios} sin cambios, ` +
    `${stats.omitidos} secciones omitidas.`
  );
  if (!dryRun) {
    console.log(
      `Índice de la wiki: ${stats.indexados} indexados` +
      (stats.sinIndexar > 0 ? `, ${stats.sinIndexar} sin indexar` : '') +
      '.'
    );
  }
  return stats;
}

if (require.main === module) {
  main().then(
    () => {},
    (err) => {
      console.error(`✗ sync-wikis falló: ${err && (err.stack || err.message || err)}`);
      process.exitCode = 1;
    }
  );
}

module.exports = { main, resolverDestino, validarDestino, listarMd, SECTIONS };
