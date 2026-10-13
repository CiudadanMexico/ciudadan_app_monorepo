import { useState } from 'react';
import { fetchFavoritos, toggleFavorito as toggleFavoritoService } from '../services/favoritosService';

export default function useFavoritos({ token, user }) {
  void user;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Agregar favorito (vía toggle: si ya existe no lo duplica).
   * @param {Object} params
   * @param {'producto'|'curso'|'contenido'|'club'} params.tipo
   * @param {number} params.id  -> id del producto / curso / contenido / club
   * @param {string} [params.url]
   */
  const addFavorito = async ({ tipo, id, url = '' }) => {
    setLoading(true);
    setError(null);

    try {
      if (!['producto', 'curso', 'contenido', 'club'].includes(tipo)) {
        throw new Error('Tipo de favorito no válido');
      }

      if (!id) {
        throw new Error('ID requerido para guardar favorito');
      }

      // Endpoint autenticado con el token Auth0 que recibe el hook
      // (antes hacía POST a la ruta core sin auth -> 401).
      const resultado = await toggleFavoritoService({
        tipo,
        elementoId: id,
        url,
        token,
      });

      return resultado;
    } catch (err) {
      console.error('Error al guardar favorito:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * ¿Este elemento ya es favorito del usuario autenticado?
   * (Antes no existía: DetalleFoodProduct lo desestructuraba y recibía
   * `undefined`, por eso el check inicial estaba comentado.)
   */
  const existeFavorito = async ({ tipo, id }) => {
    if (!['producto', 'curso', 'contenido', 'club'].includes(tipo)) return false;
    if (!id) return false;

    const data = await fetchFavoritos(token, { tipo, limit: 100 });
    const list = Array.isArray(data?.data) ? data.data : [];
    return list.some((fav) => {
      const rel = fav?.attributes?.[tipo]?.data ?? fav?.[tipo];
      const relId = rel?.id ?? rel;
      return String(relId) === String(id);
    });
  };

  return {
    addFavorito,
    existeFavorito,
    loading,
    error,
  };
}
