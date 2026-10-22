'use strict';

/**
 * Maquina de estados del expediente repartidor (spec §5 + §12D).
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ESTADOS,
  TRANSICIONES_VALIDAS,
  ESTADOS_EDITABLES_SOLICITANTE,
  esEstadoValido,
  puedeTransicionar,
  assertTransicion,
} = require('../src/api/delivery-registration/utils/state-machine');

test('los 9 estados de la spec estan definidos', () => {
  assert.deepEqual(ESTADOS, [
    'draft',
    'pending_documents',
    'pending_review',
    'corrections_required',
    'eligible_for_video_review',
    'pending_federal_audit',
    'approved',
    'rejected',
    'suspended',
  ]);
});

test('flujo ordinario completo es valido', () => {
  assert.equal(puedeTransicionar('draft', 'pending_documents'), true);
  assert.equal(puedeTransicionar('pending_documents', 'pending_review'), true);
  assert.equal(puedeTransicionar('pending_review', 'corrections_required'), true);
  assert.equal(puedeTransicionar('corrections_required', 'pending_review'), true);
  assert.equal(puedeTransicionar('pending_review', 'eligible_for_video_review'), true);
  assert.equal(puedeTransicionar('eligible_for_video_review', 'approved'), true);
});

test('flujo federal: bloqueo y resolucion', () => {
  assert.equal(puedeTransicionar('pending_review', 'pending_federal_audit'), true);
  assert.equal(puedeTransicionar('eligible_for_video_review', 'pending_federal_audit'), true);
  assert.equal(puedeTransicionar('pending_federal_audit', 'pending_review'), true);
  assert.equal(puedeTransicionar('pending_federal_audit', 'eligible_for_video_review'), true);
});

test('suspension y revalidacion; reapertura de rechazo', () => {
  assert.equal(puedeTransicionar('approved', 'suspended'), true);
  assert.equal(puedeTransicionar('suspended', 'approved'), true);
  assert.equal(puedeTransicionar('rejected', 'pending_review'), true);
});

test('transiciones invalidas rechazadas', () => {
  assert.equal(puedeTransicionar('draft', 'approved'), false, 'nunca draft->approved directo');
  assert.equal(puedeTransicionar('pending_documents', 'approved'), false);
  assert.equal(puedeTransicionar('approved', 'pending_review'), false, 'aprobado no regresa a revision');
  assert.equal(puedeTransicionar('suspended', 'pending_review'), false);
  assert.equal(puedeTransicionar('rejected', 'approved'), false);
  assert.equal(puedeTransicionar('inexistente', 'draft'), false);
  assert.equal(puedeTransicionar('draft', 'inexistente'), false);
});

test('el aprobado nunca se aprueba de nuevo por la via de estados', () => {
  assert.equal(puedeTransicionar('approved', 'approved'), false);
  assert.equal(puedeTransicionar('eligible_for_video_review', 'eligible_for_video_review'), false);
});

test('assertTransicion lanza Error plano 400 en transicion invalida', () => {
  assert.doesNotThrow(() => assertTransicion('draft', 'pending_review'));
  assert.throws(
    () => assertTransicion('draft', 'approved'),
    (err) => err.status === 400 && err.expose === true,
    'debe lanzar Error con status 400 y expose'
  );
});

test('estados editables por el solicitante', () => {
  assert.deepEqual(ESTADOS_EDITABLES_SOLICITANTE, [
    'draft',
    'pending_documents',
    'corrections_required',
  ]);
  for (const estado of ESTADOS) {
    assert.equal(esEstadoValido(estado), true, `estado ${estado} debe ser valido`);
  }
  assert.equal(esEstadoValido('bogus'), false);
});

test('TRANSICIONES_VALIDAS solo contiene estados conocidos', () => {
  for (const [de, destinos] of Object.entries(TRANSICIONES_VALIDAS)) {
    assert.equal(esEstadoValido(de), true, `origen desconocido ${de}`);
    for (const a of destinos) {
      assert.equal(esEstadoValido(a), true, `destino desconocido ${a} desde ${de}`);
    }
  }
});
