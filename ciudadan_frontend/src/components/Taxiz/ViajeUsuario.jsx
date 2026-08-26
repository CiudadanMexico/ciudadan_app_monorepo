// src/components/Trips/ViajeUsuario.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

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

const ViajeUsuario = ({ viaje, driverData, socket, userCoords, routeInfo, setUserCoords, mapRef, setConsultedTravel, paymentAmount, onCancel }) => {
  const strapiUrl = process.env.REACT_APP_STRAPI_URL || "";
  const strapiToken = process.env.REACT_APP_STRAPI_TOKEN || "";
  const { getAccessTokenSilently } = useAuth0();

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      });
    } catch (e) {
      console.warn('⚠️ No se pudo obtener token Auth0:', e.message);
      return null;
    }
  }, [getAccessTokenSilently]);

  // normalizamos todo ANTES de usarlo
  const pickupNorm = viaje?.attributes?.origendireccion?.label;
  const destNorm = viaje?.attributes?.destinodireccion?.label;
  const price = viaje?.attributes?.costo || null;
  const destiNorm = normalizeCoord(viaje?.attributes?.destination);
  const taxiNorm = normalizeCoord(userCoords);
  const userEmail = viaje?.attributes?.pasajeromail;

  const [expanded, setExpanded] = useState(true);
  const [hasLabory, setHasLabory] = useState(false);
  const [saldoLabory, setSaldoLabory] = useState(0);
  const status = viaje?.attributes?.status || 'esperando';
  const pincode = viaje?.attributes?.pincode || null;
  const isTripFree = viaje?.attributes?.isTripFree || false;
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

  const formatDistance = (m) => (m ? `${(m / 1000).toFixed(2)} km` : '—');
  const formatDuration = (s) => (s ? `${Math.ceil(s / 60)} min` : '—');

  const consultarSaldo = useCallback(async () => {
    if (!strapiUrl) return;

    try {
      const url = `${strapiUrl}/api/cartera`;
      const headers = { 'Content-Type': 'application/json' };
      const token = await getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error('No se pudo consultar la cartera del usuario');
      }

      const data = await response.json();
      const saldo = data?.laborysSaldo || 0;
      return saldo;
    } catch (err) {
      console.warn('[Pasajero] no se pudo consultar la cartera del usuario:', err);
    }
  }, [getToken, strapiUrl]);

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
      const labory = userData?.data?.[0]?.attributes?.pago_labory || false;
      setHasLabory(labory);
      if (labory) {
        const saldo = await consultarSaldo();
        setSaldoLabory(saldo);
      }
    } catch (err) {
      console.warn('[Pasajero] no se pudieron cargar preferencias del usuario:', err);
    }
  }, [strapiToken, strapiUrl, userEmail]);

  /*const confirmPayment = async (amount) => {
    if (!strapiUrl) return;

    try {
      const url = `${strapiUrl}/api/viaje/pagar`;
      const headers = { 'Content-Type': 'application/json' };
      const token = await getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          driverId: viaje?.attributes?.conductor?.data?.id,
          amount
        }),
      });
      if (!response.ok) {
        throw new Error('No se pudo consultar la cartera del usuario');
      }

      const data = await response.json();
    } catch (err) {
      console.warn('[Pasajero] no se pudo confirmar el pago:', err);
    }
  };*/

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
      overflowY: 'auto',
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
        <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className='trip-view' style={{ fontSize: 13, display: 'flex', gap: 16, margin: 6, paddingInline: 12, borderRight: '1px solid #eee' }}>
                {driverPhoto ? (
                  <img
                    src={driverPhoto}
                    alt={`Foto de ${driverName}`}
                    style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
                  />
                ) : (
                  <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    🚕
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>
                    <strong style={{ color: '#666' }}>{driverData?.license_plate}</strong>
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
                  <div style={{ fontSize: 18, marginTop: 5 }}>
                    <strong>{driverData?.ratingAvg ? `${driverData?.ratingAvg.toFixed(1)} ⭐` : '- ⭐'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {(status === 'en_curso' || status === 'iniciando' || status.includes('fin_solicitado')) && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <strong>Pickup</strong>
                  <div style={{ fontSize: 12 }}>
                    {pickupNorm ? `${pickupNorm}` : 'Sin pickup'}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <strong>Destino</strong>
                  <div style={{ fontSize: 12 }}>
                    {destNorm ? `${destNorm}` : 'Sin destino'}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <strong>Precio</strong>
                  {isTripFree ?
                    <div style={{ fontSize: 16, flexDirection: 'row' }}>
                      <strong style={{ color: '#151bc1', opacity: .5, textDecoration: 'line-through' }}>
                        {`$${price.toFixed(2)} MXN`}
                      </strong>
                      <strong style={{ color: '#16b32b', paddingLeft: 12 }}>$0.00 MXN</strong>
                    </div>
                    :
                    <div style={{ fontSize: 16 }}>
                      <strong style={{ color: '#151bc1' }}>
                        {`$${price.toFixed(2)} MXN`}
                      </strong>
                    </div>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <strong>Código PIN</strong>
                  <div style={{ fontSize: 18 }}>
                    <strong style={{ color: '#135f13' }}>{pincode}</strong>
                  </div>
                </div>
              </div>
            )}
            {(status === 'finalizado') && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                {!isTripFree ?
                  <>
                    <div style={{ fontSize: 16, paddingBlock: 8 }}><strong>Monto a pagar</strong></div>
                    <div style={{ fontSize: 14, color: '#444', paddingBottom: 8 }}>Total del viaje: <strong>${Number(paymentAmount).toFixed(2)} MXN</strong></div>
                    {(hasLabory && saldoLabory > 0) && (
                      <>
                        <div style={{ fontSize: 14, color: '#444', paddingBottom: 8 }}>
                          Pago máximo con
                          <strong> Labory</strong>: <strong style={{ color: '#151bc1' }}>${Number(paymentAmount * 0.1).toFixed(2)} MXN</strong>
                        </div>
                        <div style={{ fontSize: 14, color: '#444', paddingBottom: 8 }}>Efectivo restante: <strong style={{ color: '#12aa12' }}>${Number(paymentAmount * 0.9).toFixed(2)} MXN</strong></div>
                      </>
                    )}
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#151bc1', paddingTop: 12 }}>Confirma tu pago con el conductor</div>
                  </>
                  :
                  <div>
                    <h4 style={{ textAlign: 'center', color: '#16b32b' }}>
                      Este viaje es completamente gratuito
                    </h4>
                    <h5 style={{ textAlign: 'center' }}>No tienes que pagar nada :D</h5>
                  </div>
                }
              </div>
            )}
            {(status === 'partial' || status === 'unpaid') &&
              <div style={{ flex: 1, display: 'flex', fontSize: 16, textAlign: 'center', fontWeight: 600, color: '#e02c2c', padding: 12 }}>
                El conductor indicó que el pago no fue completado
              </div>
            }
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {(status === 'en_curso' || status === 'iniciando') && <button
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
            {status === 'en_curso' &&
              (routeInfo < 0.15 ?
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#2f6fed' }}>Ya casi llegas</div>
                  <div style={{ fontSize: 14, color: '#333' }}>Al finalizar el viaje podrás confirmar el pago y revisar tus pertenencias</div>
                </>
                : <button onClick={cancelarViaje} style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: '#f80e0e', flex: 1, color: '#fff' }}>Terminar antes del destino</button>
              )
            }
          </div>
          {status === 'fin_solicitado_pasajero' &&
            <div>
              <div style={{ color: '#333', textAlign: 'center', fontSize: 14, paddingBottom: 6, fontWeight: 600 }}>
                Espere a que el conductor acepte su solicitud. Si no acepta, puede marcar a los siguientes contactos.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={() => { }} style={{ borderRadius: 8, border: '1px solid #ddd', background: '#2ba80f', flex: 1, color: '#fff' }}>Contactar por WhatsApp</button>
                <button onClick={() => { }} style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: '#f80e0e', flex: 1, color: '#fff' }}>MARCAR AL 911</button>
              </div>
            </div>
          }

          {/*paymentFlowState?.isPaymentFlowActive && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          )*/}
        </div>
      )}
    </div>
  );
};

export default ViajeUsuario;