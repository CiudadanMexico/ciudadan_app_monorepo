'use strict';

/**
 * Fija el contrato del override de subida (src/extensions/upload/strapi-server.js):
 * `POST /api/upload` debe quedar con `auth: false` + la policy Auth0, para que
 * el Bearer Auth0 de la app deje de devolver 401 (bug: subir el PDF de una
 * habilidad en la vista de cowork).
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const extendUploadPlugin = require('../src/extensions/upload/strapi-server');

const fakeUploadPlugin = () => ({
  routes: {
    'content-api': {
      // Así declara el plugin upload sus rutas: SIN config (ver
      // node_modules/@strapi/plugin-upload/server/routes/content-api.js).
      routes: [
        { method: 'POST', path: '/', handler: 'content-api.upload' },
        { method: 'GET', path: '/files', handler: 'content-api.find', config: {} },
        { method: 'DELETE', path: '/files/:id', handler: 'content-api.destroy', config: {} },
      ],
    },
  },
});

test('POST /api/upload queda con auth:false y la policy is-authenticated-auth0', () => {
  const plugin = fakeUploadPlugin();
  extendUploadPlugin(plugin);

  const upload = plugin.routes['content-api'].routes.find(
    (r) => r.method === 'POST' && r.path === '/'
  );

  assert.ok(upload, 'la ruta de subida debe existir tras el override');
  assert.equal(upload.config.auth, false, 'auth debe ser false para que Strapi no valide su JWT');
  assert.deepEqual(
    upload.config.policies,
    ['global::is-authenticated-auth0'],
    'debe exigir el token Auth0'
  );
  assert.equal(upload.handler, 'content-api.upload', 'el handler original se conserva');
  // Regresión vivida: meterle prefix:'' a una ruta NATIVA la sacaba del
  // prefijo /api/upload y el endpoint pasaba a responder 405.
  assert.ok(
    !('prefix' in upload.config),
    'no debe inyectar prefix en la ruta nativa (rompe el prefijo del plugin)'
  );
});

test('las demás rutas de media quedan intactas', () => {
  const plugin = fakeUploadPlugin();
  const before = JSON.parse(JSON.stringify(plugin.routes['content-api'].routes));
  extendUploadPlugin(plugin);

  for (const ruta of plugin.routes['content-api'].routes) {
    if (ruta.method === 'POST' && ruta.path === '/') continue;
    const original = before.find((r) => r.method === ruta.method && r.path === ruta.path);
    assert.ok(original, 'no debe aparecer ninguna ruta nueva salvo el fallback de subida');
    assert.deepEqual(ruta.config, original.config, `${ruta.method} ${ruta.path} no debe tocarse`);
  }
});

test('si la versión futura no declara la ruta, la registra en lugar de perder el override', () => {
  const plugin = { routes: { 'content-api': { routes: [] } } };
  extendUploadPlugin(plugin);

  const upload = plugin.routes['content-api'].routes.find(
    (r) => r.method === 'POST' && r.path === '/'
  );
  assert.ok(upload, 'debe empujar la ruta de subida');
  assert.equal(upload.config.auth, false);
  assert.deepEqual(upload.config.policies, ['global::is-authenticated-auth0']);
  assert.equal(upload.handler, 'content-api.upload');
});

test('no revienta con un plugin malformado (defensa)', () => {
  assert.doesNotThrow(() => extendUploadPlugin({}));
  assert.doesNotThrow(() => extendUploadPlugin(undefined));
});
