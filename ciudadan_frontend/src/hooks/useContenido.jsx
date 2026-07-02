import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { slugify } from '../utils/slugify';
import { useMembresia } from './useMembresia.jsx';
import { useRolEditor } from './useRolEditor.jsx';
import { useAuth0 } from '@auth0/auth0-react';

const STRAPI_URL = `${process.env.REACT_APP_STRAPI_URL}`;
const UPLOAD_URL = `${STRAPI_URL}/api/upload`;

export function useContenido() {
const { user, getAccessTokenSilently } = useAuth0();
const [autoresMap, setAutoresMap] = useState({});
  const tieneMembresia = useMembresia();
  //const { user } = useAuth0();
  const esEditor = useRolEditor(user?.email);

  const [total, setTotal] = useState(0);

  const [contenidos, setContenidos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [totalItems, setTotalItems] = useState(0);




  async function fetchContenidos({ filtros = null, parametros = null } = {}) {
    try {
      setLoading(true);
      let urlFiltrada =
  `${STRAPI_URL}/api/contenidos` +
  `?populate=portada,autor,autor_nombre,autor_email,galeria_libre,galeria_restringida,` +
  `videos_libres,videos_restringidos,categoria` +
  `&pagination[page]=${pagina}` +
  `&pagination[pageSize]=${porPagina}` +
  `&sort[0]=fecha_publicacion:desc`;

// 🔎 FILTROS
if (filtros === 'categoria' && parametros) {
  urlFiltrada += `&filters[categoria][slug][$eq]=${parametros}`;
    }

    if (filtros === 'busqueda' && parametros) {
      urlFiltrada +=
        `&filters[$or][0][titulo][$containsi]=${parametros}` +
        `&filters[$or][1][contenido_libre][$containsi]=${parametros}` +
        `&filters[$or][2][contenido_restringido][$containsi]=${parametros}`;
    }

    if (filtros === 'mis-contenidos' && parametros) {
      urlFiltrada += `&filters[autor_email][$eq]=${encodeURIComponent(parametros)}`;
    }

      
      console.warn(`* * * * - * - * / * - */ / * / * /* / * /* / * /* / * /*  `, urlFiltrada);
      const res = await fetch(
        urlFiltrada
      );
      
      const data = await res.json();

      console.log('kontenidos [fetchContenidos] RESPUESTA STRAPI:', {
  page: pagina,
  pageSize: porPagina,
  received: data?.data?.length,
  total: data?.meta?.pagination?.total,
  pageCount: data?.meta?.pagination?.pageCount,
  currentPage: data?.meta?.pagination?.page,
});

      const items = Array.isArray(data.data) ? data.data : [];
      //setTotal(res.data.meta.pagination.total);
      setTotalItems(data.meta.pagination.total);
      const parsed = items.map(item => {
        const a = item.attributes;
        const cat = a.categoria?.data;
        //TODO:    EXTRAER AL USUARIO DEL CAMPO DE RELACIÓN AUTOR  CON LA COLECCIÓN USUARIOS DE STRAPI
        return {
          id: item.id,
          titulo: a.titulo,
          slug: a.slug,
          autor: a.autor_nombre || 'Anónimo',
          autor_email: a.autor_email || '',
          contenido_libre: DOMPurify.sanitize(a.contenido_libre || ''),
          contenido_restringido: DOMPurify.sanitize(a.contenido_restringido || ''),
          status: a.status,
          portada: a.portada?.data?.attributes?.url || null,
          galeria_libre: Array.isArray(a.galeria_libre?.data)
            ? a.galeria_libre.data.map(m => m.attributes?.url)
            : [],
          galeria_restringida: Array.isArray(a.galeria_restringida?.data)
            ? a.galeria_restringida.data.map(m => m.attributes?.url)
            : [],
          videos_libres: Array.isArray(a.videos_libres?.data)
            ? a.videos_libres.data.map(v => v.attributes?.url)
            : [],
          videos_restringidos: Array.isArray(a.videos_restringidos?.data)
            ? a.videos_restringidos.data.map(v => v.attributes?.url)
            : [],
          tags: Array.isArray(a.tags) ? a.tags.join(',') : (a.tags || ''),
          fecha_publicacion: a.fecha_publicacion,
          resumen: a.resumen,
          categoria: cat
            ? {
                id: cat.id,
                nombre: cat.attributes.nombre,
                slug: cat.attributes.slug,
              }
            : null,
        };
      });

      console.log('kontenidos [fetchContenidos] SETEANDO CONTENIDOS:', {
  page: pagina,
  items: parsed.length,
  ids: parsed.map(i => i.id),
});

      setContenidos(parsed);
    } catch (err) {
      console.error('Error al obtener contenidos:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategorias() {
    try {
      const res = await fetch(`${STRAPI_URL}/api/categorias-contenidos`);
      const data = await res.json();

      const cats = Array.isArray(data.data) ? data.data : [];
      const parsed = cats.map(cat => ({
        id: cat.id,
        nombre: cat.attributes.nombre,
        slug: cat.attributes.slug,
      }));

      setCategorias(parsed);
    } catch (err) {
      console.error('Error al obtener categorías:', err);
      setError(err);
    }
  }


  async function fetchAutores() {
  if (!user) return;
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/users?filters[email][$eq]=${encodeURIComponent(user.email)}`
    );
    const json = await res.json();
    const data = json.data || [];
    if (data.length) {
      setAutoresMap(prev => ({
        ...prev,
        [user.email]: data[0].id,
      }));
    }
  } catch (err) {
    console.error('Error al obtener autor Strapi:', err);
  }
}

  async function crearCategoria(nombre) {
    const slug = slugify(nombre, { lower: true });
    const res = await fetch(`${STRAPI_URL}/api/categorias-contenidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { nombre, slug } }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error('Error al crear categoría:', errData?.error || errData);
      throw new Error('No se pudo crear la categoría');
    }
    await fetchCategorias();
  }

  async function subirMedia(files) {
    const formData = new FormData();
    [...files].forEach(file => formData.append('files', file));

    const res = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error('Error al subir archivos:', errData?.error || errData);
      throw new Error('No se pudo subir el archivo');
    }

    const data = await res.json();
    return data.map(file => file.id);
  }

  async function crearContenido(nuevo, media = {}) {
  if (!esEditor) throw new Error('Permiso denegado: se requiere rol editor');

  const slug = slugify(nuevo.titulo || '', { lower: true });
   const autorId = autoresMap[user.email] || null;

  const contenido = {
    ...nuevo,
    slug,
    tags: Array.isArray(nuevo.tags)
      ? nuevo.tags.join(',')
      : nuevo.tags || '',
    categoria: nuevo.categoria ? Number(nuevo.categoria) : null,
    autor_email: user.email,                                     // guarda el email
    autor_nombre: user.name || user.nickname || '',
    ...(autorId && { autor: autorId }),

  };

  if (media.portada?.[0]) contenido.portada = media.portada[0];
  if (Array.isArray(media.galeria_libre)) contenido.galeria_libre = media.galeria_libre;
  if (Array.isArray(media.galeria_restringida)) contenido.galeria_restringida = media.galeria_restringida;
  if (Array.isArray(media.videos_libres)) contenido.videos_libres = media.videos_libres;
  if (Array.isArray(media.videos_restringidos)) contenido.videos_restringidos = media.videos_restringidos;

  try {
    const res = await fetch(`${STRAPI_URL}/api/contenidos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: contenido }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error('Error al crear contenido:', errData?.error || errData);
      throw new Error('No se pudo crear el contenido');
    }

    await fetchContenidos(); // Actualiza los contenidos si todo salió bien
  } catch (err) {
    console.error('Excepción al crear contenido:', err);
    throw err;
  }
}


  async function editarContenido(id, cambios, media = {}) {
  // 1. Log inicial
  console.log('[useContenido] editarContenido llamado con:', { id, cambios, media });

  // 2. Construir dataCampos
  const dataCampos = {
    ...cambios,
    tags: Array.isArray(cambios.tags)
      ? cambios.tags.join(',')
      : (cambios.tags || ''),
    categoria: Number(cambios.categoria) || null,
  };
  if (media.portada) dataCampos.portada = media.portada[0];
  if (media.galeria_libre) dataCampos.galeria_libre = media.galeria_libre;
  if (media.galeria_restringida) dataCampos.galeria_restringida = media.galeria_restringida;
  if (media.videos_libres) dataCampos.videos_libres = media.videos_libres;
  if (media.videos_restringidos) dataCampos.videos_restringidos = media.videos_restringidos;
  console.log('[useContenido] dataCampos preparados:', dataCampos);

  // 3. Preparar petición
  const url = `${STRAPI_URL}/api/contenidos/${id}`;
  const body = JSON.stringify({ data: dataCampos });
  console.log('[useContenido] Preparando PUT a:', url);
  console.log('[useContenido] Body:', body);

  // 4. Ejecutar fetch
  let res;
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch (networkErr) {
    console.error('[useContenido] Error de red al hacer PUT:', networkErr);
    throw new Error(`Error de red: ${networkErr.message}`);
  }

  console.log('[useContenido] Response received. Status:', res.status, 'ok:', res.ok);

  // 5. Leer cuerpo de respuesta
  let text;
  try {
    text = await res.text();
    console.log('[useContenido] Response body text:', text);
  } catch (e) {
    console.warn('[useContenido] No se pudo leer body como texto:', e);
  }

  // 6. Manejo de errores HTTP
  if (!res.ok) {
    let errData = null;
    try {
      errData = JSON.parse(text);
    } catch {}
    console.error('[useContenido] Error al editar contenido:', res.status, errData);
    throw new Error(`No se pudo editar el contenido (${res.status})`);
  }

  // 7. Refrescar lista de contenidos
  console.log('[useContenido] Éxito en PUT. Actualizando lista de contenidos…');
  await fetchContenidos();
  console.log('[useContenido] Lista de contenidos actualizada');
}


  async function eliminarContenido(id) {
    const res = await fetch(`${STRAPI_URL}/api/contenidos/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error('Error al eliminar contenido:', errData?.error || errData);
      throw new Error('No se pudo eliminar el contenido');
    }
    await fetchContenidos();
  }

  function getContenidoById(id) {
    const c = contenidos.find(c => c.id === id);
    if (!c) return null;
    return {
      ...c,
      contenido: {
        libre: c.contenido_libre,
        restringido: tieneMembresia ? c.contenido_restringido : null,
      },
      galeria: {
        libre: c.galeria_libre,
        restringida: tieneMembresia ? c.galeria_restringida : [],
      },
      videos: {
        libres: c.videos_libres,
        restringidos: tieneMembresia ? c.videos_restringidos : [],
      },
    };
  }

  function filtrarPorCategoria(slug) {
    return contenidos.filter(c => c.categoria?.slug === slug);
  }

  function buscarPorTexto(texto) {
    const t = texto.toLowerCase();
    return contenidos.filter(c =>
      c.titulo.toLowerCase().includes(t) ||
      c.resumen?.toLowerCase().includes(t) ||
      c.tags.toLowerCase().includes(t)
    );
  }

  return {
    contenidos,
    categorias,
    loading,
    error,
    tieneMembresia,
    esEditor,
    fetchContenidos,
    fetchCategorias,
    crearCategoria,
    subirMedia,
    crearContenido,
    editarContenido,
    eliminarContenido,
    getContenidoById,
    filtrarPorCategoria,
    buscarPorTexto,
    pagina,
    setPagina,
    porPagina,
    setPorPagina,
    totalItems,
    total
  };
}
