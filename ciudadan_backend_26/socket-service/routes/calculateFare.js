// routes/calculateFare.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const { calculateFareFromMetersSeconds } = require('../lib/fareServer');

// Formatter MXN
const MXN_FMT = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
function formatMXN(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return null;
  return MXN_FMT.format(Number(v));
}

function formatBreakdownNumeric(bd) {
  return {
    baseFare: Number(bd.baseFare),
    perKm: Number(bd.perKm),
    perMin: Number(bd.perMin),
    km: Number(bd.km),
    minutes: Number(bd.minutes),
    surge: Number(bd.surge),
    raw: Number(bd.raw),
    rounded: Number(bd.rounded),
    minFare: Number(bd.minFare),
  };
}

function formatBreakdownFormatted(bd) {
  return {
    baseFare: formatMXN(bd.baseFare),
    perKm: `${formatMXN(bd.perKm)} / km`,
    perMin: `${formatMXN(bd.perMin)} / min`,
    km: `${Number(bd.km).toFixed(3)} km`,
    minutes: `${Number(bd.minutes).toFixed(2)} min`,
    surge: Number(bd.surge),
    raw: formatMXN(bd.raw),
    rounded: formatMXN(bd.rounded),
    minFare: formatMXN(bd.minFare),
  };
}

// Config cache simple (evita solicitar Strapi en cada request)
let configCache = null;
let configCacheAt = 0;
const CONFIG_TTL_MS = 60 * 1000; // 60s cache (ajusta si quieres)

