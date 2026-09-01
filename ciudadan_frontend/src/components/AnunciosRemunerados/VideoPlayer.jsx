import React, { useRef, useEffect, useState } from 'react';
import { Box } from '@mui/material';

/**
 * Reproductor de video personalizado para anuncios.
 * - Ocupa la ventana principal (100vh).
 * - Sin controles nativos del navegador.
 * - Deshabilita: seek, cambio de velocidad, descarga, PiP, adelantar.
 *
 * Props:
 *  - src: string (URL del video)
 *  - currentTime: número (controlado externamente)
 *  - onTimeUpdate: (secs) => void   // para heartbeat
 *  - onEnded: () => void
 *  - autoPlay: boolean
 */
export const VideoPlayer = ({ src, currentTime, onTimeUpdate, onEnded, autoPlay = true }) => {
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [focused, setFocused] = useState(true);

  // Sincroniza la posición del video con `currentTime` solo cuando el usuario
  // no esté arrastrando el seek (no disponible: seek está deshabilitado).
  useEffect(() => {
    const v = videoRef.current;
    if (!v || typeof currentTime !== 'number') return;
    // Evita saltos si la diferencia es mínima (latido del heartbeat).
    if (Math.abs(v.currentTime - currentTime) > 0.5) {
      v.currentTime = currentTime;
    }
  }, [currentTime]);

  // Visibilidad de la pestaña.
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Enfoque de la ventana.
  useEffect(() => {
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Notifica el estado de reproducción al padre (para el heartbeat).
  useEffect(() => {
    if (typeof onTimeUpdate !== 'function') return;
    const v = videoRef.current;
    if (!v) return;
    const id = setInterval(() => {
      onTimeUpdate({
        currentTime: v.currentTime,
        playing: !v.paused && !v.ended,
        visible,
        focused,
        ended: v.ended,
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onTimeUpdate, visible, focused]);

  // Bloqueo de menú contextual (descarga, PiP) vía right-click.
  const handleContextMenu = (e) => e.preventDefault();

  // Deshabilita PiP y controles nativos.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.disablePictureInPicture = true;
    v.controls = false;
  }, []);

  return (
    <Box
      component="video"
      ref={videoRef}
      src={src}
      autoPlay={autoPlay}
      muted
      playsInline
      controls={false}
      disablePictureInPicture
      controlsList="nodownload noplaybackrate noremaining"
      onContextMenu={handleContextMenu}
      onEnded={onEnded}
      sx={{
        width: '100vw',
        height: '100vh',
        objectFit: 'cover',
        backgroundColor: 'black',
      }}
    />
  );
};
