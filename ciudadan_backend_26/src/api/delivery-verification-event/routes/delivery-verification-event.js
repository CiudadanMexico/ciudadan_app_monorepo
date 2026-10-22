'use strict';

/**
 * delivery-verification-event router
 *
 * CRUD core CERRADO: la bitacora es append-only y solo la escriben los
 * servicios de api::delivery-registration con actor y agencia verificados.
 * Nunca se expone al solicitante.
 */
const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::delivery-verification-event.delivery-verification-event', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
