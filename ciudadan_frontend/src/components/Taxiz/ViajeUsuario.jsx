// src/components/Trips/ViajeUsuario.jsx
import React, { useEffect, useState } from 'react';

// normaliza coords a {lat, lng} o null
const normalizeCoord = (c) => {
  if (!c) return null;
  try {
    if (typeof c.lat === 'number' && typeof c.lng === 'number') return { lat: c.lat, lng: c.lng };
    if (typeof c.lat === 'string' && typeof c.lng === 'string') return { lat: Number(c.lat), lng: Number(c.lng) };
    if (typeof c.latitude !== 'undefined' && typeof c.longitude !== 'undefined')
      return { lat: Number(c.latitude), lng: Number(c.longitude) };
    if (Array.isArray(c) && c.length >= 2)
      return { lat: Number(c[0]), lng: Number(c[1]) };
    return null;
  } catch {
    return null;
  }
};

const ViajeUsuario = ({ viaje, socket, userCoords, setUserCoords, mapRef, setConsultedTravel }) => {
    console.log('viajando usuario', viaje);
    console.log('viajando coords', viaje?.attributes?.origencoords);
    console.log('viajando direccion', viaje?.attributes?.origendireccion?.label);

  // normalizamos todo ANTES de usarlo
  const pickupNorm = viaje?.attributes?.origendireccion?.label;
  //const destNorm   = normalizeCoord(viaje?.attributes?.destination);
  const destNorm   = viaje?.attributes?.destinodireccion?.label;
  const destiNorm   = normalizeCoord(viaje?.attributes?.destination);
  const taxiNorm   = normalizeCoord(userCoords);

  const [expanded, setExpanded] = useState(true);
  const status = viaje?.attributes?.status || 'esperando';
  const routeInfo = viaje?.attributes?._routeInfo || null;

  const formatDistance = (m) => (m ? `${(m/1000).toFixed(2)} km` : '—');
  const formatDuration = (s) => (s ? `${Math.ceil(s/60)} min` : '—');

  useEffect(() => {
    if (!socket || !viaje?.id) return;
    const channel = `trip:${viaje.id}`;

    const onDriverLocation = (payload) => {
      if (!payload?.coords) return;
      const n = normalizeCoord(payload.coords);
      if (n) setUserCoords(n);
    };
    const onTripUpdate = (p) => {
      if (!p) return;
      // podrías actualizar viaje local si hace falta
    };

    try { socket.emit('join', { channel, client: { type: 'passenger' } }); } catch (e) {}
    socket.on('driver-location', onDriverLocation);
    socket.on('trip-update', onTripUpdate);

    return () => {
      try { socket.emit('leave', { channel, client: { type: 'passenger' } }); } catch (e) {}
      socket.off('driver-location', onDriverLocation);
      socket.off('trip-update', onTripUpdate);
    };
  }, [socket, viaje, setUserCoords]);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      width: '100%',
      maxHeight: expanded ? '50vh' : '64px',
      height: expanded ? '50vh' : '64px',
      background: '#fff',
      boxShadow: '0 -2px 12px rgba(0,0,0,0.12)',
      transition: 'height 280ms ease',
      zIndex: 2000,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #eee', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ flex: 1 }}>
          <strong>Tu viaje</strong>
          <div style={{ fontSize: 12, color: '#666' }}>{status} • Dist: {formatDistance(routeInfo?.distance_m)} • ETA: {formatDuration(routeInfo?.duration_s)}</div>
        </div>
        <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 200ms' }}>▼</div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div><strong>Taxi</strong></div>
              <div style={{ fontSize: 13 }}>
                {taxiNorm ? `${taxiNorm}` : 'No disponible aún'}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div><strong>Pickup</strong></div>
              <div style={{ fontSize: 13 }}>
                {pickupNorm ? `${pickupNorm}` : 'Sin pickup'}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div><strong>Destino</strong></div>
              <div style={{ fontSize: 13 }}>
                {destNorm ? `${destNorm}` : 'Sin destino'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                const center = pickupNorm || taxiNorm;
                if (mapRef?.current && center) {
                  mapRef.current.setCenter(center);
                  mapRef.current.setZoom(16);
                }
              }}
              style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: '#fff', flex: 1 }}
            >
              Centrar en pickup / taxi
            </button>

            <button
              onClick={() => {
                try { socket?.emit('trip-action', { viajeId: viaje.id, action: 'request-status' }); } catch (e) {}
              }}
              style={{ padding: 12, borderRadius: 8, background: '#fff200', border: 'none', fontWeight: '700', flex: 1 }}
            >
              Solicitar estado
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default ViajeUsuario;