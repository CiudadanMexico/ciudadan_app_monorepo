'use strict';

/**
 * delivery-risk-signal router
 *
 * CRUD core CERRADO: las senales solo las crea/resuelve el motor y la
 * bandeja federal de api::delivery-registration.
 */
const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::delivery-risk-signal.delivery-risk-signal', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
