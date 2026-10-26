'use strict';

/**
 * delivery-vehicle router
 *
 * CRUD core CERRADO (ver comentario de routes/delivery-profile.js): el
 * vehiculo solo se registra/edita via api::delivery-registration con
 * validacion condicional por tipo (bici jamas exige placa/licencia; moto
 * exige licencia/seguro/tarjeta vigentes).
 */
const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::delivery-vehicle.delivery-vehicle', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
