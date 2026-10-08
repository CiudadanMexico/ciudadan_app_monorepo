'use strict';

/**
 * sync-wikis.js — Sincroniza los .md de ejemplo (wikiseed/) hacia la carpeta
 * física donde vive la wiki fuera del proyecto.
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
 * Uso:
 *   node wikiseed/sync-wikis.js [--dry-run] [--force]
 *
 * Sale con código 1 si falla algo (destino irresoluble, error de red fatal,
 * fallo de escritura).
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

  const stats = { copiados: 0, sinCambios: 0, omitidos: 0 };
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
    }
  }

  console.log(
    `Listo: ${stats.copiados} copiados, ${stats.sinCambios} sin cambios, ` +
    `${stats.omitidos} secciones omitidas.`
  );
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
