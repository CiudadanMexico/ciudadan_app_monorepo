'use strict';

/**
 * Concesion segura del rol `repartidor` (spec §8, §12):
 *  - MERGE aditivo: preserva roles previos y el resto del JSON de roles
 *    (a diferencia de agregar-socio.js que REEMPLAZA el objeto).
 *  - Idempotente: no duplica el rol ni repite notificaciones/eventos.
 *  - Solo backend: ningun endpoint del solicitante toca roles.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { crearStrapiRepartidoresMock } = require('./helpers/strapi-mock-repartidores');
const { UIDS, ROL_REPARTIDOR } = require('../src/api/delivery-registration/utils/constants');

function montar() {
  const mock = crearStrapiRepartidoresMock({
    tablas: {
      [UIDS.USER]: [
        {
          id: 7,
          email: 'reparto@ciudadan.org',
          roles: { extra: ['socio', 'verificador'], area_details: { algo: 1 } },
        },
      ],
      [UIDS.PROFILE]: [{ id: 90, user: 7, agency: 3, status: 'approved' }],
      [UIDS.EVENT]: [],
    },
  });
  // bitacora requiere global.strapi
  const { otorgarRolRepartidor } = require('../src/api/delivery-registration/services/revision-service');
  return { mock, otorgarRolRepartidor };
}

test('otorga repartidor con MERGE aditivo preservando roles y otras claves del JSON', async () => {
  const { mock, otorgarRolRepartidor } = montar();

  const res = await otorgarRolRepartidor({ userId: 7, actorId: 1, profileId: 90, agencyId: 3 });
  assert.equal(res.nuevo, true);

  const usuario = mock.tablas[UIDS.USER][0];
  assert.deepEqual(
    usuario.roles.extra,
    ['socio', 'verificador', 'repartidor'],
    'conserva socio y verificador y anade repartidor'
  );
  assert.equal(usuario.roles.area_details.algo, 1, 'preserva otras claves del JSON');
  assert.ok(!Array.isArray(usuario.roles), 'roles sigue siendo objeto JSON');
});

test('segunda concesion es idempotente: no duplica rol ni evento de otorgamiento', async () => {
  const { mock, otorgarRolRepartidor } = montar();

  await otorgarRolRepartidor({ userId: 7, actorId: 1, profileId: 90, agencyId: 3 });
  const res2 = await otorgarRolRepartidor({ userId: 7, actorId: 1, profileId: 90, agencyId: 3 });

  assert.equal(res2.nuevo, false);
  const usuario = mock.tablas[UIDS.USER][0];
  assert.equal(
    usuario.roles.extra.filter((r) => r === ROL_REPARTIDOR).length,
    1,
    'el rol no se duplica'
  );

  const eventos = mock.tablas[UIDS.EVENT];
  const otorgados = eventos.filter((e) => e.action === 'role_granted');
  const idempotentes = eventos.filter((e) => e.action === 'role_grant_skipped_idempotent');
  assert.equal(otorgados.length, 1, 'un solo evento de otorgamiento real');
  assert.equal(idempotentes.length, 1, 'la segunda vez deja evento idempotente');
});

test('usuario con roles JSON malformado no rompe la concesion', async () => {
  const { mock, otorgarRolRepartidor } = montar();
  mock.tablas[UIDS.USER][0].roles = 'no-es-objeto';

  const res = await otorgarRolRepartidor({ userId: 7, actorId: 1, profileId: 90, agencyId: 3 });
  assert.equal(res.nuevo, true);
  const usuario = mock.tablas[UIDS.USER][0];
  assert.deepEqual(usuario.roles.extra, ['repartidor'], 'parte de un JSON limpio');
});

test('usuario con roles.extra ausente recibe solo repartidor', async () => {
  const { mock, otorgarRolRepartidor } = montar();
  mock.tablas[UIDS.USER][0].roles = { extra: null };

  await otorgarRolRepartidor({ userId: 7, actorId: 1, profileId: 90, agencyId: 3 });
  assert.deepEqual(mock.tablas[UIDS.USER][0].roles.extra, ['repartidor']);
});

test('el fallo de escritura deja evento role_grant_failed y no otorga en silencio', async () => {
  const { mock, otorgarRolRepartidor } = montar();

  // db.query(uid) devuelve un objeto nuevo por llamada: se envuelve la
  // FUNCION para que el update de usuario falle.
  const originalQuery = mock.strapi.db.query;
  mock.strapi.db.query = (uid) => {
    const q = originalQuery(uid);
    if (uid === UIDS.USER) {
      q.update = async () => {
        throw new Error('fallo de BD simulado');
      };
    }
    return q;
  };

  await assert.rejects(
    () => otorgarRolRepartidor({ userId: 7, actorId: 1, profileId: 90, agencyId: 3 }),
    (err) => err.status === 409 && /otorgamiento del rol fallo/.test(err.message)
  );

  const eventos = mock.tablas[UIDS.EVENT];
  assert.ok(
    eventos.some((e) => e.action === 'role_grant_failed'),
    'queda huella del fallo para soporte'
  );
});
