#!/usr/bin/env node
'use strict';

/**
 * Publica el APK firmado en la única ruta que el backend sabe servir.
 *
 *   node scripts/sync-apk.js [ruta-del-apk]
 *
 * Por seguridad NO se sirve ningún .apk suelto del repositorio: el endpoint
 * de descarga sólo lee `public/downloads/ciudadan-latest.apk`, y esa carpeta
 * no se reconstruye con `rsync --delete` en el despliegue.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RAIZ = path.resolve(__dirname, '..');
const DESTINO = path.join(RAIZ, 'public', 'downloads', 'ciudadan-latest.apk');

const candidatos = [
  process.argv[2],
  process.env.APK_SOURCE_PATH,
  path.join(RAIZ, 'apk', 'ciudadan-latest.apk'),
  path.join(RAIZ, 'apk', 'app-release.apk'),
  path.join(RAIZ, '..', 'apk', 'ciudadan-latest.apk'),
  path.join(RAIZ, '..', 'apk', 'app-release.apk'),
].filter(Boolean);

function sha256(ruta) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(ruta));
  return hash.digest('hex');
}

function encontrarOrigen() {
  for (const ruta of candidatos) {
    try {
      if (fs.statSync(ruta).isFile()) return path.resolve(ruta);
    } catch {
      /* sigue buscando */
    }
  }
  return null;
}

function main() {
  const origen = encontrarOrigen();
  if (!origen) {
    console.error('❌ No se encontró el APK. Colócalo en ./apk/ciudadan-latest.apk');
    console.error('   (o pásalo por parámetro: node scripts/sync-apk.js ruta/al/app-release.apk)');
    console.error('   Candidatos buscados:');
    candidatos.forEach(c => console.error(`     - ${c}`));
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
  fs.copyFileSync(origen, DESTINO);

  const stat = fs.statSync(DESTINO);
  if (stat.size === 0) {
    console.error(`❌ El APK copiado está vacío (${origen}). Publicación cancelada.`);
    fs.rmSync(DESTINO, { force: true });
    process.exitCode = 1;
    return;
  }

  console.log('✅ APK publicado para descarga:');
  console.log(`   origen : ${origen}`);
  console.log(`   destino: ${DESTINO}`);
  console.log(`   tamaño : ${(stat.size / 1048576).toFixed(2)} MB`);
  console.log(`   sha256 : ${sha256(DESTINO)}`);
}

main();
