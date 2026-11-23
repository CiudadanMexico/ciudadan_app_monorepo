'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarRegistro, normalizarTelefono, CIERRE } = require('../src/api/postulacion/utils/prelanzamiento');
const controller = require('../src/api/postulacion/controllers/prelanzamiento');

// Corte promocional: 00:00 del 14 de diciembre 2026, hora CDMX (UTC-6)
const CIERRE_PROMO = Date.parse('2026-12-14T00:00:00-06:00');

const base = { nombre: 'Prueba Ciudadan', telefono: '5512345678', estado: 'Jalisco', municipio: 'Guadalajara', consentimiento: true, origen: 'https://ciudadan.org/taxis/conductor/registro?utm_source=qr', utm: { utm_source: 'qr', otro: 'no' } };
const modalidades = {
  conductor: { vehiculo: 'taxi', ciudad: 'Guadalajara', lider: 'RED-123' },
  lider: { invitados: '21-50', conduce: 'no', ciudad: 'Guadalajara' },
  'socio-estatal': { estadoSolicitado: 'Jalisco', experiencia: 'Organización de redes de transporte', nodo: 'si' },
};

for (const [tipo, fields] of Object.entries(modalidades)) {
  test(`valida y conserva los datos de ${tipo} (antes del corte promo)`, () => {
    const { errors, data } = validarRegistro({ ...base, tipo, ...fields }, CIERRE_PROMO - 1);
    assert.deepEqual(errors, {});
    assert.equal(data.tipo, tipo);
    assert.equal(data.telefono, '+525512345678');
    assert.equal(data.seguimiento, 'pendiente');
    assert.deepEqual(data.utm, { utm_source: 'qr' });
    // Solo conductores antes del corte tienen promocionReservada
    assert.equal(data.promocionReservada, tipo === 'conductor');
    assert.equal(data.fecha, new Date(CIERRE_PROMO - 1).toISOString());
  });

  test(`valida y conserva los datos de ${tipo} (después del corte promo)`, () => {
    const { errors, data } = validarRegistro({ ...base, tipo, ...fields }, CIERRE_PROMO + 1);
    assert.deepEqual(errors, {});
    assert.equal(data.tipo, tipo);
    assert.equal(data.telefono, '+525512345678');
    assert.equal(data.seguimiento, 'pendiente');
    assert.deepEqual(data.utm, { utm_source: 'qr' });
    // Después del corte, NADIE tiene promocionReservada
    assert.equal(data.promocionReservada, false);
    assert.equal(data.fecha, new Date(CIERRE_PROMO + 1).toISOString());
  });
}

test('normaliza variantes de un mismo teléfono', () => {
  for (const phone of ['55 1234 5678', '+52 55 1234 5678', '+5215512345678']) assert.equal(normalizarTelefono(phone), '+525512345678');
  assert.equal(normalizarTelefono('123'), null);
});

test('rechaza estados asignados en estadoSolicitado, consentimiento ausente y campos condicionales', () => {
  const result = validarRegistro({ ...base, tipo: 'socio-estatal', estado: 'Jalisco', estadoSolicitado: 'Ciudad de México', consentimiento: false }, CIERRE_PROMO - 1);
  // estado (residencia) es válido, estadoSolicitado (CDMX) debe fallar
  assert.ok(!result.errors.estado);
  assert.ok(result.errors.estadoSolicitado);
  assert.ok(result.errors.consentimiento);
  assert.ok(result.errors.experiencia);
  assert.ok(result.errors.nodo);
});

test('cierra promoción exactamente a medianoche del 14 de diciembre 2026 en CDMX (UTC-6)', () => {
  // En el momento exacto del corte (00:00 14 dic), la promo YA está cerrada
  const result = validarRegistro({ ...base, tipo: 'conductor', ...modalidades.conductor }, CIERRE_PROMO);
  assert.equal(result.data.promocionReservada, false);
  // No debe haber error 'general' - el registro ordinario sigue abierto
  assert.ok(!result.errors.general);
  // Un milisegundo antes SÍ tiene promo
  const before = validarRegistro({ ...base, tipo: 'conductor', ...modalidades.conductor }, CIERRE_PROMO - 1);
  assert.equal(before.data.promocionReservada, true);
  // Un milisegundo después NO tiene promo
  const after = validarRegistro({ ...base, tipo: 'conductor', ...modalidades.conductor }, CIERRE_PROMO + 1);
  assert.equal(after.data.promocionReservada, false);
});

