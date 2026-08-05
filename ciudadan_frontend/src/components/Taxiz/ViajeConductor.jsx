// src/components/Trips/ViajeConductor.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

// Este componente mantiene la UX/controles que ya diseñamos antes (botones, iniciar/terminar, centrar, tarjeta colapsable)
// pero **usa** la lógica de mapas y markers del Conductor.js (esa lógica ya está en TripView).
const ViajeConductor = ({
  viaje,
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
  onDriverPaymentChoice,
  setDriverPaymentState
}) => {
  const [expanded, setExpanded] = useState(true);
  const [status, setStatus] = useState(viaje?.attributes?.status || 'pending');
  const [paymentLabory, setPaymentLabory] = useState(false);
  const [saldoLabory, setSaldoLabory] = useState(0);
  console.log('viaje', viaje);
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
    setStatus('in_progress');
    if (typeof onStatusChange === 'function') onStatusChange('in_progress');
    try {
      socket?.emit('trip-action', { viajeId: viaje?.id, action: 'start', ts: new Date().toISOString() });
    } catch (e) { }
    if (strapiConfig?.baseUrl && viaje?.id) {
      try {
        await fetch(`${strapiConfig.baseUrl.replace(/\/$/, '')}/api/viajes/${viaje.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(strapiConfig.token ? { Authorization: `Bearer ${strapiConfig.token}` } : {}) },
          body: JSON.stringify({ data: { status: 'in_progress' } }),
        });
      } catch (e) { console.warn('no pudo actualizar viaje', e); }
    }
  };

  const terminarViaje = async () => {
    setStatus('finished');
    if (typeof onStatusChange === 'function') onStatusChange('finished');
    try {
      socket?.emit('trip-action', { viajeId: viaje?.id, action: 'finish', ts: new Date().toISOString() });
    } catch (e) { }
    if (strapiConfig?.baseUrl && viaje?.id) {
      try {
        await fetch(`${strapiConfig.baseUrl.replace(/\/$/, '')}/api/viajes/${viaje.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(strapiConfig.token ? { Authorization: `Bearer ${strapiConfig.token}` } : {}) },
          body: JSON.stringify({ data: { status: 'finished' } }),
        });
      } catch (e) { console.warn('no pudo actualizar viaje', e); }
    }
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
      const payment = userData?.data?.[0]?.attributes?.pago_labory || false;
      console.log('Pago Labory', payment);
      setPaymentLabory(payment);
      if (payment) {
        const saldo = await consultarSaldo();
        console.log('Saldo Labory', saldo);
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
    console.log('[TripView] handleDriverPaymentChoice', nextState);
    setDriverPaymentState(nextState);

    if (socket) {
      try {
        socket.emit('trip-update', {
          status: nextState
        });
      } catch (e) {
        console.warn('[TripView] error emitiendo trip-update', e);
      }
    }
    if (paymentLabory && saldoLabory > 0) {
      const amountToPay = saldoLabory >= (paymentAmount * 0.1)
        ? paymentAmount * 0.1 : saldoLabory;
      await confirmPayment(amountToPay);
    }
  };

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
          <strong>Viaje #{viaje?.id || '—'}</strong>
          <div style={{ fontSize: 14, color: '#666' }}>{status} • Distancia restante: {routeInfo ? `${routeInfo.toFixed(2)} km` : '-'} • ETA: {formatDuration(routeInfo?.duration_s)}</div>
        </div>
        <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}>▼</div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(status === 'in_progress' || status === 'iniciando') && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div><strong>Origen (tu taxi)</strong></div>
                <div style={{ fontSize: 13 }}>{userCoords ? `${userCoords.lat.toFixed(6)}, ${userCoords.lng.toFixed(6)}` : 'Sin ubicación'}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div><strong>Pickup</strong></div>
                <div style={{ fontSize: 13 }}>{viaje?.attributes?.origendireccion?.label}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div><strong>Destino</strong></div>
                <div style={{ fontSize: 13 }}>{viaje?.attributes?.destinodireccion?.label}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {status === 'iniciando' && <button onClick={iniciarViaje} style={{ flex: 1, padding: 12, borderRadius: 8, background: '#fff200', border: 'none', fontWeight: '700' }}>Iniciar viaje</button>}
            {(status === 'in_progress' || status === 'iniciando') && <button onClick={() => { if (mapRef?.current && userCoords) { mapRef.current.setCenter(userCoords); mapRef.current.setZoom(16); } }} style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: '#fff', flex: 1 }}>Centrar en mí</button>}
            {status === 'in_progress' &&
              (routeInfo < .15 ?
                <button onClick={terminarViaje} style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: '#f80e0e', flex: 1, color: '#fff' }}>Terminar viaje</button>
                : <button onClick={cancelarViaje} style={{ padding: 12, borderRadius: 8, border: '1px solid #ddd', background: '#f80e0e', flex: 1, color: '#fff' }}>Terminar antes del destino</button>
              )}
          </div>

          {status === 'finished' && paymentFlowState?.isPaymentFlowActive && (
            <div style={{ borderTop: '1px solid #eee', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Estado de pago</div>
              {paymentFlowState.showDriverPaymentOptions ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => handleDriverPaymentChoice('paid')}
                    style={{ flex: 1, minWidth: 110, padding: 10, borderRadius: 8, background: '#2f6fed', color: '#fff', border: 'none', fontWeight: 700 }}>
                    Confirmar pago
                  </button>
                  <button onClick={() => handleDriverPaymentChoice('partial')}
                    style={{ flex: 1, minWidth: 110, padding: 10, borderRadius: 8, background: '#f5a623', color: '#fff', border: 'none', fontWeight: 700 }}>
                    Pago parcial
                  </button>
                  <button onClick={() => handleDriverPaymentChoice('unpaid')}
                    style={{ flex: 1, minWidth: 110, padding: 10, borderRadius: 8, background: '#d9534f', color: '#fff', border: 'none', fontWeight: 700 }}>
                    No pagado
                  </button>
                </div>
              ) : (
                <div style={{ color: '#666', fontSize: 13 }}>El pasajero verá el monto a pagar y podrá confirmar el estado del pago.</div>
              )}
              <div style={{ fontSize: 14, color: '#444' }}>Total a cobrar: <strong>${Number(paymentAmount).toFixed(2)} MXN</strong></div>
              {(paymentLabory && saldoLabory > 0) && (
                <div>
                  <div style={{ fontSize: 14, color: '#444' }}>Pago máximo con Labory: <strong>${Number(paymentAmount * 0.1).toFixed(2)} MXN</strong></div>
                  <div style={{ fontSize: 14, color: '#444' }}>Efectivo restante: <strong>${Number(paymentAmount * 0.9).toFixed(2)} MXN</strong></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ViajeConductor;
