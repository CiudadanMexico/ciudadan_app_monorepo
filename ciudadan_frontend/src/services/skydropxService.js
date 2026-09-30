const API_URL = process.env.REACT_APP_STRAPI_URL ?? 'http://localhost:1337';

export const crearCotizacionEnvio = async ({
  storeId,
  direccionDestinoId,
  items = []
}) => {
  const body = {
    store_id: storeId,
    direccion_destino_id: direccionDestinoId,
    items: items.map((item) => ({
      producto_id: item?.producto,
      cantidad: Number(item?.cantidad) || 1
    })),
  };
  const response = await fetch(`${API_URL}/api/skydropx/quotation`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const response_data = await response.json().catch(() => null);
  return response_data;
};

export const obtenerCotizacionEnvio = async (quotationId) => {
  const response = await fetch(`${API_URL}/api/skydropx/quotation/${quotationId}`);
  const response_data = await response.json().catch(() => null);
  return response_data
};

const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

export const esperarCotizacionCompleta = async (
  quotationId,
  options = {}
) => {
  const maxIntentos = options?.maxIntentos ?? 10;

  const esperaMs = options?.esperaMs ?? 1000;

  for (let intento = 0; intento < maxIntentos; intento++) {
    const response = await obtenerCotizacionEnvio(quotationId);

    const quotation = response?.quotation;

    if (quotation?.is_completed) {
      return quotation;
    }

    await sleep(esperaMs);
  }

  throw new Error("La cotización de envío tardó demasiado en completarse.");
};

export const fetchConsignmentNotes = async ({ consignment_note, description }) => {
  const params = new URLSearchParams();
  if (consignment_note) params.append('consignment_note', consignment_note);
  if (description) params.append('description', description);

  const str_params = params.toString();
  const filters = str_params ? `?${str_params}` : '';
  const response = await fetch(`${API_URL}/api/skydropx/consignment-notes${filters}`);
  const response_data = await response.json().catch(() => null);
  return response_data;
};

export const fetchPackagings = async ({ code, name }) => {
  const params = new URLSearchParams();
  if (code) params.append('code', code);
  if (name) params.append('name', name);

  const str_params = params.toString();
  const filters = str_params ? `?${str_params}` : '';
  const response = await fetch(`${API_URL}/api/skydropx/packagings${filters}`);
  const response_data = await response.json().catch(() => null);
  return response_data;
};

export const fetchOfficePoints = async (rateId, direction = 'delivery') => {
  const params = new URLSearchParams();
  params.append('rate_id', String(rateId));
  params.append('direction', direction);

  const response = await fetch(`${API_URL}/api/skydropx/office-points?${params.toString()}`);
  const response_data = await response.json().catch(() => null);
  return response_data;
};

export const crearEnvio = async (payload) => {
  const response = await fetch(`${API_URL}/api/skydropx/shipment`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const response_data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(response_data?.message ?? 'No fue posible crear el envío');
    error.details = response_data?.details ?? null;
    throw error;
  }

  return response_data;
};

export const obtenerEnvio = async (shipmentId) => {
  const response = await fetch(`${API_URL}/api/skydropx/shipment/${encodeURIComponent(shipmentId)}`);
  const response_data = await response.json().catch(() => null);
  return response_data;
};

/**
 * Congela en backend el snapshot de la tarifa seleccionada por el comprador.
 * POST /api/pedidos/:id/shipping-quote
 */
export const guardarTarifaSeleccionada = async (pedidoId, { quotationId, rate, estimatedParcels, rawResponse }) => {
  const response = await fetch(`${API_URL}/api/pedidos/${pedidoId}/shipping-quote`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      quotation_id: quotationId,
      rate,
      estimated_parcels: estimatedParcels,
      raw_response: rawResponse,
    })
  });
  const response_data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(response_data?.message ?? 'No fue posible guardar la tarifa seleccionada');
    error.details = response_data?.details ?? null;
    throw error;
  }

  return response_data;
};

/**
 * El vendedor prepara los paquetes físicos reales del envío.
 * POST /api/pedidos/:id/preparar-envio
 */
export const prepararEnvio = async (pedidoId, payload) => {
  const response = await fetch(`${API_URL}/api/pedidos/${pedidoId}/preparar-envio`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const response_data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(response_data?.message ?? 'No fue posible preparar el envío');
    error.details = response_data?.details ?? null;
    throw error;
  }

  return response_data;
};

/**
 * Consulta el envío hasta que Skydropx genere el tracking y la etiqueta (la creación responde 202 sin esos datos).
 */
export const esperarGuiaEnvio = async (shipmentId, options = {}) => {
  const maxIntentos = options?.maxIntentos ?? 6;
  const esperaMs = options?.esperaMs ?? 3000;

  for (let intento = 0; intento < maxIntentos; intento++) {
    const response = await obtenerEnvio(shipmentId);
    const shipment = response?.shipment;

    if (shipment?.tracking_number || shipment?.label_url) {
      return shipment;
    }

    await sleep(esperaMs);
  }

  return null;
};