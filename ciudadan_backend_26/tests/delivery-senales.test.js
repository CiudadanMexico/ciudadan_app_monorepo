'use strict';

/**
 * Motor de senales de riesgo (spec §12G): reglas explicables, niveles y
 * bloqueo federal solo con senal ALTA.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluarCotejo,
  evaluarDuplicidad,
  evaluarVehiculoAlEnviar,
  REGLAS,
} = require('../src/api/delivery-registration/utils/senales');

test('cotejo contradictorio genera senal ALTA', () => {
  const mismatch = evaluarCotejo({ document_id: 'id_front', result: 'mismatch' });
  assert.equal(mismatch.regla, REGLAS.COTEJO_CONTRICTORIO);
  assert.equal(mismatch.level, 'alta');

  const reported = evaluarCotejo({ document_id: 'license_front_photo', result: 'reported' });
  assert.equal(reported.level, 'alta');
});

test('cotejos normales no generan senal', () => {
  assert.equal(evaluarCotejo({ document_id: 'id_front', result: 'verified' }), null);
  assert.equal(evaluarCotejo({ document_id: 'id_front', result: 'unavailable' }), null);
  assert.equal(evaluarCotejo({ document_id: 'id_front', result: 'not_found' }), null);
});

test('duplicidad contra expediente APROBADO es ALTA; contra uno en curso es MEDIA', () => {
  const alta = evaluarDuplicidad({
    serial_or_vin: 'SERIE-123',
    plate: null,
    otro: { serial_or_vin: 'SERIE-123', profile_status: 'approved' },
  });
  assert.equal(alta.level, 'alta');
  assert.ok(alta.data.colision.includes('numero de serie'));

  const media = evaluarDuplicidad({
    serial_or_vin: null,
    plate: 'ABC-123-D',
    otro: { plate: 'ABC-123-D', profile_status: 'pending_review' },
  });
  assert.equal(media.level, 'media');

  assert.equal(
    evaluarDuplicidad({ serial_or_vin: 'OTRA', plate: null, otro: { serial_or_vin: 'DIF' } }),
    null
  );
});

test('electrica sin clasificar genera senal BAJA al enviar (recordatorio de revision)', () => {
  const senal = evaluarVehiculoAlEnviar({
    type: 'bicicleta_electrica',
    juridical_classification: 'pendiente',
  });
  assert.equal(senal.level, 'baja');
  assert.equal(senal.regla, REGLAS.CLASIFICACION_PENDIENTE);

  assert.equal(
    evaluarVehiculoAlEnviar({ type: 'bicicleta_electrica', juridical_classification: 'bicicleta_asistida' }),
    null
  );
  assert.equal(evaluarVehiculoAlEnviar({ type: 'motocicleta' }), null);
  assert.equal(evaluarVehiculoAlEnviar(null), null);
});
