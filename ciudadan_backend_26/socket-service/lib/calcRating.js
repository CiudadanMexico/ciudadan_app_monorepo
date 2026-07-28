const axios = require('axios');

async function getUserRating(userEmail, isDriver = false) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (process.env.STRAPI_TOKEN) {
      headers.Authorization = `Bearer ${process.env.STRAPI_TOKEN}`;
    }

    const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
    const emailFilter = isDriver ? 'conductormail' : 'pasajeromail';
    const ratingField = isDriver ? 'calificacionconductor' : 'calificacionpasajero';

    const url = `${STRAPI_URL.replace(/\/$/, '')}/api/viajes?filters[${emailFilter}][$eq]=${userEmail}&filters[${ratingField}][$notNull]=true`;
    const response = await axios.get(
      url,
      { headers, timeout: 8000 }
    );
    //console.log('[testTrip] getUserRating response data:', response?.data?.data);

    const travels = response.data?.data || [];
    let ratingAvg = 0;

    for (const travel of travels || []) {
      const rating = isDriver
        ? travel?.attributes?.calificacionconductor
        : travel?.attributes?.calificacionpasajero;
      if (rating !== null && rating !== undefined) {
        ratingAvg += Number(rating);
      }
    }
    return travels.length > 0 ? ratingAvg / travels.length : null;
  } catch (err) {
    console.error('[testTrip] Error obteniendo calificación del usuario:', err.message);
    return null;
  }
}

module.exports = { getUserRating };