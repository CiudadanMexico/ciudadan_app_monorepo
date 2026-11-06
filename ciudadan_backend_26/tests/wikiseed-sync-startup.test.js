'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  conteosSeed,
  sincronizarWikiSeed,
} = require('../socket-service/lib/wiki-seed-sync');

test('conteosSeed cuenta los tres grupos del seed versionado', () => {
  const conteos = conteosSeed();
  assert.deepEqual(Object.keys(conteos).sort(), ['faq', 'help', 'main']);
  assert.ok(conteos.main > 0);
  assert.ok(conteos.help > 0);
  assert.ok(conteos.faq > 0);
});

test('el arranque exige una verificación de wiki completa', async () => {
  let mainCalls = 0;
  let verifyCalls = 0;

  const resultado = await sincronizarWikiSeed({
    produccion: {},
    main: async () => {
      mainCalls += 1;
      return { destino: '/tmp/wiki-test', copiados: 3, indexados: 3, sinIndexar: 0 };
    },
    verificar: () => {
      verifyCalls += 1;
      return {
        ok: true,
        faltantes: [],
        distintos: [],
        indiceFaltantes: [],
        indice: { total: 3, main: 1, help: 1, faq: 1 },
        indexError: null,
      };
    },
    conteosSeed: () => ({ main: 1, help: 1, faq: 1 }),
  });

  assert.equal(mainCalls, 1);
  assert.equal(verifyCalls, 1);
  assert.equal(resultado.total, 3);
  assert.equal(resultado.verificacion.ok, true);
});

test('el arranque falla cerrado si la verificación detecta archivos o índice faltantes', async () => {
  await assert.rejects(
    sincronizarWikiSeed({
      produccion: {},
      main: async () => ({
        destino: '/tmp/wiki-test',
        copiados: 1,
        indexados: 0,
        sinIndexar: 1,
      }),
      verificar: () => ({
        ok: false,
        faltantes: ['help/faltante.md'],
        distintos: [],
        indiceFaltantes: ['wiki/help/faltante.md'],
        indice: { total: 0, main: 0, help: 0, faq: 0 },
        indexError: null,
      }),
      conteosSeed: () => ({ main: 1, help: 1, faq: 1 }),
    }),
    /Verificación de wiki incompleta/
  );
});
