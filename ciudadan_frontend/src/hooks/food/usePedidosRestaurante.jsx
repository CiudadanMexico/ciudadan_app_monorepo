import {
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import {
  obtenerPedidosRestaurante,
  obtenerPedidoPorId,
  aceptarPedido,
  marcarPedidoListo,
  marcarPedidoEntregado,
  cancelarPedido
} from '../../services/pedidosRestauranteService';

const normalizarPedido = (pedido) => {
  if (!pedido) return null;

  return {
    id: pedido.id,

    ...pedido.attributes
  };
};

const usePedidosRestaurante = ({ restauranteId, token, autoLoad = true, refreshInterval = 30000 } = {}) => {

  const [pedidos, setPedidos] = useState([]);

  const [loading, setLoading] = useState(false);

  const [loadingPedido, setLoadingPedido] = useState(false);

  const [updatingPedido, setUpdatingPedido] = useState(false);

  const [error, setError] = useState(null);

  const [errorPedido, setErrorPedido] = useState(null);

  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  const intervalRef = useRef(null);

  /**
   * Obtiene los pedidos del restaurante.
   */
  const obtenerPedidos = useCallback(async ({ estado = null, mostrarLoading = true } = {}) => {
    if (!restauranteId) {
      return [];
    }

    try {
      if (mostrarLoading) {
        setLoading(true);
      }
      setError(null);
      const response = await obtenerPedidosRestaurante({
        restauranteId,
        token,
        estado
      });
      const pedidosObtenidos = response?.data ?? [];
      const pedidosNormalizados = pedidosObtenidos.map(normalizarPedido);
      setPedidos(pedidosNormalizados);
      return pedidosNormalizados;
    } catch (err) {
      console.error('Error obteniendo pedidos:', err);

      setError(err?.message ?? 'No fue posible obtener los pedidos.');
      return [];
    } finally {
      if (mostrarLoading) {
        setLoading(false);
      }
    }
  }, [restauranteId, token]);

  /**
   * Obtiene un pedido individual.
   */
  const obtenerPedido = useCallback(async (pedidoId) => {
    if (!pedidoId) {
      return null;
    }

    try {
      setLoadingPedido(true);
      setErrorPedido(null);
      const response = await obtenerPedidoPorId({ pedidoId, token });
      const pedido = response?.data ?? null;
      setPedidoSeleccionado(pedido);
      return pedido;
    } catch (err) {
      console.error('Error obteniendo pedido:', err);
      setErrorPedido(err?.message ?? 'No fue posible obtener el pedido.');
      return null;
    } finally {
      setLoadingPedido(false);
    }
  }, [token]);


  /**
   * Actualiza el pedido dentro del estado local.
   *
   * Esto evita tener que volver a consultar
   * todos los pedidos después de cada operación.
   */
  const actualizarPedidoLocal = useCallback((pedidoActualizado) => {
    if (!pedidoActualizado?.id) {
      return;
    }
    setPedidos(prev => prev.map(pedido => pedido.id === pedidoActualizado.id ? pedidoActualizado : pedido));
    setPedidoSeleccionado(pedidoActualizado);
  }, []);


  /**
   * Ejecuta una operación sobre un pedido.
   */
  const ejecutarActualizacion = useCallback(async ({ pedidoId, callback, extraData = {} }) => {
    if (!pedidoId) {
      return null;
    }

    try {
      setUpdatingPedido(true);
      setError(null);
      const response = await callback({ pedidoId, token, extraData });
      const pedidoActualizado = response?.data ?? null;
      if (pedidoActualizado) {
        actualizarPedidoLocal(pedidoActualizado);
      }

      return pedidoActualizado;
    } catch (err) {
      console.error('Error actualizando pedido:', err);
      setError(err?.message ?? 'No fue posible actualizar el pedido.');
      throw err;
    } finally {

      setUpdatingPedido(false);

    }
  }, [token, actualizarPedidoLocal]
  );

  /**
   * Aceptar pedido.
   */
  const aceptar = useCallback(async (pedidoId, extraData = {}) => {
    return ejecutarActualizacion({ pedidoId, callback: aceptarPedido, extraData });
  }, [ejecutarActualizacion]);


  /**
   * Marcar pedido como listo.
   */
  const marcarListo = useCallback(async (pedidoId) => {
    return ejecutarActualizacion({ pedidoId, callback: marcarPedidoListo });
  }, [ejecutarActualizacion]);


  /**
   * Marcar pedido como entregado.
   */
  const marcarEntregado = useCallback(async (pedidoId) => {
    return ejecutarActualizacion({ pedidoId, callback: marcarPedidoEntregado });
  }, [ejecutarActualizacion]);


  /**
   * Cancelar pedido.
   */
  const cancelar = useCallback(async (pedidoId) => {
    return ejecutarActualizacion({ pedidoId, callback: cancelarPedido });
  }, [ejecutarActualizacion]);


  /**
   * Limpiar pedido seleccionado.
   */
  const limpiarPedidoSeleccionado = useCallback(() => {
    setPedidoSeleccionado(null);
    setErrorPedido(null);
  }, []);


  /**
   * Carga inicial.
   */
  useEffect(() => {
    if (!autoLoad || !restauranteId) {
      return;
    }
    obtenerPedidos();
  }, [autoLoad, restauranteId, obtenerPedidos]);


  /**
   * Actualización automática.
   *
   * mostrarLoading=false evita que aparezca
   * un CircularProgress cada 30 segundos.
   */
  useEffect(() => {
    if (!autoLoad || !restauranteId || !refreshInterval) {
      return;
    }

    intervalRef.current =
      setInterval(() => {
        obtenerPedidos({
          mostrarLoading: false
        });

      }, refreshInterval);

    return () => {

      if (intervalRef.current) {
        clearInterval(
          intervalRef.current
        );
      }

    };

  }, [autoLoad, restauranteId, refreshInterval, obtenerPedidos]);


  /**
   * Estadísticas de pedidos.
   */
  const estadisticas = {
    pendientes: pedidos.filter(
      pedido =>
        pedido.status === 'pendiente_pago' ||
        pedido.status === 'pendiente_verificacion' ||
        pedido.status === 'pendiente_envio'
    ).length,

    porPreparar: pedidos.filter(
      pedido =>
        pedido.status === 'pendiente_envio'
    ).length,

    enCamino: pedidos.filter(
      pedido =>
        pedido.status === 'enviado' ||
        pedido.status === 'en_camino'
    ).length,

    recibidos: pedidos.filter(
      pedido =>
        pedido.status === 'recibido'
    ).length,

    cancelados: pedidos.filter(
      pedido =>
        pedido.status === 'cancelado'
    ).length,

    devueltos: pedidos.filter(
      pedido =>
        pedido.status === 'devuelto'
    ).length
  };


  return {
    // Datos
    pedidos,
    pedidoSeleccionado,
    estadisticas,
    // Estados
    loading,
    loadingPedido,
    updatingPedido,
    error,
    errorPedido,
    // Consultas
    obtenerPedidos,
    obtenerPedido,
    // Acciones
    aceptar,
    marcarListo,
    marcarEntregado,
    cancelar,
    // Selección
    setPedidoSeleccionado,
    limpiarPedidoSeleccionado
  };
};

export default usePedidosRestaurante;