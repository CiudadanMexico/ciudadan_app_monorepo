import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Button, Typography, CircularProgress, Snackbar, Alert, Stack, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import PurpleButton from '../../components/common/PurpleButton.jsx';
import { useAdRewards } from '../../hooks/useAdRewards.jsx';
import { AdGrid } from '../../components/AnunciosRemunerados/AdGrid.jsx';
import { PlaylistBar } from '../../components/AnunciosRemunerados/PlaylistBar.jsx';
import { VideoPlayer } from '../../components/AnunciosRemunerados/VideoPlayer.jsx';
import { DecisionWindow } from '../../components/AnunciosRemunerados/DecisionWindow.jsx';
import { AdExitMenu, RewardScreen } from '../../components/AnunciosRemunerados/AdExitMenu.jsx';

/**
 * Página principal: /gana/ver-anuncios
 */
const AnunciosRemunerados = () => {
  const navigate = useNavigate();
  const location = useLocation();
    const { isAuthenticated, loginWithRedirect } = useAuth0();
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'info' });

  const {
    ads, playlist, sesion, itemActual, indiceActual,
    cargandoAds, errorAds, cargado, modoVision, recompensaTotal,
    sesionFinalizada, tieneToken, authToken, authError,
    togglePlaylist, iniciarVision, nextItem, prevItem,
    setEstadoItem, iniciarHeartbeat, completarItemActual,
    refill, salirVision,
  } = useAdRewards();

  // Gate de autenticación. El token lo gestiona useAdRewards (con catch:
  // un fallo de Auth0 se muestra en pantalla, no crashea la app).
  useEffect(() => {
    if (!isAuthenticated) { navigate('/gana'); return; }
  }, [isAuthenticated, navigate]);

  // Estado local: el anuncio actual pasó la ventana de decisión (comprometido).
  const [comprometido, setComprometido] = useState(false);
  const [avisoSalir, setAvisoSalir] = useState(false);

  // Resetea el compromiso al cambiar de anuncio.
  useEffect(() => { setComprometido(false); }, [itemActual?.id]);

  // Marca decision_window en el server apenas inicia el item (telemetría).
  useEffect(() => {
    if (itemActual && sesion) setEstadoItem(itemActual.id, 'decision_window').catch(() => {});
  }, [itemActual, sesion, setEstadoItem]);

  // Heartbeat: VideoPlayer emite { currentTime, duration, playing, visible, focused } cada 1s.
  // El backend exige itemId + currentTime: se agrega el id del item actual.
  // Se guarda el último tick en un ref para el heartbeat final al terminar.
  const ultimoTickRef = useRef(null);
  const handlePlaybackTick = useCallback((t) => {
    ultimoTickRef.current = t;
    if (!itemActual || !sesion) return;
    iniciarHeartbeat({ ...t, itemId: itemActual.id });
  }, [iniciarHeartbeat, itemActual, sesion]);

  // Saltar el anuncio actual: durante la ventana de decisión se sale sin
  // penalidad (skipped); comprometido → abandoned (pierde la recompensa).
  const saltarActual = useCallback(() => {
    if (!itemActual) return;
    if (comprometido) {
      setEstadoItem(itemActual.id, 'abandoned').catch(() => {});
    } else {
      setEstadoItem(itemActual.id, 'skipped').catch(() => {});
    }
    nextItem();
  }, [itemActual, comprometido, nextItem, setEstadoItem]);

  // Navegación vertical (spec §7). Si el anuncio está comprometido se advierte
  // antes de perder la visualización; nunca se bloquea la navegación.
  const intentarSiguiente = useCallback(() => {
    if (comprometido) { setAvisoSalir(true); return; }
    saltarActual();
  }, [comprometido, saltarActual]);

  useEffect(() => {
    if (!modoVision || !itemActual) return undefined;
    // Cooldown: una sola rueda del mouse dispara múltiples eventos wheel con
    // deltaY > 40. Sin este refresco se saltaban varios videos por gesto.
    let cooldown = false;
    const onWheel = (e) => {
      if (cooldown) return;
      if (e.deltaY > 60) {
        cooldown = true;
        setTimeout(() => { cooldown = false; }, 900);
        intentarSiguiente();
      } else if (e.deltaY < -60) {
        cooldown = true;
        setTimeout(() => { cooldown = false; }, 900);
        prevItem();
      }
    };
    const onKey = (e) => {
      if (['ArrowDown', 'PageDown'].includes(e.key)) intentarSiguiente();
      else if (['ArrowUp', 'PageUp'].includes(e.key)) prevItem();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [modoVision, itemActual, intentarSiguiente, prevItem]);

  const handleVideoEnded = async () => {
    if (!itemActual) return;
    try {
      // Heartbeat FINAL con ended=true + duración real: el servidor registra
      // duracion_real ANTES de que completar valide cobertura (evita la carrera).
      const t = ultimoTickRef.current || {};
      await iniciarHeartbeat({
        itemId: itemActual.id,
        currentTime: Number(t.currentTime || 0),
        duration: Number(t.duration || 0),
        playing: false,
        visible: true,
        focused: true,
        ended: true,
      });
    } catch (e) { /* el heartbeat es best-effort */ }
    try {
      const res = await completarItemActual();
      setSnack({
        open: true,
        msg: res?.reward ? `¡Ganaste ${res.recompensa} laborys!` : (res?.motivo || 'Visualización no válida'),
        severity: res?.reward ? 'success' : 'warning',
      });
    } catch (err) {
      setSnack({ open: true, msg: 'No se pudo registrar la visualización', severity: 'error' });
    }
    nextItem();
  };

  const [exitMenuAbierto, setExitMenuAbierto] = useState(false);
  const intentarSalir = (e) => { e.preventDefault(); e.stopPropagation(); setExitMenuAbierto(true); };

    if (!modoVision) {
    return (
      <Box component="div" sx={{ pb: { xs: 8, sm: 10 }, backgroundColor: 'background.default' }}>
        {authError ? (
          // Gate de Auth0: si el token falla (p.ej. "Missing Refresh Token" por
          // caché vieja), NO mostramos "No hay anuncios": ofrecemos reconectar.
          <Box sx={{ p: 3, m: 2, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
            <Alert severity="warning">
              <Typography component="span" fontWeight="bold">Sesión de anuncios.</Typography>{' '}
              No se pudo obtener el token de Auth0 para cargar los anuncios.
              <br />
              <Typography variant="body2">{authError}</Typography>
            </Alert>
            <Button variant="contained" onClick={() => loginWithRedirect()}>
              Reconectar con Auth0
            </Button>
          </Box>
        ) : (
          <>
            {cargandoAds && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
            {errorAds && <Alert severity="error" sx={{ m: 2 }}>{errorAds}</Alert>}
            {!errorAds && !cargandoAds && !cargado && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            )}
            {!errorAds && cargado && !cargandoAds && (
              ads.length > 0 ? (
                <>
                  <AdGrid ads={ads} playlist={playlist} togglePlaylist={togglePlaylist} />
                  <PlaylistBar ads={ads} playlist={playlist} iniciarVision={iniciarVision} recompensaTotal={recompensaTotal} />
                </>
              ) : (
                <Box sx={{ p: 6, m: 2, textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Ya viste todos los anuncios disponibles por hoy 👀
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Vuelve mañana: cada día se renuevan los anuncios y las recompensas.
                  </Typography>
                </Box>
              )
            )}
            <Snackbar open={snack.open} autoHideDuration={4000}
              onClose={() => setSnack({ open: false, msg: '', severity: 'info' })} message={snack.msg} />
          </>
        )}
      </Box>
    );
  }

  return (
    <Box component="div" tabIndex={-1}
      sx={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'black',
            position: 'fixed', top: 0, left: 0, zIndex: 1300 }}>
      {itemActual ? (
        <>
                    <VideoPlayer key={`v-${itemActual.id}`} src={itemActual.archivo_url || ''}
            poster={itemActual.thumbnail || ''} autoPlay
            onTimeUpdate={handlePlaybackTick} onEnded={handleVideoEnded} />
          <DecisionWindow key={`d-${itemActual.id}`} decisionWindow={itemActual.decisionWindow}
            recompensa={itemActual.recompensa || 0}
            onContinuar={() => { setComprometido(true); setEstadoItem(itemActual.id, 'committed').catch(() => {}); }}
            onNext={intentarSiguiente} />
          <Box sx={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: comprometido || itemActual.estado === 'committed' ? '#7CFC9B' : 'warning.light' }}>
              {comprometido || itemActual.estado === 'committed'
                ? `✔ Recompensa ganada: +${itemActual.recompensa || 0} laborys — termina el video para cobrarla`
                : itemActual.estado === 'decision_window'
                  ? `Decisión: ${itemActual.decisionWindow}s restantes · +${itemActual.recompensa || 0} laborys si la completas`
                  : 'Si sales ahora, no se contabilizará esta visualización'}
            </Typography>
          </Box>
        </>
      ) : (
        <Box sx={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <Typography variant="h6">{sesionFinalizada ? 'Playlist terminada' : 'Cargando...'}</Typography>
        </Box>
      )}

      {/* Aviso breve antes de perder una visualización comprometida (spec §7). */}
      <Dialog open={avisoSalir} onClose={() => setAvisoSalir(false)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Pasar al siguiente?</DialogTitle>
        <DialogContent>
          <Typography color="warning.main">
            <strong>Esta visualización no se contabilizará si sales ahora.</strong>
          </Typography>
        </DialogContent>
        <DialogActions>
          <PurpleButton onClick={() => setAvisoSalir(false)}>Seguir viendo</PurpleButton>
          <PurpleButton outlined onClick={() => { setAvisoSalir(false); saltarActual(); }}>
            Pasar al siguiente
          </PurpleButton>
        </DialogActions>
      </Dialog>

      <AdExitMenu open={exitMenuAbierto} onClose={() => setExitMenuAbierto(false)}
        onSalir={() => { setExitMenuAbierto(false); salirVision(); navigate('/gana/ver-anuncios'); }}
        onContinuar={() => setExitMenuAbierto(false)}
        onVolverGrid={() => { setExitMenuAbierto(false); salirVision(); navigate('/gana/ver-anuncios'); }}
        hayPendientes={!!itemActual && itemActual.estado !== 'completed'} />

      {sesionFinalizada && (
        <RewardScreen recompensaTotal={recompensaTotal}
          onRefill={async () => { await refill(); }}
          onVolverGrid={() => { salirVision(); navigate('/gana/ver-anuncios'); }} />
      )}
    </Box>
  );
};

export default AnunciosRemunerados;

