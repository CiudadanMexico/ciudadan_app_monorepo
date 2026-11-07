'use strict';

/**
 * Pruebas del flujo "postulación aceptada -> invitación + aviso por correo".
 *
 * Contratos reales que se respetan:
 *  - `api::invitacion.invitacion` (agencia = RELACIÓN, draftAndPublish);
 *  - `src/services/brevo` (el `enviar` real nunca lanza: se wrappea).
 *
 * Casos cubiertos:
 *  (a) al resolver a 'aceptada' se crea la invitación con correo y agencia;
 *  (b) una segunda aceptación de la MISMA postulación no duplica la
 *      invitación ni reenvía el correo;
 *  (c) un estado distinto de 'aceptada' no crea invitación;
 *  (d) un fallo del envío de correo (Brevo) NO rompe la operación;
 *  (e) si el alta de la invitación falla, la postulación NO queda aceptada a
 *      medias (la invitación se crea antes de aceptar);
 *  (f) el HTML del correo escapa el nombre del candidato.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  crearMockPostulacion,
  crearCtxPostulacion,
  usuarioRoot,
} = require('./helpers/strapi-mock-postulacion');
const brevo = require('../src/services/brevo');
const factoryController = require('../src/api/postulacion-socio/controllers/postulacion-socio');

const UID_INVITACION = 'api::invitacion.invitacion';
const UID_POSTULACION = 'api::postulacion-socio.postulacion-socio';

// El buzón del equipo se lee del entorno en CADA llamada (`brevo.leerConfig`),
// así que se fija aquí para poder comprobar el aviso interno.
const EQUIPO = 'equipo@ciudadan.org';
const envOriginal = process.env.BREVO_NOTIFICACION_EMAIL;
process.env.BREVO_NOTIFICACION_EMAIL = EQUIPO;

const postulacionBase = () => ({
  id: 7,
  nombre_completo: 'Ana Pérez',
  email: 'Ana.Perez@Ejemplo.COM',
  telefono: '5512345678',
  estado: 'revisada',
  agencia: { id: 3, nombre: 'Agencia Norte' },
});

/** Monta el mock, el controller y un doble de `brevo.enviar`. */
function montar({ postulaciones = [postulacionBase()], invitaciones = [] } = {}) {
  const mock = crearMockPostulacion({ postulaciones, invitaciones });
  const controller = factoryController({ strapi: mock.strapi });
  const enviados = [];
  const original = brevo.enviar;
  brevo.enviar = async (mensaje) => {
    enviados.push(mensaje);
    return { enviado: true, status: 202, messageId: 'doble' };
  };
  return {
    ...mock,
    controller,
    enviados,
    restaurar: () => { brevo.enviar = original; },
  };
}

const ctxDe = (estado) => crearCtxPostulacion({
  params: { id: '7' },
  body: { estado },
  user: usuarioRoot(),
});

test('(a) al resolver a "aceptada" se crea la invitación con el correo y la agencia', async () => {
  const { controller, tablas, enviados, restaurar } = montar();
  try {
    const ctx = ctxDe('aceptada');
    await controller.resolver(ctx);

    assert.equal(ctx.body.ok, true);
    const invitaciones = tablas[UID_INVITACION];
    assert.equal(invitaciones.length, 1, 'debe crearse exactamente una invitación');

    const invitacion = invitaciones[0];
    assert.equal(invitacion.email, 'ana.perez@ejemplo.com', 'el correo se normaliza a minúsculas');
    assert.equal(invitacion.agencia, 3, 'la agencia es la RELACIÓN de la postulación');
    assert.equal(invitacion.estado, 'pendiente');
    assert.equal(invitacion.nombre, 'Ana Pérez');
    assert.ok(invitacion.fecha_invitacion, 'debe llevar fecha de invitación');
    assert.ok(invitacion.publishedAt, 'la invitación se publica (draftAndPublish)');
    assert.equal(invitacion.metadata.postulacion_id, 7);

    const postulacion = tablas[UID_POSTULACION][0];
    assert.equal(postulacion.estado, 'aceptada', 'la postulación queda aceptada');

    assert.equal(enviados.length, 2, 'se avisa al candidato y al buzón del equipo');
    assert.equal(enviados[0].to, 'ana.perez@ejemplo.com');
    assert.deepEqual(enviados[1].to, [EQUIPO], 'el aviso interno va al buzón del equipo');
    assert.equal(ctx.body.invitacion.id, invitacion.id);
    assert.equal(ctx.body.correo.candidato.enviado, true);
  } finally {
    restaurar();
    delete global.strapi;
  }
});

