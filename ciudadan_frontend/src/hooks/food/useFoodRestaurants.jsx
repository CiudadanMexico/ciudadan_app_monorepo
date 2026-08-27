import { useState } from "react";
import { generateSlug, generateTempSlug, slugify } from "../../utils/slugify";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
const RESTAURANTS_URL = `${STRAPI_URL}/api/food-restaurants`;

export function useFoodRestaurants() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getRestaurantsBySlug = async (slug) => {
    try {
      setLoading(true);
      const res = await fetch(`${RESTAURANTS_URL}?filters[slug][$eq]=${slug}`);
      const data = await res.json();
      return Array.isArray(data.data) ? data.data : [];
    } catch (err) {
      console.error("Error al consultar el slug:", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getRestaurantsByEmail = async (email) => {
    try {
      setLoading(true);
      const res = await fetch(`${RESTAURANTS_URL}?filters[email][$eq]=${email}&populate=imagen`);
      const data = await res.json();
      return Array.isArray(data.data) ? data?.data : [];
    } catch (error) {
      console.error("Error al consultar por email:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getRestaurantBySlugFromUserEmail = async (slug = '', email = '') => {
    try {
      setLoading(true);
      const res = await fetch(`${RESTAURANTS_URL}?filters[slug][$eq]=${slug}&filters[email][$eq]=${email}`);
      const data = await res.json();
      return Array.isArray(data.data) ? data.data[0] : null;
    } catch (err) {
      console.error("Error al consultar el slug:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createRestaurant = async ({ name = '', email = '', user_id, }) => {
    const slug = slugify(name);
    const slug_tmp = generateTempSlug();

    const [existingRestaurantBySlug, existingRestaurantByEmail] = await Promise.all([getRestaurantsBySlug(slug), getRestaurantsByEmail(email.trim())]);
    if (existingRestaurantBySlug.length > 0)
      throw new Error("Ya existe un restaurante con ese nombre");

    if (existingRestaurantByEmail.length > 0)
      throw new Error("Ya existe un restaurante asociado al correo del usuario");

    try {
      const res = await fetch(`${RESTAURANTS_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { nombre: name, slug: slug_tmp, email, users_permissions_user: user_id } })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Error al crear restaurante");
      }
      const newRestaurant = await res.json();
      const dataRestaurant = newRestaurant.data;
      const finalSlug = generateSlug(name, dataRestaurant.id);
      const updatedRestaurant = await updateRestaurant(dataRestaurant.id, { slug: finalSlug, paso: 1 });
      return updatedRestaurant;
    } catch (error) {
      console.error("Error al registrar restaurante: ", error);
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }

  };

  const updateRestaurant = async (id, data = {}) => {
    if (!id) return null;
    try {
      setLoading(true);
      const res = await fetch(`${RESTAURANTS_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data })
      });
      return await res.json();

    } catch (error) {
      setError(error);
      console.error("Error al actualizar restaurante:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createDireccion = async ({ data }) => {
    try {
      const res = await fetch(`${STRAPI_URL}/api/direcciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data })
      });
      return await res.json();
    } catch (err) {
      console.error('Error en createDireccion:', err);
      throw err;
    }
  };

  return {
    loading,
    error,
    setLoading,
    setError,
    getRestaurantsByEmail,
    getRestaurantsBySlug,
    getRestaurantBySlugFromUserEmail,
    createRestaurant,
    updateRestaurant,
    createDireccion
  }
};