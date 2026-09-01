
import { useCallback, useRef, useState } from "react";

const STRAPI = process.env.REACT_APP_STRAPI_URL || process.env.REACT_APP_STRAPI || "";
const API_URL = `${STRAPI}/api/uber-direct`;

/**
 * Hook para gestionar cotizaciones de Uber Direct.
 * Permite obtener una cotización para uno o múltiples restaurantes utilizando una misma dirección de entrega.
*/
const useUberDirect = () => {
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /*
   * Evita que una misma solicitud de cotización se ejecute simultáneamente varias veces.
   */
  const requestIdRef = useRef(0);

  /**
   * Limpia las cotizaciones actuales.
  */
  const clearQuotes = useCallback(() => {
    setQuotes({});
    setError(null);
  }, []);

  /**
   * Obtiene una cotización para un restaurante.
   */
  const getQuote = useCallback(async ({ restaurantId, direccionDestinoId, direccionDestino, }) => {
    if (!restaurantId) {
      throw new Error("restaurantId es requerido");
    }

    if (!direccionDestinoId && !direccionDestino) {
      throw new Error("Debes proporcionar una dirección de destino");
    }

    const response = await fetch(`${API_URL}/quote`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantId,
          direccionDestinoId,
          direccionDestino,
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data?.success) {
      const message = data?.error?.message ?? "No fue posible obtener la cotización de Uber Direct";

      const requestError = new Error(message);

      requestError.status = response.status;
      requestError.details = data?.error?.details || null;

      throw requestError;
    }

    return data;
  }, []);

  /**
   * Obtiene cotizaciones para múltiples restaurantes.
   *
   * Las solicitudes se ejecutan en paralelo.
   */
  const getQuotes = useCallback(async ({ restaurants = [], direccionDestinoId = null, direccionDestino = null, }) => {
    if (!Array.isArray(restaurants) || restaurants.length === 0) {
      setQuotes({});
      return {};
    }

    if (!direccionDestinoId && !direccionDestino) {
      const message = "Debes seleccionar una dirección de entrega";
      setError(message);
      throw new Error(message);
    }

    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    /*
     * Elimina restaurantes duplicados.
     */
    const uniqueRestaurants = restaurants.filter((restaurant, index, array) =>
      restaurant?.restaurantId && array.findIndex((item) => String(item.restaurantId) === String(restaurant.restaurantId)) === index
    );

    try {
      /*
       * Ejecutamos todas las cotizaciones
       * simultáneamente.
       */
      const results = await Promise.allSettled(
        uniqueRestaurants.map(async (restaurant) => {
          const result = await getQuote({
            restaurantId: restaurant.restaurantId,
            direccionDestinoId,
            direccionDestino,
          });

          return {
            restaurantId: restaurant.restaurantId,
            restaurantName: restaurant.restaurantName ?? restaurant.name ?? "",
            ...result,
          };
        })
      );

      /*
       * Si ya inició una solicitud posterior, ignoramos esta respuesta.
       */
      if (currentRequestId !== requestIdRef.current) {
        return {};
      }

      const normalizedQuotes = {};

      const errors = [];

      results.forEach((result, index) => {
        const restaurant = uniqueRestaurants[index];
        const restaurantId = restaurant.restaurantId;

        if (result.status === "fulfilled") {
          normalizedQuotes[restaurantId] = result.value;
        } else {
          errors.push({
            restaurantId,
            restaurantName: restaurant.restaurantName ?? restaurant.name ?? "",
            error: result.reason,
          });
        }
      });

      setQuotes(normalizedQuotes);

      /*
       * No hacemos fallar toda la operación si un restaurante no pudo cotizar.
       * Esto es importante porque el checkout puede tener varios restaurantes.
      */
      if (errors.length > 0) {
        setError({
          type: "PARTIAL_ERROR",
          message: "No fue posible obtener el costo de envío de uno o más restaurantes.",
          restaurants: errors,
        });
      }

      return {
        quotes: normalizedQuotes,
        errors,
      };
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) {
        return {};
      }

      console.error("Error obteniendo cotizaciones Uber Direct:", err);

      setError({
        type: "GENERAL_ERROR",
        message: err?.message || "No fue posible obtener las cotizaciones.",
      });

      throw err;
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [getQuote]);

  /**
   * Devuelve el quote de un restaurante.
   */
  const getRestaurantQuote = useCallback((restaurantId) => {
    if (!restaurantId) {
      return null;
    }

    return (quotes[restaurantId] || null);
  }, [quotes]);

  /**
   * Obtiene el costo de envío de un restaurante.
   */
  const getRestaurantFee = useCallback((restaurantId) => {
    const result = getRestaurantQuote(restaurantId);

    return (result?.quote?.fee ?? null);
  }, [getRestaurantQuote]);

  /**
   * Obtiene el costo total de todas
   * las cotizaciones disponibles.
   */
  const getTotalFee = useCallback(() => {
    return Object.values(quotes).reduce((total, item) => {
      const fee = Number(item?.quote?.fee);

      if (!Number.isFinite(fee)) {
        return total;
      }

      return total + fee;
    }, 0);
  }, [quotes]);

  /**
   * Indica si una cotización existe.
   */
  const hasQuote = useCallback((restaurantId) => {
    return Boolean(quotes[restaurantId]);
  }, [quotes]);

  /**
   * Verifica si un quote sigue vigente
   * utilizando la fecha expires proporcionada
   * por Uber.
   */
  const isQuoteExpired = useCallback((restaurantId) => {
    const result = getRestaurantQuote(restaurantId);

    const expires = result?.quote?.expires;

    if (!expires) {
      return true;
    }

    const expirationDate = new Date(expires);

    if (Number.isNaN(expirationDate.getTime())) {
      return true;
    }

    return (expirationDate.getTime() <= Date.now());
  }, [getRestaurantQuote]);

  /**
   * Verifica si alguna de las cotizaciones
   * está expirada.
   */
  const hasExpiredQuotes = useCallback(() => {
    return Object.keys(quotes).some((restaurantId) => isQuoteExpired(restaurantId));
  }, [quotes, isQuoteExpired,]);

  return {
    // Estado
    quotes,
    loading,
    error,

    // Solicitudes
    getQuote,
    getQuotes,

    // Consultas
    getRestaurantQuote,
    getRestaurantFee,
    getTotalFee,
    hasQuote,
    isQuoteExpired,
    hasExpiredQuotes,

    // Utilidades
    clearQuotes,
  };
};

export default useUberDirect;