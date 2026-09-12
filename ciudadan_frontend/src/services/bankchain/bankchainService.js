import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

/**
 * Bankchain Provisional - Servicios para ledger temporal
 * Endpoints: /api/pago-con-subsidio, /api/earn-laborys, /api/direcciones, /api/saldo
 * Requiere Auth0 token (is-authenticated-auth0)
 */

const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

/**
 * POST /api/pago-con-subsidio
 * @param {Object} payload - { tipo, porcentaje_labory, direccion_origen, direccion_destino, direccion_agencia, monto_laborys, subsidio, timestamp, digital_signature }
 */
export const pagoConSubsidio = async (payload, token) => {
  return fetchJson(`${STRAPI_URL}/api/pago-con-subsidio`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  }, 'Error en pago con subsidio');
};

/**
 * POST /api/earn-laborys
 * @param {Object} payload - { tipo, monto, cartera_agencia, cartera_destino, origin_id, timestamp, digital_signature }
 */
export const earnLaborys = async (payload, token) => {
  return fetchJson(`${STRAPI_URL}/api/earn-laborys`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  }, 'Error en earn_laborys');
};

/**
 * GET /api/direcciones?tipo=agencia|usuario
 */
export const consultarDirecciones = async (tipo, token) => {
  const qs = tipo ? `?tipo=${tipo}` : '';
  return fetchJson(`${STRAPI_URL}/api/direcciones${qs}`, {
    headers: getAuthHeaders(token),
  }, 'Error consultando direcciones');
};

/**
 * GET /api/saldo?direccion=0x...
 */
export const consultarSaldo = async (direccion, token) => {
  return fetchJson(`${STRAPI_URL}/api/saldo?direccion=${encodeURIComponent(direccion)}`, {
    headers: getAuthHeaders(token),
  }, 'Error consultando saldo');
};

/**
 * Helper para firmar con ethers (frontend)
 * Uso: const { ethers } = require('ethers') / import { ethers } from 'ethers'
 * const signature = await wallet.signMessage(JSON.stringify({ monto, timestamp }))
 */
export const generarPayloadFirmado = async (wallet, data) => {
  if (!wallet?.signMessage) throw new Error('Wallet no válida para firmar');
  const timestamp = new Date().toISOString();
  const message = JSON.stringify({ ...data, timestamp });
  const digital_signature = await wallet.signMessage(message);
  return { ...data, timestamp, digital_signature };
};
