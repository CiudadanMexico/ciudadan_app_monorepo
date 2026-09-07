module.exports = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      // Se requiere origen explícito (credentials: true no permite '*') y
      // permitir X-Ad-Token (token de sesión de anuncios): sin esto el
      // navegador cancela los POST heartbeat/estado/completar tras el
      // preflight y nunca se registran las vistas en ad_views.
      origin: (process.env.CORS_ORIGINS || 'http://localhost:3001,http://localhost:3000,http://localhost,http://localhost:33422,http://localhost:33033,https://ciudadan.org,https://marihuanas.club')
        .split(',').map((s) => s.trim()).filter(Boolean),
      headers: [
        'Content-Type',
        'Authorization',
        'Origin',
        'Accept',
        'X-Requested-With',
        'X-Ad-Token',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
