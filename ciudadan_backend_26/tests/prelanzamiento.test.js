'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarRegistro, normalizarTelefono, CIERRE } = require('../src/api/postulacion/utils/prelanzamiento');
const controller = require('../src/api/postulacion/controllers/prelanzamiento');
const base = { nombre: 'Prueba Ciudadan', telefono: '5512345678', estado: 'Jalisco', municipio: 'Guadalajara', consentimiento: true, origen: 'https://ciudadan.org/taxis/conductor/registro?utm_source=qr', utm: { utm_source: 'qr', otro: 'no' } };
const modalidades = {
  conductor: { vehiculo: 'taxi', ciudad: 'Guadalajara', lider: 'RED-123' },
  lider: { invitados: '21-50', conduce: 'no', ciudad: 'Guadalajara' },
  'socio-estatal': { estadoSolicitado: 'Jalisco', experiencia: 'Organización de redes de transporte', nodo: 'si' },
};
for (const [tipo, fields] of Object.entries(modalidades)) {
  test(`valida y conserva los datos de ${tipo}`, () => {
    const { errors, data } = validarRegistro({ ...base, tipo, ...fields }, CIERRE - 1);
    assert.deepEqual(errors, {});
    assert.equal(data.tipo, tipo);
    assert.equal(data.telefono, '+525512345678');
    assert.equal(data.seguimiento, 'pendiente');
    assert.deepEqual(data.utm, { utm_source: 'qr' });
    assert.equal(data.promocionReservada, tipo === 'conductor');
    assert.equal(data.fecha, new Date(CIERRE - 1).toISOString());
  });
}
test('normaliza variantes de un mismo teléfono', () => {
  for (const phone of ['55 1234 5678', '+52 55 1234 5678', '+5215512345678']) assert.equal(normalizarTelefono(phone), '+525512345678');
  assert.equal(normalizarTelefono('123'), null);
});
test('rechaza estados asignados, consentimiento ausente y campos condicionales', () => {
  const result = validarRegistro({ ...base, tipo: 'socio-estatal', estado: 'Ciudad de México', estadoSolicitado: 'Estado de México', consentimiento: false }, CIERRE - 1);
  for (const key of ['estado', 'estadoSolicitado', 'consentimiento', 'experiencia', 'nodo']) assert.ok(result.errors[key]);
});
test('cierra exactamente a medianoche del 9 de octubre en CDMX', () => {
  assert.ok(validarRegistro({ ...base, tipo: 'conductor', ...modalidades.conductor }, CIERRE).errors.general);
});
test('descarta campos arbitrarios y URLs no HTTP', () => {
  const result = validarRegistro({ ...base, tipo: 'conductor', ...modalidades.conductor, status: 'aprobado', origen: 'javascript:alert(1)' }, CIERRE - 1);
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
