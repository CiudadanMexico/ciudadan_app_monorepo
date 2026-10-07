'use strict';

/**
 * Selftest de la validación de POST /api/prelanzamiento, con foco en el correo
 * opcional que alimenta la confirmación por Brevo.
 *
 * Ejecutar: node tests/selftests/prelanzamiento.selftest.js
 */

const assert = require('assert');
const {
  validarRegistro,
  normalizarEmail,
  normalizarTelefono,
} = require('../../src/api/postulacion/utils/prelanzamiento');

// Fecha previa al cierre (9 de octubre de 2026) para que no salte errors.general.
const ANTES_DEL_CIERRE = Date.parse('2026-10-01T12:00:00-06:00');
const DESPUES_DEL_CIERRE = Date.parse('2026-10-10T00:00:00-06:00');

const base = () => ({
  tipo: 'socio-estatal',
  nombre: 'María García López',
  telefono: '5512345678',
  estado: 'Oaxaca',
  municipio: 'Oaxaca de Juárez',
  estadoSolicitado: 'Oaxaca',
  experiencia: 'Coordino una red de 40 conductores desde 2019.',
  nodo: 'si',
  consentimiento: true,
  origen: 'https://socios.ciudadan.org/socios-estatales/oaxaca',
  utm: { utm_source: 'whatsapp' },
});

const validar = (overrides = {}, now = ANTES_DEL_CIERRE) =>
  validarRegistro({ ...base(), ...overrides }, now);

// 1. Sin correo: el formulario genérico de prelanzamiento sigue funcionando.
let { data, errors } = validar();
assert.strictEqual(errors.email, undefined, 'sin correo no debe haber error');
assert.strictEqual(data.email, undefined, 'sin correo no se inventa un valor');
assert.strictEqual(data.telefono, '+525512345678');
console.log('ok 1: socio estatal sin correo (opcional) no rompe el flujo');

// 2. Correo válido: se normaliza (trim + minúsculas) porque es clave de envío.
({ data, errors } = validar({ email: '  Maria.Garcia@Oaxaca.MX ' }));
assert.strictEqual(errors.email, undefined);
assert.strictEqual(data.email, 'maria.garcia@oaxaca.mx');
console.log('ok 2: correo normalizado a minúsculas y sin espacios');

// 3. Correo inválido: error de campo, no se guarda.
({ data, errors } = validar({ email: 'maria-arroba-oaxaca' }));
assert.ok(errors.email, 'debe marcar error de correo');
assert.strictEqual(data.email, null);
console.log('ok 3: correo inválido → error de campo');

// 4. Tipos que no capturan correo (conductor) no se ven afectados.
({ errors } = validar({ tipo: 'conductor', vehiculo: 'taxi', ciudad: 'Oaxaca', email: undefined }));
assert.strictEqual(errors.email, undefined);
assert.strictEqual(errors.general, undefined);
console.log('ok 4: conductor sin correo → sin error');

// 5. Reglas de negocio existentes intactas.
({ errors } = validar({ email: 'ok@oaxaca.mx', estado: 'Ciudad de México' }));
assert.ok(/CDMX/.test(errors.estado), 'CDMX sigue bloqueado como residencia');
({ errors } = validar({}, DESPUES_DEL_CIERRE));
assert.ok(/cerró/.test(errors.general), 'después del cierre se rechaza');
console.log('ok 5: reglas existentes intactas (CDMX asignado, cierre 9-oct-2026)');

// 6. Helpers puros.
assert.strictEqual(normalizarEmail('A@B.CO'), 'a@b.co');
assert.strictEqual(normalizarEmail('no-es-correo'), null);
assert.strictEqual(normalizarEmail(''), null);
assert.strictEqual(normalizarEmail(undefined), null);
assert.strictEqual(normalizarTelefono('+52 1 55 1234 5678'), '+525512345678');
console.log('ok 6: helpers normalizarEmail / normalizarTelefono');

console.log('\nprelanzamiento.selftest: 6/6 ok');
