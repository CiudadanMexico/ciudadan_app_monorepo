import { useState } from 'react';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

export default function useFavoritos({ token, user }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Agregar favorito
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

      // Base del payload
      const data = {
        tipo,
        usuario: user?.id,
        usuario_email: user?.email,
        url,
        producto: null,
        curso: null,
        contenido: null,
        club: null,
      };

      // Asignar SOLO la relación correspondiente
      data[tipo] = id;

      const res = await fetch(`${STRAPI_URL}/api/favoritos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ data }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw err;
      }

      return await res.json();
    } catch (err) {
      console.error('Error al guardar favorito:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    addFavorito,
    loading,
    error,
  };
}
