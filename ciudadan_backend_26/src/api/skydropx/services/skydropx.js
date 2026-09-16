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
 * Normaliza una dirección para CREAR un envío.
 *
 * Skydropx requiere información adicional:
 * street1
 * name
 * company
 * phone
 * email
 * reference
 */
function normalizeShipmentAddress(
  direccion,
  options = {}
) {
  if (!direccion) {
    throw new Error("La dirección es requerida para crear el envío");
  }

  const attrs = direccion?.attributes || direccion;
  const direccionJson = attrs.direccion || {};
  const postalCode = direccionJson.postal_code || attrs.cp;
  const state = direccionJson.state || attrs.estado;
  const city = direccionJson.city || attrs.ciudad;
  const neighborhood = direccionJson.neighborhood;
  const street = direccionJson.street || attrs.route;
  const number = direccionJson.number || attrs.numero;
  const formattedAddress = direccionJson.formatted_address || "";
  const reference = attrs.observaciones || options.reference || formattedAddress;

  const name = options.name || attrs.nombre || "";

  const company = options.company || "";

  const phone = options.phone || "";

  const email = options.email || "";

  if (!postalCode) {
    throw new Error("La dirección no tiene código postal");
  }

  if (!state) {
    throw new Error("La dirección no tiene estado");
  }

  if (!city) {
    throw new Error("La dirección no tiene ciudad");
  }

  if (!neighborhood) {
    throw new Error("La dirección no tiene colonia");
  }

  if (!street && !formattedAddress) {
    throw new Error("La dirección no tiene calle");
  }

  if (!name) {
    throw new Error("No se pudo determinar el nombre del destinatario/remitente");
  }

  if (!company) {
    throw new Error("No se pudo determinar la empresa del remitente/destinatario");
  }

  if (!phone) {
    throw new Error("Se requiere un teléfono para crear el envío en Skydropx");
  }

  if (!email) {
    throw new Error("Se requiere un correo electrónico para crear el envío en Skydropx");
  }

  const street1 = street && number ? `${street} ${number}` : street || formattedAddress;

  return {
    country_code: "MX",
    postal_code: String(postalCode),
    area_level1: String(state),
    area_level2: String(city),
    area_level3: String(neighborhood),

    street1: String(street1),
    name: String(name),
    company: String(company),
    phone: String(phone),
    email: String(email),

    reference: String(reference || "Domicilio"),

    ...(options.further_information ? { further_information: String(options.further_information).slice(0, 70) } : {}),
  };
}

/**
 * Construye los paquetes que fueron cotizados.
 *
 * Nuestra cotización actual genera un parcel por cada
 * producto/item.
 *
 * Skydropx necesita package_number para relacionarlo
 * con el paquete de la cotización.
 */
function buildShipmentPackages(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No se encontraron productos para crear el envío");
  }

  return items.map((item, index) => ({
    package_number: String(index + 1),
  }));
}

/**
 * Construye los paquetes usando directamente el número
 * de paquetes de la cotización.
 *
 * Útil cuando queremos respetar exactamente los paquetes
 * generados originalmente.
 */
function buildShipmentPackagesFromCount(packageCount) {
  const count = Number(packageCount);

  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("El número de paquetes debe ser mayor a cero");
  }

  return Array.from({ length: count }, (_, index) => ({
    package_number: String(index + 1),
  }));
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

/**
 * Obtener catálogo de Cartas Porte desde Skydropx
 */
async function getConsignmentNotes({ page = 1, per_page = 20, consignment_note, description }) {
  const params = new URLSearchParams();

  params.append('page', String(page));
  params.append('per_page', String(per_page));

  if (consignment_note)
    params.append('consignment_note', consignment_note);

  if (description)
    params.append('description', description);

  return skydropxRequest(`/api/v1/shipments/consignment_notes?${params.toString()}`, { method: "GET" });
};

/**
 * Obtener catálogo de tipos de empaque desde Skydropx
 */
async function getPackagings({ page = 1, per_page = 20, code, name }) {
  const params = new URLSearchParams();

  params.append('page', String(page));
  params.append('per_page', String(per_page));
  if (code) {
    params.append('code', code);
  }

  if (name) {
    params.append('name', name);
  }

  return skydropxRequest(`/api/v1/shipments/packagings?${params.toString()}`,{ method: "GET" });
};

/**
 * =====================================================
 * CREAR ENVÍO
 * =====================================================
 *
 * Skydropx responde 202 cuando el envío fue aceptado  para procesamiento.
 *
 * IMPORTANTE:
 * El response inicial puede no tener todavía:
 * - tracking_number
 * - label_url
 *
 * Por eso posteriormente debemos consultar
 * getShipment().
 */
async function createShipment(shipment) {
  if (!shipment)
    throw new Error("La información del envío es requerida");

  if (!shipment.rate_id)
    throw new Error("rate_id es requerido para crear el envío");

  if (!shipment.address_from)
    throw new Error("address_from es requerido para crear el envío");

  if (!shipment.address_to)
    throw new Error("address_to es requerido para crear el envío");

  if (!Array.isArray(shipment.packages) || shipment.packages.length === 0)
    throw new Error("packages es requerido para crear el envío");

  const payload = {
    shipment: {
      rate_id: String(shipment.rate_id),
      // Evita crear dos envíos accidentalmente si el administrador pulsa dos veces.
      unique_shipment: shipment.unique_shipment !== false,
      // Formato de guía.
      printing_format: shipment.printing_format || "standard",
      // * Opcional. Generamos también packing slip.
      include_order_detail: Boolean(shipment.include_order_detail),
      address_from: shipment.address_from,
      address_to: shipment.address_to,
      packages: shipment.packages,
      // Sólo se agregan si fueron proporcionados.
      ...(shipment.office_delivery ? { office_delivery: true, office_delivery_point_id: shipment.office_delivery_point_id, } : {}),
      ...(shipment.office_pickup ? { office_pickup: true, office_pickup_point_id: shipment.office_pickup_point_id, } : {}),
      ...(Array.isArray(shipment.products) ? { products: shipment.products, } : {}),
    },
  };

  // Quitamos propiedades undefined para evitar romper la API.
  //const cleanPayload = JSON.parse(JSON.stringify(payload));

  return skydropxRequest("/api/v1/shipments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * =====================================================
 * CONSULTAR ENVÍO
 * =====================================================
 */
async function getShipment(shipmentId) {
  if (!shipmentId)
    throw new Error("El ID del envío es requerido");

  return skydropxRequest(`/api/v1/shipments/${encodeURIComponent(shipmentId)}`, {
    method: "GET",
  });
}


module.exports = {
  getAccessToken,
  skydropxRequest,

  normalizeAddress,
  normalizeShipmentAddress,

  buildParcelsFromItems,
  buildShipmentPackages,
  buildShipmentPackagesFromCount,

  getConsignmentNotes,
  getPackagings,

  createQuotation,
  getQuotation,

  createShipment,
  getShipment,
};