const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const STRAPI_URL = (process.env.STRAPI_URL || '').replace(/\/$/, '');
const STRAPI_TOKEN = process.env.STRAPI_TOKEN || null;

// Helper: construir headers para Strapi
const buildStrapiHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (STRAPI_TOKEN) headers['Authorization'] = `Bearer ${STRAPI_TOKEN}`;
  return headers;
};

const generatePIN = () => {
  const min = Math.pow(10, 4 - 1);
  const max = Math.pow(10, 4) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

// POST /api/aceptar-viaje
router.post('/aceptar-viaje', async (req, res) => {
  try {
    const {
      userEmail,
      driverEmail,
      origencoords,
      destinocoords,
      conductorcoords,
      travelid,
      travelId,
      costo,
      pagadoefectivo,
      pagadolabory,
    } = req.body || {};

    const travelIdFinal = travelid || travelId;
    console.log(`[aceptar-viaje] travelId: ${travelIdFinal}`);
    console.log(`[aceptar-viaje] userEmail: ${userEmail}`);
    console.log(`[aceptar-viaje] driverEmail: ${driverEmail}`);
    console.log(`[aceptar-viaje] origencoords: ${JSON.stringify(origencoords)}`);
    console.log(`[aceptar-viaje] destinocoords: ${JSON.stringify(destinocoords)}`);

    if (!userEmail) {
      return res.status(400).json({ ok: false, error: 'userEmail es requerido' });
    }

    if (!driverEmail) {
      return res.status(400).json({ ok: false, error: 'driverEmail es requerido' });
    }

    if (!travelIdFinal) {
      return res.status(400).json({ ok: false, error: 'travelid es requerido' });
    }

    if (!STRAPI_URL) {
      return res.status(500).json({ ok: false, error: 'STRAPI_URL no configurada' });
    }

    /* ======================================================
      Buscar el viaje existente por travelid
    ====================================================== */
    const findResp = await axios.get(
      `${STRAPI_URL}/api/viajes?filters[travelid][$eq]=${encodeURIComponent(travelIdFinal)}`,
      { headers: buildStrapiHeaders(), timeout: 10000 }
    );

    const existing = findResp.data?.data?.[0];
    console.log(`[aceptar-viaje] viaje encontrado: ${existing ? existing : 'no encontrado'}`);

    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Viaje no encontrado' });
    }

    /* ======================================================
      Buscar el conductor existente por driverEmail
    ====================================================== */
    const resp = await axios.get(
      `${STRAPI_URL}/api/users?filters[email][$eq]=${driverEmail}`,
      { headers: buildStrapiHeaders(), timeout: 10000 }
    );
    if (!resp) {
      console.warn('[aceptar-viaje] error obteniendo usuario de Strapi');
      return;
    }

    const user = await resp.data;
    if (!user) {
      console.warn('[aceptar-viaje] no se encontró usuario Strapi con email:', user);
      return;
    }
    const driverId = user[0].id;
    console.log('[aceptar-viaje] driverId obtenido:', driverId);

    /* ======================================================
      Preparar SOLO los campos a actualizar
    ====================================================== */
    const pin = generatePIN();

    const updateData = {
      conductor: driverId,
      conductormail: driverEmail,
      status: 'iniciando',
      pincode: pin,
      iniciado: new Date().toISOString(),
    };

    if (conductorcoords) {
      updateData.conductorcoords = conductorcoords;
    }

    if (origencoords) {
      updateData.origencoords = origencoords;
    }

    if (destinocoords) {
      updateData.destinocoords = destinocoords;
    }

    if (typeof costo === 'number') {
      updateData.costo = costo;
    }

    /* ======================================================
      Update REAL del viaje (NO POST)
    ====================================================== */
    const updateResp = await axios.put(
      `${STRAPI_URL}/api/viajes/${existing.id}`,
      { data: updateData },
      { headers: buildStrapiHeaders(), timeout: 10000 }
    );

    const updated = updateResp.data?.data || null;

    /* ======================================================
      Emitir evento por socket
    ====================================================== */
    try {
      const io = req.app?.get?.('io');
      if (io && typeof io.emit === 'function') {
        io.to(driverEmail).emit('viajeAceptado', {
          travelId: travelIdFinal,
          strapiId: existing.id,
          status: 'iniciando',
          userEmail,
          driverEmail,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (socketErr) {
      console.warn('[aceptar-viaje] error socket:', socketErr);
    }

    return res.status(200).json({
      ok: true,
      updated,
      travelId: travelIdFinal,
      strapiId: existing.id,
    });
  } catch (err) {
    console.error('[aceptar-viaje] error:', err?.response?.data || err.message || err);
    return res.status(500).json({
      ok: false,
      error: err?.response?.data || err.message || String(err),
    });
  }
});

module.exports = router;
