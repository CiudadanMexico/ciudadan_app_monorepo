const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/rating-calculate', async (req, res) => {
    try {
        const headers = {
          'Content-Type': 'application/json',
        };
        if (process.env.STRAPI_TOKEN) {
          headers.Authorization = `Bearer ${process.env.STRAPI_TOKEN}`;
        }
        const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

        const { userEmail, isDriver } = req.body
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
        ratingAvg /= travels.length;
        return res.status(200).json({
            ratingAvg: travels.length > 0 ? ratingAvg / travels.length : null
        });
      } catch (err) {
        console.error('[testTrip] Error obteniendo calificación del usuario:', err.message);
        return res.status(500).json({ error: err.message });
      }
});

module.exports = router;