async function fetchTarifaConfig() {
  console.log("----- fetchTarifaConfig() START -----");
  const now = Date.now();
  if (configCache && (now - configCacheAt) < CONFIG_TTL_MS) {
    console.log("[CACHE HIT]");
    return configCache;
  }

  const STRAPI_URL = process.env.STRAPI_URL;
  if (!STRAPI_URL) throw new Error("STRAPI_URL no definido en .env");
  const base = STRAPI_URL.replace(/\/$/, '');

  // endpoints a probar (ordenados)
  const endpoints = [
    `${base}/api/configuraciones-sistemas?filters[parametro][$eq]=tarifataxi&populate=basic_set`,
    `${base}/api/configuraciones-sistemas?filters[parametro][$eq]=tarifataxi`,
    `${base}/api/configuraciones-sistemas?populate=basic_set`,
    `${base}/api/configuraciones-sistemas?populate=*`,
    `${base}/api/configuraciones-sistema?filters[parametro][$eq]=tarifataxi&populate=basic_set`,
    `${base}/api/configuraciones-sistema?populate=basic_set`,
  ];

  // opciones axios comunes
  const axiosOptsBase = {
    timeout: 15000,
    headers: {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'ciudadan-backend/1.0 (+https://ciudadan.org)',
      // opcionalmente agrega Origin si Cloudflare lo requiere:
      // Origin: 'https://ciudadan.org'
    }
  };

  let lastErr = null;
  let resp = null;

  // retry simple con backoff
  for (const url of endpoints) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[TRY] ${url} (attempt ${attempt})`);
        resp = await axios.get(url, axiosOptsBase);
        console.log(`[OK] ${url} -> status ${resp.status}`);
        break;
      } catch (err) {
        lastErr = err;
        const status = err?.response?.status;
        console.warn(`[WARN] ${url} attempt ${attempt} -> ${status || err.code || err.message}`);
        // si code de red (ENOTFOUND, ECONNREFUSED) puede ser DNS/conn problem
        if (attempt < 3) {
          const backoff = 300 * attempt;
          console.log(` waiting ${backoff}ms before retry...`);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
      }
    }
    if (resp && resp.status && resp.status >= 200 && resp.status < 300) break;
  }

  if (!resp) {
    console.error("[ERROR] No se obtuvo respuesta de Strapi. Último error:", lastErr && lastErr.message ? lastErr.message : lastErr);
    throw new Error(`Error consultando Strapi: ${lastErr && lastErr.message ? lastErr.message : 'no response'}`);
  }

  console.log("[RAW STRAPI RESPONSE STATUS]", resp.status);
  // intentar loguear un fragmento del body para debug sin spamear
  try {
    const bodyPreview = typeof resp.data === 'object' ? JSON.stringify(resp.data, null, 2) : String(resp.data);
    console.log("[RAW STRAPI BODY PREVIEW]:", bodyPreview.slice(0, 2000));
  } catch (e) {
    console.log("[RAW BODY] non-serializable");
  }

  const items = Array.isArray(resp?.data?.data) ? resp.data.data : (Array.isArray(resp?.data) ? resp.data : []);
  if (!items || items.length === 0) {
    console.error("[ERROR] resp.data.data vacío o no es array");
    throw new Error('Configuración "tarifataxi" no encontrada en Strapi (respuesta vacía)');
  }

  const found = items.find(it => {
    const p = it?.attributes?.parametro ?? it?.parametro;
    return String(p ?? '').toLowerCase() === 'tarifataxi';
  }) || items[0];

  if (!found) throw new Error('No se encontró elemento con parametro "tarifataxi"');

  console.log("[FOUND ITEM - RAW]:", JSON.stringify(found, null, 2));

  let basic = found?.attributes?.basic_set ?? found?.basic_set ?? null;

  if (typeof basic === 'string') {
    console.log("[INFO] basic_set viene como string; parseando...");
    try { basic = JSON.parse(basic); }
    catch (e) { throw new Error('basic_set no es JSON válido'); }
  }

  if (basic && basic.data && basic.data.attributes) {
    basic = basic.data.attributes;
  } else if (basic && basic.attributes) {
    basic = basic.attributes;
  }

  if (!basic || typeof basic !== 'object') {
    console.error("[ERROR] basic_set inválido:", basic);
    throw new Error('basic_set inválido o vacío');
  }

  // normalizar numéricos
  const expected = ['baseFare','perKm','perMin','surge','minFare','roundTo'];
  const normalized = {};
  expected.forEach(k => {
    if (basic[k] !== undefined) {
      const n = Number(basic[k]);
      normalized[k] = isNaN(n) ? basic[k] : n;
    }
  });
  // copiar extras
  Object.keys(basic).forEach(k => { if (!normalized.hasOwnProperty(k)) normalized[k] = basic[k]; });

  configCache = normalized;
  configCacheAt = Date.now();
  console.log("[FINAL CONFIG]:", configCache);
  console.log("----- fetchTarifaConfig() END -----");
  return configCache;
}


router.post('/calculate-fare', async (req, res) => {
  try {
    const { origin, destination, fareOpts } = req.body;
    if (!origin || !destination) return res.status(400).json({ ok: false, error: 'origin y destination requeridos' });

    // Obtener configuración de tarifa desde Strapi
    let tarifaConfig = null;
    try {
      tarifaConfig = await fetchTarifaConfig();
    } catch (cfgErr) {
      console.warn('No se pudo obtener tarifa desde Strapi, usando defaults:', String(cfgErr));
      tarifaConfig = null;
    }

    const DEFAULTS = {
      baseFare: 9.19,
      perKm: 5.84,
      perMin: 1.95,
      surge: 1,
      minFare: 30,
      roundTo: 1,
    };

    const config = Object.assign({}, DEFAULTS, tarifaConfig || {});

    const originParam = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
    const destParam = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;

    const GEOCODING_KEY = process.env.GEOCODING_KEY;
    if (!GEOCODING_KEY) {
      return res.status(500).json({ ok: false, error: 'GEOCODING_KEY no definido en .env' });
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(originParam)}&destination=${encodeURIComponent(destParam)}&key=${encodeURIComponent(GEOCODING_KEY)}`;

    const r = await axios.get(url, { timeout: 10000 });
    if (!r.data || r.data.status !== 'OK' || !r.data.routes || !r.data.routes.length) {
      // fallback: intentamos aproximar distancia por Haversine si vienen coords
      try {
        if (typeof origin === 'object' && typeof destination === 'object' && origin.lat && origin.lng && destination.lat && destination.lng) {
          const meters = haversineMeters(origin, destination);
          const approxDuration = Math.max(60, Math.round(meters / 8.33)); // velocidad promedio ~30 km/h -> 8.33 m/s
          const fareObj = calculateFareFromMetersSeconds(meters, approxDuration, {
            baseFare: config.baseFare,
            perKm: config.perKm,
            perMin: config.perMin,
            surge: config.surge,
            minFare: config.minFare,
            roundTo: config.roundTo
          });

          const breakdownNum = formatBreakdownNumeric(fareObj.breakdown || {});
          const breakdownFmt = formatBreakdownFormatted(breakdownNum);

          return res.json({
            ok: true,
            fallback: true,
            distanceMeters: Math.round(meters),
            durationSeconds: approxDuration,
            fare: fareObj.fare,
            fareFormatted: formatMXN(fareObj.fare),
            breakdown: breakdownNum,
            breakdownFormatted: breakdownFmt,
            config
          });
        }
      } catch (e) {
        console.warn('Fallback haversine fallo', e);
      }

      return res.status(500).json({ ok: false, error: 'No route from Google Directions', details: r.data, config });
    }

    const leg = r.data.routes[0].legs[0];
    const distanceMeters = leg.distance && leg.distance.value ? leg.distance.value : null;
    const durationSeconds = leg.duration && leg.duration.value ? leg.duration.value : null;

    if (distanceMeters === null || durationSeconds === null) {
      return res.status(500).json({ ok: false, error: 'No se obtuvo distancia/tiempo de Google', route: r.data.routes[0], config });
    }

    const fareResult = calculateFareFromMetersSeconds(distanceMeters, durationSeconds, {
      baseFare: Number(config.baseFare),
      perKm: Number(config.perKm),
      perMin: Number(config.perMin),
      surge: Number(config.surge),
      minFare: Number(config.minFare),
      roundTo: Number(config.roundTo),
      ...fareOpts
    });

    const breakdownNum = formatBreakdownNumeric(fareResult.breakdown || {});
    const breakdownFmt = formatBreakdownFormatted(breakdownNum);

    return res.json({
      ok: true,
      distanceMeters,
      durationSeconds,
      fare: fareResult.fare,
      fareFormatted: formatMXN(fareResult.fare),
      breakdown: breakdownNum,
      breakdownFormatted: breakdownFmt,
      route: r.data.routes[0],
      configUsed: config
    });
  } catch (err) {
    console.error('calculate-fare error', err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, error: err && err.message ? err.message : String(err) });
  }
});

module.exports = router;

/* ---------------------
   Helpers internos
   --------------------- */
function haversineMeters(a, b) {
  const toRad = v => (v * Math.PI) / 180;
  const R = 6371000; // m
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
