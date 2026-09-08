'use strict';

const TOKEN_URL = 'https://auth.uber.com/oauth/v2/token';
const API_URL = 'https://api.uber.com/v1';

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

const isMockEnabled = () => {
  return String(process.env.UBER_DIRECT_MOCK).toLowerCase() === 'true';
};

/**
 * Obtiene un token OAuth de Uber Direct.
 *
 * El token se mantiene en memoria para evitar solicitar
 * uno nuevo innecesariamente.
 */
const getAccessToken = async () => {
  const now = Date.now();

  if (
    tokenCache.accessToken &&
    tokenCache.expiresAt > now + 60 * 1000
  ) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.UBER_DIRECT_CLIENT_ID;
  const clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Faltan UBER_DIRECT_CLIENT_ID o UBER_DIRECT_CLIENT_SECRET'
    );
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: 'eats.deliveries',
  });

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error_description ||
      'No fue posible obtener el token de Uber Direct'
    );
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt:
      now +
      Number(data.expires_in || 3600) * 1000,
  };

  return tokenCache.accessToken;
};

/**
 * MOCK de creación de delivery.
 *
 * Mantiene una respuesta similar a la que utilizaremos
 * posteriormente con Uber.
 */
const createMockDelivery = async ({
  quoteId,
  pickup,
  dropoff,

  pickupName,
  pickupPhone,
  pickupNotes,

  dropoffName,
  dropoffPhone,
  dropoffNotes,

  manifestItems,

  fee,
  currency = 'MXN',
}) => {
  const deliveryId = `mock-delivery-${Date.now()}`;

  return {
    id: deliveryId,
    quote_id: quoteId,
    status: 'pending',
    // Unidad mayor para nuestra aplicación.
    fee: Number(fee ?? 0),
    currency,
    tracking_url: `https://mock.uber.com/track/${deliveryId}`,
    pickup: {
      ...pickup,
      name: pickupName,
      phone: pickupPhone,
      notes: pickupNotes || null,
    },

    dropoff: {
      ...dropoff,
      name: dropoffName,
      phone: dropoffPhone,
      notes: dropoffNotes || null,
    },

    manifest_items: manifestItems,
    mock: true,
    metadata: {
      provider: 'uber_direct',
      mock: true,
      created_at: new Date().toISOString(),
    },
  };
};

/**
 * Crea un delivery real en Uber Direct.
 */
const createRealDelivery = async ({
  quoteId,
  pickup,
  dropoff,
  pickupName,
  pickupPhone,
  pickupNotes,

  dropoffName,
  dropoffPhone,
  dropoffNotes,

  manifestItems,
}) => {
  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID;

  if (!customerId) {
    throw new Error('Falta UBER_DIRECT_CUSTOMER_ID');
  }

  const accessToken = await getAccessToken();

  const url = `${API_URL}/customers/${customerId}/deliveries`;

  const payload = {
    quote_id: quoteId,

    pickup_name: pickupName,
    pickup_address: JSON.stringify(pickup.address),
    pickup_phone_number: pickupPhone,
    pickup_latitude: pickup.lat,
    pickup_longitude: pickup.lng,

    dropoff_name: dropoffName,
    dropoff_address: JSON.stringify(dropoff.address),
    dropoff_phone_number: dropoffPhone,
    dropoff_latitude: dropoff.lat,
    dropoff_longitude: dropoff.lng,

    manifest_items: manifestItems,

    ...(pickupNotes ? { pickup_notes: pickupNotes } : {}),
    ...(dropoffNotes ? { dropoff_notes: dropoffNotes } : {}),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.message ?? data?.error ?? 'Uber Direct rechazó la creación del delivery');
    
    // @ts-ignore
    error.status = response.status;
    // @ts-ignore
    error.details = data;
    throw error;
  }

  return {
    id: data.id,
    quote_id: quoteId,
    status: data.status || 'pending',
    // Uber puede entregar el fee en unidades menores.
    fee: Number(data.fee ?? 0) > 0 ? Number(data.fee) / 100 : 0,
    fee_minor: Number(data.fee ?? 0),
    currency: data.currency || 'MXN',
    tracking_url: data.tracking_url || null,
    pickup,
    dropoff,
    mock: false,
    metadata: data,
  };
};

/**
 * Punto único utilizado por nuestra aplicación.
 */
const createDelivery = async ({
  quoteId,
  pickup,
  dropoff,
  pickupName,
  pickupPhone,
  pickupNotes,
  dropoffName,
  dropoffPhone,
  dropoffNotes,
  manifestItems,
  fee,
  currency,

}) => {
  if (!quoteId) {
    throw new Error('No se proporcionó quote_id para crear el delivery');
  }

  if (isMockEnabled()) {
    strapi.log.info(`[Uber Direct] MOCK createDelivery quote=${quoteId}`);

    return createMockDelivery({
      quoteId,
      pickup,
      dropoff,
      fee,
      currency,
      pickupName,
      pickupPhone,
      pickupNotes,
      dropoffName,
      dropoffPhone,
      dropoffNotes,
      manifestItems
    });
  }

  return createRealDelivery({
    quoteId,
    pickup,
    dropoff,
    pickupName,
    pickupPhone,
    pickupNotes,
    dropoffName,
    dropoffPhone,
    dropoffNotes,
    manifestItems
  });
};

module.exports = {
  getAccessToken,
  createDelivery,
  isMockEnabled,
};