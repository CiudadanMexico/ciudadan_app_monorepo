"use strict";


const UBER_CUSTOMER_ID = process.env.UBER_DIRECT_CUSTOMER_ID;
const UBER_CLIENT_ID = process.env.UBER_DIRECT_CLIENT_ID;
const UBER_CLIENT_SECRET = process.env.UBER_DIRECT_CLIENT_SECRET;

const UBER_AUTH_URL = process.env.UBER_DIRECT_AUTH_URL || "https://auth.uber.com/oauth/v2/token";
const UBER_API_BASE_URL = process.env.UBER_DIRECT_API_BASE_URL || "https://api.uber.com";
const UBER_SCOPE = process.env.UBER_DIRECT_SCOPE || "eats.deliveries";
const UBER_DIRECT_MOCK = String(process.env.UBER_DIRECT_MOCK).toLowerCase() === "true";

// --------------------------------------------------
// Cache del access token
// --------------------------------------------------

let cachedAccessToken = null;
let accessTokenExpiresAt = 0;

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const isValidCoordinate = (value) => {
  return Number.isFinite(Number(value));
};

const parseJsonIfNeeded = (value) => {
  if (!value) return null;

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return null;
};

// --------------------------------------------------
// Obtener Access Token
// --------------------------------------------------

const getAccessToken = async () => {
  const now = Date.now();

  // Reutilizar token mientras siga vigente.
  // Dejamos 60 segundos de margen.
  if (cachedAccessToken && accessTokenExpiresAt > now + 60 * 1000) {
    return cachedAccessToken;
  }

  if (!UBER_CLIENT_ID || !UBER_CLIENT_SECRET) {
    throw new Error("Faltan UBER_DIRECT_CLIENT_ID o UBER_DIRECT_CLIENT_SECRET");
  }

  const body = new URLSearchParams();

  body.append("client_id", UBER_CLIENT_ID);
  body.append("client_secret", UBER_CLIENT_SECRET);
  body.append("grant_type", "client_credentials");
  body.append("scope", UBER_SCOPE);

  const response = await fetch(UBER_AUTH_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error_description ?? data?.error ?? "No fue posible obtener el access token de Uber Direct");
    // @ts-ignore
    error.status = response.status;
    // @ts-ignore
    error.details = data;

    throw error;
  }

  if (!data?.access_token) {
    throw new Error("Uber Direct no devolvió un access_token");
  }

  cachedAccessToken = data?.access_token;

  const expiresIn = Number(data.expires_in) ?? 2592000;

  accessTokenExpiresAt = now + expiresIn * 1000;

  return cachedAccessToken;
};

// --------------------------------------------------
// Construir dirección Uber
// --------------------------------------------------

const buildUberAddress = (rawDireccion) => {
  const direccion = parseJsonIfNeeded(rawDireccion) || {};

  const street = direccion?.street ?? "";

  const number = direccion?.number ?? "";

  const neighborhood = direccion?.neighborhood ?? "";

  const city = direccion?.city ?? "";

  const state = direccion?.state ?? "";

  const postalCode = direccion?.postal_code ?? "";

  const formatted = direccion?.formatted_address ?? direccion?.address ?? "";

  const lat = direccion?.lat ?? null;

  const lng = direccion?.lng ?? null;

  /*
   * Uber recomienda utilizar direcciones estructuradas.
   * street_address es un array.
   *
   * Ejemplo:
   * [
   *   "Av. Xalapa 123",
   *   "Colonia Centro"
   * ]
  */

  const streetAddress = [
    [street, number].filter(Boolean).join(" "),
    neighborhood,
  ].filter(Boolean);

  /*
   * Si nuestra dirección no tiene estructura
   * suficiente, usamos formatted_address.
   */
  const hasStructuredAddress =
    Boolean(streetAddress.length) &&
    Boolean(city) &&
    Boolean(state) &&
    Boolean(postalCode);

  const addressObject = hasStructuredAddress ? {
    street_address: streetAddress,
    city,
    state,
    zip_code: postalCode,
    country: "MX",
  } : formatted;

  return {
    address: addressObject,
    lat: isValidCoordinate(lat) ? Number(lat) : null,
    lng: isValidCoordinate(lng) ? Number(lng) : null,
  };
};

// --------------------------------------------------
// Buscar dirección del restaurante
// --------------------------------------------------

