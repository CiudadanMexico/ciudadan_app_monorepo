import { useState } from "react";
import { generateSlug, generateTempSlug } from "../../utils/slugify";
import { transformImageStrapi } from "../../utils/strapiHelpers";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:1337';
const PRODUCTS_URL = `${STRAPI_URL}/api/food-products`;
const VARIANTS_URL = `${STRAPI_URL}/api/food-product-variants`;

export default function useProductsRestaurant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [pagination, setPagination] = useState({});

  const getProducts = async (params = {}) => {
    try {
      setLoading(true);
      const populateStr = `populate[imagen_predeterminada]=true&populate[food_categories]=true&populate[food_product_variants][populate][imagen_predeterminada]=true&populate[food_product_variants][populate][imagenes]=true`;
      const filterPagination = `pagination[page]=${page}&pagination[pageSize]=${perPage}`;
      const extraParamsString = new URLSearchParams(params).toString();
      const response = await fetch(`${PRODUCTS_URL}?${populateStr}&${filterPagination}${extraParamsString ? `&${extraParamsString}` : ''}`);
      const { data, meta } = await response.json();
      setPagination(meta?.pagination ?? {});
      const returnProducts = data.map(({ id, attributes }) => {
        const imagen_predeterminada = transformImageStrapi(attributes.imagen_predeterminada);
        return ({ id, attributes: { ...attributes, imagen_predeterminada } })
      });
      console.log("Products get:", returnProducts)
      return returnProducts;
    } catch (error) {
      console.error("--- Error on getProducts :", error);
      return [];
    } finally {
      setLoading(false);
    }
  }

  const getProductsByRestaurant = async (restaurantId = 0, params = {}) => {
    try {
      setLoading(true);
      const filterRestaurant = `filters[food_restaurant][id][$eq]=${restaurantId}`;
      const populateStr = `populate[0]=imagen_predeterminada&populate[1]=food_categories`;
      const filterPagination = `pagination[page]=${page}&pagination[pageSize]=${perPage}`;
      const extraParamsString = new URLSearchParams(params).toString();
      const response = await fetch(`${PRODUCTS_URL}?${filterRestaurant}&${populateStr}&${filterPagination}${extraParamsString ? `&${extraParamsString}` : ''}`);
      const { data, meta } = await response.json();
      setPagination(meta?.pagination ?? {});
      const returnProducts = data.map(({ id, attributes }) => {
        const imagen_predeterminada = transformImageStrapi(attributes.imagen_predeterminada);
        return ({ id, attributes: { ...attributes, imagen_predeterminada } })
      });
      console.log("Products get:", returnProducts)
      return returnProducts;

    } catch (error) {
      console.error("--- Error on getProducts :", error);
      return [];
    } finally {
      setLoading(false);
    }
  }

  const getProductById = async (productId) => {
    try {
      if (!productId) return null;
      setLoading(true);
      const populateStr = `populate[imagen_predeterminada]=true&populate[imagenes]=true&populate[food_categories]=true&populate[food_restaurant][populate][direccion]=true&populate[food_product_variants][populate][imagen_predeterminada]=true&populate[food_product_variants][populate][imagenes]=true`;
      const response = await fetch(`${PRODUCTS_URL}/${productId}?${populateStr}`);
      const { data } = await response.json();
      console.log("Product get by id:", data)
      return data;
    } catch (error) {
      console.error("--- Error on getProductById :", error);
      return null;
    } finally {
      setLoading(false);
    }
  }

  const getProductBySlug = async (productSlug) => {
    try {
      if (!productSlug) return null;
      setLoading(true);
      const filterSlug = `filters[slug][$eq]=${productSlug}`;
      const populateStr = `populate[imagen_predeterminada]=true&populate[imagenes]=true&populate[food_categories]=true&populate[food_restaurant][populate][direccion]=true&populate[food_product_variants][populate][imagen_predeterminada]=true&populate[food_product_variants][populate][imagenes]=true`;
      const response = await fetch(`${PRODUCTS_URL}?${filterSlug}&${populateStr}`);
      const { data } = await response.json();
      console.log("Product get by slug:", data)
      return data[0];
    } catch (error) {
      console.error("--- Error on getProductBySlug :", error);
      return null;
    } finally {
      setLoading(false);
    }
  }

  const saveProduct = async ({
    nombre = '', // General - step 1
    descripcion = '', // General - step 1
    precio_base = 0, // General - step 1
    food_categories = [], // General - step 1
    disponible = true,  // General - step 1
    stockEnable = false, // General - step 1
    stock = 0, // General - step 1
    horario_disponibilidad = {}, // General - step 1

    tiempo_preparacion = 0, // Medidas - step 2
    calorias = 0, // Medidas - step 2
    peso = 0, // Medidas - step 2
    porciones = 0, // Medidas - step 2
    temperatura = 'ambiente', // Medidas - step 2
    orden_minima = 1, // Medidas - step 2

    es_picante = false, // Especificaciones - step 3
    nivel_picante = 'ninguno', // Especificaciones - step 3
    vegetariano = false, // Especificaciones - step 3
    vegano = false, // Especificaciones - step 3
    sin_gluten = false, // Especificaciones - step 3
    contiene_lacteos = false, // Especificaciones - step 3
    contiene_mariscos = false, // Especificaciones - step 3
    contiene_cerdo = false, // Especificaciones - step 3
    permite_programar = false, // Especificaciones - step 3

    ingredientes = [], // Ingredientes - step 4
    alergenos = [], // Ingredientes - step 4
    food_products_variants = [],
    food_modifiers = [], // Modificadores - paso final, ids de food-modifier ya existentes
    imagen_predeterminada, // Imagen principal - step 5
    imagenes = [], // Galería - step 6
    fecha_creacion = new Date().toISOString(), // Finalizar - step 7
    food_restaurant = null, // Finalizar - step 7
  }) => {
    const data = new FormData();
    const tmpSlug = generateTempSlug();
    const payload = {
      nombre,
      descripcion,
      precio_base,
      slug: tmpSlug,
      food_categories,
      food_restaurant,
      tiempo_preparacion,
      calorias,
      peso,
      porciones,
      es_picante,
      nivel_picante,
      vegetariano,
      vegano,
      sin_gluten,
      contiene_lacteos,
      contiene_mariscos,
      contiene_cerdo,
      ingredientes,
      alergenos,
      temperatura,
      disponible,
      usa_stock: stockEnable,
      stock: stockEnable ? stock : 0,
      horario_disponibilidad,
      orden_minima,
      permite_programar,
      fecha_creacion,
      food_modifiers,
    };
    data.append('data', JSON.stringify(payload));
    if (imagen_predeterminada) data.append('files.imagen_predeterminada', imagen_predeterminada);
    imagenes.forEach(img => data.append('files.imagenes', img));;

    try {
      setLoading(true);
      const response = await fetch(PRODUCTS_URL, { method: 'POST', body: data });
      const responseData = await response.json();
      const productId = responseData?.data?.id;
      const updatedSlug = generateSlug(nombre, productId);
      const updatedProduct = await updateProduct(productId, { slug: updatedSlug });
      const savedVariantIds = await handleSaveProductsVariants(productId, food_products_variants);
      console.log("Product saved:", updatedProduct, "Variants saved:", savedVariantIds);
      return updatedProduct;
    } catch (error) {
      console.error("Error al registrar producto: ", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (productId, data = {}) => {
    try {
      setLoading(true);
      const response = await fetch(`${PRODUCTS_URL}/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      const responseData = await response.json();
      return responseData.data;
    } catch (error) {
      console.error('Error al actualizar producto: ' + productId, error)
      return null;
    } finally {
      setLoading(false);
    }
  };

  const saveProductVariant = async (productId, data) => {
    try {
      setLoading(true);
      const { nombre, descripcion, precio, peso, calorias, stock, usaStock, orden, porciones, ingredientes, alergenos, imagen_predeterminada, imagenes } = data;
      const dataForm = new FormData();
      const payload = {
        nombre,
        descripcion,
        precio,
        peso,
        calorias,
        stock,
        orden,
        porciones,
        ingredientes,
        alergenos,
        usa_stock: usaStock,
        food_product: productId,
      };
      dataForm.append('data', JSON.stringify(payload));
      if (imagen_predeterminada) dataForm.append('files.imagen_predeterminada', imagen_predeterminada)
      imagenes.forEach(img => dataForm.append('files.imagenes', img));

      const responseSaved = await fetch(VARIANTS_URL, { method: 'POST', body: dataForm });
      const dataSaved = await responseSaved.json();
      return dataSaved?.data;
    } catch (error) {
      console.error("Error al registrar variante de producto:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProductsVariants = async (productId, food_products_variants = []) => {
    const promises = food_products_variants.map(async (v) => {
      const response = await saveProductVariant(productId, v);
      return response;
    });
    const resultResponses = await Promise.all(promises);
    return resultResponses.map(p => p?.id);
  };

  return ({
    loading,
    error,
    setLoading,
    page,
    setPage,
    perPage,
    setPerPage,
    pagination,
    setPagination,
    getProducts,
    getProductsByRestaurant,
    saveProduct,
    updateProduct,
    saveProductVariant,
    getProductById,
    getProductBySlug
  });
};