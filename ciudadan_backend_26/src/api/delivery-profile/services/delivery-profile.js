'use strict';

/**
 * delivery-profile service
 *
 * Stock: la logica de negocio del expediente repartidor vive en
 * api::delivery-registration/services/ (maquina de estados, requisitos,
 * concesion de rol, bitacora).
 */
const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::delivery-profile.delivery-profile');
