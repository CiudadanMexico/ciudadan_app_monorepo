const API_URL = process.env.REACT_APP_STRAPI_URL;

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