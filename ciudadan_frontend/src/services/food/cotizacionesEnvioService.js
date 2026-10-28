// Servicios de cotizaciones de envío del módulo Food (MVP food-shipping).
//
// Contrato backend: docs/FOOD-COTIZACIONES-ENVIO-MVP.md
//  - POST /api/food-shipping/cotizar (Bearer Auth0, policy
//    is-authenticated-auth0) devuelve el tablero de opciones de envío
//    (Ciudadan y Uber Direct) por restaurante del carrito.
//  - La indisponibilidad de un proveedor NO es error HTTP: viaja como dato
//    (disponible: false + codigoIndisponibilidad + mensaje).
//  - Cada cotización válida se persiste con vencimiento (default 15 min) y un
//    código opaco (cotizacionId) que el checkout devuelve al confirmar la
//    orden en metadata.cotizacion_envio.codigo.

import { fetchJson, STRAPI_URL } from '../../utils/request.utils';

/**
 * Solicita las cotizaciones de envío del carrito (o de una orden pendiente
 * de pago) hacia la dirección de entrega indicada.
 *
 * El backend resuelve todo en servidor (restaurante, direcciones, distancia,
 * precio, disponibilidad) y valida la propiedad de carrito/pedido/dirección;
 * el usuario siempre es el del token Auth0.
 *
 * @param {object} params
 * @param {number|null} params.foodCartId carrito activo del usuario (preferido)
 * @param {number|null} params.foodOrderId orden `pendiente_pago` propia (re-cotización)
 * @param {number|null} params.direccionDestinoId dirección guardada del usuario
 * @param {object|null} params.direccionDestino destino inline (fila de dirección
 *   `{ direccion, coords }` o `{ lat, lng }`); la cotización queda ligada a
 *   esas coordenadas
 * @param {string} token access token de Auth0 (cabecera Authorization)
 * @returns {Promise<object>} tablero
 *   `{ success, puedeContinuar, direccionDestinoId, restaurantes: [...] }`
 */
export const cotizarEnvio = async (
  { foodCartId, foodOrderId, direccionDestinoId, direccionDestino } = {},
  token
) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Solo viajan los campos presentes: el backend exige exactamente una
  // fuente (foodCartId o foodOrderId) y un destino (id guardado o inline).
  const body = {};
  if (foodCartId != null) body.foodCartId = foodCartId;
  if (foodOrderId != null) body.foodOrderId = foodOrderId;
  if (direccionDestinoId != null) body.direccionDestinoId = direccionDestinoId;
  if (direccionDestino) body.direccionDestino = direccionDestino;

  const data = await fetchJson(
    `${STRAPI_URL}/api/food-shipping/cotizar`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
    'No fue posible obtener las cotizaciones de envío'
  );

  if (!data?.success) {
    throw new Error(data?.error?.message || 'No fue posible obtener las cotizaciones de envío');
  }

  return data;
};

/**
 * Guarda una dirección de entrega del usuario (POST /api/direcciones).
 *
 * La usa el checkout cuando el usuario elige una dirección temporal (sin id,
 * p.ej. "Usar sin guardar" del DireccionSelector): la cotización de envío
 * debe quedar ligada a una dirección guardada del usuario porque la
 * confirmación de la orden (POST /api/food-orders) revalida
 * `direccion_destino` contra la cotización (si no coincide → 409
 * DESTINO_MODIFICADO).
 *
 * Acepta la misma forma de fila que emite DireccionSelector al confirmar.
 *
 * @param {object} direccion fila de dirección `{ direccion, coords, cp, ... }`
 * @returns {Promise<object>} respuesta Strapi `{ data: { id, attributes } }`
 */
export const guardarDireccionEnvio = (direccion) => {
  const payload = {
    data: {
      direccion: direccion?.direccion ?? null,
      coords: direccion?.coords ?? null,
      cp: direccion?.cp ?? '',
      ciudad: direccion?.ciudad ?? '',
      estado: direccion?.estado ?? '',
      estado_codigo: direccion?.estado_codigo ?? '',
      colonia: direccion?.colonia ?? '',
      pais: direccion?.pais ?? '',
      pais_codigo: direccion?.pais_codigo ?? 'MX',
      observaciones: direccion?.observaciones ?? '',
      activa: true,
      user_email: direccion?.user_email ?? direccion?.usuario_email ?? null,
      usuario_email: direccion?.usuario_email ?? direccion?.user_email ?? null,
      place_id: direccion?.place_id ?? null,
      route: direccion?.route ?? '',
      numero: direccion?.numero ?? '',
      predeterminada: Boolean(direccion?.predeterminada),
    },
  };

  return fetchJson(
    `${STRAPI_URL}/api/direcciones`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'No fue posible guardar la dirección de entrega'
  );
};
