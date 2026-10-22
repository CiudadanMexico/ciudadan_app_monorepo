'use strict';

/**
 * delivery-profile router
 *
 * CRUD core CERRADO por completo: el expediente de repartidor solo muta a
 * traves de las rutas numeradas de api::delivery-registration (auth:false +
 * policy Auth0). Ningun status, reviewer ni rol es escribible por el
 * frontend (spec, criterio de aceptacion 4).
 *
 * `except` omite las rutas de forma estructural (no depende de toggles del
 * panel): ver node_modules/@strapi/strapi/dist/factories.js:69-72. El repo ya
 * usaba config.delete.enabled=false en cars-evidence; aqui se cierran las
 * cinco.
 */
const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::delivery-profile.delivery-profile', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
