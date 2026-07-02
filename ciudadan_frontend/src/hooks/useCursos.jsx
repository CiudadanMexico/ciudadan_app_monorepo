import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { slugify } from '../utils/slugify';
import { useMembresia } from './useMembresia.jsx';
import { useRolEditor } from './useRolEditor.jsx';
import { useAuth0 } from '@auth0/auth0-react';

const STRAPI_URL = `${process.env.REACT_APP_STRAPI_URL}`;
const UPLOAD_URL = `${STRAPI_URL}/api/upload`;

export function useCursos() {
  const { user, getAccessTokenSilently } = useAuth0();
  const tieneMembresia = useMembresia();
  const esEditor = useRolEditor(user?.email);

  const [cursos, setCursos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [maestrosMap, setMaestrosMap] = useState({}); // email -> id

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchCursos();
    fetchCategorias();
    fetchMaestro();
  }, [pagina, porPagina, user]);

  async function fetchCursos(filtros = {}) {
    try {
      setLoading(true);
      let url = `${STRAPI_URL}/api/cursos?populate=portada,archivos,maestro,categoria`;

      // Paginación y orden por defecto
      if (!filtros.misCursos) {
        url += `&pagination[page]=${pagina}&pagination[pageSize]=${porPagina}&sort[0]=fecha_publicacion:desc`;
      } else {
        // Si se quieren traer "mis cursos" podríamos filtrar por el maestro relacionado
        if (user?.email && maestrosMap[user.email]) {
          url += `&filters[maestro][id][$eq]=${maestrosMap[user.email]}`;
        }
      }

      // Filtros extra (por ejemplo categoria)
      if (filtros.categoriaSlug) {
        url += `&filters[categoria][slug][$eq]=${encodeURIComponent(filtros.categoriaSlug)}`;
      }

      console.log('[useCursos] fetchCursos url:', url);
      const res = await fetch(url);
      const data = await res.json();

      const items = Array.isArray(data.data) ? data.data : [];
      setTotalItems(data.meta?.pagination?.total || 0);

      const parsed = items.map(item => {
        const a = item.attributes;
        const cat = a.categoria?.data;
        const maestroRel = a.maestro?.data;

        return {
          id: item.id,
          titulo: a.titulo,
          slug: a.slug,
          modalidad: a.modalidad,
          certificacion: a.certificacion,
          precio: a.precio,
          descripcion: DOMPurify.sanitize(a.descripcion || ''),
          portada: a.portada?.data?.attributes?.url
            ? `${STRAPI_URL}${a.portada.data.attributes.url}`
            : null,
          temario: a.temario || null,
          calendario_actividades: a.calendario_actividades,
          archivos: Array.isArray(a.archivos?.data)
            ? a.archivos.data.map(f => f.attributes?.url)
            : [],
          fecha_inicio: a.fecha_inicio,
          fecha_publicacion: a.fecha_publicacion,
          maestro: maestroRel
            ? {
                id: maestroRel.id,
                nombre: maestroRel.attributes?.name || maestroRel.attributes?.username || '',
                email: maestroRel.attributes?.email || '',
              }
            : null,
          maestro_email: a.maestro_email || '',
          maestro_nombre: a.maestro_nombre || '',
          de_pago: Boolean(a.de_pago),
          enlace_reunion: a.enlace_reunion || '',
          enlaces_publicos: a.enlaces_publicos || null,
          enlaces_privados: a.enlaces_privados || null,
          ubicacion: a.ubicacion?.data || null,
          resumen: a.resumen || '',
          categoria: cat
            ? {
                id: cat.id,
                nombre: cat.attributes.nombre,
                slug: cat.attributes.slug,
              }
            : null,
        };
      });

      setCursos(parsed);
    } catch (err) {
      console.error('Error al obtener cursos:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategorias() {
    try {
      const res = await fetch(`${STRAPI_URL}/api/categorias-cursos`);
      const data = await res.json();
      const cats = Array.isArray(data.data) ? data.data : [];
      const parsed = cats.map(cat => ({
        id: cat.id,
        nombre: cat.attributes.nombre,
        slug: cat.attributes.slug,
      }));
      setCategorias(parsed);
    } catch (err) {
      console.error('Error al obtener categorías de cursos:', err);
      setError(err);
    }
  }

  // Trae el id del usuario actual en Strapi para usarlo como maestro
  async function fetchMaestro() {
    if (!user) return;
    try {
      const res = await fetch(
        `${STRAPI_URL}/api/users?filters[email][$eq]=${encodeURIComponent(user.email)}`
      );
      const json = await res.json();
      const data = json.data || [];
      if (data.length) {
        setMaestrosMap(prev => ({ ...prev, [user.email]: data[0].id }));
      }
    } catch (err) {
      console.error('Error al obtener maestro Strapi:', err);
    }
  }

  async function crearCategoria(nombre) {
    const slug = slugify(nombre, { lower: true });
    const res = await fetch(`${STRAPI_URL}/api/categorias-cursos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { nombre, slug } }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error('Error al crear categoría cursos:', errData?.error || errData);
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

  async function crearCurso(nuevo, media = {}) {
    if (!esEditor) throw new Error('Permiso denegado: se requiere rol editor');

    const slug = slugify(nuevo.titulo || '', { lower: true });
    const maestroId = maestrosMap[user?.email] || null;

    // preparar temario (acepta objeto o string JSON)
    let temario = nuevo.temario || null;
    if (typeof temario === 'string') {
      try {
        temario = JSON.parse(temario);
      } catch (e) {
        // si no es JSON, lo dejamos como string
      }
    }

    // preparar enlaces
    let enlaces_publicos = nuevo.enlaces_publicos || null;
    if (typeof enlaces_publicos === 'string') {
      try { enlaces_publicos = JSON.parse(enlaces_publicos); } catch (e) {}
    }
    let enlaces_privados = nuevo.enlaces_privados || null;
    if (typeof enlaces_privados === 'string') {
      try { enlaces_privados = JSON.parse(enlaces_privados); } catch (e) {}
    }

    const curso = {
      titulo: nuevo.titulo,
      slug,
      modalidad: nuevo.modalidad || null,
      certificacion: nuevo.certificacion || '',
      precio: nuevo.precio ? Number(nuevo.precio) : 0,
      descripcion: nuevo.descripcion ? DOMPurify.sanitize(nuevo.descripcion) : '',
      temario: temario || null,
      calendario_actividades: nuevo.calendario_actividades || '',
      fecha_inicio: nuevo.fecha_inicio || null,
      fecha_publicacion: nuevo.fecha_publicacion || null,
      maestro_email: user?.email || '',
      maestro_nombre: user?.name || user?.nickname || '',
      ...(maestroId && { maestro: maestroId }),
      de_pago: !!nuevo.de_pago,
      enlace_reunion: nuevo.enlace_reunion || '',
      enlaces_publicos: enlaces_publicos || null,
      enlaces_privados: enlaces_privados || null,
      ubicacion: nuevo.ubicacion || null,
      resumen: nuevo.resumen || '',
      categoria: nuevo.categoria ? Number(nuevo.categoria) : null,
      // archivos y portada se asignan más abajo si vienen en media
    };

    if (media.portada?.[0]) curso.portada = media.portada[0];
    if (Array.isArray(media.archivos)) curso.archivos = media.archivos;

    try {
      const res = await fetch(`${STRAPI_URL}/api/cursos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: curso }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        console.error('Error al crear curso:', errData?.error || errData);
        throw new Error('No se pudo crear el curso');
      }

      await fetchCursos();
    } catch (err) {
      console.error('Excepción al crear curso:', err);
      throw err;
    }
  }

  async function editarCurso(id, cambios, media = {}) {
    console.log('[useCursos] editarCurso llamado con:', { id, cambios, media });

    if (!esEditor) throw new Error('Permiso denegado: se requiere rol editor');

    const dataCampos = {
      ...cambios,
      precio: cambios.precio !== undefined ? Number(cambios.precio) : undefined,
      descripcion: cambios.descripcion ? DOMPurify.sanitize(cambios.descripcion) : undefined,
      categoria: cambios.categoria ? Number(cambios.categoria) : null,
    };

    if (media.portada) dataCampos.portada = media.portada[0];
    if (media.archivos) dataCampos.archivos = media.archivos;

    // normalizar temario y enlaces si vienen como string
    if (typeof dataCampos.temario === 'string') {
      try { dataCampos.temario = JSON.parse(dataCampos.temario); } catch (e) {}
    }
    if (typeof dataCampos.enlaces_publicos === 'string') {
      try { dataCampos.enlaces_publicos = JSON.parse(dataCampos.enlaces_publicos); } catch (e) {}
    }
    if (typeof dataCampos.enlaces_privados === 'string') {
      try { dataCampos.enlaces_privados = JSON.parse(dataCampos.enlaces_privados); } catch (e) {}
    }

    const url = `${STRAPI_URL}/api/cursos/${id}`;
    const body = JSON.stringify({ data: dataCampos });

    console.log('[useCursos] PUT a:', url);
    console.log('[useCursos] body:', body);

    let res;
    try {
      res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch (networkErr) {
      console.error('[useCursos] Error de red al hacer PUT:', networkErr);
      throw new Error(`Error de red: ${networkErr.message}`);
    }

    console.log('[useCursos] Response status:', res.status);

    let text;
    try { text = await res.text(); console.log('[useCursos] Response body text:', text); } catch (e) { console.warn('[useCursos] No se pudo leer body como texto', e); }

    if (!res.ok) {
      let errData = null;
      try { errData = JSON.parse(text); } catch {};
      console.error('[useCursos] Error al editar curso:', res.status, errData);
      throw new Error(`No se pudo editar el curso (${res.status})`);
    }

    await fetchCursos();
    console.log('[useCursos] Lista de cursos actualizada');
  }

  async function eliminarCurso(id) {
    if (!esEditor) throw new Error('Permiso denegado: se requiere rol editor');

    const res = await fetch(`${STRAPI_URL}/api/cursos/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.error('Error al eliminar curso:', errData?.error || errData);
      throw new Error('No se pudo eliminar el curso');
    }

    await fetchCursos();
  }

  function getCursoById(id) {
    const c = cursos.find(c => c.id === id);
    if (!c) return null;
    return {
      ...c,
      descripcion: c.descripcion,
      temario: c.temario,
      archivos: c.archivos,
      de_pago: c.de_pago,
      enlaces_publicos: c.enlaces_publicos,
      enlaces_privados: tieneMembresia ? c.enlaces_privados : null,
    };
  }

  function filtrarPorCategoria(slug) {
    return cursos.filter(c => c.categoria?.slug === slug);
  }

  function buscarPorTexto(texto) {
    const t = (texto || '').toLowerCase();
    return cursos.filter(c =>
      (c.titulo || '').toLowerCase().includes(t) ||
      (c.descripcion || '').toLowerCase().includes(t) ||
      (c.resumen || '').toLowerCase().includes(t)
    );
  }

  return {
    cursos,
    categorias,
    loading,
    error,
    tieneMembresia,
    esEditor,
    fetchCursos,
    fetchCategorias,
    crearCategoria,
    subirMedia,
    crearCurso,
    editarCurso,
    eliminarCurso,
    getCursoById,
    filtrarPorCategoria,
    buscarPorTexto,
    pagina,
    setPagina,
    porPagina,
    setPorPagina,
    totalItems,
    total,
  };
}

export default useCursos;
