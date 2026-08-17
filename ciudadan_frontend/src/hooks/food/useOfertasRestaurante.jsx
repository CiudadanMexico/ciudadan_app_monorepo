import { useCallback, useState } from "react";

const API_URL = process.env.REACT_APP_STRAPI_URL;

const useOfertasRestaurante = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingModificadores, setLoadingModificadores] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);

  const obtenerOfertas = useCallback(async (restaurantId) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("filters[restaurant][id][$eq]", restaurantId);
      params.append("populate[restaurant]", "true");
      params.append("populate[items][populate][product]", "true");
      params.append("populate[items][populate][food_modifiers]", "true");
      params.append("sort[0]", "createdAt:desc");
      const response = await fetch(`${API_URL}/api/food-offers?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error obteniendo ofertas: ${response.status}`);
      }
      const result = await response.json();
      return result?.data ?? [];
    } catch (err) {
      console.error("Error obteniendo ofertas:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const crearOferta = useCallback(async (data) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/food-offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            data
          })
        }
      );

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => null);
        throw new Error(errorResponse?.error?.message ?? `Error creando oferta: ${response.status}`);
      }
      const result = await response.json();
      return result?.data;
    } catch (err) {
      console.error("Error creando oferta:", err);

      setError(err);
      throw err;

    } finally {
      setLoading(false);
    }
  }, []);

  const actualizarOferta = useCallback(async (id, data = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/food-offers/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            data
          })
        }
      );

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => null);
        throw new Error(errorResponse?.error?.message ?? `Error actualizando oferta: ${response.status}`);
      }

      const result = await response.json();
      return result?.data;

    } catch (err) {
      console.error(
        "Error actualizando oferta:",
        err
      );

      setError(err);

      throw err;

    } finally {
      setLoading(false);
    }
  }, []);

  const eliminarOferta = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/food-offers/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => null);
        throw new Error(errorResponse?.error?.message ?? `Error eliminando oferta: ${response.status}`);
      }

      return true;

    } catch (err) {
      console.error("Error eliminando oferta:", err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const obtenerGruposModificadores = useCallback(async (restaurantId) => {
    try {
      setLoadingModificadores(true);
      const params = new URLSearchParams();
      params.append("filters[food_restaurant][id][$eq]", restaurantId);
      params.append("populate[food_modifiers][populate][image]", "true");
      const response = await fetch(`${API_URL}/api/food-modifier-groups?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Error obteniendo grupo de modificadores: ${response.status}`);
      }

      const result = await response.json();
      return result?.data ?? [];

    } catch (error) {
      console.error("Error: ", error);
      return [];
    } finally {
      setLoadingModificadores(false);
    }
  }, []);

  const obtenerProductos = useCallback(async (restaurantId) => {
    try {
      setLoadingProductos(true)
      const params = new URLSearchParams();
      params.append("filters[food_restaurant][id][$eq]", restaurantId);
      params.append("populate[imagen_predeterminada]", "true");
      params.append("populate[food_categories]", "true");
      const response = await fetch(`${API_URL}/api/food-products?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Error obteniendo grupo de modificadores: ${response.status}`);
      }

      const result = await response.json();
      return result?.data ?? [];

    } catch (error) {
      console.error("Error: ", error);
      return [];
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  return {
    loading,
    error,
    obtenerOfertas,
    crearOferta,
    actualizarOferta,
    eliminarOferta,
    obtenerGruposModificadores,
    obtenerProductos,
    loadingModificadores,
    loadingProductos,
  };
};

export default useOfertasRestaurante;