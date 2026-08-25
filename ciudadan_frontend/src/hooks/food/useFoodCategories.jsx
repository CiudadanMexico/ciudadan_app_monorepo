import { useState } from 'react';
import { transformImageStrapi } from '../../utils/strapiHelpers';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
const CATEGORIES_URL = `${STRAPI_URL}/api/food-categories`;

export function useFoodCategories() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${CATEGORIES_URL}?populate=imagen`);
      const data = await res.json();
     
      const categoriesData = data?.data ?? [];
      const categoriesTransformed = categoriesData?.map((c) => {
        const { id, attributes } = c;
        const imagen = transformImageStrapi(attributes?.imagen ?? {});
        return ({id, attributes: {...attributes, imagen}});
      });
      return categoriesTransformed;
    } catch (err) {
      setError(err);
      return [];
    }finally{
      setLoading(false);
    }
  };

  const getCategoriaBySlug = async (slug) => {
    try {
      const res = await fetch(`${STRAPI_URL}/api/store-categories?filters[slug][$eq]=${slug}&populate=imagen`);
      const data = await res.json();
      return data.data[0]; // retorna la primera coincidencia
    } catch (err) {
      setError(err);
      return null;
    }
  };

  const getCategoriaById = async (id) => {
    try {
      const res = await fetch(`${STRAPI_URL}/api/store-categories/${id}?populate=imagen`);
      const data = await res.json();
      return data.data;
    } catch (err) {
      setError(err);
      return null;
    }
  };

  const createCategoria = async ({ nombre, slug, imagen = null }) => {
    try {
      const payload = {
        data: {
          nombre,
          slug,
        }
      };

      if (imagen) {
        payload.data.imagen = imagen; // id de imagen subida previamente
      }

      const res = await fetch(`${STRAPI_URL}/api/store-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      return data.data;
    } catch (err) {
      setError(err);
      return null;
    }
  };

  const updateCategoria = async (id, data) => {
    try {
      const res = await fetch(`${STRAPI_URL}/api/store-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });

      const updated = await res.json();
      return updated.data;
    } catch (err) {
      setError(err);
      return null;
    }
  };

  const deleteCategoria = async (id) => {
    try {
      await fetch(`${STRAPI_URL}/api/store-categories/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      setError(err);
    }
  };

  return {
    loading,
    error,
    getCategories,
    getCategoriaBySlug,
    getCategoriaById,
    createCategoria,
    updateCategoria,
    deleteCategoria
  };
}