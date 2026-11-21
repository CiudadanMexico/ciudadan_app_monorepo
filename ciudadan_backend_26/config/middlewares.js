module.exports = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
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
  'global::subdomain',
  'global::rbac-subdomain',
];
