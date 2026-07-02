import { useState, useEffect } from 'react';
import { slugify } from '../utils/slugify';
import { useAuth0 } from '@auth0/auth0-react';

const STRAPI_URL = `${process.env.REACT_APP_STRAPI_URL}`;
const UPLOAD_URL = `${STRAPI_URL}/api/upload`;

// Helper to convert HH:mm to HH:mm:ss.SSS
function formatTime(time) {
  if (!time) return null;
  // If already in HH:mm:ss or includes milliseconds, return
  if (/^\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/.test(time)) {
    return time;
  }
  // If just HH:mm, append :00.000
  if (/^\d{2}:\d{2}$/.test(time)) {
    return `${time}:00.000`;
  }
  console.warn('Formato de hora inesperado:', time);
  return time;
}

export function useEventos() {
  const { user } = useAuth0();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  

  useEffect(() => {
    fetchEventos();
  }, [pagina, porPagina]);

  async function fetchEventos() {
    setLoading(true);
    try {
      const res = await fetch(
        `${STRAPI_URL}/api/eventos?populate=portada,imagenes,creador,direccion,evento_id&pagination[page]=${pagina}&pagination[pageSize]=${porPagina}&sort[0]=fecha_inicio:desc`
      );
      const data = await res.json();

      const list = Array.isArray(data.data) ? data.data : [];
      setTotalItems(data.meta?.pagination?.total || 0);

      const parsed = list.map(item => {
        const a = item.attributes;
        return {
          id: item.id,
          titulo: a.titulo,
          slug: a.slug,
          descripcion: a.descripcion,
          creador: a.creador?.data || null,
          colaboradores: a.colaboradores || [],
          portada: a.portada?.data?.attributes?.url || null,
          imagenes: Array.isArray(a.imagenes?.data)
            ? a.imagenes.data.map(i => i.attributes.url)
            : [],
          de_pago: a.de_pago,
          precio: a.precio,
          ciudad: a.ciudad,
          estado: a.estado,
          multifecha: a.multifecha,
          fecha_inicio: a.fecha_inicio,
          hora_inicio: a.hora_inicio,
          fechas_horarios_adicionales: a.fechas_horarios_adicionales || [],
          fecha_fin: a.fecha_fin,
          hora_fin: a.hora_fin,
          modalidad: a.modalidad,
          status: a.status,
          direccion: a.direccion?.data || null,
          evento_id: a.evento_id?.data?.id || null,
        };
      });

      setEventos(parsed);
    } catch (err) {
      console.error('Error al obtener eventos:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function subirMedia(files) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const res = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      console.error('Error al subir archivos:', err);
      throw new Error('No se pudo subir el archivo');
    }
    const data = await res.json();
    return data.map(f => f.id);
  }

  // -------------------------------------------
  // Crear Evento (ahora guarda coords como JSON)
  // -------------------------------------------
  async function crearEvento(nuevo, media = {}) {
    const slug = slugify(nuevo.titulo || '', { lower: true });
    const payload = { ...nuevo, slug, creador: user?.id || null };

    // Formatear hora inicio/fin y fechas adicionales
    payload.hora_inicio = formatTime(payload.hora_inicio);
    payload.hora_fin = formatTime(payload.hora_fin);
    if (Array.isArray(payload.fechas_horarios_adicionales)) {
      payload.fechas_horarios_adicionales = payload.fechas_horarios_adicionales.map(f => ({
        fecha: f.fecha,
        hora: formatTime(f.hora),
      }));
    }

    // Limpiar valores innecesarios o inválidos
    if (!payload.de_pago || isNaN(Number(payload.precio))) {
      delete payload.precio;
    }
    if (!payload.fecha_fin) delete payload.fecha_fin;
    if (!payload.hora_fin) delete payload.hora_fin;
    if (!payload.url) delete payload.url;

    // Mapear modalidad
    if (payload.modalidad === 'virtual') payload.modalidad = 'en línea';

    // Manejar dirección si NO es virtual
    if (payload.modalidad !== 'en línea' && payload.direccion) {
      try {
        // Construimos el body para crear la dirección
        const direccionBody = {
          direccion: payload.direccion,
          ciudad: payload.ciudad,
          estado: payload.estado,
          cp: payload.cp,
        };

        // Si tenemos lat/lng, los enviamos dentro de coords (objeto JSON)
        if (payload.lat !== undefined && payload.lng !== undefined) {
          // aseguramos que sean números
          const latNum = Number(payload.lat);
          const lngNum = Number(payload.lng);
          if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
            direccionBody.coords = { lat: latNum, lng: lngNum };
          }
        }

        const direccionRes = await fetch(`${STRAPI_URL}/api/direcciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: direccionBody }),
        });

        const direccionJson = await direccionRes.json();
        if (!direccionRes.ok) {
          throw new Error(`No se pudo crear la dirección: ${direccionJson.error?.message || JSON.stringify(direccionJson)}`);
        }

        // Guardamos la relación de dirección en el payload como id
        payload.direccion = direccionJson.data.id;

        // Quitamos lat/lng del payload principal (ya están dentro de coords)
        delete payload.lat;
        delete payload.lng;
      } catch (err) {
        console.error('Error al crear dirección:', err);
        throw err;
      }
    } else {
      // Si es virtual, no se manda dirección
      delete payload.direccion;
      delete payload.ciudad;
      delete payload.estado;
      delete payload.cp;
      delete payload.lat;
      delete payload.lng;
    }

    // Construir FormData con archivos
    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
    if (media.portada) formData.append('files.portada', media.portada);
    if (media.imagenes) media.imagenes.forEach(f => formData.append('files.imagenes', f));

    // Enviar a Strapi
    try {
      const res = await fetch(`${STRAPI_URL}/api/eventos`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(`No se pudo crear el evento (${res.status}): ${json.error?.message || JSON.stringify(json)}`);
      }

      await fetchEventos();
    } catch (err) {
      console.error('Error crearEvento:', err);
      throw err;
    }
  }

  // -------------------------------------------
  // Editar Evento (si se dan lat/lng actualiza/crea coords)
  // -------------------------------------------
  async function editarEvento(id, cambios, media = {}) {
    // Mapear slug y modalidad según cambios
    if (cambios.titulo) cambios.slug = slugify(cambios.titulo, { lower: true });
    if (cambios.modalidad === 'virtual') cambios.modalidad = 'en línea';
    // Formatear tiempos
    cambios.hora_inicio = formatTime(cambios.hora_inicio);
    cambios.hora_fin = formatTime(cambios.hora_fin);
    if (Array.isArray(cambios.fechas_horarios_adicionales)) {
      cambios.fechas_horarios_adicionales = cambios.fechas_horarios_adicionales.map(f => ({
        fecha: f.fecha,
        hora: formatTime(f.hora),
      }));
    }

    // Si modalidad no es virtual y vienen datos de dirección / lat lng, manejarlos
    try {
      if (cambios.modalidad !== 'en línea' && (cambios.direccion || cambios.lat !== undefined || cambios.lng !== undefined)) {
        // Si cambios.direccion es un id numérico -> intentar actualizar esa dirección
        const dirId = Number(cambios.direccion);
        const tieneCoords = cambios.lat !== undefined && cambios.lng !== undefined;

        if (!Number.isNaN(dirId) && dirId > 0) {
          // Preparamos body para update
          const updateBody = { };
          if (cambios.direccion) updateBody.direccion = cambios.direccion_text || undefined; // si traes un campo para texto de dirección
          if (cambios.ciudad) updateBody.ciudad = cambios.ciudad;
          if (cambios.estado) updateBody.estado = cambios.estado;
          if (cambios.cp) updateBody.cp = cambios.cp;

          if (tieneCoords) {
            const latNum = Number(cambios.lat);
            const lngNum = Number(cambios.lng);
            if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
              updateBody.coords = { lat: latNum, lng: lngNum };
            }
          }

          // Solo enviar los campos que existan
          const dataToSend = {};
          for (const k of Object.keys(updateBody)) {
            if (updateBody[k] !== undefined) dataToSend[k] = updateBody[k];
          }

          if (Object.keys(dataToSend).length > 0) {
            const resDir = await fetch(`${STRAPI_URL}/api/direcciones/${dirId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: dataToSend }),
            });

            const jsonDir = await resDir.json();
            if (!resDir.ok) {
              console.warn('No se pudo actualizar la dirección existente, intentaremos crear una nueva.', jsonDir);
              // intentaremos crear una nueva abajo
              // No lanzamos error aún para permitir fallback a creación
            }
          }
          // aseguramos que cambios.direccion sea el id
          cambios.direccion = dirId;
        } else {
          // Si no hay un id válido, creamos una nueva dirección (similar a crearEvento)
          const direccionBody = {
            direccion: cambios.direccion,
            ciudad: cambios.ciudad,
            estado: cambios.estado,
            cp: cambios.cp,
          };

          if (cambios.lat !== undefined && cambios.lng !== undefined) {
            const latNum = Number(cambios.lat);
            const lngNum = Number(cambios.lng);
            if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
              direccionBody.coords = { lat: latNum, lng: lngNum };
            }
          }

          const resDir = await fetch(`${STRAPI_URL}/api/direcciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: direccionBody }),
          });

          const jsonDir = await resDir.json();
          if (!resDir.ok) {
            throw new Error(`No se pudo crear la dirección al editar: ${jsonDir.error?.message || JSON.stringify(jsonDir)}`);
          }
          cambios.direccion = jsonDir.data.id;
        }

        // Ya que coords están en la entidad direcciones, removemos lat/lng del payload de evento
        delete cambios.lat;
        delete cambios.lng;
      } else {
        // Si modalidad es virtual, quitar campos de dirección y coords
        if (cambios.modalidad === 'en línea') {
          delete cambios.direccion;
          delete cambios.ciudad;
          delete cambios.estado;
          delete cambios.cp;
          delete cambios.lat;
          delete cambios.lng;
        }
      }
    } catch (err) {
      console.error('Error manejando dirección en editarEvento:', err);
      // No abortamos aún: permitimos que la edición del evento intente continuar,
      // pero lanzamos al final si la petición al evento falla.
    }

    const formData = new FormData();
    formData.append('data', JSON.stringify(cambios));
    if (media.portada) formData.append('files.portada', media.portada);
    if (media.imagenes) media.imagenes.forEach(f => formData.append('files.imagenes', f));

    try {
      const res = await fetch(`${STRAPI_URL}/api/eventos/${id}`, {
        method: 'PUT',
        body: formData,
      });
      const json = await res.json();

      console.log('editarEvento:', res.status, json);
      if (!res.ok) {
        throw new Error(`No se pudo editar el evento (${res.status}): ${json.error?.message || JSON.stringify(json)}`);
      }
      await fetchEventos();
    } catch (err) {
      console.error('Error editarEvento:', err);
      throw err;
    }
  }

  async function eliminarEvento(id) {
    try {
      const res = await fetch(`${STRAPI_URL}/api/eventos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`No se pudo eliminar el evento (${res.status})`);
      await fetchEventos();
    } catch (err) {
      console.error('Error eliminarEvento:', err);
      throw err;
    }
  }

  function getEventoById(id) {
    return eventos.find(e => e.id === id) || null;
  }

  function buscarPorTexto(text) {
    const t = text?.toLowerCase() || '';
    return eventos.filter(e =>
      e.titulo.toLowerCase().includes(t) ||
      e.descripcion.toLowerCase().includes(t) ||
      e.ciudad.toLowerCase().includes(t) ||
      e.estado.toLowerCase().includes(t)
    );
  }

  function getEventosPasados() {
    const ahora = new Date();
    return eventos.filter(e => e.fecha_fin && new Date(e.fecha_fin) < ahora);
  }

  function getEventosFuturos() {
    const ahora = new Date();
    return eventos.filter(e => e.fecha_inicio && new Date(e.fecha_inicio) > ahora);
  }

  function getEventosEnCurso() {
    const ahora = new Date();
    return eventos.filter(e => {
      const inicio = new Date(e.fecha_inicio);
      const fin = e.fecha_fin ? new Date(e.fecha_fin) : inicio;
      return inicio <= ahora && ahora <= fin;
    });
  }

  return {
    eventos,
    loading,
    error,
    pagina,
    setPagina,
    porPagina,
    setPorPagina,
    totalItems,
    fetchEventos,
    crearEvento,
    editarEvento,
    eliminarEvento,
    subirMedia,
    getEventoById,
    buscarPorTexto,
    getEventosPasados,
    getEventosFuturos,
    getEventosEnCurso,
  };
}
