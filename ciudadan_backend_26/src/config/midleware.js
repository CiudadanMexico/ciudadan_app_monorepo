// config/middlewares.js

module.exports = [
  'strapi::errors',
/*  {
    name: 'strapi::cors',
    config: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
  },
  'strapi::security',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      jsonLimit: '200mb',
      formLimit: '200mb',
      textLimit: '200mb',
      multipart: true,
      formidable: { maxFileSize: 200 * 1024 * 1024 },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
 */
  // Aquí sólo registramos el custom middleware por su nombre


/*  {
    name: 'global::auth0jwt',
    config: {},
  }, */
];
