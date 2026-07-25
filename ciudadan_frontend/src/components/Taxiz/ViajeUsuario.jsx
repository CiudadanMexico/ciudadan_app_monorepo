// src/components/Trips/ViajeUsuario.jsx
import React, { useEffect, useState, useCallback } from 'react';

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

const ViajeUsuario = ({ viaje, driverData, socket, userCoords, routeInfo, setUserCoords, mapRef, setConsultedTravel, paymentFlowState, paymentAmount, onPassengerPaymentChoice, passengerPaymentState, onCancel }) => {
  console.log('viajando usuario', viaje);
  console.log('driverData', driverData);
  console.log('paymentFlowState', paymentFlowState.showPassengerConfirmationOptions);
  console.log('passengerPaymentState', passengerPaymentState);

  const strapiUrl = process.env.REACT_APP_STRAPI_URL || "";
  const strapiToken = process.env.REACT_APP_STRAPI_TOKEN || "";

  // normalizamos todo ANTES de usarlo
  const pickupNorm = viaje?.attributes?.origendireccion?.label;
  const destNorm = viaje?.attributes?.destinodireccion?.label;
  const price = viaje?.attributes?.costo || null;
  const destiNorm = normalizeCoord(viaje?.attributes?.destination);
  const taxiNorm = normalizeCoord(userCoords);
  const userEmail = viaje?.attributes?.pasajeromail;

  const [expanded, setExpanded] = useState(true);
  const [paymentLabory, setPaymentLabory] = useState(false);
  const status = viaje?.attributes?.status || 'esperando';
  //const routeInfo = viaje?.attributes?._routeInfo || null;

  const cancelarViaje = async () => {
    if (typeof onCancel === 'function') onCancel();
  };

  const driverName =
    [driverData?.firstname, driverData?.middlename, driverData?.lastname]
      .filter(Boolean)
      .join(" ") || "No disponible";

  let driverPhoto = null;
  const profilePicThumbnail = driverData?.profile_pic?.data?.attributes?.formats?.thumbnail?.url || null;
  if (profilePicThumbnail) {
    // Usar thumbnail si disponible (más pequeño y rápido)
    driverPhoto = `${strapiUrl}${profilePicThumbnail}`;
  }

  const vehicleLabel =
    [driverData?.vehicle_brand, driverData?.vehicle_model]
      .filter(Boolean)
      .join(" ") || "Vehículo no disponible";
  //const vehicleExtras = [vehicleModel, vehicleColor, vehiclePlate].filter(Boolean);

  const formatDistance = (m) => (m ? `${(m / 1000).toFixed(2)} km` : '—');
  const formatDuration = (s) => (s ? `${Math.ceil(s / 60)} min` : '—');

  const loadLabory = useCallback(async () => {
    if (!userEmail || !strapiUrl) return;

    try {
      const url = `${strapiUrl}/api/configuraciones-usuarios?filters[email][$eq]=${encodeURIComponent(userEmail)}&populate=*`;
      const headers = { 'Content-Type': 'application/json' };
      if (strapiToken) {
        headers.Authorization = `Bearer ${strapiToken}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error('No se pudieron cargar las preferencias');
      }

      const userData = await response.json();
      const payment = userData?.data?.[0]?.attributes?.pago_labory || false;
      console.log('Pago Labory', payment);
      setPaymentLabory(payment);
    } catch (err) {
      console.warn('[Pasajero] no se pudieron cargar preferencias del usuario:', err);
    }
  }, [strapiToken, strapiUrl, userEmail]);

  useEffect(() => {
    if (!socket || !viaje?.id) return;
    const channel = `trip:${viaje.id}`;

    loadLabory();

    const onDriverLocation = (payload) => {
      if (!payload?.coords) return;
      const n = normalizeCoord(payload.coords);
      if (n) setUserCoords(n);
    };
    const onTripUpdate = (p) => {
      if (!p) return;
      // podrías actualizar viaje local si hace falta
    };

    try { socket.emit('join', { channel, client: { type: 'passenger' } }); } catch (e) { }
    socket.on('driver-location', onDriverLocation);
    socket.on('trip-update', onTripUpdate);

    return () => {
      try { socket.emit('leave', { channel, client: { type: 'passenger' } }); } catch (e) { }
      socket.off('driver-location', onDriverLocation);
      socket.off('trip-update', onTripUpdate);
    };
  }, [socket, viaje, setUserCoords, loadLabory]);

  /*useEffect(() => {
    loadLabory();
  }, [loadLabory]);*/

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
          <div style={{ fontSize: 14, color: '#666' }}>{status} • Distancia restante: {routeInfo ? `${routeInfo.toFixed(2)} km` : '-'} • ETA: {formatDuration(routeInfo?.duration_s)}</div>
        </div>
        <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 200ms' }}>▼</div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                {driverPhoto ? (
                  <img
                    src={driverPhoto}
                    alt={`Foto de ${driverName}`}
                    style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
                  />
                ) : (
                  <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    🚕
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>
                    <strong>{driverData?.license_plate}</strong>
                  </div>
                  <div style={{ fontWeight: 600, color: '#444', fontSize: 16 }}>
                    {driverName}
                  </div>
                  {vehicleLabel !== "Vehículo no disponible" ? (
                    <div style={{ color: '#666', fontSize: 16, marginTop: 6 }}>
                      {vehicleLabel}
                    </div>
                  ) : (
                    <div style={{ color: '#666', fontSize: 16 }}>Sin datos de vehículo</div>
                  )}
                  <div style={{ fontSize: 16, marginTop: 5 }}>
                    {driverData?.ratingAvg ? `${driverData?.ratingAvg} ⭐` : '- ⭐'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
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

              <div style={{ flex: 1 }}>
                <div><strong>Precio</strong></div>
                <div style={{ fontSize: 20 }}>
                  <strong>
                    {price ? `$${price.toFixed(2)} MXN` : 'Sin precio'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {(status === 'in_progress' || status === 'iniciando') && <button
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
            </button>}
            {status === 'in_progress' &&
              (routeInfo < .15 ?
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#2f6fed' }}>Ya casi llegas</div>
                  <div style={{ fontSize: 14, color: '#333' }}>Al finalizar el viaje podrás confirmar el pago y revisar tus pertenencias</div>
                </>
                : <button onClick={cancelarViaje} style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: '#f80e0e', flex: 1, color: '#fff' }}>Terminar antes del destino</button>
              )
            }
          </div>

          {paymentFlowState?.isPaymentFlowActive && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Monto a pagar</div>
              {paymentFlowState.showPassengerAmount && paymentAmount != null && (
                <div>
                  <div style={{ fontSize: 14, color: '#444' }}>Total del viaje: <strong>${Number(paymentAmount).toFixed(2)} MXN</strong></div>
                  {paymentLabory && (
                    <>
                      <div style={{ fontSize: 14, color: '#444' }}>Pago máximo con Labory: <strong>${Number(paymentAmount * 0.1).toFixed(2)} MXN</strong></div>
                      <div style={{ fontSize: 14, color: '#444' }}>Efectivo restante: <strong>${Number(paymentAmount * 0.9).toFixed(2)} MXN</strong></div>
                    </>
                  )}
                  {/*<button onClick={() => onConfirmPayment?.(paymentAmount)} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#2f6fed', color: '#fff', border: 'none', fontWeight: 700 }}>
                    Confirmar pago
                  </button>*/}
                </div>
              )}
              {paymentFlowState.showPassengerConfirmationOptions && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => onPassengerPaymentChoice?.('paid')} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#2f6fed', color: '#fff', border: 'none', fontWeight: 700 }}>
                    Sí pagué
                  </button>
                  <button onClick={() => onPassengerPaymentChoice?.('pending')} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#f5a623', color: '#fff', border: 'none', fontWeight: 700 }}>
                    Pago pendiente
                  </button>
                </div>
              )}
              {passengerPaymentState === 'paid' && (
                <div style={{ fontSize: 13, color: '#2f6fed' }}>Pago confirmado.</div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default ViajeUsuario;