const getRestaurantAddress = async (restaurantId) => {
  if (!restaurantId) {
    throw new Error("restaurantId es requerido");
  }

  const direccion = await strapi.entityService.findMany("api::direccion.direccion",
    {
      filters: {
        restaurant_id: {
          id: {
            $eq: restaurantId,
          },
        },
      },
      populate: ["restaurant_id"],
      limit: 1,
    }
  );

  const direccionEntry = Array.isArray(direccion) ? direccion[0] : direccion;

  if (!direccionEntry) {
    throw new Error(`No se encontró una dirección para el restaurante ${restaurantId}`);
  }

  return direccionEntry;
};

// --------------------------------------------------
// Buscar dirección del cliente
// --------------------------------------------------

const getCustomerAddress = async (direccionDestinoId) => {
  if (!direccionDestinoId) {
    throw new Error("direccionDestinoId es requerido");
  }

  const direccion = await strapi.entityService.findOne("api::direccion.direccion", direccionDestinoId);

  if (!direccion) {
    throw new Error(`No se encontró la dirección ${direccionDestinoId}`);
  }

  return direccion;
};

// --------------------------------------------------
// Normalizar Fee Obtenido por Uber
// --------------------------------------------------
const normalizeFee = (fee) => {
  const value = Number(fee);

  if (!Number.isFinite(value)) {
    return null;
  }

  return Number((value / 100).toFixed(2));
};
// ----------------------------------------------
// Mock para solicitar Quote a Uber
// ----------------------------------------------
const createMockDeliveryQuote = ({ restaurantId, direccionDestinoId, direccionDestino, pickup, dropoff, }) => {
  /*
   * Simulamos una cotización de Uber Direct.
   * Los valores son deliberadamente realistas, pero NO representan un precio real de Uber.
   */

  const quoteId = `mock_quote_${restaurantId}_${Date.now()}`;

  const now = new Date();

  // 15 minutos de vigencia, igual que una cotización real.
  const expires = new Date(now.getTime() + 15 * 60 * 1000);

  /*
   * Generamos un costo determinístico basado en el restaurante.
   * Esto ayuda a distinguir visualmente los diferentes envíos durante las pruebas.
  */
  const baseFee = 65;

  const restaurantVariation = (Number(restaurantId) % 5) * 5;

  const fee = baseFee + restaurantVariation;

  return {
    id: quoteId,
    fee,
    currency: "mxn",
    currency_type: "MXN",
    duration: 40,
    pickup_duration: 15,
    dropoff_eta: new Date(now.getTime() + 40 * 60 * 1000).toISOString(),
    dropoff_deadline: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    created: now.toISOString(),
    expires: expires.toISOString(),
    /*
     * Información adicional que nos ayuda durante las pruebas.
     */
    mock: true,
    mock_data: {
      restaurantId,
      direccionDestinoId: direccionDestinoId || null,
      pickup,
      dropoff,
    },
  };
};

const createMockDelivery = ({
  foodOrder,
  quoteId,
  pickup,
  dropoff,
  fee,
  currency,
}) => {
  const timestamp = Date.now();

  return {
    uber_delivery_id: `mock_delivery_${foodOrder.id}_${timestamp}`,
    status: 'pending',
    tracking_url: `https://mock.uber.local/delivery/${foodOrder.id}`,
    quote_id: quoteId,
    fee,
    currency,
    pickup,
    dropoff,
    metadata: {
      mock: true,
      food_order_id: foodOrder.id,
      created_at: new Date().toISOString(),
    },
  };
};

// --------------------------------------------------
// Solicitar Quote a Uber
// --------------------------------------------------

