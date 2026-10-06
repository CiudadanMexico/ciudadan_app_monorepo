'use strict';

/**
 * Localización del APK publicado. Está en `utils` (y no dentro del
 * controlador) porque lo necesitan tanto la descarga como la configuración
 * pública de la landing, y para poder probarlo sin arrancar Strapi.
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Ruta(s) candidatas del APK publicado. `DRIVER_APK_PATH` es un override
 * explícito (dev/pruebas): cuando está definido se usa SOLO esa ruta.
 *
 * `scripts/sync-apk.js` publica en `<backend>/public/downloads/`; se mantienen
 * como respaldo el cwd de Strapi y las carpetas `apk/` del proyecto.
 */
const RAIZ_BACKEND = path.resolve(__dirname, '../../../..');
const RAIZ_REPO = path.resolve(RAIZ_BACKEND, '..');

function rutasApk(env = process.env) {
  if (env.DRIVER_APK_PATH) return [path.resolve(env.DRIVER_APK_PATH)];
  return [
    path.join(RAIZ_BACKEND, 'public', 'downloads', 'ciudadan-latest.apk'),
    path.join(process.cwd(), 'public', 'downloads', 'ciudadan-latest.apk'),
    path.join(RAIZ_BACKEND, 'apk', 'ciudadan-latest.apk'),
    path.join(RAIZ_REPO, 'apk', 'ciudadan-latest.apk'),
  ];
}

/** Primer APK legible y no vacío: `{ ruta, tamano }` o `null`. */
function buscarApk(env = process.env) {
  for (const ruta of rutasApk(env)) {
    try {
      const stat = fs.statSync(ruta);
      if (stat.isFile() && stat.size > 0) return { ruta, tamano: stat.size };
    } catch {
      /* prueba con la siguiente ruta */
    }
  }
  return null;
}

/** Nombre de archivo del attachment (sin caracteres raros). */
const nombreArchivo = version =>
  `CiudadanConductor-${String(version || 'latest').replace(/[^0-9A-Za-z.\-]/g, '')}.apk`;

/**
 * Lo que la landing necesita saber del binario: si existe, su versión y su
 * peso real en MB, para advertir antes de descargar.
 */
function descripcionApk(version, env = process.env) {
  const apk = buscarApk(env);
  const versionLimpia = version ? String(version).slice(0, 60) : null;
  if (!apk) return { disponible: false, version: versionLimpia, tamanoMb: null };
  return {
    disponible: true,
    version: versionLimpia,
    tamanoMb: Math.round((apk.tamano / 1048576) * 10) / 10,
  };
}

module.exports = { rutasApk, buscarApk, nombreArchivo, descripcionApk };
