import { useCallback, useEffect, useRef, useState } from 'react';

import { cotizarEnvio as cotizarEnvioService } from '../../services/food/cotizacionesEnvioService';

// Proveedores del tablero de cotizaciones, en orden de preferencia de la
// preselección: Ciudadan es el camino soportado end-to-end por el MVP
// (verify-payment registra la entrega pendiente de despacho sin depender del
// quote_id legacy de Uber). El usuario puede cambiar la selección cuando
// quiera mientras el proveedor esté disponible.
export const PROVEEDORES_ENVIO = ['ciudadan', 'uber_direct'];

/**
 * Hook del tablero de cotizaciones de envío del módulo Food.
 *
 * Una sola llamada a POST /api/food-shipping/cotizar devuelve las opciones
 * de envío (Ciudadan y Uber Direct) por restaurante del carrito, con precio,
 * distancia y vigencia. La indisponibilidad de un proveedor NO es error HTTP:
 * viaja como dato (`disponible: false` + `codigoIndisponibilidad` + `mensaje`).
 *
 * Contrato: docs/FOOD-COTIZACIONES-ENVIO-MVP.md §3.
 */
const useCotizacionesEnvio = () => {
  const [tablero, setTablero] = useState(null);
  const [selecciones, setSelecciones] = useState({});
  const [cotizando, setCotizando] = useState(false);
  const [error, setError] = useState(null);

  /*
   * Tic del reloj de vigencia: la cotización caduca sola (15 min por defecto)
   * y la UI debe enterarse aunque el usuario no toque nada. Se incrementa cada
   * 30 s y las vistas que dependen de `Date.now()` lo usan como dependencia.
   */
  const [tic, setTic] = useState(0);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setTic((valorActual) => valorActual + 1);
    }, 30000);

    return () => clearInterval(intervalo);
  }, []);

  /*
   * Identificador de solicitud: solo la cotización más reciente actualiza el
   * estado (si la dirección o el carrito cambian mientras vuela una
   * cotización, su respuesta se descarta).
   */
  const solicitudRef = useRef(0);

  /**
   * Limpia el tablero y las selecciones. También invalida la respuesta de
   * cualquier cotización en vuelo.
   */
  const limpiarCotizaciones = useCallback(() => {
    solicitudRef.current += 1;
    setTablero(null);
    // Se evita recrear el objeto vacío cuando ya lo está (evita renders de más).
    setSelecciones((previas) => (Object.keys(previas).length > 0 ? {} : previas));
    setError(null);
  }, []);

  /**
   * Solicita el tablero de cotizaciones y preselecciona por restaurante.
   *
   * @param {object} params `{ foodCartId, foodOrderId, direccionDestinoId, direccionDestino }`
   * @param {string} token access token de Auth0
   * @returns {Promise<object|null>} tablero (null si llegó una solicitud más reciente)
   */
  const cotizar = useCallback(async ({ foodCartId, foodOrderId, direccionDestinoId, direccionDestino }, token) => {
    if (!token) {
      const mensaje = 'Falta el token de autenticación para cotizar el envío.';
      setError(mensaje);
      throw new Error(mensaje);
    }

    const solicitudActual = ++solicitudRef.current;

    setCotizando(true);
    setError(null);

    try {
      const resultado = await cotizarEnvioService(
        { foodCartId, foodOrderId, direccionDestinoId, direccionDestino },
        token
      );

      if (solicitudActual !== solicitudRef.current) {
        return null;
      }

      setTablero(resultado);

      /*
       * Preselección por restaurante: primera opción disponible según el
       * orden de PROVEEDORES_ENVIO (Ciudadan primero).
       */
      const nuevasSelecciones = {};

      (resultado?.restaurantes ?? []).forEach((restaurante) => {
        const disponibles = PROVEEDORES_ENVIO.filter(
          (proveedor) => restaurante?.cotizaciones?.[proveedor]?.disponible
        );

        if (disponibles.length === 0) {
          return;
        }

        nuevasSelecciones[String(restaurante.restaurantId)] = disponibles[0];
      });

      setSelecciones(nuevasSelecciones);

      return resultado;
    } catch (err) {
      if (solicitudActual === solicitudRef.current) {
        setError(err?.message ?? 'No fue posible obtener las cotizaciones de envío.');
      }
      throw err;
    } finally {
      if (solicitudActual === solicitudRef.current) {
        setCotizando(false);
      }
    }
  }, []);

  /**
   * Cambia el proveedor seleccionado de un restaurante.
   */
  const seleccionarProveedor = useCallback((restaurantId, proveedor) => {
    setSelecciones((prev) => ({
      ...prev,
      [String(restaurantId)]: proveedor,
    }));
  }, []);

  /**
   * Fila del tablero para un restaurante
   * (`{ restaurantId, nombre, cotizaciones }`).
   */
  const getCotizacionesRestaurante = useCallback(
    (restaurantId) => {
      return (
        (tablero?.restaurantes ?? []).find(
          (restaurante) => String(restaurante.restaurantId) === String(restaurantId)
        ) ?? null
      );
    },
    [tablero]
  );

  /**
   * Cotización seleccionada de un restaurante (solo si sigue disponible).
   */
  const getCotizacionSeleccionada = useCallback(
    (restaurantId) => {
      const proveedor = selecciones[String(restaurantId)];
      const restaurante = getCotizacionesRestaurante(restaurantId);
      const cotizacion = restaurante?.cotizaciones?.[proveedor] ?? null;

      return cotizacion?.disponible ? cotizacion : null;
    },
    [selecciones, getCotizacionesRestaurante]
  );

  /**
   * Importe de la cotización seleccionada (null si no hay selección válida).
   */
  const getImporteSeleccionado = useCallback(
    (restaurantId) => {
      const importe = Number(getCotizacionSeleccionada(restaurantId)?.importe);

      return Number.isFinite(importe) ? importe : null;
    },
    [getCotizacionSeleccionada]
  );

  /**
   * La cotización seleccionada ya venció (vigencia por defecto: 15 min).
   * Si venció hay que volver a cotizar antes de confirmar el pedido.
   */
  const seleccionVencida = useCallback(
    (restaurantId) => {
      const cotizacion = getCotizacionSeleccionada(restaurantId);

      if (!cotizacion?.vence) {
        return false;
      }

      const vence = new Date(cotizacion.vence).getTime();

      return Number.isFinite(vence) ? vence <= Date.now() : false;
    },
    [getCotizacionSeleccionada]
  );

  /*
   * Regla de checkout (docs §2): se puede continuar cuando cada restaurante
   * del carrito tiene al menos un proveedor disponible.
   */
  const puedeContinuar = tablero?.puedeContinuar === true;

  return {
    // Estado
    tablero,
    selecciones,
    cotizando,
    error,
    puedeContinuar,
    // Tic del reloj de vigencia (cambia cada 30 s): úsalo como dependencia de
    // las vistas que dependen de `Date.now()` (p.ej. "cotización vencida").
    tic,

    // Solicitudes
    cotizar,
    limpiarCotizaciones,

    // Selección
    seleccionarProveedor,

    // Consultas
    getCotizacionesRestaurante,
    getCotizacionSeleccionada,
    getImporteSeleccionado,
    seleccionVencida,
  };
};

export default useCotizacionesEnvio;

