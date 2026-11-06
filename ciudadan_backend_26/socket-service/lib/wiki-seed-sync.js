'use strict';

/**
 * Sincronización de `wikiseed/` durante el arranque del socket-service.
 *
 * En producción el release queda así:
 *
 *   <release>/wikiseed/
 *   <release>/ciudadan_backend_26/socket-service/
 *
 * El servicio corre como `alexander`, el mismo usuario propietario de la raíz
 * viva y de la base SQLite compartida. Esta integración se ejecuta ANTES de
 * `listen()`: si la copia o la indexación falla, el proceso termina con error
 * y systemd no declara el socket disponible.
 *
 * En checkout/local, `wikiseed/` es hermano de `ciudadan_backend_26/`; el
 * layout de release también cumple esa relación. Desde `socket-service/lib/`
 * la ruta canónica es `../../../wikiseed`.
 */

const fs = require('fs');
const path = require('path');

const RELEASE_ROOT = path.resolve(__dirname, '..', '..', '..');
const SEED_ROOT = path.join(RELEASE_ROOT, 'wikiseed');
const PRODUCTION_SYNC = path.join(SEED_ROOT, 'sync-wikis-production.js');

function conteosSeed() {
  const conteos = { main: 0, help: 0, faq: 0 };
  for (const seccion of Object.keys(conteos)) {
    const dir = path.join(SEED_ROOT, seccion);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) conteos[seccion] += 1;
    }
  }
  return conteos;
}

/**
 * Ejecuta el wrapper de producción y exige que la verificación final sea
 * verde. `deps.produccion` permite probar la política sin tocar el disco.
 */
async function sincronizarWikiSeed(deps = {}) {
  const produccion = deps.produccion || require(PRODUCTION_SYNC);
  const main = deps.main || produccion.main;
  const verificar = deps.verificar || produccion.verificar;

  if (!fs.existsSync(SEED_ROOT)) {
    throw new Error(`No existe el directorio de seeds de wiki: ${SEED_ROOT}`);
  }

  const conteos = (deps.conteosSeed || conteosSeed)();
  const total = Object.values(conteos).reduce((sum, n) => sum + n, 0);
  if (total === 0) {
    throw new Error(`El directorio de seeds de wiki está vacío: ${SEED_ROOT}`);
  }

  // El gate por variables de entorno es opcional para el script de producción,
  // pero si se proporciona debe ser completo. Esto evita interpretar un
  // contador ausente como cero y bloquear un árbol sano.
  const expectedEnv = [
    'WIKI_SYNC_EXPECTED_MAIN',
    'WIKI_SYNC_EXPECTED_HELP',
    'WIKI_SYNC_EXPECTED_FAQ',
  ];
  const expectedPresent = expectedEnv.filter((name) => process.env[name] !== undefined);
  if (expectedPresent.length > 0 && expectedPresent.length !== expectedEnv.length) {
    throw new Error(
      `Conteos esperados de wiki incompletos; faltan: ${expectedEnv
        .filter((name) => !expectedPresent.includes(name))
        .join(', ')}`
    );
  }

  const stats = await main([], {
    ...(deps.deps || {}),
  });

  // `verificar` recibe el módulo base como primer argumento (compatibilidad
  // histórica de la API); el destino ya resuelto por `main` es el segundo.
  const verificacion = verificar(
    produccion && produccion.baseSync ? produccion.baseSync : produccion,
    stats.destino
  );
  if (!verificacion.ok) {
    throw new Error(
      `Verificación de wiki incompleta: ${JSON.stringify({
        faltantes: verificacion.faltantes,
        distintos: verificacion.distintos,
        indiceFaltantes: verificacion.indiceFaltantes,
        indice: verificacion.indice,
        indexError: verificacion.indexError,
      })}`
    );
  }

  return {
    destino: stats.destino,
    conteos,
    total,
    copiados: stats.copiados,
    indexados: stats.indexados,
    sinIndexar: stats.sinIndexar,
    verificacion,
  };
}

module.exports = {
  RELEASE_ROOT,
  SEED_ROOT,
  PRODUCTION_SYNC,
  conteosSeed,
  sincronizarWikiSeed,
};
