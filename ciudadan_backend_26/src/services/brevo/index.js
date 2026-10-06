'use strict';

/**
 * Cliente mínimo de la API transaccional de Brevo (https://api.brevo.com/v3).
 *
 * Se usa desde `api::postulacion` (controller `prelanzamiento`) para avisar por
 * correo cuando alguien se postula como Socio Estatal:
 *   1. Confirmación al postulante (solo si dejó un correo válido).
 *   2. Aviso interno al equipo (si BREVO_NOTIFICACION_EMAIL está definido).
 *
 * Reglas de diseño:
 * - Es *best-effort*: ninguna función lanza. Si falta configuración o Brevo
 *   responde con error se devuelve `{ enviado: false, motivo }` y se registra un
 *   warning — la postulación ya quedó guardada en Strapi y el equipo la ve en el
 *   panel de administración. Un fallo de correo NUNCA debe perder el registro.
 * - Sin `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` no se hace ni una llamada HTTP.
 *
 * Variables de entorno (ver docs/07-Variables-de-Entorno.md):
 *   BREVO_API_KEY             API key v3 de Brevo (token).
 *   BREVO_SENDER_EMAIL        Remitente verificado en Brevo.
 *   BREVO_NOTIFICACION_EMAIL  Buzón(es) del equipo, separados por coma.
 *   BREVO_TIMEOUT_MS          Timeout HTTP en ms (default 10000).
 */


const axios = require('axios');

const API_URL = 'https://api.brevo.com/v3/smtp/email';
const VERDE = '#19d79c';
const FONDO = '#07120f';
const TEXTO = '#a2c4b9';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

// `strapi` es global en Strapi v4; el fallback a console cubre los selftests.
const log = () => (global.strapi && global.strapi.log ? global.strapi.log : console);

const limpiar = (valor) => String(valor === null || valor === undefined ? '' : valor).trim();

const esEmailValido = (valor) => EMAIL_RE.test(limpiar(valor));

