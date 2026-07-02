// routes/testTrip.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { calculateFareFromMetersSeconds } = require('../lib/fareServer');


const normalizeAddress = (addr) => {
  if (!addr) return null;

  // ya viene como objeto (lo correcto)
  if (typeof addr === 'object') return addr;

  // viene como string → lo convertimos al formato JSON esperado
  return { label: String(addr) };
};

// === helper para guardar viaje en Strapi v4 ===
async function saveTripToStrapi(data) {
  const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    // si hay token, lo usamos; si no, no pasa nada
    if (process.env.STRAPI_TOKEN) {
      headers.Authorization = `Bearer ${process.env.STRAPI_TOKEN}`;
    }

    const response = await axios.post(
      `${STRAPI_URL.replace(/\/$/, '')}/api/viajes`,
      { data },
      {
        headers,
        timeout: 8000,
      }
    );

    console.log('[testTrip] Viaje guardado en Strapi ID:', response.data?.data?.id);
    return response.data;
  } catch (err) {
    console.error(
      '[testTrip] Error guardando viaje en Strapi:',
      err?.response?.status,
      err?.response?.data || err.message
    );
    return null;
  }
}

// constantes (más adelante vendrán de Strapi)
const STEP_METERS = 2000;
const DEFAULT_SPEED_M_S = 8.33; // ~30 km/h para estimar duración si no hay ruta

function roundToStep(meters, step) {
  if (!meters || !step) return meters || 0;
  return Math.round(meters / step) * step;
}

