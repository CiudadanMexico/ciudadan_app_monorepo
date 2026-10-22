'use strict';

/**
 * delivery-waitlist-entry router
 *
 * CRUD core CERRADO: el alta/baja solo por POST /delivery-registration/waitlist
 * (y /waitlist/unsubscribe) con consentimiento y dedup en el servicio.
 */
const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::delivery-waitlist-entry.delivery-waitlist-entry', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
