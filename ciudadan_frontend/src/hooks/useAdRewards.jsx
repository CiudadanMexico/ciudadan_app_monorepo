import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  getAdsPublicitarios,
  getSesion,
} from '../services/adRewards/queryServices';
import {
  iniciarSesion as apiIniciarSesion,
  heartbeat as apiHeartbeat,
  cambiarEstadoItem as apiCambiarEstado,
  completarAnuncio as apiCompletar,
  refillSesion as apiRefill,
} from '../services/adRewards/mutationsServices';
import { STRAPI_URL } from '../utils/request.utils';

/**
 * Resuelve URLs de media que el backend devuelve relativas (/uploads/xxx).
 * El seed usa https absolutas (funciona directo); los anuncios subidos a
 * Strapi vía admin panel salen como /uploads/<file> → hay que anteponer
 * REACT_APP_STRAPI_URL. Igual patrón que getThumbnail en AdGrid.
 */
const resolveUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = STRAPI_URL || '';
  return base ? `${base}${url}` : url;
};


/**
 * Hook orquestador del flujo completo /gana/ver-anuncios.
 * Gestiona: carga de anuncios, playlist, sesión (token), heartbeat,
 * navegación entre items, completar anuncio, refill y reward screen.
 */
export const useAdRewards = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [authToken, setAuthToken] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Carga del token de Auth0 (audience api.ciudadan.org). Con catch: un fallo
  // (p.ej. "Missing Refresh Token" por caché vieja) se reporta en authError
  // en lugar de lanzar un unhandled rejection que crashea la app.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const tok = await getAccessTokenSilently({
          authorizationParams: { audience: 'https://api.ciudadan.org' },
        });
        if (vivo) setAuthToken(tok);
      } catch (e) {
        console.error('[adRewards] no se pudo obtener token Auth0:', e.message);
        if (vivo) setAuthError(e.message || 'No se pudo iniciar sesión con Auth0');
      }
    })();
    return () => { vivo = false; };
  }, [getAccessTokenSilently]);

  // -- Estado del grid / playlist --
  const [ads, setAds] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [cargandoAds, setCargandoAds] = useState(false);
  const [errorAds, setErrorAds] = useState(null);
  // true solo después de que la petición de anuncios terminó (éxito o error).
  // Evita el parpadeo del estado vacío ("ya viste todos") en el render inicial.
  const [cargado, setCargado] = useState(false);

    // -- Estado de la sesión de reproducción --
  const [sesion, setSesion] = useState(null);
  const [itemActual, setItemActual] = useState(null);
  const [indiceActual, setIndiceActual] = useState(0);

  const [modoVision, setModoVision] = useState(false);
  const [recompensaTotal, setRecompensaTotal] = useState(0);
  const [sesionFinalizada, setSesionFinalizada] = useState(false);

  const heartbeatRef = useRef(null);

  const cargarAds = useCallback(async () => {
    if (!authToken) return;
    setCargandoAds(true);
    try {
      const res = await getAdsPublicitarios(authToken);
      setAds(res?.data || []);
      setErrorAds(null);
    } catch (err) {
      setErrorAds(err.message || 'Error al cargar anuncios');
    } finally {
      setCargandoAds(false);
      setCargado(true);
    }
  }, [authToken]);

  // Carga inicial de anuncios.
  useEffect(() => {
    cargarAds();
  }, [cargarAds]);

  // Selecciona/deselecciona un anuncio de la playlist (orden de agregado).
  const togglePlaylist = (adId) => {
    setPlaylist((prev) =>
      prev.includes(adId) ? prev.filter((id) => id !== adId) : [...prev, adId]
    );
  };

  const iniciarVision = useCallback(async () => {
    const res = await apiIniciarSesion(playlist, authToken);
    const s = res?.data;
    setSesion(s);
    setIndiceActual(0);
    setRecompensaTotal(0);
    setSesionFinalizada(false);
    setModoVision(true);
  }, [playlist, authToken]);

  const refreshSesion = useCallback(async () => {
    if (!sesion) return;
    const res = await getSesion(sesion.sesionId, sesion.token, authToken);
    // getSesion devuelve { id, ... } SIN token/sesionId: se preservan del estado previo.
    setSesion((prev) => (res?.data ? { ...res.data, sesionId: prev.sesionId, token: prev.token } : prev));
  }, [sesion, authToken]);

  const nextItem = useCallback(() => {
    if (!sesion?.items) return;
    const sig = indiceActual + 1;
    setIndiceActual(sig);
    setSesionFinalizada(sig >= sesion.items.length);
  }, [sesion, indiceActual]);

  const prevItem = useCallback(() => {
    setIndiceActual((prev) => Math.max(0, prev - 1));
  }, []);

  const startHeartbeat = useCallback(
    ({ itemId, currentTime, duration, playing, visible, focused }) => {
      if (!sesion) return;
      apiHeartbeat(
        sesion.sesionId,
        sesion.token,
        authToken,
        { itemId, currentTime, duration, playing, visible, focused }
      ).catch(() => {});
    },
    [sesion, authToken]
  );

  const setEstadoItem = useCallback(
    (itemId, estado) => {
      if (!sesion) return Promise.resolve();
      return apiCambiarEstado(sesion.sesionId, itemId, estado, sesion.token, authToken);
    },
    [sesion, authToken]
  );

  const completarItemActual = useCallback(async () => {
    if (!sesion || !itemActual) return null;
    const res = await apiCompletar(sesion.sesionId, itemActual.id, sesion.token, authToken);
    await refreshSesion();
    if (res?.data?.reward) setRecompensaTotal((prev) => prev + Number(res.data.recompensa || 0));
    return res?.data;
  }, [sesion, itemActual, authToken]);

  const refill = useCallback(async () => {
    if (!sesion) return;
    await apiRefill(sesion.sesionId, sesion.token, authToken);
    await refreshSesion();
    setSesionFinalizada(false);
  }, [sesion, authToken]);

  // El item actual se deriva del índice sobre la sesión.
  useEffect(() => {
    if (!sesion?.items?.[indiceActual]) {
      setItemActual(null);
      return;
    }
    const it = sesion.items[indiceActual];
    const rawArchivo = it.archivo_url || it.anuncio?.archivo?.url || it.anuncio?.metadata?.archivo_url;
    setItemActual({
      ...it,
      titulo: it.anuncio?.titulo || it.titulo,
      duracion: it.anuncio?.duracion || it.duracion || 0,
      decisionWindow: it.anuncio?.decisionWindow || it.decisionWindow || 5,
      recompensa: it.recompensa || 0,
      // el backend devuelve URLs de media relativas (/uploads/...) cuando el
      // anuncio fue subido a Strapi; el frontend las resuelve contra
      // REACT_APP_STRAPI_URL (mismo patrón que getThumbnail en AdGrid).
      archivo_url: resolveUrl(rawArchivo),
      thumbnail: resolveUrl(it.thumbnail_url || it.anuncio?.thumbnail?.url),
    });
    if (it.estado !== 'playing' && it.estado !== 'completed') {
      setEstadoItem(it.id, 'playing').catch(() => {});
    }
  }, [sesion, indiceActual]);

  // Detiene el heartbeat al desmontar.
  useEffect(() => () => clearInterval(heartbeatRef.current), []);

  return {
    ads,
    playlist,
    sesion,
    itemActual,
    indiceActual,
    cargandoAds,
    errorAds,
    cargado,
    modoVision,
    recompensaTotal,
    sesionFinalizada,
    tieneToken: !!authToken,
    authToken,
    authError,
    togglePlaylist,
    iniciarVision,
    nextItem,
    prevItem,
    setEstadoItem,
    iniciarHeartbeat: startHeartbeat,
    completarItemActual,
    refill,
    salirVision: () => setModoVision(false),
  };
};
