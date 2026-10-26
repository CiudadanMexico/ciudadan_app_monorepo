'use strict';

/**
 * delivery-profile controller
 *
 * Stock: el CRUD core esta cerrado en routes/. Toda la logica vive en
 * api::delivery-registration (controladores de expediente/revisión) para
 * mantener en un solo lugar las transiciones y la autorización.
 */
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::delivery-profile.delivery-profile');
