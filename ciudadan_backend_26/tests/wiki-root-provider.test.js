'use strict';

/**
 * Selftest del proveedor de raíz de la wiki
 * (`socket-service/config/WikiRootProvider.ts` → dist).
 *
 * Cubre la precedencia site-setting.wikis_path → WIKI_ROOT_PATH → default,
 * el fallback cuando Strapi está caído o el valor es inválido, la caché TTL
 * y la validación de rutas.
 *
 * Ejecutar: node --test tests/wiki-root-provider.test.js
 */

const test = require('node:test');
const assert = require('node:assert/strict');

// El fallback de este test es el del .env del socket-service.
process.env.WIKI_ROOT_PATH = '/home/ubuntu/wikis';

const provider = require('../socket-service/dist/config/WikiRootProvider');
const paths = require('../socket-service/dist/config/WikiPaths');

const ENV_ROOT = '/home/ubuntu/wikis';
const APPS_ROOT = '/home/ubuntu/apps/wikis';

test('precedencia: site-setting.wikis_path gana al .env', async () => {
  provider.__resetWikiRootCache();
  const r = await provider.resolveActiveRoot(async () => ({ wikisPath: APPS_ROOT }));
  assert.equal(r.source, 'strapi');
  assert.equal(r.root, APPS_ROOT);
  assert.equal(paths.getWikiFsRoot(), APPS_ROOT, 'la raíz activa queda fijada');
});

test('Strapi caído → cae al WIKI_ROOT_PATH del .env', async () => {
  provider.__resetWikiRootCache();
  const r = await provider.resolveActiveRoot(async () => {
    throw new Error('connect ECONNREFUSED');
  });
  assert.equal(r.source, 'env');
  assert.equal(r.root, ENV_ROOT);
  assert.equal(paths.getWikiFsRoot(), ENV_ROOT);
});

test('valor vacío de Strapi → cae al .env', async () => {
  provider.__resetWikiRootCache();
  const r = await provider.resolveActiveRoot(async () => ({ wikisPath: null }));
  assert.equal(r.source, 'env');
  assert.equal(r.root, ENV_ROOT);
});

test('valores inválidos (relativos o con ..) → no se aceptan', async () => {
  provider.__resetWikiRootCache();
  for (const invalido of ['relativo/wikis', '/home/ubuntu/../../etc', '   ']) {
    const r = await provider.resolveActiveRoot(async () => ({ wikisPath: invalido }));
    assert.equal(r.source, 'env', `no debió aceptarse: ${JSON.stringify(invalido)}`);
    assert.equal(r.root, ENV_ROOT);
  }
});

test('caché TTL: la segunda resolución no vuelve a consultar a Strapi', async () => {
  provider.__resetWikiRootCache();
  let llamadas = 0;
  const request = async () => {
    llamadas += 1;
    return { wikisPath: APPS_ROOT };
  };
  const primera = await provider.resolveActiveRoot(request);
  const segunda = await provider.resolveActiveRoot(request);
  assert.equal(primera.source, 'strapi');
  assert.equal(segunda.source, 'cache');
  assert.equal(llamadas, 1, 'solo una consulta a Strapi dentro del TTL');
  provider.__resetWikiRootCache();
});

test('validateWikiRoot: solo rutas absolutas y sin ..', () => {
  assert.equal(paths.validateWikiRoot('/opt/wikis'), '/opt/wikis');
  assert.equal(paths.validateWikiRoot('  /var/www/apps/wikis  '), '/var/www/apps/wikis');
  assert.throws(() => paths.validateWikiRoot(''), /vacío/);
  assert.throws(() => paths.validateWikiRoot('relativo/wikis'), /absoluta/);
  assert.throws(() => paths.validateWikiRoot('/raiz/../../etc'), /\.\./);
});

test('resolveWikiDiskPath usa la raíz activa y quita el prefijo wiki/', () => {
  paths.setActiveRoot(APPS_ROOT);
  assert.equal(
    paths.resolveWikiDiskPath('wiki/help/guia-usuario.md'),
    `${APPS_ROOT}/help/guia-usuario.md`
  );
  assert.equal(paths.resolveWikiDiskPath('help/indice.md'), `${APPS_ROOT}/help/indice.md`);
  assert.equal(
    paths.resolveWikiDiskPath('wiki/main/mi-primer-articulo.md', '/otra/raiz'),
    '/otra/raiz/main/mi-primer-articulo.md',
    'la raíz explícita tiene prioridad sobre la activa'
  );
});
