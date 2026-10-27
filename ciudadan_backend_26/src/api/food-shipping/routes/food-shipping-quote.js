'use strict';

/**
 * food-shipping-quote router
 *
 * CRUD core CERRADO por completo (patrón delivery-profile / spec §7):
 * las cotizaciones solo se crean y consumen a través de api::food-shipping;
 * nada es escribible ni consultable por REST público (no se exponen
 * cotizaciones de otros usuarios ni se permite alterar importe/estado).
 */
const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::food-shipping.food-shipping-quote', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
