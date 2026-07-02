// src/hooks/useProductos.js
import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const regiones = {
  Norte: ['Chihuahua', 'Sonora', 'Coahuila', 'Nuevo León', 'Durango', 'Tamaulipas'],
  Centro: ['CDMX', 'Estado de México', 'Hidalgo', 'Puebla', 'Tlaxcala', 'Morelos', 'Querétaro'],
  Occidente: ['Jalisco', 'Michoacán', 'Colima', 'Nayarit', 'Zacatecas', 'San Luis Potosí'],
  Sur: ['Oaxaca', 'Chiapas', 'Veracruz', 'Tabasco', 'Guerrero'],
  Sureste: ['Yucatán', 'Campeche', 'Quintana Roo'],
  Bajío: ['Aguascalientes', 'Guanajuato'],
};

const getRegion = (estado) => {
  for (const [region, estados] of Object.entries(regiones)) {
    if (estados.includes(estado)) return region;
  }
  return null;
};

const obtenerEstadoPorCP = async (cp) => {
  const cpp = cp || '11560';
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${cpp}&components=country:MX&key=${process.env.REACT_APP_GEOCODING_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK') return null;

    const resultados = data.results[0]?.address_components;
    if (!resultados) return null;

    const estado = resultados.find(component =>
      component.types.includes('administrative_area_level_1')
    );

    return estado ? estado.long_name : null;
  } catch (err) {
    return null;
  }
};

const obtenerEstadoProducto = async (producto) => {
  return await obtenerEstadoPorCP(producto.cp);
};

const obtenerCPProducto = (producto) => {
  return producto.cp || null;
};

const calcularPesoVolumetrico = (largoCm, anchoCm, altoCm) => {
  return (largoCm * anchoCm * altoCm) / 5000;
};

const calcularPesoCobrado = (pesoReal, pesoVolumetrico) => {
  return Math.max(pesoReal, pesoVolumetrico);
};

const estimarCostoEnvio = (regionOrigen, regionDestino, pesoCobrado) => {
  let base = 0;
  if (regionOrigen && regionDestino) {
    base = regionOrigen === regionDestino ? 70 : 130;
  } else {
    base = 150;
  }
  if (pesoCobrado <= 1) return base;
  const extraPeso = Math.ceil(pesoCobrado - 1);
  return base + extraPeso * 30;
};

const precotizarMienvio = async (cpOrigen, cpDestino, largo, ancho, alto, peso) => {
  const cppOrigen = cpOrigen || '11560';
  const cppDestino = cpDestino || '11560';
  const estadoOrigen = await obtenerEstadoPorCP(cppOrigen);
  const estadoDestino = await obtenerEstadoPorCP(cppDestino);
  if (!estadoOrigen || !estadoDestino) return null;
  const regionOrigen = getRegion(estadoOrigen);
  const regionDestino = getRegion(estadoDestino);
  const pesoVol = calcularPesoVolumetrico(largo, ancho, alto);
  const pesoCobrado = calcularPesoCobrado(peso, pesoVol);
  return estimarCostoEnvio(regionOrigen, regionDestino, pesoCobrado);
};

const precotizarStripe = (precioProducto) => {
  const tarifa = precioProducto < 200 ? 5 : 10;
  const iva = tarifa * 0.16;
  return parseFloat((tarifa + iva).toFixed(2));
};

const precotizacionSuma = async (producto, cpDestino) => {
  const envio = await precotizarMienvio(producto.cp, cpDestino, producto.largo, producto.ancho, producto.alto, producto.peso);
  const comision = precotizarStripe(producto.precio);
  producto.comisionStripe = comision;
  return { envio, comision };
};

const precotizacionTotal = async (producto, cpDestino) => {
  const { envio, comision } = await precotizacionSuma(producto, cpDestino);
  return parseFloat((producto.precio + envio + comision).toFixed(2));
};

/**
 * useProductos
 * @param {Object} options
 * @param {boolean} options.paginado - si true, el hook devolverá productos en forma { data: [], meta: {} }
 */
