// src/components/Trips/ViajeConductor.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

// Este componente mantiene la UX/controles que ya diseñamos antes (botones, iniciar/terminar, centrar, tarjeta colapsable)
// pero **usa** la lógica de mapas y markers del Conductor.js (esa lógica ya está en TripView).
const ViajeConductor = ({
  viaje,
  userData,
  socket,
  strapiConfig,
  userCoords,
  routeInfo,
  setUserCoords,
  travelData,
  consultedTravel,
  handleTravelCardClick,
  handleBackButtonClick,
  handleCloseButtonClick,
  handleAcceptTrip,
  mapRef,
  onStatusChange,
  onCancel,
  paymentFlowState,
  paymentAmount,
  setCashAmount,
  setDriverPaymentState
}) => {
  const [expanded, setExpanded] = useState(true);
  const [status, setStatus] = useState(viaje?.attributes?.status || 'pending');
  const [hasLabory, setHasLabory] = useState(false);
  const [saldoLabory, setSaldoLabory] = useState(0);
  console.log('viaje', viaje);
  //console.log('userData', userData);
  //const routeInfo = viaje?.attributes?.routeInfo || null;
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

  useEffect(() => {
    setStatus(viaje?.attributes?.status || 'pending');
  }, [viaje?.attributes?.status]);

  const formatDistance = (m) => (m ? `${(m / 1000).toFixed(2)} km` : '—');
  const formatDuration = (s) => (s ? `${Math.ceil(s / 60)} min` : '—');
  const userEmail = viaje?.attributes?.pasajeromail;

  const iniciarViaje = async () => {
    setStatus('en_curso');
    if (typeof onStatusChange === 'function') await onStatusChange('en_curso');
    /*try {
      socket?.emit('trip-action', { viajeId: viaje?.id, action: 'start', ts: new Date().toISOString() });
    } catch (e) { }*/
  };

  const terminarViaje = async () => {
    setStatus('finalizado');
    if (typeof onStatusChange === 'function') onStatusChange('finalizado');
    /*try {
      socket?.emit('trip-action', { viajeId: viaje?.id, action: 'finish', ts: new Date().toISOString() });
    } catch (e) { }*/
  };

  const cancelarViaje = async () => {
    if (typeof onCancel === 'function') onCancel();
  };

  const consultarSaldo = useCallback(async () => {
    if (!strapiConfig?.baseUrl) return;

    try {
      const url = `${strapiConfig.baseUrl.replace(/\/$/, '')}/api/cartera`;
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
  }, [getToken, strapiConfig?.baseUrl]);

  const loadLabory = useCallback(async () => {
    if (!userEmail || !strapiConfig?.baseUrl) return;

    try {
      const url = `${strapiConfig.baseUrl.replace(/\/$/, '')}/api/configuraciones-usuarios?filters[email][$eq]=${encodeURIComponent(userEmail)}&populate=*`;
      const headers = { 'Content-Type': 'application/json' };
      if (strapiConfig.token) {
        headers.Authorization = `Bearer ${strapiConfig.token}`;
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
  }, [strapiConfig?.token, strapiConfig?.baseUrl, userEmail]);

  useEffect(() => {
    loadLabory();
  }, [loadLabory]);

  const confirmPayment = async (amount) => {
    if (!strapiConfig?.baseUrl) return;

    try {
      const url = `${strapiConfig.baseUrl.replace(/\/$/, '')}/api/viaje/pagar`;
      const headers = { 'Content-Type': 'application/json' };
      const token = await getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          userId: viaje?.attributes?.pasajero?.data?.id,
          amount
        }),
      });
      if (!response.ok) {
        throw new Error('No se pudo consultar la cartera del usuario');
      }

      const data = await response.json();
      console.log('[Pasajero] pago confirmado:', data);
    } catch (err) {
      console.warn('[Pasajero] no se pudo confirmar el pago:', err);
    }
  };

  const handleDriverPaymentChoice = async (nextState) => {
    setStatus(nextState);
    if (typeof onStatusChange === 'function') onStatusChange(nextState);

    if (hasLabory && saldoLabory > 0) {
      const amountLabory = saldoLabory >= (paymentAmount * 0.1)
        ? paymentAmount * 0.1 : saldoLabory;
      setCashAmount(paymentAmount - amountLabory);
      await confirmPayment(amountLabory);
    } else {
      setCashAmount(paymentAmount);
    }
  };

  const username = userData?.nombre_completo || userData?.username || 'Usuario';
  let userPhoto = null;
  const profilePicThumbnail = userData?.profilepic?.formats?.thumbnail?.url || null;
  if (profilePicThumbnail) {
    // Usar thumbnail si disponible (más pequeño y rápido)
    userPhoto = `${strapiConfig?.baseUrl}${profilePicThumbnail}`;
  }

  const isTripFinished = ['finalizado', 'paid', 'partial', 'unpaid'].includes(viaje?.attributes?.status);

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
          <strong>Viaje #{viaje?.id || '—'}</strong>
          <div style={{ fontSize: 14, color: '#666' }}>{status} • Distancia restante: {routeInfo ? `${routeInfo.toFixed(2)} km` : '-'} • ETA: {formatDuration(routeInfo?.duration_s)}</div>
        </div>
        <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}>▼</div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className='trip-view' style={{ fontSize: 13, display: 'flex', gap: 16, margin: 6, borderRight: '1px solid #eee', paddingInline: 12 }}>
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt={`Profile de ${username}`}
                    style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
                  />
                ) : (
                  <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#f2f2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    🚕
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, color: '#444', fontSize: 16 }}>
                    {username}
                  </div>
                  <div style={{ fontSize: 18, marginTop: 5 }}>
                    <strong>{userData?.ratingAvg ? `${userData?.ratingAvg.toFixed(1)} ⭐` : '- ⭐'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {(status === 'en_curso' || status === 'iniciando' || status.includes('fin_solicitado')) && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div><strong>Origen (tu taxi)</strong></div>
                  <div style={{ fontSize: 12 }}>{userCoords ? `${userCoords.lat.toFixed(6)}, ${userCoords.lng.toFixed(6)}` : 'Sin ubicación'}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div><strong>Pickup</strong></div>
                  <div style={{ fontSize: 12 }}>{viaje?.attributes?.origendireccion?.label}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div><strong>Destino</strong></div>
                  <div style={{ fontSize: 12 }}>{viaje?.attributes?.destinodireccion?.label}</div>
                </div>
              </div>
            )}
            {isTripFinished && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 700, paddingBlock: 8 }}>Confirme el pago del pasajero</div>
                <div style={{ fontSize: 14, color: '#444', paddingBottom: 8 }}>Total a cobrar: <strong>${Number(paymentAmount).toFixed(2)} MXN</strong></div>
                {(hasLabory && saldoLabory > 0) && (
                  <>
                    <div style={{ fontSize: 14, color: '#444', paddingBottom: 8 }}>
                      Pago máximo con
                      <strong> Labory</strong>: <strong style={{ color: '#151bc1' }}>${Number(paymentAmount * 0.1).toFixed(2)} MXN</strong>
                    </div>
                    <div style={{ fontSize: 14, color: '#444', paddingBottom: 8 }}>Efectivo restante: <strong style={{ color: '#12aa12' }}>${Number(paymentAmount * 0.9).toFixed(2)} MXN</strong></div>
                  </>
                )}
              </div>
            )}
            {/*(status === 'partial' || status === 'unpaid') &&
              <div style={{ flex: 1, display: 'flex', fontSize: 18, textAlign: 'center', fontWeight: 600, color: '#e02c2c', padding: 12 }}>
                Al pasajero se le notificará que su pago no fue completado
              </div>
            */}
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 12 }}>
            {status === 'iniciando' && <button onClick={iniciarViaje} style={{ flex: 1, padding: 12, borderRadius: 8, background: '#fff200', border: 'none', fontWeight: '700' }}>Iniciar viaje</button>}
            {(status === 'en_curso' || status === 'iniciando') && <button onClick={() => {
              if (mapRef?.current && userCoords) { mapRef.current.setCenter(userCoords); mapRef.current.setZoom(16); }
            }} style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: '#fff', flex: 1 }}>
              Centrar en mí
            </button>
            }
            {status === 'en_curso' &&
              (routeInfo < 0.15 ?
                <button onClick={terminarViaje} style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: '#f80e0e', flex: 1, color: '#fff' }}>Terminar viaje</button>
                : <button onClick={cancelarViaje} style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: '#f80e0e', flex: 1, color: '#fff' }}>Terminar antes del destino</button>
              )
            }
            {/*(status === 'paid' || status === 'partial' || status === 'unpaid') && (
              <div style={{ color: '#666', fontSize: 13 }}>
                El pasajero verá el monto a pagar y podrá confirmar el estado del pago.
              </div>
            )*/}
          </div>
          {status === 'finalizado' && (
            <>
              <button onClick={() => handleDriverPaymentChoice('paid')}
                style={{ flex: 1, minWidth: 110, padding: 10, borderRadius: 8, background: '#2f6fed', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                Confirmar pago
              </button>
              <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={() => handleDriverPaymentChoice('partial')}
                  style={{ flex: 1, minWidth: 110, padding: 10, borderRadius: 8, background: 'none', color: '#f5a623', textDecoration: 'underline', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                  El pasajero pagó parcialmente
                </button>
                <button onClick={() => handleDriverPaymentChoice('unpaid')}
                  style={{ flex: 1, minWidth: 110, padding: 10, borderRadius: 8, background: 'none', color: '#f80e0e', textDecoration: 'underline', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                  El pasajero no pagó
                </button>
              </div>
            </>
          )}
          {status === 'fin_solicitado_conductor' &&
            <div>
              <div style={{ color: '#333', textAlign: 'center', fontSize: 14, paddingBottom: 6, fontWeight: 600 }}>
                Espere a que el pasajero acepte su solicitud. Si no acepta, puede marcar a los siguientes contactos.
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button onClick={() => { }} style={{ borderRadius: 8, border: '1px solid #ddd', background: '#2ba80f', flex: 1, color: '#fff' }}>Contactar por WhatsApp</button>
                <button onClick={() => { }} style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: '#f80e0e', flex: 1, color: '#fff' }}>MARCAR AL 911</button>
              </div>
            </div>
          }
        </div>
      )}
    </div>
  );
};

export default ViajeConductor;
