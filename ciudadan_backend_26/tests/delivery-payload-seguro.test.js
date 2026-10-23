'use strict';

process.env.APP_KEYS = process.env.APP_KEYS || 'clave-solo-para-tests';

/**
 * Payloads maliciosos (spec §10 criterio 4, fase B7 del Agente 1): un usuario
 * comun NO puede modificar status, approved_at, reviewer, roles, agencia ni
 * campos privados mediante PATCH/POST del solicitante. Se prueba en la
 * SUPERFICIE REAL (controladores), no solo en servicios.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { crearStrapiRepartidoresMock, crearCtxRepartidores } = require('./helpers/strapi-mock-repartidores');
const { UIDS } = require('../src/api/delivery-registration/utils/constants');
const { PREGUNTAS } = require('../src/api/delivery-registration/utils/questionnaire');

const expedienteCtrl = require('../src/api/delivery-registration/controllers/expediente');
const vehiculosCtrl = require('../src/api/delivery-registration/controllers/vehiculos');
const capacitacionCtrl = require('../src/api/delivery-registration/controllers/capacitacion');
const evidenciasCtrl = require('../src/api/delivery-registration/controllers/evidencias');

const CLABE_VALIDA = '002180000123456789';
const CURP_VALIDA = 'GARC900520HDFRRT09';

function montar() {
  return crearStrapiRepartidoresMock({
    tablas: {
      [UIDS.USER]: [
        { id: 7, email: 'solicitante@ciudadan.org', roles: { extra: [] } },
        { id: 20, email: 'otro@ciudadan.org', roles: { extra: [] } },
      ],
      [UIDS.AGENCIA]: [
        { id: 3, nombre: 'A', tipo: 'local', publishedAt: '2026-01-01T00:00:00Z' },
        { id: 4, nombre: 'B', tipo: 'local', publishedAt: '2026-01-01T00:00:00Z' },
      ],
      [UIDS.PROFILE]: [],
      [UIDS.VEHICLE]: [],
      [UIDS.EVENT]: [],
      [UIDS.TRAINING]: [],
      [UIDS.SIGNAL]: [],
      [UIDS.WAITLIST]: [],
      'plugin::upload.file': [
        { id: 301, name: 'foto.jpg', mime: 'image/jpeg', size: 1, url: '/uploads/foto.jpg' },
      ],
    },
  });
}

async function crearExpediente(mock, userId = 7) {
  const user = mock.tablas[UIDS.USER].find((u) => u.id === userId);
  const ctx = crearCtxRepartidores({ body: { agency_id: 3, territory: 'CDMX' }, strapiUser: user });
  await expedienteCtrl.iniciar(ctx);
  return { user, profile: mock.tablas[UIDS.PROFILE].find((p) => p.user === userId) };
}

test('PATCH /me con payload malicioso no toca status, reviewer, roles, agencia ni campos privados', async () => {
  const mock = montar();
  const { user, profile } = await crearExpediente(mock);
  const rolesAntes = JSON.parse(JSON.stringify(mock.tablas[UIDS.USER][0].roles));

  const ctx = crearCtxRepartidores({
    strapiUser: user,
    body: {
      // Campos legitimos: se guardan.
      phone: '5512345678',
      curp: CURP_VALIDA,
      birthdate: '1990-05-20',
      account_holder_name: 'Carlos Garcia',
      payout_clabe: CLABE_VALIDA,
      accept_terms: true,
      // ==== Payload malicioso: campos NO editables por el solicitante ====
      status: 'approved',
      approved_at: '2026-01-01T00:00:00Z',
      reviewer: 999,
      roles: { extra: ['admin', 'repartidor'] },
      agency: 4,
      agency_assigned_at: '1999-01-01T00:00:00Z',
      review_notes: 'auto-aprobado por payload',
      payout_clabe_encrypted: ' texto plano inyectado ',
      payout_clabe_last4: '1111',
      identity_verification_status: 'oficialmente_verificada',
      training_status: 'aprobado',
      training_score: 10,
      zoom_attendance_result: 'validado',
      approval_version: 5,
      id_front: 301,
    },
  });

  await expedienteCtrl.actualizar(ctx);
  assert.equal(ctx.body.ok, true);

  const p = mock.tablas[UIDS.PROFILE][0];
  // El estado solo avanza por la transicion normal draft -> pending_documents.
  assert.equal(p.status, 'pending_documents', 'status NO se toma del payload');
  // Campos protegidos: el valor INYECTADO no toma efecto y el campo queda
  // sin escribir (== null cubre undefined en el mock y null en Strapi).
  assert.ok(p.approved_at == null, 'approved_at no es inyectable');
  assert.notEqual(p.approved_at, '2026-01-01T00:00:00Z');
  assert.ok(p.reviewer == null, 'reviewer no es inyectable');
  assert.notEqual(p.reviewer, 999);
  assert.equal(p.agency, 3, 'la agencia NO se cambia por payload');
  assert.ok(p.review_notes == null, 'review_notes es privado y no escribible');
  assert.notEqual(p.identity_verification_status, 'oficialmente_verificada', 'el tipo de cotejo lo decide el revisor');
  assert.notEqual(p.training_status, 'aprobado', 'training_status no es inyectable');
  assert.notEqual(p.training_score, 10, 'training_score no es inyectable');
  assert.notEqual(p.zoom_attendance_result, 'validado', 'zoom no es inyectable');
  assert.notEqual(p.approval_version, 5, 'approval_version no es inyectable');
  assert.ok(p.id_front == null, 'las evidencias SOLO entran por el endpoint de evidencias');
  assert.notEqual(p.id_front, 301);
  assert.equal(p.payout_clabe_last4, '6789', 'last4 se deriva de la CLABE, no del payload');
  assert.ok(!String(p.payout_clabe_encrypted).includes('texto plano'), 'el sobre cifrado no es inyectable');
  assert.ok(p.payout_clabe_encrypted.startsWith('v1:'), 'la CLABE legitima se cifra');

  // Los roles del usuario quedan intactos.
  assert.deepEqual(mock.tablas[UIDS.USER][0].roles, rolesAntes);
});

test('POST /vehicles ignora status/validation_status inyectados y no admite campos ajenos', async () => {
  const mock = montar();
  const { user } = await crearExpediente(mock);

  const ctx = crearCtxRepartidores({
    strapiUser: user,
    body: {
      type: 'bicicleta',
      brand: 'B',
      model: 'M',
      color: 'C',
      // Malicioso:
      validation_status: 'verificado',
      delivery_profile: 999,
      juridical_classification: 'bicicleta_asistida',
      plate: 'HACK-001',
    },
  });

  await vehiculosCtrl.registrar(ctx);
  const v = mock.tablas[UIDS.VEHICLE][0];
  assert.equal(v.delivery_profile, mock.tablas[UIDS.PROFILE][0].id, 'la relacion la fija el backend');
  assert.notEqual(v.validation_status, 'verificado', 'validation_status no es inyectable');
  assert.ok(!v.plate, 'la bici NUNCA guarda placa, ni inyectada');
  assert.equal(v.juridical_classification, undefined, 'la clasificacion la decide el revisor');
});

test('POST /training con passed/score declarados: el backend recalcula todo', async () => {
  const mock = montar();
  const { user } = await crearExpediente(mock);

  const respuestas = {};
  for (let i = 0; i < PREGUNTAS.length; i++) {
    respuestas[PREGUNTAS[i].id] = i < 2 ? PREGUNTAS[i].correcta : (PREGUNTAS[i].correcta + 1) % 4;
  }

  const ctx = crearCtxRepartidores({
    strapiUser: user,
    body: { respuestas, passed: true, score: 10, version: 999 },
  });
  await capacitacionCtrl.presentar(ctx);

  assert.equal(ctx.body.score, 2, 'el score se recalcula server-side (2 aciertos reales)');
  assert.equal(ctx.body.passed, false, 'un passed:true del cliente no aprueba nada');
  const p = mock.tablas[UIDS.PROFILE][0];
  assert.equal(p.training_score, 2);
  assert.equal(p.training_status, 'reprobado');
  assert.equal(mock.tablas[UIDS.TRAINING][0].version, 1, 'la version del cuestionario la fija el backend');
});

test('POST /evidence con vehicle_id ajeno y slot inexistente rechazados', async () => {
  const mock = montar();
  const { user } = await crearExpediente(mock);

  // El "otro" usuario crea su expediente y su vehiculo.
  const { profile: otroProfile } = await crearExpediente(mock, 20);
  const vehiculoAjeno = await require('../src/api/delivery-registration/services/expediente-service')
    .registrarVehiculo({
      user: mock.tablas[UIDS.USER].find((u) => u.id === 20),
      body: { type: 'bicicleta', brand: 'X', model: 'Y', color: 'Z' },
    });
  assert.ok(vehiculoAjeno.id, 'vehiculo ajeno creado');

  const ctxAjeno = crearCtxRepartidores({
    strapiUser: user,
    body: { slot: 'photo_front', file_id: 301, vehicle_id: vehiculoAjeno.id },
  });
  await assert.rejects(
    () => evidenciasCtrl.adjuntar(ctxAjeno),
    (e) => e.status === 400 && /no pertenece a tu expediente/.test(e.message),
    'IDOR: no se adjunta evidencia al vehiculo de otro'
  );

  const ctxSlot = crearCtxRepartidores({
    strapiUser: user,
    body: { slot: 'status', file_id: 301 },
  });
  await assert.rejects(
    () => evidenciasCtrl.adjuntar(ctxSlot),
    (e) => e.status === 400 && /Slot/.test(e.message),
    'los "slots" son una lista cerrada'
  );

  assert.equal(otroProfile.id !== mock.tablas[UIDS.PROFILE][0].id, true);
  assert.ok(
    mock.tablas[UIDS.PROFILE][0].id_front == null,
    'nada se adjunto al expediente propio'
  );
});

test('POST / (iniciar) ignora status/user inyectados y usa la sesion', async () => {
  const mock = montar();
  const user = mock.tablas[UIDS.USER][0];

  const ctx = crearCtxRepartidores({
    strapiUser: user,
    body: { agency_id: 3, territory: 'CDMX', status: 'approved', user: 999, reviewer: 999 },
  });
  await expedienteCtrl.iniciar(ctx);

  const p = mock.tablas[UIDS.PROFILE][0];
  assert.equal(p.user, 7, 'el usuario es SIEMPRE el de la sesion');
  assert.notEqual(p.user, 999);
  assert.equal(p.status, 'draft', 'el estado inicial es draft, no el del payload');
  assert.ok(p.reviewer == null, 'reviewer no es inyectable');
  assert.notEqual(p.reviewer, 999);
});
