const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

const buildMediaUrl = (media) => {
  if (!media) return null;

  const data = media?.data ?? media;

  if (Array.isArray(data)) {
    const first = data[0];

    if (!first) return null;

    const url =
      first?.attributes?.url ??
      first?.attributes?.formats?.medium?.url ??
      first?.attributes?.formats?.small?.url ??
      first?.attributes?.formats?.thumbnail?.url ??
      null;

    if (!url) return null;

    return url.startsWith('http')
      ? url
      : `${STRAPI_URL}${url}`;
  }

  const url =
    data?.attributes?.url ??
    data?.attributes?.formats?.medium?.url ??
    data?.attributes?.formats?.small?.url ??
    data?.attributes?.formats?.thumbnail?.url ??
    null;

  if (!url) return null;

  return url.startsWith('http')
    ? url
    : `${STRAPI_URL}${url}`;
};

const buildMediaUrls = (media) => {
  const data = media?.data ?? media;

  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      const url =
        item?.attributes?.url ??
        item?.attributes?.formats?.medium?.url ??
        item?.attributes?.formats?.small?.url ??
        item?.attributes?.formats?.thumbnail?.url ??
        null;

      if (!url) return null;

      return url.startsWith('http')
        ? url
        : `${STRAPI_URL}${url}`;
    })
    .filter(Boolean);
};

export const normalizeFoodVariant = (variant) => {
  if (!variant) return null;
  const attributes = variant.attributes || variant;
  const id = variant.id ?? attributes.id ?? null;
  const imagen = buildMediaUrl(attributes.imagen_predeterminada);
  const imagenes = buildMediaUrls(attributes.imagenes);

  return {
    id,
    nombre: attributes.nombre || 'Sin nombre',
    descripcion: attributes.descripcion || '',
    precio: Number(attributes.precio) || 0,
    peso: attributes.peso != null ? Number(attributes.peso) : null,
    calorias: attributes.calorias != null ? Number(attributes.calorias) : null,
    stock: attributes.stock != null ? Number(attributes.stock) : null,
    usa_stock: Boolean(attributes.usa_stock),
    activo: attributes.activo !== false,
    orden: attributes.orden != null ? Number(attributes.orden) : 0,
    porciones: attributes.porciones != null ? Number(attributes.porciones) : null,

    ingredientes: attributes.ingredientes || [],

    alergenos: attributes.alergenos || [],

    imagen,

    imagenes: [
      ...(imagen ? [imagen] : []),
      ...imagenes.filter((url) => url !== imagen),
    ],

    raw: variant,
  };
};

export const normalizeFoodVariants = (variants) => {
  const data = variants?.data ?? variants ?? [];

  if (!Array.isArray(data)) return [];

  return data
    .map(normalizeFoodVariant)
    .filter(Boolean)
    .filter((variant) => variant.activo)
    .sort((a, b) => a.orden - b.orden);
};