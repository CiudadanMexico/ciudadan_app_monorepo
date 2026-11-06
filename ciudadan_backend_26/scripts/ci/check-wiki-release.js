'use strict';

/**
 * Gate local del artefacto de wiki.
 *
 * Comprueba que el layout de release conserva las dos piezas indispensable:
 *
 *   <release>/wikiseed/{main,help,faq}/*.md
 *   <release>/ciudadan_backend_26/socket-service/dist/
 *
 * También calcula los conteos que producción usará para validar el índice
 * SQLite después del deploy. No abre la BD ni toca producción.
 *
 * Uso:
 *   node ciudadan_backend_26/scripts/ci/check-wiki-release.js <release-dir>
 */

const fs = require('fs');
const path = require('path');

const SECTIONS = ['main', 'help', 'faq'];

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

function main() {
  const release = path.resolve(process.argv[2] || '.');
  const seed = path.join(release, 'wikiseed');
  const socket = path.join(release, 'ciudadan_backend_26', 'socket-service');
  const errores = [];

  for (const archivo of [
    path.join(seed, 'sync-wikis.js'),
    path.join(seed, 'sync-wikis-production.js'),
    path.join(socket, 'dist', 'config', 'ConfigDatabase.js'),
    path.join(socket, 'dist', 'services', 'WikiService.js'),
  ]) {
    if (!fs.existsSync(archivo)) errores.push(`falta ${path.relative(release, archivo)}`);
  }

  const conteos = {};
  for (const seccion of SECTIONS) {
    conteos[seccion] = listarMd(path.join(seed, seccion)).length;
    if (conteos[seccion] === 0) errores.push(`wikiseed/${seccion} no contiene .md`);
  }

  const total = Object.values(conteos).reduce((sum, n) => sum + n, 0);
  if (errores.length) {
    console.error('✗ release de wiki inválido:');
    for (const error of errores) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ ok: true, release, conteos, total }));
}

main();
