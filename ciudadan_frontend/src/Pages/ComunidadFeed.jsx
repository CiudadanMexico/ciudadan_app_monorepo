// src/Pages/ComunidadFeed.jsx
// Feed real de la sección Comunidad (rutas /comunidades y /comunidad/feed).
//
// Antes esta pantalla era un placeholder con contenido mock; ahora lista las
// publicaciones reales publicadas en Strapi (content-type `publicacion`) a
// través de `services/comunidad/comunidadFeedService.js`.
//
// El diseño reutiliza la hoja de estilos existente `styles/Comunidad.css`
// (`.comunidad-container`, `.comunidad-content`, `.join-button`,
// `.comunidad-buttons`, `.comunidad-footer`) sin inventar una identidad nueva.
// Español primero.

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircularProgress, Pagination } from '@mui/material';
import '../styles/Comunidad.css';
import {
  getPublicacionesFeed,
  PAGE_SIZE_POR_DEFECTO,
} from '../services/comunidad/comunidadFeedService';
import { WHATSAPP_COMUNIDAD } from '../services/prelanzamientoService';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatearFecha(fecha) {
  if (!fecha) return '';
  const fechaValida = new Date(fecha);
  if (Number.isNaN(fechaValida.getTime())) return '';
  return FORMATO_FECHA.format(fechaValida);
}

export default function ComunidadFeed() {
  const navigate = useNavigate();
  const [publicaciones, setPublicaciones] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState({
    page: 1,
    pageSize: PAGE_SIZE_POR_DEFECTO,
    pageCount: 1,
    total: 0,
  });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async (paginaSolicitada) => {
    setCargando(true);
    setError(null);
    try {
      const { publicaciones: items, paginacion: meta } = await getPublicacionesFeed({
        page: paginaSolicitada,
        pageSize: PAGE_SIZE_POR_DEFECTO,
      });
      setPublicaciones(items);
      setPaginacion(meta);
      setPagina(meta.page);
    } catch (e) {
      setPublicaciones([]);
      setError(
        e?.message ||
          'No se pudo cargar el feed de la comunidad. Revisa tu conexión e inténtalo de nuevo.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    window.dispatchEvent(new Event('closeTopBar'));
    cargar(1);
  }, [cargar]);

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pagina]);

  const irAComunidadPrincipal = () => navigate('/comunidad');

  return (
    <div className="comunidad-container comunidad-container--feed">
      <div className="comunidad-content comunidad-content--feed">
        <header className="comunidad-feed__encabezado">
          <h1>Comunidad 4:20</h1>
          <p>
            Publicaciones reales de la comunidad: anuncios, convocatorias y
            avances que comparte la red.
          </p>
        </header>


        {cargando && (
          <div className="comunidad-feed__estado" role="status" aria-live="polite">
            <CircularProgress size={28} />
            <p>Cargando publicaciones…</p>
          </div>
        )}

        {!cargando && error && (
          <div className="comunidad-feed__estado" role="alert">
            <p>{error}</p>
            <div className="comunidad-buttons">
              <button type="button" className="join-button ciudadan" onClick={() => cargar(pagina)}>
                Reintentar
              </button>
              <button type="button" className="join-button neutro" onClick={irAComunidadPrincipal}>
                Ir a la página principal de comunidad
              </button>
            </div>
          </div>
        )}

        {!cargando && !error && publicaciones.length === 0 && (
          <div className="comunidad-feed__estado">
            <p>
              Todavía no hay publicaciones en la comunidad. En cuanto se comparta
              la primera, aparecerá aquí.
            </p>
            <div className="comunidad-buttons">
              <button type="button" className="join-button ciudadan" onClick={irAComunidadPrincipal}>
                Conoce la comunidad
              </button>
              <a
                className="join-button whatsapp"
                href={WHATSAPP_COMUNIDAD}
                target="_blank"
                rel="noopener noreferrer"
              >
                Únete al grupo de WhatsApp
              </a>
            </div>
          </div>
        )}

        {!cargando && !error && publicaciones.length > 0 && (
          <ul className="comunidad-feed__lista">
            {publicaciones.map((publicacion) => (
              <li className="comunidad-feed__item" key={publicacion.id ?? publicacion.uid}>
                <div className="comunidad-feed__meta">
                  <span className="comunidad-feed__autor">{publicacion.autor}</span>
                  {publicacion.fecha && (
                    <span className="comunidad-feed__fecha">
                      {formatearFecha(publicacion.fecha)}
                    </span>
                  )}
                </div>
                {publicacion.imagen && (
                  <img
                    className="comunidad-feed__imagen"
                    src={publicacion.imagen}
                    alt={`Imagen de la publicación de ${publicacion.autor}`}
                    loading="lazy"
                  />
                )}
                {publicacion.texto && <p className="comunidad-feed__texto">{publicacion.texto}</p>}
              </li>
            ))}
          </ul>
        )}

        {!cargando && !error && paginacion.pageCount > 1 && (
          <div className="comunidad-footer">
            <Pagination
              count={paginacion.pageCount}
              page={pagina}
              onChange={(evento, valor) => cargar(valor)}
              color="primary"
              shape="rounded"
              getItemAriaLabel={(tipo, paginaActual) =>
                tipo === 'page'
                  ? `Ir a la página ${paginaActual} del feed`
                  : `Ir a la ${tipo === 'prev' ? 'página anterior' : 'página siguiente'} del feed`
              }
            />
            <p>
              {paginacion.total} publicación{paginacion.total === 1 ? '' : 'es'} en la comunidad
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
