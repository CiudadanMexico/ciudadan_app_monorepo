'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const controller = require('../src/api/site-setting/controllers/wiki');

const fila = (wikis_path) => {
  let llamada = 0;
  global.strapi = {
    db: {
      query: (uid) => {
        assert.equal(uid, 'api::site-setting.site-setting');
        return {
          findMany: async ({ limit } = {}) => {
            llamada += 1;
            assert.equal(limit, 1);
            return wikis_path === undefined ? [] : [{ wikis_path }];
          },
        };
      },
    },
    log: { warn() {} },
  };
  return { llamada: () => llamada };
};

test('devuelve la ruta física configurada en site-setting', async () => {
  const { llamada } = fila('/home/ubuntu/apps/wikis');
  const ctx = {};
  await controller.getPublicConfig(ctx);
  assert.equal(llamada(), 1);
  assert.deepEqual(ctx.body, { wikisPath: '/home/ubuntu/apps/wikis' });
});

test('recorta espacios y devuelve null cuando no hay valor', async () => {
  fila('  /var/www/apps/wikis  ');
  const ctx = {};
  await controller.getPublicConfig(ctx);
  assert.deepEqual(ctx.body, { wikisPath: '/var/www/apps/wikis' });

  fila('');
  const ctxVacio = {};
  await controller.getPublicConfig(ctxVacio);
  assert.deepEqual(ctxVacio.body, { wikisPath: null });

  fila(undefined);
  const ctxSinFila = {};
  await controller.getPublicConfig(ctxSinFila);
  assert.deepEqual(ctxSinFila.body, { wikisPath: null });
  delete global.strapi;
});

test('nunca expone el resto de site-setting', async () => {
  global.strapi = {
    db: {
      query: () => ({
        findMany: async () => [{
          wikis_path: '/home/ubuntu/apps/wikis',
          whatsapp_number: '+5215500000000',
          labory_to_pesos_exchange_rate: '17.5',
        }],
      }),
    },
    log: { warn() {} },
  };
  const ctx = {};
  await controller.getPublicConfig(ctx);
  assert.deepEqual(Object.keys(ctx.body), ['wikisPath']);
  delete global.strapi;
});
