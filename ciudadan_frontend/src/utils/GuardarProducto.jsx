// utils/enviarProducto.js
import axios from 'axios';

export const GuardarProducto = async (params) => {
  const {
    formData, imagenPredeterminada, imagenes, STRAPI_URL, storeId, userEmail, volumetrico, pesoCobrado, cp
  } = params;

  const data = new FormData();

  const payload = {
    nombre: formData.nombre,
    descripcion: formData.descripcion,
    precio: formData.precio,
    marca: formData.marca,
    stock: formData.stockEnabled ? parseFloat(formData.stock) : -1,
    store_email: userEmail,
    store_id: String(storeId),
    store: storeId,
    store_category: Number(formData.categoria),
    largo: parseFloat(formData.largo),
    ancho: parseFloat(formData.ancho),
    alto: parseFloat(formData.alto),
    peso: parseFloat(formData.peso),
    volumetrico,
    peso_cobrado: pesoCobrado,
    cp: cp,
    fecha_creacion: new Date().toISOString(),
    slug: formData.nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  };

  data.append('data', JSON.stringify(payload));
  if (imagenPredeterminada) data.append('files.imagen_predeterminada', imagenPredeterminada);
  imagenes.forEach(img => data.append('files.imagenes', img));

  const response = await axios.post(`${STRAPI_URL}/api/productos`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response;
};
