'use strict';

/**
 * Matriz de requisitos por tipo de vehiculo + prechecks de envio +
 * matriz de cotejos documentales (spec §4, §6.10, §12B, §12E).
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validarVehiculo,
  tipoEfectivo,
  prechecksEnvio,
  documentosRequeridosParaCotejo,
  matrizDocumentalCompleta,
  validarIdentidadDocs,
} = require('../src/api/delivery-registration/utils/requirements');

const HOY = new Date('2026-10-22T00:00:00Z');

function vehiculoCompleto(tipo, extra = {}) {
  const base = { type: tipo, brand: 'Marca', model: 'Modelo', color: 'Rojo' };
  if (tipo === 'bicicleta_electrica') {
    Object.assign(base, { motor_power: '250W', max_assisted_speed: 25 });
  }
  if (tipo === 'motocicleta') {
    Object.assign(base, {
      year: 2022,
      plate: 'ABC-123-D',
      license_number: 'LIC123456',
      license_expiration: '2027-12-31',
      insurance_expiration: '2027-06-30',
    });
  }
  const media = {
    bicicleta: ['photo_front', 'photo_side', 'photo_delivery_bag', 'video_presentation'],
    bicicleta_electrica: [
      'photo_front',
      'photo_side',
      'photo_delivery_bag',
      'video_presentation',
      'motor_label_photo',
    ],
    motocicleta: [
      'photo_front',
      'photo_side',
      'photo_back',
      'photo_helmet',
      'photo_delivery_bag',
      'video_presentation',
      'license_front_photo',
      'license_back_photo',
      'circulation_card_photo',
      'insurance_policy_photo',
    ],
  }[tipo];
  for (const slot of media) base[slot] = { id: 1 };
  return { ...base, ...extra };
}

test('bicicleta NUNCA exige placa, licencia ni poliza', () => {
  const v = vehiculoCompleto('bicicleta');
  assert.equal(validarVehiculo(v, HOY).ok, true);
  assert.equal(v.plate, undefined);
  const requisitos = validarVehiculo({ ...v, photo_delivery_bag: null }, HOY);
  assert.equal(requisitos.ok, false);
  assert.ok(requisitos.faltantes.some((f) => f.media === 'photo_delivery_bag'));
  assert.ok(!JSON.stringify(requisitos.faltantes).includes('plate'));
  assert.ok(!JSON.stringify(requisitos.faltantes).includes('license'));
});

test('motocicleta exige licencia, tarjeta, seguro y las cinco fotos', () => {
  const v = vehiculoCompleto('motocicleta');
  assert.equal(validarVehiculo(v, HOY).ok, true);

  const sinSeguro = { ...v, insurance_policy_photo: null };
  const r1 = validarVehiculo(sinSeguro, HOY);
  assert.equal(r1.ok, false);
  assert.ok(r1.faltantes.some((f) => f.media === 'insurance_policy_photo'));

  const sinPlaca = { ...v, plate: '' };
  assert.equal(validarVehiculo(sinPlaca, HOY).ok, false);
});

test('motocicleta con licencia o seguro vencidos no pasa', () => {
  const vencida = vehiculoCompleto('motocicleta', { license_expiration: '2025-01-01' });
  const r = validarVehiculo(vencida, HOY);
  assert.equal(r.ok, false);
  assert.ok(r.faltantes.some((f) => f.campo === 'license_expiration' && f.motivo.includes('vencido')));
});

test('electrica clasificada como motorizado adopta la matriz de motocicleta', () => {
  const ebike = vehiculoCompleto('bicicleta_electrica');
  assert.equal(tipoEfectivo(ebike), 'bicicleta_electrica');

  const motorizada = { ...ebike, juridical_classification: 'motorizado' };
  assert.equal(tipoEfectivo(motorizada), 'motocicleta');

  // La matriz de moto exige placa/licencia/seguro: la electrica "disfrazada" no pasa.
  const r = validarVehiculo(motorizada, HOY);
  assert.equal(r.ok, false);
  assert.ok(r.faltantes.some((f) => f.campo === 'plate'));
  assert.ok(r.faltantes.some((f) => f.media === 'circulation_card_photo'));
});

test('identidad propia o reutilizada del INE del usuario (sin duplicar almacenamiento)', () => {
  const conDocs = validarIdentidadDocs(
    { id_front: { id: 1 }, id_back: { id: 2 }, selfie: { id: 3 } },
    {}
  );
  assert.equal(conDocs.ok, true);
  assert.equal(conDocs.reutilizada, false);

  const reutilizada = validarIdentidadDocs(
    {},
    { ine_frente: { id: 9 }, ine_tras: { id: 10 } }
  );
  assert.equal(reutilizada.ok, false, 'sin selfie propia no basta el INE');
  assert.ok(reutilizada.faltantes.some((f) => f.media === 'selfie'));

  const completa = validarIdentidadDocs(
    { selfie: { id: 3 } },
    { ine_frente: { id: 9 }, ine_tras: { id: 10 } }
  );
  assert.equal(completa.ok, true);
  assert.equal(completa.reutilizada, true);
});

function profileCompleto() {
  return {
    curp: 'GARC900520HDFRRT09',
    birthdate: '1990-05-20',
    phone: '5512345678',
    id_front: { id: 1 },
    id_back: { id: 2 },
    selfie: { id: 3 },
    payout_clabe_encrypted: 'v1:abc',
    payout_clabe_last4: '6789',
    account_holder_name: 'Carlos Garcia',
    payment_validation_status: 'formato_valido',
    training_status: 'aprobado',
    training_score: 9,
    terms_accepted_at: '2026-10-01T00:00:00Z',
    privacy_accepted_at: '2026-10-01T00:00:00Z',
  };
}

test('prechecksEnvio aprueba un expediente completo con motocicleta', () => {
  const res = prechecksEnvio({
    profile: profileCompleto(),
    vehicle: vehiculoCompleto('motocicleta'),
    user: {},
    hoy: HOY,
  });
  assert.equal(res.ok, true);
  assert.deepEqual(res.faltantes, []);
  assert.equal(res.identidadReutilizada, false);
});

test('prechecksEnvio reporta cada faltante por su nombre', () => {
  const res = prechecksEnvio({
    profile: { ...profileCompleto(), curp: null, payment_validation_status: 'pendiente', training_status: 'pendiente', terms_accepted_at: null },
    vehicle: null,
    user: {},
    hoy: HOY,
  });
  assert.equal(res.ok, false);
  const campos = res.faltantes.map((f) => f.campo);
  assert.ok(campos.includes('identidad'));
  assert.ok(campos.includes('phone') === false, 'el telefono si esta');
  assert.ok(campos.includes('clabe'));
  assert.ok(campos.includes('vehicle'));
  assert.ok(campos.includes('training'));
  assert.ok(campos.includes('terms'));
});

test('prechecksEnvio funciona con identidad reutilizada (INE del usuario)', () => {
  const profile = { ...profileCompleto() };
  delete profile.id_front;
  delete profile.id_back;
  const res = prechecksEnvio({
    profile,
    vehicle: vehiculoCompleto('bicicleta'),
    user: { ine_frente: { id: 9 }, ine_tras: { id: 10 } },
    hoy: HOY,
  });
  assert.equal(res.ok, true);
  assert.equal(res.identidadReutilizada, true);
});

test('documentosRequeridosParaCotejo refleja identidad reutilizada y matriz del vehiculo', () => {
  const propios = documentosRequeridosParaCotejo({
    profile: profileCompleto(),
    user: {},
    vehicle: vehiculoCompleto('bicicleta'),
  }).map((d) => d.document_id);
  assert.ok(propios.includes('id_front'));
  assert.ok(propios.includes('selfie'));
  assert.ok(propios.includes('photo_delivery_bag'));
  assert.ok(!propios.includes('license_front_photo'), 'bici no exige cotejo de licencia');

  const reutilizada = documentosRequeridosParaCotejo({
    profile: { selfie: { id: 3 } },
    user: { ine_frente: { id: 9 }, ine_tras: { id: 10 } },
    vehicle: vehiculoCompleto('motocicleta'),
  }).map((d) => d.document_id);
  assert.ok(reutilizada.includes('ine_frente'));
  assert.ok(reutilizada.includes('ine_tras'));
  assert.ok(reutilizada.includes('circulation_card_photo'));
});

test('matrizDocumentalCompleta exige cotejo verified por cada documento requerido', () => {
  const base = { profile: profileCompleto(), user: {}, vehicle: vehiculoCompleto('bicicleta') };
  const requeridos = documentosRequeridosParaCotejo(base);

  const cotejosOk = requeridos.map((d) => ({
    document_id: d.document_id,
    check_type: 'visually_reviewed',
    result: 'verified',
    official_source_url: null,
  }));
  assert.equal(matrizDocumentalCompleta({ ...base, cotejos: cotejosOk }).ok, true);

  const sinUno = cotejosOk.slice(0, -1);
  const r2 = matrizDocumentalCompleta({ ...base, cotejos: sinUno });
  assert.equal(r2.ok, false);
  assert.deepEqual(r2.pendientes, [requeridos.at(-1).document_id]);
});

test('matrizDocumentalCompleta: cotejo "oficial" sin URL cuenta como marcacion falsa', () => {
  const base = { profile: profileCompleto(), user: {}, vehicle: vehiculoCompleto('bicicleta') };
  const requeridos = documentosRequeridosParaCotejo(base);
  const cotejos = requeridos.map((d) => ({
    document_id: d.document_id,
    check_type: 'officially_checked',
    result: 'verified',
    official_source_url: null, // falta el metodo/fuente: no es verificacion oficial
  }));
  const r = matrizDocumentalCompleta({ ...base, cotejos });
  assert.equal(r.ok, false);
  assert.equal(r.pendientes.length, requeridos.length);
});

test('matrizDocumentalCompleta usa el ULTIMO cotejo por documento', () => {
  const base = { profile: profileCompleto(), user: {}, vehicle: vehiculoCompleto('bicicleta') };
  const requeridos = documentosRequeridosParaCotejo(base);
  const doc = requeridos[0].document_id;

  const cotejos = requeridos.map((d) => ({
    document_id: d.document_id,
    check_type: 'visually_reviewed',
    result: 'verified',
    official_source_url: null,
  }));
  cotejos.push({
    document_id: doc,
    check_type: 'officially_checked',
    result: 'mismatch',
    official_source_url: 'https://fuente-oficial.gob.mx',
  });

  const r = matrizDocumentalCompleta({ ...base, cotejos });
  assert.equal(r.ok, false);
  assert.deepEqual(r.pendientes, [doc], 'el cotejo contradictorio mas reciente domina');
});