test('(b) una segunda aceptación de la misma postulación no duplica la invitación', async () => {
  const { controller, tablas, enviados, restaurar } = montar();
  try {
    await controller.resolver(ctxDe('aceptada'));
    await controller.resolver(ctxDe('aceptada'));

    assert.equal(tablas[UID_INVITACION].length, 1, 'no se crea una segunda invitación');
    assert.equal(enviados.length, 2, 'no se reenvía el correo al reutilizar la invitación');
    assert.equal(tablas[UID_POSTULACION][0].estado, 'aceptada');
  } finally {
    restaurar();
    delete global.strapi;
  }
});

test('(c) un estado distinto de "aceptada" no crea invitación', async () => {
  const { controller, tablas, enviados, restaurar } = montar();
  try {
    for (const estado of ['pendiente', 'revisada', 'contactada', 'rechazada']) {
      const ctx = ctxDe(estado);
      await controller.resolver(ctx);
      assert.equal(ctx.body.ok, true);
    }
    assert.equal(tablas[UID_INVITACION].length, 0, 'ningún estado distinto de aceptada crea invitación');
    assert.equal(enviados.length, 0, 'ni un solo correo');
    assert.equal(tablas[UID_POSTULACION][0].estado, 'rechazada');
  } finally {
    restaurar();
    delete global.strapi;
  }
});

test('(d) un fallo del envío de correo (Brevo) NO rompe la operación', async () => {
  const { controller, tablas, enviados, restaurar } = montar();
  const original = brevo.enviar;
  brevo.enviar = async () => { throw new Error('brevo caido'); };
  try {
    const ctx = ctxDe('aceptada');
    await controller.resolver(ctx);

    assert.equal(ctx.body.ok, true, 'la aceptación no se cae por un fallo de correo');
    assert.equal(tablas[UID_INVITACION].length, 1, 'la invitación sí se creó');
    assert.equal(tablas[UID_POSTULACION][0].estado, 'aceptada');
    assert.equal(ctx.body.correo.candidato.enviado, false);
    assert.equal(ctx.body.correo.candidato.motivo, 'error-excepcion');
  } finally {
    brevo.enviar = original;
    restaurar();
    delete global.strapi;
  }
});

test('(d2) sin configuración de Brevo la operación sigue completando', async () => {
  const { controller, tablas, restaurar } = montar();
  const original = brevo.enviar;
  brevo.enviar = async () => ({ enviado: false, motivo: 'sin-configurar' });
  try {
    const ctx = ctxDe('aceptada');
    await controller.resolver(ctx);
    assert.equal(ctx.body.ok, true);
    assert.equal(tablas[UID_INVITACION].length, 1);
    assert.equal(ctx.body.correo.candidato.enviado, false);
    assert.equal(ctx.body.correo.candidato.motivo, 'sin-configurar');
  } finally {
    brevo.enviar = original;
    restaurar();
    delete global.strapi;
  }
});

test('(e) si el alta de la invitación falla, la postulación NO queda aceptada a medias', async () => {
  const { controller, tablas, restaurar } = montar();
  try {
    const original = mockCreateThrows(tablas);
    const ctx = ctxDe('aceptada');
    await assert.rejects(() => controller.resolver(ctx), /alta de invitación simulada/);
    assert.equal(tablas[UID_POSTULACION][0].estado, 'revisada', 'la postulación sigue como estaba');
    void original;
  } finally {
    restaurar();
    delete global.strapi;
  }
});

test('(f) el HTML del correo escapa el nombre del candidato', async () => {
  const postulacion = postulacionBase();
  postulacion.nombre_completo = 'Ana <b>Pérez</b> & "Co"';
  const { controller, enviados, restaurar } = montar({ postulaciones: [postulacion] });
  try {
    await controller.resolver(ctxDe('aceptada'));
    const html = enviados.map((m) => m.htmlContent).join('\n');
    // El nombre original trae HTML: debe llegar escapado (con la MISMA función
    // que usa el servicio real de Brevo), nunca crudo.
    const escapado = brevo.escapar(postulacion.nombre_completo);
    assert.ok(html.includes(escapado), 'el nombre llega escapado en el HTML');
    assert.ok(!html.includes('<b>'), 'no se inyecta HTML desde el nombre');
    assert.ok(!html.includes('"Co"'), 'no queda HTML crudo desde el nombre');
    assert.ok(!html.includes(postulacion.nombre_completo), 'el nombre crudo no aparece');
  } finally {
    restaurar();
    delete global.strapi;
  }
});

