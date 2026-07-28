// src/components/Taxis/TravelCard.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { emitEvent } from '../../lib/socketClient.jsx';

/**
 * TravelCard.jsx
 * Componente que muestra la información del viaje y permite:
 *  - ver detalle (onClick)
 *  - rechazar (handleReject) -> llama al handler pasado con el travel o travelId
 *  - enviar propuesta (onAccept via onAccept prop + emisión socket)
 *
 * Asegúrate de que ConductorRender pase handleReject(travel) o handleReject(travelId).
 */

const currencyFmt = (v) => {
  if (v === null || v === undefined || isNaN(Number(v))) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(v));
};

const TravelCard = ({ travel = {}, index, onClick, onClose, handleReject, onAccept }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(null);
  const [finalPrice, setFinalPrice] = useState('');
  const [sending, setSending] = useState(false);

  // Obtener timestamp start (buscamos varias propiedades posibles)
  const startTs = useMemo(() => {
    const cand = [
      travel.requestTime,
      travel.requestedAt,
      travel.createdAt,
      travel.startTime,
      travel.created_at,
      travel.createdAtISO,
    ];
    for (const c of cand) {
      if (!c) continue;
      const t = new Date(c);
      if (!isNaN(t.getTime())) return t;
    }
    return null;
  }, [travel]);

  useEffect(() => {
    if (!startTs) {
      setElapsedSeconds(null);
      return;
    }
    const tick = () => {
      const now = new Date();
      const diff = Math.floor((now - startTs) / 1000);
      setElapsedSeconds(diff >= 0 ? diff : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startTs]);

  // Inicializar input con suggestedPrice si viene
  useEffect(() => {
    const p = travel.suggestedPrice ?? travel.meta?.suggested?.price ?? null;
    if (p !== null && p !== undefined && !isNaN(Number(p))) {
      setFinalPrice(String(Number(p)));
    } else {
      setFinalPrice('');
    }
  }, [travel]);

  const formatMMSS = (seconds) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const origin =
    travel.originAdress ||
    travel.originAddress ||
    travel.origin ||
    travel.from ||
    travel.pickup ||
    'Origen desconocido';
  const destination =
    travel.destinationAdress ||
    travel.destinationAddress ||
    travel.destination ||
    travel.to ||
    travel.dropoff ||
    'Destino desconocido';

  const suggestedPrice = travel.suggestedPrice ?? travel.meta?.suggested?.price ?? null;
  const suggestedFormatted =
    travel.suggestedPriceFormatted ??
    travel.meta?.suggested?.priceFormatted ??
    (suggestedPrice ? currencyFmt(suggestedPrice) : null);

  // Helper para obtener coords actuales (Promise)
  const getCurrentPosition = (opts = { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation no disponible'));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        opts
      );
    });
  };

  // Envía la propuesta: emite por socket (usando emitEvent) y llama a onAccept
  const handleSendProposal = async () => {
    if (sending) return;

    const priceToSend = finalPrice !== '' ? Number(finalPrice) : suggestedPrice;
    if (!priceToSend || isNaN(Number(priceToSend))) {
      // UX simple: alerta; en producción podrías mostrar un toast
      alert('Por favor ingresa un precio final válido antes de enviar la propuesta.');
      return;
    }

    setSending(true);

    let driverCoords = null;
    try {
      driverCoords = await getCurrentPosition();
      console.log('[TravelCard] coords obtenidas:', driverCoords);
    } catch (geoErr) {
      console.warn('[TravelCard] no se pudo obtener geolocalización:', geoErr?.message ?? geoErr);
    }

    const resolvedTravelId = travel?.travelId ?? travel?.id ?? travel?.travelID ?? null;

    const payload = {
      coordinates: driverCoords || travel?.driverCoordinates || travel?.coords || null,
      price: Number(priceToSend),
      meta: {
        from: 'conductor',
        travelId: resolvedTravelId,
        note: 'oferta desde TravelCard',
      },
      rawTravel: travel ?? null,
      timestamp: new Date().toISOString(),
    };

    try {
      // emitEvent viene de lib/socketClient.jsx
      emitEvent('ofertaviaje', payload, (ack) => {
        console.log('[TravelCard] ack ofertaviaje:', ack);
      });
      console.log('[TravelCard] emitido ofertaviaje:', payload);
    } catch (emitErr) {
      console.warn('[TravelCard] error emitiendo ofertaviaje:', emitErr);
    }

    try {
      if (typeof onAccept === 'function') {
        await onAccept(travel, Number(priceToSend));
      }
    } catch (e) {
      console.warn('[TravelCard] onAccept lanzó error:', e);
    } finally {
      setSending(true);
    }
  };

  // Handler para Rechazar: pasa travel y index al handler padre
  const handleRejectClicked = useCallback(() => {
    try {
      if (typeof handleReject === 'function') {
        // Preferimos enviar el id del backend si existe, sino el objeto travel
        const resolvedId = travel?.travelId ?? travel?.id ?? null;
        if (resolvedId !== null) {
          handleReject(resolvedId, index);
        } else {
          handleReject(travel, index);
        }
      } else {
        console.warn('[TravelCard] handleReject no es función');
      }
    } catch (e) {
      console.warn('[TravelCard] error en handleRejectClicked:', e);
    }
  }, [handleReject, travel, index]);

  // Handler para Ver: pasa travel e index al handler padre
  const handleViewClicked = useCallback(() => {
    try {
      if (typeof onClick === 'function') {
        onClick(travel, index);
      }
    } catch (e) {
      console.warn('[TravelCard] error en handleViewClicked:', e);
    }
  }, [onClick, travel, index]);

  // Handler para Close (si se usa)
  const handleCloseClicked = useCallback(() => {
    try {
      if (typeof onClose === 'function') {
        onClose(travel, index);
      }
    } catch (e) {
      console.warn('[TravelCard] error en handleCloseClicked:', e);
    }
  }, [onClose, travel, index]);

  // small accessibility: disable send if ya enviando
  const canSend = !sending && (finalPrice !== '' || (suggestedPrice !== null && !isNaN(Number(suggestedPrice))));

  return (
    <div
      role="article"
      aria-label={`TravelCard ${travel?.travelId ?? travel?.id ?? index}`}
      style={{
        border: '1px solid #e6e6e6',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#666' }}>
            <strong>Origen</strong>
          </div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>
            {origin
              ?.split(" ")
              .map(p => p.charAt(0).toUpperCase() + p.slice(1))
              .join(" ")
            }
          </div>

          <div style={{ fontSize: 12, color: '#666' }}>
            <strong>Destino</strong>
          </div>
          <div style={{ fontSize: 15 }}>{destination}</div>

          <div style={{ fontSize: 12, color: '#999', marginTop: 10 }}>
            ID: {travel.travelId || travel.id || '—'}
            {travel.roundedDistanceMeters ? ` • ${travel.roundedDistanceMeters} m` : ''}
            {travel.distanceMeters ? ` • ${(travel.distanceMeters / 1000).toFixed(2)} km` : ''}
          </div>
        </div>

        <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#333' }}>
            Tiempo: <strong>{formatMMSS(elapsedSeconds)}</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#fafafa', padding: 8, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: '#666' }}>Precio sugerido</div>
            <center><div style={{ fontSize: 18, fontWeight: 700, color: '#135f13ff' }}>{suggestedFormatted ?? '—'}</div></center>

            <label style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Precio final (MXN)</label>
            <input
              aria-label="Precio final"
              type="number"
              inputMode="numeric"
              value={finalPrice}
              onChange={(e) => {
                const v = e.target.value;
                // permitir limpiar
                if (v === '') return setFinalPrice('');
                // aceptar sólo números (puede incluir decimales)
                const n = Number(v);
                if (!isNaN(n)) setFinalPrice(String(n));
              }}
              placeholder={suggestedPrice ? String(suggestedPrice) : 'Ingresa precio final'}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <button
              onClick={handleViewClicked}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                background: '#fff',
                cursor: 'pointer',
              }}
              aria-label="Ver viaje"
            >
              Ver
            </button>

            <button
              onClick={handleRejectClicked}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                background: '#b0b1aec4',
                cursor: 'pointer',
              }}
              aria-label="Rechazar viaje"
            >
              Rechazar
            </button>

            <button
              onClick={handleSendProposal}
              disabled={!canSend}
              style={{
                flex: 1.4,
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                background: sending ? '#d8c966af' : '#ffbf00',
                color: '#111',
                fontWeight: 700,
                cursor: sending ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 12px rgba(255,191,0,0.18)',
              }}
              aria-label="Enviar propuesta"
            >
              {sending ? 'Esperando respuesta' : 'Enviar propuesta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelCard;
