import { useState } from 'react';
import { slugify } from '../utils/slugify';
import axios from 'axios';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

export function useStores() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getStoreBySlug = async (slug) => {
    try {
      const res = await fetch(`${STRAPI_URL}/api/stores?filters[slug][$eq]=${slug}`);
      const data = await res.json();
      return Array.isArray(data.data) ? data.data : [];
    } catch (err) {
      console.error("Error al consultar el slug:", err);
      return [];
    }
  };

  const getStoreByEmail = async (email) => {
    const res = await fetch(`${STRAPI_URL}/api/stores?filters[email][$eq]=${email}`);
    const data = await res.json();
    return data.data;
  };

  const createStore = async ({ name, email, status = "pending" }) => {
    const slugified = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existingStores = await getStoreBySlug(slugified);
    
    if (existingStores.length > 0) {
      throw new Error("Ya existe una tienda con ese nombre");
    }

    const res = await fetch(`${STRAPI_URL}/api/stores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { name: slugified, slug: slugified, email, status } })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "Error al crear la tienda");
    }

    return await res.json();
  };

  const updateStore = async (id, data) => {
    const res = await fetch(`${STRAPI_URL}/api/stores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data })
    });
    return await res.json();
  };

  const deleteStore = async (id) => {
    return await fetch(`${STRAPI_URL}/api/stores/${id}`, {
      method: "DELETE"
    });
  };

  const deleteDuplicateStores = async (name, validEmail) => {
    const slugified = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const stores = await getStoreBySlug(slugified);
    for (const store of stores) {
      if (store.attributes.email !== validEmail) {
        await deleteStore(store.id);
      }
    }
  };

  const onboardingStripe = async (name, email) => {
    console.log('stripe desde hook');
    const res = await fetch(`${STRAPI_URL}/api/stripe/onboarding-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeName: name, email })
    });
    const data = await res.json();
    if (res.ok && data.url) {
      console.log('stripe desde hook exito');
      return data.url;
    }
    throw new Error("No se pudo generar el enlace de Stripe");
  };

  const completeStoreSetup = async (storeId) => {
    return await updateStore(storeId, {
      stripePayoutsEnabled: true,
      stripeChargesEnabled: true,
      stripeOnboarded: true,
      terminado: true
    });
  };

  const createDireccion = async ({ data }) => {
    try {
      const res = await axios.post(
        `${STRAPI_URL}/api/direcciones`,
        { data }
      );
      return res.data;
    } catch (err) {
      console.error('Error en createDireccion:', err);
      throw err;
    }
  };

  const finishStoreSetup = async (storeId, name) => {
    console.log('terminando !!!!!!!!!');
    return await updateStore(storeId, {
      name: name,
      slug: name,
      stripePayoutsEnabled: true,
      stripeChargesEnabled: true,
      stripeOnboarded: true,
      terminado: true
    });
  }

  return {
    loading,
    error,
    setLoading,
    setError,
    getStoreByEmail,
    getStoreBySlug,
    createStore,
    updateStore,
    deleteStore,
    deleteDuplicateStores,
    onboardingStripe,
    completeStoreSetup,
    finishStoreSetup,
    createDireccion,
  };
}