// ---------------------------------------------------------------------------
// Listado de invitaciones (GET /api/invitaciones) que consume el frontend
// vía `getInvitaciones` de candidatosService.js.
// ---------------------------------------------------------------------------

const factoryInvitacionController = require('../src/api/invitacion/controllers/invitacion');

const invitacionBase = (over = {}) => ({
  id: 50,
  email: 'ana.perez@ejemplo.com',
  nombre: 'Ana Pérez',
  estado: 'pendiente',
  fecha_invitacion: '2026-11-01T10:00:00.000Z',
  fecha_respuesta: null,
  metadata: { postulacion_id: 7 },
  agencia: 3,
  publishedAt: '2026-11-01T10:00:00.000Z',
  ...over,
});

const usuarioAgencia = (agenciaId) => ({
  id: 5,
  roles: { extra: [] },
  agencia: { id: agenciaId, nombre: 'Agencia Norte' },
});

const ctxDeListado = (user, query = {}) => ({
  query,
  state: { strapiUser: user },
  body: undefined,
});

test('(g) el listado solo devuelve las invitaciones de la agencia del llamante', async () => {
  const mock = crearMockPostulacion({
    postulaciones: [],
    invitaciones: [
      invitacionBase({ id: 1, agencia: 3, email: 'propia@ejemplo.com' }),
      invitacionBase({ id: 2, agencia: 4, email: 'ajena@ejemplo.com' }),
    ],
  });
  const controller = factoryInvitacionController({ strapi: mock.strapi });
  const ctx = ctxDeListado(usuarioAgencia(3));
  await controller.find(ctx);

  assert.equal(ctx.body.data.length, 1, 'solo ve las de su agencia');
  assert.equal(ctx.body.data[0].id, 1);
  assert.equal(ctx.body.data[0].attributes.email, 'propia@ejemplo.com');
  assert.equal(ctx.body.meta.pagination.total, 1);
  delete global.strapi;
});

test('(h) root ve todas las invitaciones', async () => {
  const mock = crearMockPostulacion({
    postulaciones: [],
    invitaciones: [
      invitacionBase({ id: 1, agencia: 3 }),
      invitacionBase({ id: 2, agencia: 4 }),
    ],
  });
  const controller = factoryInvitacionController({ strapi: mock.strapi });
  const ctx = ctxDeListado(usuarioRoot());
  await controller.find(ctx);

  assert.equal(ctx.body.data.length, 2, 'root ve todas las agencias');
  delete global.strapi;
});

test('(i) un usuario sin agencia no ve ninguna invitación', async () => {
  const mock = crearMockPostulacion({
    postulaciones: [],
    invitaciones: [invitacionBase({ id: 1, agencia: 3 })],
  });
  const controller = factoryInvitacionController({ strapi: mock.strapi });
  const ctx = ctxDeListado({ id: 9, roles: { extra: [] } });
  await controller.find(ctx);

  assert.deepEqual(ctx.body.data, [], 'sin agencia no se lista nada');
  assert.equal(ctx.body.meta.pagination.total, 0);
  delete global.strapi;
});

test('(j) el listado respeta el filtro de estado y el límite', async () => {
  const mock = crearMockPostulacion({
    postulaciones: [],
    invitaciones: [
      invitacionBase({ id: 1, agencia: 3, estado: 'pendiente' }),
      invitacionBase({ id: 2, agencia: 3, estado: 'aceptada' }),
      invitacionBase({ id: 3, agencia: 3, estado: 'aceptada' }),
    ],
  });
  const controller = factoryInvitacionController({ strapi: mock.strapi });

  const ctx = ctxDeListado(usuarioAgencia(3), { 'filters[estado][$eq]': 'aceptada' });
  await controller.find(ctx);
  assert.equal(ctx.body.data.length, 2, 'solo las del estado pedido');
  assert.ok(ctx.body.data.every((i) => i.attributes.estado === 'aceptada'));

  const ctx2 = ctxDeListado(usuarioAgencia(3), { 'pagination[limit]': '1' });
  await controller.find(ctx2);
  assert.equal(ctx2.body.data.length, 1, 'respeta el límite solicitado');
  delete global.strapi;
});

/** Hace que falle SOLO el alta de invitaciones (no la actualización). */
function mockCreateThrows(tablas) {
  const original = global.strapi.entityService.create;
  global.strapi.entityService.create = async (uid, params) => {
    if (uid === UID_INVITACION) throw new Error('alta de invitación simulada');
    return original(uid, params);
  };
  return original;
}
