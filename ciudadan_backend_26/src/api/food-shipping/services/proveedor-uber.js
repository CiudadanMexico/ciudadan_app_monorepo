'use strict';

/**
 * Adaptador de Uber Direct para el MVP de cotizaciones de envío Food.
 *
 * REUTILIZA el cliente existente `api::uber-direct.uber-direct`
 * (`createDeliveryQuote`: OAuth client_credentials contra auth.uber.com con
 * scope eats.deliveries y POST {api.uber.com}/v1/customers/{customer_id}/
 * delivery_quotes; fee en unidades menores /100 — ver
 * src/api/uber-direct/services/uber-direct.js). No duplica credenciales ni
 * contrato: agrega lo que la cotización de checkout necesita:
 *
 *  - Timeout (UBER_DIRECT_TIMEOUT_MS, default 8000): un Uber lento nunca cuelga
 *    el checkout ni a la cotización de Ciudadan.
 *  - Aislamiento total de fallos: cualquier error se convierte en
 *    indisponibilidad con código seguro, NUNCA en un 500 ni en un precio
 *    inventado.
 *  - Normalización: importe numérico, moneda en mayúsculas (MXN), vencimiento.
 *  - Honradez del modo mock del service (UBER_DIRECT_MOCK): se expone
 *    `simulado: true` para que el frontend nunca presente una cotización mock
 *    como precio real.
 *
 * Credenciales 100% servidor (UBER_DIRECT_*): nada viaja al frontend. Este
 * adaptador solo COTIZA; no crea entregas.
 */

const { PROVEEDORES, CODIGOS_INDISPONIBILIDAD, vigenciaCotizacionMin } = require('../utils/constants');

const UBER_TIMEOUT_MS_DEFAULT = 8000;

const timeoutMs = () => {
  const valor = Number(process.env.UBER_DIRECT_TIMEOUT_MS);
  return Number.isFinite(valor) && valor > 0 ? valor : UBER_TIMEOUT_MS_DEFAULT;
};

const normalizarMoneda = (moneda) => {
  const texto = String(moneda || '').trim().toUpperCase();
  return texto || 'MXN';
};

function indisponible(codigo, causa = null) {
  return {
    proveedor: PROVEEDORES.UBER,
    disponible: false,
    codigoIndisponibilidad: codigo,
    mensaje: CODIGOS_INDISPONIBILIDAD[codigo] || CODIGOS_INDISPONIBILIDAD.PROVEEDOR_ERROR,
    causa,
  };
}

/** Clasifica un error del service Uber a código seguro. */
function mapearErrorUber(error) {
  const mensaje = String(error?.message || '');
  if (/Falta UBER_DIRECT_(CUSTOMER_ID|CLIENT_ID|CLIENT_SECRET)/.test(mensaje)) {
    return 'PROVEEDOR_NO_CONFIGURADO';
  }
  const status = Number(error?.status);
  if (status >= 400 && status < 500) return 'PROVEEDOR_RECHAZO';
  return 'PROVEEDOR_ERROR';
}

/**
 * Cotiza una entrega con Uber Direct.
 * @param {object} params
 * @param {number} params.restaurantId
 * @param {number|null} params.direccionDestinoId dirección guardada (preferida)
 * @param {object|null} params.direccionDestino destino inline en formato fila
 *   de direccion ({ direccion, coords }) — mismo contrato que /uber-direct/quote
 * @returns {Promise<object>} disponibilidad normalizada del proveedor
 */
async function cotizarUber({ restaurantId, direccionDestinoId, direccionDestino }) {
  const timeout = timeoutMs();

  let resultado;
  try {
    const service = strapi.service('api::uber-direct.uber-direct');
    if (!service || typeof service.createDeliveryQuote !== 'function') {
      return indisponible('PROVEEDOR_NO_CONFIGURADO');
    }

    const cotizacion = Promise.resolve(
      service.createDeliveryQuote({ restaurantId, direccionDestinoId, direccionDestino })
    );

    let temporizador = null;
    const rechazoTimeout = new Promise((_, reject) => {
      temporizador = setTimeout(() => {
        const error = new Error('Uber Direct timeout');
        error.codigo = 'PROVEEDOR_TIMEOUT';
        reject(error);
      }, timeout);
    });

    try {
      resultado = await Promise.race([cotizacion, rechazoTimeout]);
    } finally {
      clearTimeout(temporizador);
    }
  } catch (error) {
    if (error?.codigo === 'PROVEEDOR_TIMEOUT') {
      return indisponible('PROVEEDOR_TIMEOUT');
    }
    const codigo = mapearErrorUber(error);
    strapi.log.warn(
      `[food-shipping] Uber Direct indisponible (${codigo}): ${String(error?.message || error).slice(0, 200)}`
    );
    return indisponible(codigo, String(error?.message || '').slice(0, 200));
  }

  const quote = resultado?.quote;
  const importe = Number(quote?.fee);

  // Un fallo técnico nunca se convierte en cotización exitosa: sin fee finito
  // y no negativo, no hay cotización.
  if (!Number.isFinite(importe) || importe < 0) {
    return indisponible('PROVEEDOR_ERROR', 'fee inválido');
  }

  const vence = quote?.expires && new Date(quote.expires).getTime() > Date.now()
    ? new Date(quote.expires).toISOString()
    : new Date(Date.now() + vigenciaCotizacionMin() * 60 * 1000).toISOString();

  return {
    proveedor: PROVEEDORES.UBER,
    disponible: true,
    importe: Math.round(importe * 100) / 100,
    moneda: normalizarMoneda(quote?.currency),
    distanciaMetros: null, // Uber Direct no devuelve distancia en la cotización
    referencia: quote?.id ? String(quote.id) : null,
    vence,
    simulado: Boolean(quote?.mock),
    detalle: {
      duracionSegundos: Number(quote?.duration) || null,
      pickupDuracionSegundos: Number(quote?.pickup_duration) || null,
    },
    respuestaBruta: quote,
  };
}

module.exports = { cotizarUber, mapearErrorUber, normalizarMoneda };
