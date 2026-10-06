'use strict';

const { createCoreService } = require('@strapi/strapi').factories;
const { DEFAULTS, normalizarConfig, configPublica, sePuedeReclamarPromocion, resolverPrecioMembresia } = require('../utils/precios');
const { descripcionApk } = require('../../driver-launch-lead/utils/apk');

const UID = 'api::driver-membership-config.driver-membership-config';
const CAMPOS = Object.keys(DEFAULTS);

module.exports = createCoreService(UID, ({ strapi }) => ({
  /** Lee el single type y lo normaliza. Si no existe el registro, devuelve defaults. */
  async getConfig() {
    try {
      const fila = await strapi.db.query(UID).findOne({ select: CAMPOS });
      return normalizarConfig(fila);
    } catch (error) {
      strapi.log.warn(`[driver-membership-config] Usando defaults (${error.message || error})`);
      return normalizarConfig(null);
    }
  },

  /** Payload público para la landing: precios, promo y datos del binario. */
  async getPublicConfig() {
    const config = await this.getConfig();
    return { ...configPublica(config), apk: descripcionApk(config.apk_version) };
  },

  /** ¿Se puede seguir otorgando la promoción? */
  async estadoPromocion() {
    return sePuedeReclamarPromocion(await this.getConfig());
  },

  /** Precio efectivo de un conductor. Fuente de verdad: el servidor. */
  async resolveDriverMembershipPrice(driver) {
    return resolverPrecioMembresia(driver, await this.getConfig());
  },

  /** Idempotente: crea la configuración inicial si todavía no existe registro. */
  async asegurarExiste() {
    const query = strapi.db.query(UID);
    const existente = await query.findOne({ select: ['id'] });
    if (existente) return existente;
    const creado = await query.create({ data: { ...DEFAULTS } });
    strapi.log.info('[driver-membership-config] Configuración inicial creada (500/300 MXN, 12 meses)');
    return creado;
  },
}));
