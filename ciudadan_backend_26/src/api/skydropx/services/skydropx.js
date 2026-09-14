"use strict";

const SKYDROPX_API_URL = process.env.SKYDROPX_API_URL || "https://sb-pro.skydropx.com";

let cachedToken = null;
let cachedTokenExpiresAt = 0;

/**
 * Obtiene un token de acceso de Skydropx.
 *
 * El token se almacena temporalmente en memoria para evitar
 * solicitar uno nuevo en cada petición.
 */
async function getAccessToken() {
  const now = Date.now();

  if (cachedToken && now < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.SKYDROPX_CLIENT_ID;
  const clientSecret = process.env.SKYDROPX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("No están configuradas las credenciales SKYDROPX_CLIENT_ID y SKYDROPX_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(`${SKYDROPX_API_URL}/api/v1/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    strapi.log.error("Error obteniendo token Skydropx:", data);

    const error = new Error(data?.error_description ?? data?.message ?? "No fue posible obtener token Skydropx");
    // @ts-ignore
    error.status = response.status;
    // @ts-ignore
    error.details = data;

    throw error;
  }

  cachedToken = data.access_token;

  const expiresIn = Number(data.expires_in) || 7200;

  // Dejamos 5 minutos de margen.
  cachedTokenExpiresAt = now + Math.max(expiresIn - 300, 60) * 1000;

  return cachedToken;
}

/**
 * Request genérico hacia Skydropx.
 */
async function skydropxRequest(endpoint, options = {}) {
  const token = await getAccessToken();

  const response = await fetch(
    `${SKYDROPX_API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options?.headers ?? {}),
      },
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    strapi.log.error(`Skydropx API ${response.status}:`, data);

    const error = new Error(data?.message ?? data?.error_description ?? "Error en API Skydropx");
    // @ts-ignore
    error.status = response.status;
    // @ts-ignore
    error.details = data;
    throw error;
  }

  return data;
}

/**
 * Convierte una dirección de Strapi al formato requerido por Skydropx.
 */
function normalizeAddress(direccionData) {
  if (!direccionData)
    throw new Error("La dirección es requerida");

  const direccionJson = direccionData?.direccion ?? {};
  const postalCode = direccionJson?.postal_code ?? direccionData?.cp ?? "";
  const state = direccionJson?.state ?? direccionData?.estado ?? "";
  const city = direccionJson?.city ?? direccionData?.ciudad ?? "";
  const neighborhood = direccionJson?.neighborhood ?? direccionData?.colonia;

  if (!postalCode)
    throw new Error("La dirección no tiene código postal");
  if (!state)
    throw new Error("La dirección no tiene estado");
  if (!city)
    throw new Error("La dirección no tiene ciudad");
  if (!neighborhood)
    throw new Error("La dirección no tiene colonia");

  return {
    country_code: "MX",
    postal_code: String(postalCode),
    area_level1: String(state),
    area_level2: String(city),
    area_level3: String(neighborhood),
  };
}

/**
 * Convierte los productos del pedido en parcels para Skydropx.
 *
 * IMPORTANTE:
 * Los datos físicos se toman directamente del producto almacenado en Strapi.
 */
function buildParcelsFromItems(items = []) {
  if (!Array.isArray(items) || items.length == 0)
    throw new Error("No se proporcionaron productos para cotizar");

  return items.map((item) => {
    const producto = item.producto;

    if (!producto)
      throw new Error("Uno de los productos no pudo ser encontrado");

    const nombre = producto?.nombre ?? `Producto ${producto?.id}`;
    const cantidad = Number(item.cantidad) || 1;

    if (!Number.isFinite(cantidad) || cantidad <= 0)
      throw new Error(`Cantidad inválida para el producto '${nombre}'`);

    const length = Number(producto.largo);
    const width = Number(producto.ancho);
    const height = Number(producto.alto);
    const weight = Number(producto.peso);

    if (!Number.isFinite(length) || length <= 0)
      throw new Error(`El producto "${nombre}" no tiene un largo válido`);

    if (!Number.isFinite(width) || width <= 0)
      throw new Error(`El producto "${nombre}" no tiene un ancho válido`);

    if (!Number.isFinite(height) || height <= 0)
      throw new Error(`El producto "${nombre}" no tiene un alto válido`);

    if (!Number.isFinite(weight) || weight <= 0)
      throw new Error(`El producto "${nombre}" no tiene un peso válido`);

    return {
      length: Math.ceil(length),
      width: Math.ceil(width),
      height: Math.ceil(height),
      weight: weight * cantidad,
      declared_value: Math.ceil(producto?.precio)
    };
  });
}

/**
 * Crea una cotización en Skydropx.
 */
async function createQuotation(quotation) {
  if (!quotation)
    throw new Error("La información de cotización es requerida");

  const body = { quotation };
  return skydropxRequest("/api/v1/quotations",
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

/**
 * Consulta una cotización existente.
 */
async function getQuotation(quotationId) {
  if (!quotationId)
    throw new Error("El ID de cotización es requerido");

  return skydropxRequest(`/api/v1/quotations/${encodeURIComponent(quotationId)}`, { method: "GET", });
}

module.exports = {
  getAccessToken,
  createQuotation,
  getQuotation,
  normalizeAddress,
  buildParcelsFromItems
};