const escapar = (valor) =>
  limpiar(valor).replace(/[&<>"']/g, (caracter) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[caracter]));

/**
 * Lee la configuración en cada llamada (no se cachea) para que un cambio de
 * .env o una rotación del token no requiera reiniciar el proceso.
 */
function leerConfig() {
  const apiKey = limpiar(process.env.BREVO_API_KEY);
  const senderEmail = limpiar(process.env.BREVO_SENDER_EMAIL);
  const equipo = limpiar(process.env.BREVO_NOTIFICACION_EMAIL)
    .split(',')
    .map((valor) => valor.trim())
    .filter((valor) => EMAIL_RE.test(valor));
  return { apiKey, senderEmail, equipo, listo: Boolean(apiKey && senderEmail) };
}


/** Diagnóstico para logs/soporte: qué falta para poder enviar correos. */
function estadoConfiguracion() {
  const config = leerConfig();
  const faltantes = [];
  if (!config.apiKey) faltantes.push('BREVO_API_KEY');
  if (!config.senderEmail) faltantes.push('BREVO_SENDER_EMAIL');
  return {
    configurado: config.listo,
    faltantes,
    avisoEquipo: config.equipo.length > 0,
  };
}

/**
 * Arma el body de `POST /v3/smtp/email`. Devuelve null si no hay configuración,
 * destinatario válido o asunto (evita llamadas HTTP inútiles).
 */
function construirPayload({ to, toName, subject, htmlContent, textContent, replyTo, tags, senderName } = {}) {
  const config = leerConfig();
  const destinatarios = (Array.isArray(to) ? to : [to])
    .map((direccion) => limpiar(direccion))
    .filter((direccion) => EMAIL_RE.test(direccion))
    .map((email) => (limpiar(toName) ? { email, name: limpiar(toName) } : { email }));
  if (!config.listo || destinatarios.length === 0 || !limpiar(subject)) return null;
  const payload = {
    sender: { email: config.senderEmail, name: limpiar(senderName) || 'Ciudadan' },
    to: destinatarios,
    subject: limpiar(subject),
    htmlContent: htmlContent || '',
  };
  if (textContent) payload.textContent = textContent;
  if (esEmailValido(replyTo)) payload.replyTo = { email: limpiar(replyTo) };
  if (Array.isArray(tags) && tags.length) payload.tags = tags.slice(0, 10);
  return payload;
}


/**
 * Envía un correo transaccional. Nunca lanza: devuelve el resultado.
 * @returns {Promise<{enviado: boolean, motivo?: string, status?: number, messageId?: string}>}
 */
async function enviar(mensaje = {}) {
  const config = leerConfig();
  if (!config.listo) return { enviado: false, motivo: 'sin-configurar' };
  const payload = construirPayload(mensaje);
  if (!payload) return { enviado: false, motivo: 'destinatario-invalido' };
  try {
    const respuesta = await axios.post(API_URL, payload, {
      headers: {
        'api-key': config.apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      timeout: Number(process.env.BREVO_TIMEOUT_MS) || 10000,
    });
    return {
      enviado: true,
      status: respuesta.status,
      messageId: respuesta.data && respuesta.data.messageId,
    };
  } catch (error) {
    const status = error.response && error.response.status;
    const cuerpo = error.response && error.response.data;
    const detalle = (cuerpo && (cuerpo.message || cuerpo.code)) || error.message;
    log().warn(
      `[brevo] no se pudo enviar "${payload.subject}" (${status || 'sin-status'}): ${detalle}`
    );
    return { enviado: false, motivo: 'error-http', status, detalle: String(detalle).slice(0, 300) };
  }
}

/** Envoltura visual común (estilos inline: los clientes de correo ignoran <style>). */
function envolver(titulo, cuerpoHtml) {
  return [
    '<div style="margin:0;padding:24px;background:#f4f6f5;font-family:Arial,Helvetica,sans-serif;color:#14211c">',
    `<div style="max-width:560px;margin:0 auto;background:${FONDO};border-radius:14px;padding:28px">`,
    `<p style="margin:0 0 6px;color:${VERDE};font-size:12px;letter-spacing:.08em;text-transform:uppercase">Ciudadan</p>`,
    `<h1 style="margin:0 0 16px;color:#ffffff;font-size:22px;line-height:1.25">${titulo}</h1>`,
    cuerpoHtml,
    `<p style="margin:26px 0 0;color:${TEXTO};font-size:12px">Ciudadan · Programa de Socios Estatales</p>`,
    '</div></div>',
  ].join('');
}

function parrafo(textoHtml) {
  return `<p style="margin:0 0 14px;color:${TEXTO};font-size:15px;line-height:1.6">${textoHtml}</p>`;
}

/** Confirmación para quien se postuló como Socio Estatal. */
function plantillaConfirmacion({ nombre, estadoLabel } = {}) {
  const estado = escapar(estadoLabel);
  const primerNombre = escapar(nombre).split(' ')[0];
  const saludo = primerNombre ? `Hola ${primerNombre}:` : 'Hola:';
  return {
    subject: `Recibimos tu postulación como Socio Estatal de ${limpiar(estadoLabel)}`,
    htmlContent: envolver(
      'Recibimos tu postulación',
      [
        parrafo(saludo),
        parrafo(
          `Guardamos tu solicitud para ser <strong style="color:#ffffff">Socio Estatal de ${estado}</strong>. ` +
            'El equipo revisará la disponibilidad del estado y te contactará para continuar el proceso.'
        ),
        parrafo(
          'No se realizó ningún cobro. La asignación está sujeta a la revisión del equipo, ' +
          'que normalmente responde por WhatsApp.'
        ),
      ].join('')
    ),
    textContent: [
      saludo,
      '',
      `Guardamos tu solicitud para ser Socio Estatal de ${limpiar(estadoLabel)}.`,
      'El equipo revisará la disponibilidad del estado y te contactará para continuar el proceso.',
      'No se realizó ningún cobro.',
      '',
      'Ciudadan · Programa de Socios Estatales',
    ].join('\n'),
  };
}

/** Aviso interno para el equipo con los datos capturados en la postulación. */
function plantillaAvisoEquipo(datos = {}) {
  const estadoLabel = limpiar(datos.estadoSolicitado || datos.estado);
  const filas = [
    ['Nombre', datos.nombre],
    ['WhatsApp', datos.telefono],
    ['Correo', datos.email],
    ['Estado solicitado', estadoLabel],
    ['Estado de residencia', datos.estado],
    ['Municipio / Alcaldía', datos.municipio],
    ['Espacio, Internet y respaldo eléctrico', datos.nodo],
    ['Origen', datos.origen],
    ['Fecha', datos.fecha],
  ];
  const htmlFilas = filas
    .filter(([, valor]) => limpiar(valor))
    .map(
      ([etiqueta, valor]) =>
        '<tr>' +
        `<td style="padding:6px 12px 6px 0;color:${TEXTO};font-size:13px;vertical-align:top;white-space:nowrap">${escapar(etiqueta)}</td>` +
        `<td style="padding:6px 0;color:#ffffff;font-size:13px;vertical-align:top">${escapar(valor)}</td>` +
        '</tr>'
    )
    .join('');
  return {
    subject: `Nueva postulación de Socio Estatal · ${estadoLabel || 'sin estado'}`,
    htmlContent: envolver(
      'Nueva postulación de Socio Estatal',
      [
        parrafo('Entró una postulación desde el sitio. Datos capturados:'),
        `<table role="presentation" style="border-collapse:collapse;margin-bottom:14px">${htmlFilas}</table>`,
        parrafo(
          `<strong style="color:#ffffff">Experiencia:</strong><br>${escapar(datos.experiencia).replace(/\n/g, '<br>')}`
        ),
        parrafo('Revisa la solicitud completa en el panel: Contenido → Postulaciones.'),
      ].join('')
    ),
    textContent: filas
      .filter(([, valor]) => limpiar(valor))
      .map(([etiqueta, valor]) => `${etiqueta}: ${limpiar(valor)}`)
      .concat(['', `Experiencia: ${limpiar(datos.experiencia)}`])
      .join('\n'),
  };
}

/**
 * Envía la confirmación al postulante (si dejó correo) y el aviso al equipo.
 * Devuelve el resultado de ambos envíos por separado para poder loguearlos.
 * @param {Object} options
 * @param {Object} options.datos Datos del postulante
 * @param {string} [options.senderNameConfirmacion='Ciudadan'] Nombre del remitente para la confirmación al postulante
 * @param {string} [options.senderNameAviso='Ciudadan'] Nombre del remitente para el aviso interno
 */
async function enviarPostulacionSocioEstatal({ datos = {}, senderNameConfirmacion, senderNameAviso } = {}) {
  const config = leerConfig();
  if (!config.listo) {
    const sinConfigurar = { enviado: false, motivo: 'sin-configurar' };
    return { confirmacion: { ...sinConfigurar }, aviso: { ...sinConfigurar } };
  }
  const estadoLabel = limpiar(datos.estadoSolicitado || datos.estado);
  const confirmacion = esEmailValido(datos.email)
    ? await enviar({
        to: datos.email,
        toName: datos.nombre,
        replyTo: config.equipo[0],
        tags: ['socios-estatales', 'confirmacion'],
        senderName: senderNameConfirmacion,
        ...plantillaConfirmacion({ nombre: datos.nombre, estadoLabel }),
      })
    : { enviado: false, motivo: 'sin-correo-postulante' };
  const aviso = config.equipo.length
    ? await enviar({
        to: config.equipo,
        replyTo: datos.email,
        tags: ['socios-estatales', 'interno'],
        senderName: senderNameAviso,
        ...plantillaAvisoEquipo({ ...datos, estadoLabel }),
      })
    : { enviado: false, motivo: 'sin-buzon-equipo' };
  return { confirmacion, aviso };
}


module.exports = {
  // utilidades (testeables sin red)
  esEmailValido,
  escapar,
  leerConfig,
  estadoConfiguracion,
  construirPayload,
  plantillaConfirmacion,
  plantillaAvisoEquipo,
  // envío
  enviar,
  enviarPostulacionSocioEstatal,
};

