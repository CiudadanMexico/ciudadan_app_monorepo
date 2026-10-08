'use strict';

/**
 * Selftest del cliente de Brevo (`src/services/brevo`).
 *
 * NO hace llamadas de red: cubre la ruta "sin configurar", la construcción del
 * payload, el saneo del buzón del equipo y las plantillas (escape de HTML).
 *
 * Ejecutar: node tests/selftests/brevo.selftest.js
 */

const assert = require('assert');
const brevo = require('../../src/services/brevo');

const limpiarEnv = () => {
  delete process.env.BREVO_API_KEY;
  delete process.env.BREVO_SENDER_EMAIL;
  delete process.env.BREVO_NOTIFICACION_EMAIL;
};

(async () => {
  // 1. Sin BREVO_API_KEY no se envía nada ni se toca la red.
  limpiarEnv();
  let estado = brevo.estadoConfiguracion();
  assert.strictEqual(estado.configurado, false);
  assert.deepStrictEqual(estado.faltantes, ['BREVO_API_KEY', 'BREVO_SENDER_EMAIL']);
  assert.strictEqual(estado.avisoEquipo, false);
  let resultado = await brevo.enviar({
    to: 'persona@oaxaca.mx',
    subject: 'Hola',
    htmlContent: '<p>hola</p>',
  });
  assert.deepStrictEqual(resultado, { enviado: false, motivo: 'sin-configurar' });
  assert.strictEqual(brevo.construirPayload({ to: 'persona@oaxaca.mx', subject: 'Hola' }), null);
  console.log('ok 1: sin configurar → no envía ni construye payload');

  // 2. Falta solo el remitente: sigue sin configurar.
  process.env.BREVO_API_KEY = 'xkeysib-clave-de-prueba';
  estado = brevo.estadoConfiguracion();
  assert.strictEqual(estado.configurado, false);
  assert.deepStrictEqual(estado.faltantes, ['BREVO_SENDER_EMAIL']);
  console.log('ok 2: falta BREVO_SENDER_EMAIL → no configurado');

  // 3. Configuración completa: payload con el formato de la API v3 de Brevo.
  process.env.BREVO_SENDER_EMAIL = 'no-reply@ciudadan.org';
  process.env.BREVO_NOTIFICACION_EMAIL = 'equipo@ciudadan.org, mal-correo, socios@ciudadan.org';
  assert.strictEqual(brevo.estadoConfiguracion().configurado, true);
  const payload = brevo.construirPayload({
    to: 'maria@oaxaca.mx',
    toName: 'María García',
    subject: 'Prueba',
    htmlContent: '<p>hola</p>',
    textContent: 'hola',
    replyTo: 'equipo@ciudadan.org',
    tags: ['socios-estatales'],
    senderName: 'Ciudadan Socios',
  });
  assert.strictEqual(payload.sender.email, 'no-reply@ciudadan.org');
  assert.strictEqual(payload.sender.name, 'Ciudadan Socios');
  assert.deepStrictEqual(payload.to, [{ email: 'maria@oaxaca.mx', name: 'María García' }]);
  assert.strictEqual(payload.subject, 'Prueba');
  assert.deepStrictEqual(payload.replyTo, { email: 'equipo@ciudadan.org' });
  assert.deepStrictEqual(payload.tags, ['socios-estatales']);
  // Sin senderName en la llamada: fallback a "Ciudadan" (nada viene del .env).
  const payloadSinNombre = brevo.construirPayload({
    to: 'maria@oaxaca.mx',
    subject: 'Prueba',
    htmlContent: '<p>hola</p>',
  });
  assert.strictEqual(payloadSinNombre.sender.name, 'Ciudadan');
  assert.strictEqual(brevo.construirPayload({ to: 'no-es-correo', subject: 'x' }), null);
  assert.strictEqual(brevo.construirPayload({ to: 'a@b.mx' }), null, 'sin asunto no hay payload');
  console.log('ok 3: payload válido, senderName por parámetro y fallback a "Ciudadan"');

  // 4. El buzón del equipo se sanea (se descarta la basura del CSV).
  assert.deepStrictEqual(brevo.leerConfig().equipo, ['equipo@ciudadan.org', 'socios@ciudadan.org']);
  console.log('ok 4: CSV del equipo saneado');

  // 5. Plantillas: datos del postulante + escape de HTML.
  assert.strictEqual(
    brevo.escapar('<b>"Ana" & Luis</b>'),
    '&lt;b&gt;&quot;Ana&quot; &amp; Luis&lt;/b&gt;'
  );
  const confirmacion = brevo.plantillaConfirmacion({ nombre: 'Ana <script>', estadoLabel: 'Oaxaca' });
  assert.ok(/Oaxaca/.test(confirmacion.subject), 'el asunto menciona el estado');
  assert.ok(/Hola Ana/.test(confirmacion.htmlContent), 'el saludo usa el primer nombre');
  assert.ok(!/<script>/.test(confirmacion.htmlContent), 'el saludo no debe inyectar HTML');
  assert.ok(/Oaxaca/.test(confirmacion.textContent));
  // El aviso interno sí renderiza el nombre completo: ahí debe escapar.
  const avisoInyectado = brevo.plantillaAvisoEquipo({
    nombre: 'Ana <script>alert(1)</script>',
    experiencia: 'x',
  });
  assert.ok(/&lt;script&gt;/.test(avisoInyectado.htmlContent), 'el aviso debe escapar el HTML del nombre');
  assert.ok(!/<script>/.test(avisoInyectado.htmlContent), 'el aviso no debe inyectar HTML');
  const aviso = brevo.plantillaAvisoEquipo({
    nombre: 'María García',
    telefono: '+525512345678',
    email: 'maria@oaxaca.mx',
    estadoSolicitado: 'Oaxaca',
    estado: 'Oaxaca',
    municipio: 'Oaxaca de Juárez',
    nodo: 'si',
    experiencia: 'Coordino 40 conductores',
  });
  assert.ok(/Oaxaca/.test(aviso.subject));
  ['María García', '+525512345678', 'maria@oaxaca.mx', 'Oaxaca de Juárez', 'Coordino 40 conductores'].forEach(
    (dato) => assert.ok(aviso.textContent.includes(dato), `el aviso debe incluir "${dato}"`)
  );
  console.log('ok 5: plantillas con escape de HTML');

  // 6. Sin correo del postulante / sin buzón del equipo no se llama a Brevo.
  process.env.BREVO_NOTIFICACION_EMAIL = '';
  const envios = await brevo.enviarPostulacionSocioEstatal({
    datos: { nombre: 'Ana', estadoSolicitado: 'Oaxaca' },
  });
  assert.deepStrictEqual(envios.confirmacion, { enviado: false, motivo: 'sin-correo-postulante' });
  assert.deepStrictEqual(envios.aviso, { enviado: false, motivo: 'sin-buzon-equipo' });
  console.log('ok 6: sin correo ni buzón no se llama a la API de Brevo');

  limpiarEnv();
  console.log('\nbrevo.selftest: 6/6 ok');
})().catch((error) => {
  console.error('brevo.selftest FALLÓ:', error.message);
  process.exit(1);
});