test('después del corte: registro ordinario de conductor SIN promo sigue permitido', () => {
  const after = validarRegistro({ ...base, tipo: 'conductor', ...modalidades.conductor }, CIERRE_PROMO + 86400000); // 1 día después
  assert.deepEqual(after.errors, {});
  assert.equal(after.data.promocionReservada, false);
  assert.equal(after.data.tipo, 'conductor');
});

test('después del corte: registro ordinario de líder sigue permitido', () => {
  const after = validarRegistro({ ...base, tipo: 'lider', ...modalidades.lider }, CIERRE_PROMO + 86400000);
  assert.deepEqual(after.errors, {});
  assert.equal(after.data.promocionReservada, false);
  assert.equal(after.data.tipo, 'lider');
});

test('después del corte: registro ordinario de socio-estatal sigue permitido', () => {
  const after = validarRegistro({ ...base, tipo: 'socio-estatal', ...modalidades['socio-estatal'] }, CIERRE_PROMO + 86400000);
  assert.deepEqual(after.errors, {});
  assert.equal(after.data.promocionReservada, false);
  assert.equal(after.data.tipo, 'socio-estatal');
});

test('socio-estatal: rechaza CDMX y Estado de México como estadoSolicitado', () => {
  for (const estado of ['Ciudad de México', 'Estado de México']) {
    const result = validarRegistro({ ...base, tipo: 'socio-estatal', estado: 'Jalisco', estadoSolicitado: estado, experiencia: 'Test', nodo: 'si' }, CIERRE_PROMO - 1);
    assert.ok(result.errors.estadoSolicitado);
    assert.match(result.errors.estadoSolicitado, /CDMX y Estado de México ya están asignados/);
  }
});

test('socio-estatal: acepta estados disponibles como estadoSolicitado', () => {
  const result = validarRegistro({ ...base, tipo: 'socio-estatal', estado: 'Jalisco', estadoSolicitado: 'Jalisco', experiencia: 'Test', nodo: 'si' }, CIERRE_PROMO - 1);
  assert.ok(!result.errors.estadoSolicitado);
});

test('descarta campos arbitrarios y URLs no HTTP', () => {
  const result = validarRegistro({ ...base, tipo: 'conductor', ...modalidades.conductor, status: 'aprobado', origen: 'javascript:alert(1)' }, CIERRE_PROMO - 1);
  assert.ok(result.errors.origen);
  assert.equal(result.data.status, undefined);
});

test('guarda en postulaciones y rechaza duplicados sin exponer datos', async () => {
  const rows = [];
  global.strapi = {
    db: { query: () => ({ findOne: async ({ where }) => rows.find(row => row.prelanzamiento_clave === where.prelanzamiento_clave) }) },
    entityService: { create: async (uid, { data }) => { assert.equal(uid, 'api::postulacion.postulacion'); rows.push(data); return { id: 1 }; } },
    log: { error() {} },
  };
  const ctx = () => ({ request: { body: { data: { ...base, tipo: 'conductor', ...modalidades.conductor } } }, conflict(message) { this.status = 409; this.body = { message }; }, badRequest(message) { throw new Error(message); } });
  const first = ctx();
  await controller.registrar(first);
  assert.equal(first.status, 201);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].publishedAt, null);
  assert.equal(rows[0].prelanzamiento_datos.lider, 'RED-123');
  assert.equal(first.body.data.telefono, undefined);
  const second = ctx();
  await controller.registrar(second);
  assert.equal(second.status, 409);
  assert.equal(rows.length, 1);
  delete global.strapi;
});
