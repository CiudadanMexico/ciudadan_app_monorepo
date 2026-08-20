import { useCallback, useState } from "react";

const API_URL = process.env.REACT_APP_STRAPI_URL;

const useOfertasComida = () => {

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  const obtenerOfertas = useCallback(async ({ search = "", categoriaId = null } = {}) => {

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      /*
       * Solo ofertas activas
      */
      params.append("filters[activa][$eq]", "true");

      /*
       * Solo ofertas publicadas
       * params.append("filters[publishedAt][$notNull]", "true");
      */

      /*
       * Restaurante
      */
      params.append("populate[restaurant][populate]", "imagen");

      /*
       * Items de la oferta
      */
      params.append("populate[items][populate][product][populate]", "imagen_predeterminada");

      /*
       * Modificadores de los items
      */
      params.append("populate[items][populate][food_modifiers]", "true");

      /*
       * Búsqueda
      */
      if (search.trim()) {
        // params.append("filters[$or][0][titulo][$containsi]", search.trim());
        // params.append("filters[$or][1][descripcion][$containsi]", search.trim());
        params.append("filters[titulo][$containsi]", search.trim());
      }

      /*
       * Orden
      */
      params.append("sort[0]", "createdAt:desc");

      const response = await fetch(`${API_URL}/api/food-offers?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Error obteniendo ofertas: ${response.status}`);
      }

      const result = await response.json();
      return result?.data || [];

    } catch (err) {
      console.error("Error obteniendo ofertas:", err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);


  return {
    obtenerOfertas,
    loading,
    error
  };

};


export default useOfertasComida;