function haversineMeters(a, b) {
  const toRad = v => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

/**
 * Endpoint: /test/send-trip
 * (ya existente) -> emite 'trip-request' con payload de viaje simulado
 */
router.post('/send-trip', async (req, res) => {
  try {
    const io = req.app.get('io');
    if (!io) return res.status(500).json({ ok: false, error: 'Socket.io no disponible (io no seteado)' });

    const body = req.body || {};
    const payload = {
      id: body.id || `trip-${Date.now()}`,
      originCoordinates: body.originCoordinates || { lat: 19.432607, lng: -99.133209 },
      originAdress: body.originAdress || 'Zócalo, CDMX',
      destinationCoordinates: body.destinationCoordinates || { lat: 19.4286, lng: -99.1276 },
      destinationAdress: body.destinationAdress || 'Av. Reforma 1',
      broadcast: body.broadcast === undefined ? true : Boolean(body.broadcast),
      driverId: body.driverId || null,
      candidateDrivers: Array.isArray(body.candidateDrivers) ? body.candidateDrivers : [],
      createdAt: new Date().toISOString(),
      userEmail: body.userEmail,
      meta: body.meta || {}
    };

    // Intentar llamar al endpoint de cálculo de tarifa (interno HTTP)
    const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3033}`;
    const calcUrl = `${base.replace(/\/$/, '')}/calculataxi/calculate-fare`;

    let suggested = null;
    try {
      console.log(`[testTrip] Llamando a calculate-fare -> ${calcUrl}`);
      const calcResp = await axios.post(calcUrl, {
        origin: payload.originCoordinates,
        destination: payload.destinationCoordinates
      }, { timeout: 8000 });

      console.log('[testTrip] calculate-fare status:', calcResp.status);
      if (calcResp?.data?.ok) {
        suggested = {
          fare: calcResp.data.fare,
          fareFormatted: calcResp.data.fareFormatted || null,
          distanceMeters: calcResp.data.distanceMeters || null,
          durationSeconds: calcResp.data.durationSeconds || null,
        };
      } else {
        console.warn('[testTrip] calculate-fare no devolvió ok, body:', calcResp.data);
      }
    } catch (err) {
      // Log detallado para depuración (por ejemplo 405)
      const status = err?.response?.status;
      const bodyPreview = err?.response?.data ? JSON.stringify(err.response.data).slice(0, 2000) : err.message;
      console.warn(`[testTrip] fallo al consultar calculate-fare: status=${status} bodyPreview=${bodyPreview}`);
      // no rethrow: seguimos a fallback
    }

    // Si no hay suggested (falló la API), fallback con Haversine + fareServer
    if (!suggested) {
      try {
        const meters = haversineMeters(payload.originCoordinates, payload.destinationCoordinates);
        const duration = Math.max(60, Math.round(meters / DEFAULT_SPEED_M_S));
        const fareObj = calculateFareFromMetersSeconds(meters, duration, {
          baseFare: 9.19,
          perKm: 5.84,
          perMin: 1.95,
          surge: 1,
          minFare: 30,
          roundTo: 1
        });

        suggested = {
          fare: fareObj.fare,
          fareFormatted: null,
          distanceMeters: Math.round(meters),
          durationSeconds: duration,
        };
        console.log('[testTrip] fallback fare calculated', suggested);
      } catch (e) {
        console.error('[testTrip] fallback fallo:', e);
      }
    }

    // Redondeo de distancia al STEP_METERS
    const roundedDistanceMeters = suggested && suggested.distanceMeters ? roundToStep(suggested.distanceMeters, STEP_METERS) : STEP_METERS;

    // Añadimos campos al payload
    payload.suggestedPrice = suggested ? suggested.fare : null;
    payload.suggestedPriceFormatted = suggested ? suggested.fareFormatted : null;
    payload.distanceMeters = suggested ? suggested.distanceMeters : null;
    payload.durationSeconds = suggested ? suggested.durationSeconds : null;
    payload.roundedDistanceMeters = roundedDistanceMeters;
    payload.meta.suggested = {
      price: payload.suggestedPrice,
      priceFormatted: payload.suggestedPriceFormatted,
      roundedDistanceMeters
    };


    // Guardar viaje en Strapi (estado inicial: solicitado)
    const strapiTripPayload = {
      origencoords: payload.originCoordinates || null,
      destinocoords: payload.destinationCoordinates || null,
      origendireccion: normalizeAddress(payload.originAdress) || null,
      destinodireccion: normalizeAddress(payload.destinationAdress) || null,
      pasajeromail: payload.userEmail || null,
      solicitado: payload.createdAt,
      status: 'solicitado',
      travelid: payload.id, // útil para correlación futura
    };

    const savedTrip = await saveTripToStrapi(strapiTripPayload);

    if (savedTrip?.data?.id) {
      payload.strapiTripId = savedTrip.data.id;
    }

    // Emitir evento 'trip-request' (broadcast)
    io.emit('trip-request', payload);

    return res.json({ ok: true, emittedTo: 'all', payload });
  } catch (err) {
    console.error('Error /test/send-trip', err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

/**
 * Nuevo endpoint: /test/cancel-trip
 * - body esperado (opcional / con defaults):
 *   { id, driverId, userEmail, cancelledBy, reason, code, refundAmount, notifyDriver, notifyUser, meta }
 *
 * Emite:
 *   - evento global 'trip-cancel' con payload completo
 *   - si driverId está presente: emite a room `driver:<driverId>` el mismo evento
 *   - si userEmail está presente: emite a room `user:<userEmail>` el mismo evento
 *
 * Ajusta las rooms a la convención que uses en tu app (aquí uso 'driver:<id>' / 'user:<email>' como ejemplo).
 */
router.post('/cancel-trip', async (req, res) => {
  try {
    const io = req.app.get('io');
    if (!io) return res.status(500).json({ ok: false, error: 'Socket.io no disponible (io no seteado)' });

    const body = req.body || {};

    // Si el cliente no envía id generamos uno mínimo para referencia
    const tripId = body.id || `trip-${Date.now()}`;

    const payload = {
      id: tripId,
      driverId: body.driverId || null,
      userEmail: body.userEmail || null,
      cancelledBy: body.cancelledBy || 'user', // user | driver | system | admin
      reason: body.reason || 'cancelado por usuario',
      code: body.code || null, // opcional: código de cancelación o motivo estandarizado
      refundAmount: typeof body.refundAmount === 'number' ? body.refundAmount : null,
      notifyDriver: body.notifyDriver === undefined ? true : Boolean(body.notifyDriver),
      notifyUser: body.notifyUser === undefined ? true : Boolean(body.notifyUser),
      meta: body.meta || {},
      createdAt: new Date().toISOString(),
      cancelledAt: new Date().toISOString()
    };

    // Log para debugging
    console.log(`[testTrip] cancel-trip payload:`, payload);

    // Emitir evento global para que clientes (paneles, drivers, usuarios en testing) reciban la cancelación
    io.emit('trip-cancel', payload);

    // Si se quiere notificar específicamente al driver (si la app los asigna a rooms)
    if (payload.driverId && payload.notifyDriver) {
      try {
        // Convención de room: 'driver:<driverId>' (ajusta a tu implementación)
        io.to(`driver:${payload.driverId}`).emit('trip-cancel', payload);
        console.log(`[testTrip] emit to driver:${payload.driverId}`);
      } catch (e) {
        console.warn(`[testTrip] fallo al emitir a driver:${payload.driverId}`, e);
      }
    }

    // Si se quiere notificar específicamente al usuario (por ejemplo por email->room)
    if (payload.userEmail && payload.notifyUser) {
      try {
        // Convención de room: 'user:<email>' (ajusta a tu implementación)
        io.to(`user:${payload.userEmail}`).emit('trip-cancel', payload);
        console.log(`[testTrip] emit to user:${payload.userEmail}`);
      } catch (e) {
        console.warn(`[testTrip] fallo al emitir a user:${payload.userEmail}`, e);
      }
    }

    // Respuesta
    return res.json({
      ok: true,
      emittedTo: 'all' + (payload.driverId && payload.notifyDriver ? `, driver:${payload.driverId}` : '') + (payload.userEmail && payload.notifyUser ? `, user:${payload.userEmail}` : ''),
      payload
    });
  } catch (err) {
    console.error('Error /test/cancel-trip', err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

module.exports = router;