const createDeliveryQuote = async ({ restaurantId, direccionDestinoId, direccionDestino }) => {
  if (!UBER_CUSTOMER_ID) {
    throw new Error("Falta UBER_DIRECT_CUSTOMER_ID");
  }

  const restaurantAddress = await getRestaurantAddress(restaurantId);

  let customerAddress;

  if (direccionDestinoId) {
    customerAddress = await getCustomerAddress(direccionDestinoId);
  } else if (direccionDestino) {
    customerAddress = direccionDestino;
  } else {
    throw new Error("Debes proporcionar direccionDestinoId o direccionDestino");
  }

  const pickup = buildUberAddress(restaurantAddress.direccion);

  const dropoff = buildUberAddress(customerAddress.direccion);

  /*
   * Si la estructura direccion no contiene coordenadas, intentamos utilizar coords.
  */

  const restaurantCoords = parseJsonIfNeeded(restaurantAddress.coords) || {};
  const customerCoords = parseJsonIfNeeded(customerAddress.coords) || {};

  pickup.lat = pickup.lat ?? (isValidCoordinate(restaurantCoords.lat) ? Number(restaurantCoords.lat) : null);
  pickup.lng = pickup.lng ?? (isValidCoordinate(restaurantCoords.lng) ? Number(restaurantCoords.lng) : null);

  dropoff.lat = dropoff.lat ?? (isValidCoordinate(customerCoords.lat) ? Number(customerCoords.lat) : null);

  dropoff.lng = dropoff.lng ?? (isValidCoordinate(customerCoords.lng) ? Number(customerCoords.lng) : null);

  /*
   * Para México queremos ser estrictos: necesitamos coordenadas válidas.
   * Uber indica que en determinadas regiones son importantes durante Create Quote.
   */

  if (!isValidCoordinate(pickup.lat) || !isValidCoordinate(pickup.lng)) {
    throw new Error("El restaurante no tiene coordenadas válidas");
  }

  if (!isValidCoordinate(dropoff.lat) || !isValidCoordinate(dropoff.lng)) {
    throw new Error("La dirección de entrega no tiene coordenadas válidas");
  }

  if (UBER_DIRECT_MOCK) {
    strapi.log.info(`[Uber Direct MOCK] Generando quote para restaurante ${restaurantId}`);

    const mockQuote = createMockDeliveryQuote({
      restaurantId,
      direccionDestinoId,
      direccionDestino,
      pickup,
      dropoff,
    });


    return {
      quote: mockQuote,
      restaurantId,
      direccionDestinoId: direccionDestinoId || null,
      pickup: {
        lat: pickup.lat,
        lng: pickup.lng,
      },
      dropoff: {
        lat: dropoff.lat,
        lng: dropoff.lng,
      },
    };
  }

  const token = await getAccessToken();

  const url = `${UBER_API_BASE_URL}/v1/customers/` + `${UBER_CUSTOMER_ID}/delivery_quotes`;

  /*
   * Uber espera pickup_address y dropoff_address como strings JSON.
   */
  const payload = {
    pickup_address: typeof pickup.address === "string" ? pickup.address : JSON.stringify(pickup.address),
    dropoff_address: typeof dropoff.address === "string" ? dropoff.address : JSON.stringify(dropoff.address),
  };

  /*
   * Algunas regiones requieren lat/lng.
   * Los agregamos al request para nuestra integración.
   */
  payload.pickup_latitude = pickup.lat;

  payload.pickup_longitude = pickup.lng;

  payload.dropoff_latitude = dropoff.lat;

  payload.dropoff_longitude = dropoff.lng;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  /*
   * Si el token expiró o fue rechazado, limpiamos cache para que el siguiente request solicite uno nuevo.
  */
  if (response.status === 401) {
    cachedAccessToken = null;
    accessTokenExpiresAt = 0;
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || "Uber Direct rechazó la cotización");
    // @ts-ignore
    error.status = response.status;
    // @ts-ignore
    error.details = data;
    throw error;
  }

  const quote = {
    id: data?.id,
    fee: normalizeFee(data?.fee),
    currency: data?.currency ?? 'mxn',
    duration: data?.duration ?? null,
    pickup_duration: data?.pickup_duration ?? null,
    dropoff_eta: data?.dropoff_eta ?? null,
    dropoff_deadline: data?.dropoff_deadline ?? null,
    created: data?.created ?? null,
    expires: data?.expires ?? null,
    mock: false,
  };

  return {
    quote,
    restaurantId,
    direccionDestinoId,
    pickup: {
      lat: pickup.lat,
      lng: pickup.lng,
    },
    dropoff: {
      lat: dropoff.lat,
      lng: dropoff.lng,
    },
  };
};

/**
 * Crea el delivery real en Uber Direct.
 *
 * IMPORTANTE:
 * Este método lo dejamos encapsulado para que
 * la transición MOCK -> REAL no afecte al controller.
 */