const useProductos = ({ paginado } = {}) => {
  const isPaginado = Boolean(paginado);
  const [productos, setProductos] = useState(isPaginado ? { data: [], meta: {} } : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [producto, setProducto] = useState(null);
  const [totalItems, setTotalItems] = useState(0);

  const API_ROOT = process.env.REACT_APP_STRAPI_URL + '/api';
  const API_URL_PRODUCTOS = `${API_ROOT}/productos`;
  const API_URL_RANKINGS = `${API_ROOT}/rankings`; // asumimos colección 'rankings'

  const mountedRef = useRef(true);

  const setProductosNormalized = useCallback((items = [], meta = {}) => {
    if (isPaginado) {
      setProductos({ data: items, meta: meta || {} });
      setTotalItems(meta?.pagination?.total || (items ? items.length : 0));
    } else {
      setProductos(items);
      setTotalItems(items ? items.length : 0);
    }
  }, [isPaginado]);

  // --------- Helpers para manejar producto que puede venir en forma Strapi (attributes) o plano
  const _getField = (productoObj, field) => {
    if (!productoObj) return undefined;
    // Si es objeto Strapi: { id, attributes: { ... } }
    if (productoObj.attributes) return productoObj.attributes[field];
    return productoObj[field];
  };

  const _getId = (productoObj) => {
    if (!productoObj) return null;
    return productoObj.id || (productoObj.attributes && productoObj.attributes.id) || null;
  };
  // --------------------------------------------------------

  // Legacy simple fetch (arreglado) - envía items y meta cuando aplica
  const fetchProductos = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL_PRODUCTOS}`, {
        credentials: 'include',
      });
      const json = await res.json();
      const items = json?.data || [];
      const meta = json?.meta || {};
      setProductosNormalized(items, meta);
      return { items, meta };
    } catch (err) {
      setError(err);
      console.error('fetchProductos error', err);
      return { items: [], meta: {} };
    } finally {
      setLoading(false);
    }
  }, [API_URL_PRODUCTOS, setProductosNormalized]);

  const createProducto = useCallback(async (nuevoProducto) => {
    try {
      const res = await fetch(`${API_URL_PRODUCTOS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: nuevoProducto }),
      });
      const json = await res.json();
      return json;
    } catch (err) {
      setError(err);
      console.error('createProducto error', err);
      return null;
    }
  }, [API_URL_PRODUCTOS]);

  const updateProducto = useCallback(async (id, datos) => {
    try {
      const res = await fetch(`${API_URL_PRODUCTOS}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: datos }),
      });
      const json = await res.json();
      return json;
    } catch (err) {
      setError(err);
      console.error('updateProducto error', err);
      return null;
    }
  }, [API_URL_PRODUCTOS]);

  const deleteProducto = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_URL_PRODUCTOS}/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const json = await res.json();
      return json;
    } catch (err) {
      setError(err);
      console.error('deleteProducto error', err);
      return null;
    }
  }, [API_URL_PRODUCTOS]);

  // ---- RANKINGS: contar y obtener rankings de la colección 'rankings'
  // Se intenta detectar el campo numérico de la puntuación entre varias posibilidades (valor, puntuacion, calificacion, rating, score)
  const _extractScoreFromRanking = (ranking) => {
    // ranking puede venir con atributos si fue devuelto por Strapi
    const raw = ranking.attributes ? ranking.attributes : ranking;
    const possible = ['valor', 'puntuacion', 'calificacion', 'rating', 'score', 'value'];
    for (const key of possible) {
      if (raw[key] != null && !isNaN(Number(raw[key]))) {
        return Number(raw[key]);
      }
    }
    // si no encontramos, intentar buscar cualquier campo numérico
    for (const k of Object.keys(raw)) {
      const v = raw[k];
      if (v != null && !isNaN(Number(v))) return Number(v);
    }
    return null;
  };

  // obtener los items de rankings para un producto
  const obtenerRankings = useCallback(async (productoId, { pageSize = 1000 } = {}) => {
    try {
      const res = await axios.get(API_URL_RANKINGS, {
        params: {
          'filters[producto][id][$eq]': productoId,
          'pagination[pageSize]': pageSize,
          populate: '*',
        },
        withCredentials: true,
      });
      return res?.data?.data || [];
    } catch (err) {
      console.error('Error obteniendo rankings:', err);
      return [];
    }
  }, [API_URL_RANKINGS]);

  // contar rankings rápidamente usando meta.pagination.total (si Strapi regresa meta)
  const contadorRankings = useCallback(async (productoId) => {
    try {
      const res = await axios.get(API_URL_RANKINGS, {
        params: {
          'filters[producto][id][$eq]': productoId,
          'pagination[pageSize]': 1,
        },
        withCredentials: true,
      });
      const meta = res?.data?.meta;
      if (meta?.pagination?.total != null) return meta.pagination.total;
      // fallback: obtener todos y contar
      const items = res?.data?.data || [];
      return items.length;
    } catch (err) {
      console.error('Error contando rankings:', err);
      return 0;
    }
  }, [API_URL_RANKINGS]);

  // calcular promedio de rankings (de 1-100) y devolver también la conversión a 0-5
  const calcularPromedioRankingsPorProducto = useCallback(async (productoId) => {
    try {
      const items = await obtenerRankings(productoId);
      if (!items || items.length === 0) return { count: 0, avg100: 0, avg5: 0 };
      let sum = 0;
      let valid = 0;
      for (const it of items) {
        const score = _extractScoreFromRanking(it);
        if (score != null && !isNaN(score)) {
          sum += Number(score);
          valid += 1;
        }
      }
      if (valid === 0) return { count: 0, avg100: 0, avg5: 0 };
      const avg100 = sum / valid; // promedio en escala 1-100
      const avg5 = (avg100 / 100) * 5; // convertir a 0-5
      return {
        count: valid,
        avg100: parseFloat(avg100.toFixed(2)),
        avg5: parseFloat(avg5.toFixed(2)),
      };
    } catch (err) {
      console.error('Error calculando promedio rankings:', err);
      return { count: 0, avg100: 0, avg5: 0 };
    }
  }, [obtenerRankings]);

  // actualizar en Strapi los campos relacionados del producto:
  // - numero_calificaciones: número total de rankings
  // - calificacion: suma total de estrellas (avg5 * count) para mantener compatibilidad con calificacionPromedio existente
  const actualizarCalificacionProducto = useCallback(async (productoId) => {
    try {
      const { count, avg5 } = await calcularPromedioRankingsPorProducto(productoId);
      // sumStars = avg5 * count  (mantener formato que usa calificacionPromedio)
      const sumStars = parseFloat((avg5 * count).toFixed(2));
      // si necesitas guardar avg5 directamente, podríamos crear campo adiccional 'promedio_estrellas'
      const body = {
        numero_calificaciones: count,
        calificacion: sumStars,
      };
      // actualizar producto en Strapi (PUT)
      const res = await axios.put(`${API_URL_PRODUCTOS}/${productoId}`, { data: body }, { withCredentials: true });
      return { success: true, data: res.data };
    } catch (err) {
      console.error('Error actualizando calificacion producto:', err);
      return { success: false, error: err };
    }
  }, [API_URL_PRODUCTOS, calcularPromedioRankingsPorProducto]);

  // ---- adaptar funciones ya existentes para aprovechar lo anterior ----

  // nota: calificacionPromedio asume que producto.calificacion es la SUMA de estrellas (0-5) de todas las calificaciones
  const calificacionPromedio = useCallback((producto) => {
    // soportar producto que puede venir con attributes
    const calificacion = _getField(producto, 'calificacion');
    const numero_calificaciones = _getField(producto, 'numero_calificaciones');
    if (!calificacion || calificacion === 0 || !numero_calificaciones) return 0;
    // devuelve valor normalizado 0..1 (como ya lo tenías). Si necesitas 0..5, multiplica por 5.
    return parseFloat((calificacion / (numero_calificaciones * 5)).toFixed(2));
  }, []);

  // obtenerNúmeroCalificaciones: si viene en el producto lo devuelve, si no, hace fetch
  const obtenerNumeroCalificaciones = useCallback(async (producto) => {
    const numero_local = _getField(producto, 'numero_calificaciones');
    if (numero_local != null) return Number(numero_local);
    // si no está, intentar contar en collection rankings
    const id = _getId(producto);
    if (!id) return 0;
    const cnt = await contadorRankings(id);
    return cnt;
  }, [contadorRankings]);

  // contadorResenas y obtenerResenas ya existentes (resenas distinta de rankings)
  const contadorResenas = useCallback(async (productoId) => {
    try {
      const res = await fetch(`${API_ROOT}/resenas?filters[producto][id][$eq]=${productoId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      return data?.meta?.pagination?.total || 0;
    } catch (err) {
      console.error('Error contando reseñas:', err);
      return 0;
    }
  }, [API_ROOT]);

  const obtenerResenas = useCallback(async (productoId) => {
    try {
      const res = await fetch(`${API_ROOT}/resenas?filters[producto][id][$eq]=${productoId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      return data?.data || [];
    } catch (err) {
      console.error('Error obteniendo reseñas:', err);
      return [];
    }
  }, [API_ROOT]);

  // getProductos (incremental / onChunk) - lo dejamos igual pero agrego comentario de dónde llamar actualizarCalificacionProducto si quieres
  const getProductos = useCallback(async (params = {}) => {
    const { onChunk, batchSize = 1, chunkDelay = 0, ...axiosParams } = params || {};
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(API_URL_PRODUCTOS, {
        params: {
          populate: '*',
          'pagination[pageSize]': 150,
          ...axiosParams,
        },
      });

      const items = res?.data?.data || [];
      const meta = res?.data?.meta || {};

      if (typeof onChunk === 'function') {
        if (batchSize <= 1) {
          for (const item of items) {
            try {
              // allow onChunk to be async
              await onChunk(item);
              setProductos(prev => {
                if (isPaginado) {
                  const prevData = (prev && prev.data) ? prev.data : [];
                  const next = { data: [...prevData, item], meta };
                  return next;
                }
                return [...prev, item];
              });
            } catch (err) {
              console.error('Error procesando chunk:', err);
            }
            if (chunkDelay) await new Promise(r => setTimeout(r, chunkDelay));
          }
          setTotalItems(meta?.pagination?.total || items.length);
        } else {
          for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            try {
              batch.forEach(it => onChunk(it));
              setProductos(prev => {
                if (isPaginado) {
                  const prevData = (prev && prev.data) ? prev.data : [];
                  return { data: prevData.concat(batch), meta };
                }
                return prev.concat(batch);
              });
            } catch (err) {
              console.error('Error procesando batch:', err);
            }
            if (chunkDelay) await new Promise(r => setTimeout(r, chunkDelay));
          }
          setTotalItems(meta?.pagination?.total || items.length);
        }
      } else {
        setProductosNormalized(items, meta);
      }

      return items;
    } catch (err) {
      console.error('❌ Error al obtener productos:', err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [API_URL_PRODUCTOS, isPaginado, setProductosNormalized]);

  // getProducto por id (si quieres, puedes llamar actualizarCalificacionProducto después de obtener)
  const getProducto = useCallback(async (id, { actualizarCalificacion = false } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL_PRODUCTOS}/${id}`, {
        params: { populate: '*' }
      });
      const item = res.data?.data || null;
      setProducto(item);
      // opcional: actualizar calificación desde rankings y refrescar
      if (actualizarCalificacion && item?.id) {
        await actualizarCalificacionProducto(item.id);
        // volver a traer item (opcional)
        const r2 = await axios.get(`${API_URL_PRODUCTOS}/${id}`, { params: { populate: '*' } });
        const item2 = r2.data?.data || item;
        setProducto(item2);
        return item2;
      }
      return item;
    } catch (err) {
      setError(err);
      console.error('getProducto error', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_URL_PRODUCTOS, actualizarCalificacionProducto]);

  const getProductoBySlug = useCallback(async (slug) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(API_URL_PRODUCTOS, {
        params: {
          'filters[slug][$eq]': slug,
          populate: '*',
        },
      });
      const data = res.data?.data?.[0] || null;
      setProducto(data);
      return data;
    } catch (err) {
      setError(err);
      console.error('getProductoBySlug error', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_URL_PRODUCTOS]);

  // buscarProductos ...
  const buscarProductos = useCallback(async (busqueda) => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = API_URL_PRODUCTOS;
      let params = { populate: '*' };

      if (typeof busqueda === 'string') {
        const q = busqueda;
        params = {
          ...params,
          'filters[$or][0][descripcion][$containsi]': q,
          'filters[$or][1][nombre][$containsi]': q,
          'filters[$or][2][marca][$containsi]': q,
        };
      } else if (busqueda && typeof busqueda === 'object') {
        const {
          filtros,
          parametros,
          pagina,
          porPagina,
          precio_min,
          precio_max,
          marca,
          tienda,
        } = busqueda;

        if (filtros === 'busqueda' && parametros) {
          params = {
            ...params,
            'filters[$or][0][descripcion][$containsi]': parametros,
            'filters[$or][1][nombre][$containsi]': parametros,
            'filters[$or][2][marca][$containsi]': parametros,
          };
        }

        if (filtros === 'categoria' && parametros) {
          params = {
            ...params,
            'filters[categoria][slug][$eq]': parametros,
          };
        }

        if (precio_min != null) {
          params['filters[precio][$gte]'] = precio_min;
        }

        if (precio_max != null) {
          params['filters[precio][$lte]'] = precio_max;
        }

        if (marca) {
          params['filters[marca][$eq]'] = marca;
        }

        if (tienda) {
          params['filters[tienda][$eq]'] = tienda;
        }

        if (pagina) params['pagination[page]'] = pagina;
        if (porPagina) params['pagination[pageSize]'] = porPagina;
      }

      const res = await axios.get(endpoint, { params });
      const items = res?.data?.data || [];
      const meta = res?.data?.meta || {};

      setProductosNormalized(items, meta);
      return items;

    } catch (err) {
      setError(err);
      console.error('buscarProductos error', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [API_URL_PRODUCTOS, setProductosNormalized]);

  const getProductosPorCategoria = useCallback(async (categoriaId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(API_URL_PRODUCTOS, {
        params: {
          populate: '*',
          'filters[store_category][id][$eq]': categoriaId,
        },
      });
      const items = res.data?.data || [];
      const meta = res.data?.meta || {};
      setProductosNormalized(items, meta);
      return items;
    } catch (err) {
      setError(err);
      console.error('getProductosPorCategoria error', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [API_URL_PRODUCTOS, setProductosNormalized]);

  const getProductosPorTienda = useCallback(async (storeId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(API_URL_PRODUCTOS, {
        params: {
          populate: '*',
          'filters[store_id][$eq]': storeId,
        },
      });
      const items = res.data?.data || [];
      const meta = res.data?.meta || {};
      setProductosNormalized(items, meta);
      return items;
    } catch (err) {
      setError(err);
      console.error('getProductosPorTienda error', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [API_URL_PRODUCTOS, setProductosNormalized]);

  const agregarResena = useCallback(async (productoId, datosResena) => {
    try {
      const res = await fetch(`${API_ROOT}/resenas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: { ...datosResena, producto: productoId } }),
      });
      const json = await res.json();
      return json;
    } catch (err) {
      console.error('Error agregando reseña:', err);
      return null;
    }
  }, [API_ROOT]);

  const obtenerImagenProducto = useCallback(async (productoId) => {
    try {
      const res = await axios.get(`${API_URL_PRODUCTOS}/${productoId}`, {
        params: { populate: 'imagen_predeterminada' }
      });
      const imagen = res.data?.data?.attributes?.imagen_predeterminada?.data?.[0];
      if (!imagen) return null;
      const url = imagen.attributes?.url;
      return `${process.env.REACT_APP_STRAPI_URL}${url}`;
    } catch (err) {
      console.error('Error obteniendo imagen del producto:', err);
      return null;
    }
  }, [API_URL_PRODUCTOS]);

  return {
    productos,
    loading,
    error,
    totalItems,
    fetchProductos,
    createProducto,
    updateProducto,
    deleteProducto,
    obtenerEstadoProducto,
    obtenerCPProducto,
    precotizarMienvio,
    precotizarStripe,
    precotizacionSuma,
    precotizacionTotal,
    calificacionPromedio,           // devuelve 0..1 (como antes)
    obtenerNumeroCalificaciones,    // ahora async: si no viene en producto la cuenta en rankings
    contadorResenas,
    obtenerResenas,
    agregarResena,
    getProductos,
    getProducto,
    getProductoBySlug,
    buscarProductos,
    getProductosPorCategoria,
    getProductosPorTienda,
    obtenerImagenProducto,
    // nuevas exportadas relacionadas con rankings:
    obtenerRankings,
    contadorRankings,
    calcularPromedioRankingsPorProducto, // { count, avg100, avg5 }
    actualizarCalificacionProducto,     // actualiza producto en Strapi con numero_calificaciones y calificacion (suma de estrellas)
  };
};

export default useProductos;
