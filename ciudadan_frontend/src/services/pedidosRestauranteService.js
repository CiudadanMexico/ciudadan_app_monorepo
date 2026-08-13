const API_URL = process.env.REACT_APP_STRAPI_URL;

const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token
    ? {
      Authorization: `Bearer ${token}`
    }
    : {})
});

/**
 * Obtiene los pedidos pertenecientes a un restaurante.
 */
export const obtenerPedidosRestaurante = async ({ restauranteId, token, estado }) => {
  if (!restauranteId) {
    throw new Error('El restauranteId es requerido.');
  }

  const params = new URLSearchParams();
  params.append('filters[restaurant][id][$eq]', restauranteId);
  /*
   * Populate necesario para obtener la información
   * relacionada del pedido.
   *
   * Ajusta estos populate de acuerdo con tu schema.
   */
  params.append('populate[items][populate][product][populate][populate][imagen_predeterminada]', 'true');
  params.append('populate[direccion_destino]', 'true');
  params.append('populate[user]', 'true');
  params.append('populate[pago][populate][comprobante]', 'true');
  /*
   * Ordenar primero los pedidos más recientes.
   */
  params.append('sort[0]', 'createdAt:desc');

  if (estado && estado !== 'todos') {
    params.append('filters[status][$eq]', estado);
  }

  const response = await fetch(`${API_URL}/api/food-orders?${params.toString()}`,
    {
      method: 'GET',
      headers: getHeaders(token)
    }
  );

  if (!response.ok) {
    let errorMessage = 'No fue posible obtener los pedidos.';
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error?.message ?? errorMessage;
    } catch (_) {
      // No hacer nada.
    }
    throw new Error(errorMessage);
  }
  const data = await response.json();
  return data;
};


/**
 * Obtiene un pedido específico.
 */
export const obtenerPedidoPorId = async ({ pedidoId, token }) => {
  if (!pedidoId) {
    throw new Error('El pedidoId es requerido.');
  }

  const params = new URLSearchParams();

  params.append('populate[items][populate][product][populate][populate][imagen_predeterminada]', 'true');
  params.append('populate[direccion_destino]', 'true');
  params.append('populate[user]', 'true');
  params.append('populate[pago][populate][comprobante]', 'true');
  params.append('populate[restaurant]', '*');

  const response = await fetch(`${API_URL}/api/food-orders/${pedidoId}?${params.toString()}`,
    {
      method: 'GET',
      headers: getHeaders(token)
    }
  );

  if (!response.ok) {
    let errorMessage = 'No fue posible obtener el pedido.';

    try {
      const errorData = await response.json();
      errorMessage = errorData?.error?.message ?? errorMessage;
    } catch (_) {
      // No hacer nada.
    }

    throw new Error(errorMessage);
  }

  return await response.json();
};


/**
 * Actualiza el estado de un pedido.
 */
export const actualizarEstadoPedido = async ({ pedidoId, estado, token, extraData = {} }) => {
  if (!pedidoId) {
    throw new Error('El pedidoId es requerido.');
  }

  if (!estado) {
    throw new Error('El estado es requerido.');
  }

  const response = await fetch(`${API_URL}/api/food-orders/${pedidoId}`,
    {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify({
        data: {
          status: estado,
          ...extraData
        }
      })
    }
  );

  if (!response.ok) {
    let errorMessage = 'No fue posible actualizar el estado del pedido.';
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error?.message ?? errorMessage;
    } catch (_) {
      // No hacer nada.
    }

    throw new Error(errorMessage);
  }

  return await response.json();
};


/**
 * Aceptar un pedido.
 */
export const aceptarPedido = async ({ pedidoId, token, extraData }) => {
  return actualizarEstadoPedido({
    pedidoId,
    estado: 'pendiente_envio',
    token,
    extraData,
  });
};

/**
 * Marcar pedido como listo.
 */
export const marcarPedidoListo = async ({ pedidoId, token }) => {
  return actualizarEstadoPedido({
    pedidoId,
    estado: 'enviado',
    token
  });
};


/**
 * Cancelar pedido.
 */
export const cancelarPedido = async ({ pedidoId, token }) => {
  return actualizarEstadoPedido({
    pedidoId,
    estado: 'cancelado',
    token
  });
};
/**
 * Devolver pedido.
 */
export const devolverPedido = async ({ pedidoId, token }) => {
  return actualizarEstadoPedido({
    pedidoId,
    estado: 'devuelto',
    token
  });
};
/**
 * Marcar pedido como entregado.
 */
export const marcarPedidoEntregado = async ({ pedidoId, token }) => {
  return actualizarEstadoPedido({
    pedidoId,
    estado: 'recibido',
    token
  });
};