const createUberDelivery = async ({
  quoteId,
  pickup,
  dropoff,
  order,
}) => {
  const accessToken = await getAccessToken();

  /*
   * AQUÍ colocaremos el payload definitivo
   * de Uber Direct cuando validemos el endpoint
   * de creación de delivery correspondiente
   * a la cuenta/API que nos proporcionaron.
   */

  const payload = {
    quote_id: quoteId,
    pickup,
    dropoff,
    order_reference: String(order.id),
  };

  try {
    const response = await fetch(`${UBER_API_BASE_URL}/v1/customers/${UBER_CUSTOMER_ID}/deliveries`,
      {
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const json = await response.json();
    return json;
  } catch (error) {
    const uberError = error?.response?.data;
    strapi.log.error('Uber Direct create delivery error:', uberError || error?.message);
    throw error;
  }
};

const createDelivery = async ({ foodOrderId }) => {
  if (!foodOrderId) {
    throw new Error('foodOrderId es requerido');
  }

  /**
   * 1. Obtener food-order
   */
  const foodOrder = await strapi.entityService.findOne('api::food-order.food-order', foodOrderId,
    {
      populate: {
        restaurant: true,
        user: true,
      },
    }
  );

  if (!foodOrder) {
    throw new Error(`No se encontró food-order ${foodOrderId}`);
  }


  /**
   * 2. Obtener metadata de Uber Direct
   */
  const uberMetadata = foodOrder.metadata?.uber_direct;

  if (!uberMetadata) {
    throw new Error(`La food-order ${foodOrderId} no tiene información de Uber Direct`);
  }


  /**
   * 3. Obtener quote_id
   */
  const quoteId = uberMetadata.quote_id;

  if (!quoteId) {
    throw new Error(`La food-order ${foodOrderId} no tiene quote_id`);
  }


  /**
   * 4. Evitar crear dos deliveries
   */
  const existingDelivery = await strapi.entityService.findMany('api::food-delivery.food-delivery',
    {
      filters: {
        food_order: {
          id: foodOrderId,
        },
      },
      limit: 1,
    }
  );

  if (existingDelivery?.length) {
    return {
      delivery: existingDelivery[0],
      alreadyExists: true,
    };
  }


  /**
   * 5. Obtener pickup y dropoff
   *
   * Estos datos deberían haber quedado guardados dentro de metadata durante la cotización.
   */
  const pickup = uberMetadata.pickup || null;

  const dropoff = uberMetadata.dropoff || null;

  if (!pickup) {
    throw new Error('No existe información pickup para el delivery');
  }

  if (!dropoff) {
    throw new Error('No existe información dropoff para el delivery');
  }


  /**
   * 6. Fee
   */
  const fee = Number(uberMetadata.fee ?? foodOrder.monto_envio ?? 0);

  const currency = uberMetadata.currency || foodOrder.moneda || 'MXN';


  /**
   * 7. Crear delivery
   */
  let providerDelivery;

  if (UBER_DIRECT_MOCK) {
    strapi.log.info(`[Uber Direct MOCK] Creando delivery para food-order ${foodOrderId}`);

    providerDelivery = createMockDelivery({
      foodOrder,
      quoteId,
      pickup,
      dropoff,
      fee,
      currency,
    });

  } else {

    strapi.log.info(`[Uber Direct] Creando delivery para food-order ${foodOrderId}`);

    providerDelivery = await createUberDelivery({
      quoteId,
      pickup,
      dropoff,
      order: foodOrder,
    });
  }


  /**
   * 8. Guardar food_delivery
   */
  const delivery = await strapi.entityService.create('api::food-delivery.food-delivery', {
    data: {
      food_order: foodOrder.id,
      restaurant: foodOrder.restaurant?.id || foodOrder.restaurant,
      user: foodOrder.user?.id || foodOrder.user,
      provider: 'uber_direct',
      quote_id: quoteId,
      uber_delivery_id: providerDelivery?.uber_delivery_id || providerDelivery?.id || null,
      status: providerDelivery?.status || 'pending',
      fee: providerDelivery?.fee ?? fee,
      currency: providerDelivery?.currency || currency,
      tracking_url: providerDelivery?.tracking_url || null,
      pickup,
      dropoff,
      metadata: {
        mock: UBER_DIRECT_MOCK,
        provider_response: providerDelivery,
        quote_id: quoteId,
        created_at: new Date().toISOString(),
      },
    },
  }
  );


  /**
   * 9. Devolver resultado
   */
  return {
    delivery,
    alreadyExists: false,
    mock: UBER_DIRECT_MOCK,
  };
};

module.exports = {
  getAccessToken,
  getRestaurantAddress,
  getCustomerAddress,
  buildUberAddress,
  createDeliveryQuote,
  createDelivery,
};