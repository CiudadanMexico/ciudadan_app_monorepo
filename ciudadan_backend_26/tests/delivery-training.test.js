'use strict';

/**
 * Cuestionario de capacitacion: 10 preguntas, 5 modulos, >= 8 aprueba,
 * respuestas correctas jamas viajan al cliente.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PREGUNTAS,
  preguntasPublicas,
  calificarExamen,
  EXAMEN_MINIMO_APROBATORIO,
} = require('../src/api/delivery-registration/utils/questionnaire');

test('el banco tiene 10 preguntas en 5 modulos (2 por modulo)', () => {
  assert.equal(PREGUNTAS.length, 10);
  const modulos = [...new Set(PREGUNTAS.map((p) => p.modulo))];
  assert.equal(modulos.length, 5);
  for (const modulo of modulos) {
    assert.equal(PREGUNTAS.filter((p) => p.modulo === modulo).length, 2);
  }
});

test('preguntasPublicas NO expone respuestas correctas', () => {
  const publicas = preguntasPublicas();
  assert.equal(publicas.length, 10);
  for (const p of publicas) {
    assert.equal(p.correcta, undefined, `la pregunta ${p.id} no debe exponer la correcta`);
    assert.equal(p.opciones.length, 4);
  }
});

function respuestasCon(aciertos, total = 10) {
  const respuestas = {};
  for (let i = 0; i < total; i++) {
    respuestas[PREGUNTAS[i].id] = i < aciertos ? PREGUNTAS[i].correcta : (PREGUNTAS[i].correcta + 1) % 4;
  }
  return respuestas;
}

test('calificarExamen aprueba con 8 y reprueba con 7', () => {
  assert.equal(EXAMEN_MINIMO_APROBATORIO, 8);

  const ocho = calificarExamen(respuestasCon(8));
  assert.equal(ocho.score, 8);
  assert.equal(ocho.total, 10);
  assert.equal(ocho.passed, true);

  const siete = calificarExamen(respuestasCon(7));
  assert.equal(siete.score, 7);
  assert.equal(siete.passed, false);
});

test('sin respuestas o con respuestas fuera de rango no revienta ni aprueba', () => {
  const vacio = calificarExamen(undefined);
  assert.equal(vacio.score, 0);
  assert.equal(vacio.passed, false);

  const basura = calificarExamen({ [PREGUNTAS[0].id]: 99, [PREGUNTAS[1].id]: 'a' });
  assert.equal(basura.score, 0);
  assert.deepEqual(basura.respuestasInvalidas, [PREGUNTAS[0].id, PREGUNTAS[1].id]);
  assert.equal(basura.passed, false);
});

test('diez respuestas fuera de rango no marcan aprobacion por error', () => {
  const todasMal = {};
  for (const p of PREGUNTAS) todasMal[p.id] = -1;
  const r = calificarExamen(todasMal);
  assert.equal(r.score, 0);
  assert.equal(r.passed, false);
  assert.equal(r.respuestasInvalidas.length, 10);
});
