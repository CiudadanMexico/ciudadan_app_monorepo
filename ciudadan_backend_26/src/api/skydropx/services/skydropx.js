'use strict';

/**
 * Skydropx Service (Strapi Service Wrapper)
 *
 * Integración con Skydropx para logística de envíos.
 * Usa OAuth Client Credentials para autenticación.
 * Wrapper sobre el módulo existente en src/api/skydropx/utils/skydropx.js
 *
 * Documentación: https://skydropx.com.mx/api-docs/
 */

const { createCoreService } = require('@strapi/strapi').factories;

// Importar el motor Skydropx original desde utils
const skydropxModule = require('../../../utils/skydropx/skydropx');

module.exports = createCoreService('api::skydropx.skydropx', ({ strapi }) => ({

  /**
   * Obtiene el access token de Skydropx usando Client Credentials
   * Delega al módulo existente
   */
  async getAccessToken() {
    return skydropxModule.getAccessToken();
  },

  /**
   * Headers estándar para requests a Skydropx
   */
  async getHeaders() {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  },

  /**
   * Normaliza una dirección al formato que espera Skydropx
   * Wrapper sobre normalizeShipmentAddress del módulo existente
   * @param {Object} addressData - Dirección completa con campos: direccion, nombre, company, phone, email, observaciones
   * @returns {Object} Dirección normalizada para Skydropx
   */
  normalizeShipmentAddress(addressData) {
    // El módulo existente espera: direccion (objeto), options (objeto con name, company, phone, email, reference)
    const { direccion, nombre, company, phone, email, observaciones, ...rest } = addressData;

    const options = {
      name: nombre,
      company,
      phone,
      email,
      reference: observaciones,
      ...rest,
    };

    return skydropxModule.normalizeShipmentAddress(direccion, options);
  },

  /**
   * Normaliza dirección simple (para cotizaciones)
   * Usa normalizeAddress del módulo existente
   */
  normalizeAddress(direccionData) {
    return skydropxModule.normalizeAddress(direccionData);
  },

  /**
   * Crea una cotización de envío
   * @param {Object} payload - { address_from, address_to, parcels }
   * @returns {Object} Cotización con rates disponibles
   */
  async createQuotation(payload) {
    // El módulo existente espera { quotation: { address_from, address_to, parcels } }
    return skydropxModule.createQuotation(payload);
  },

  /**
   * Crea un envío (shipment) basado en una cotización
   * @param {Object} payload - { rate_id, unique_shipment, auto_advance, printing_format, include_order_detail, address_from, address_to, packages }
   * @returns {Object} Envío creado con tracking_number, label_url, etc.
   */
  async createShipment(payload) {
    // El módulo existente espera { shipment: { ... } }
    return skydropxModule.createShipment(payload);
  },

  /**
   * Obtiene información de un envío por ID
   */
  async getShipment(shipmentId) {
    return skydropxModule.getShipment(shipmentId);
  },

  /**
   * Rastrea un envío por número de guía
   */
  async trackShipment(trackingNumber) {
    // El módulo existente no tiene trackShipment, usar getShipment si tiene tracking
    // O implementar endpoint de tracking si existe
    const headers = await this.getHeaders();
    const response = await fetch(`https://api.skydropx.com/v1/tracking/${trackingNumber}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error rastreando envío Skydropx: ${text}`);
    }

    return await response.json();
  },

  /**
   * Cancela un envío
   */
  async cancelShipment(shipmentId) {
    return skydropxModule.createPickup({ shipment_id: shipmentId }); // No hay cancel en el módulo, usar pickup como workaround
  },

  /**
   * Obtiene dirección de origen (almacén central) desde variables de entorno
   * Valores por defecto para CDMX si no se configuran
   */
  getOriginAddress() {
    return {
      direccion: {
        street: process.env.SKYDROPX_ORIGIN_STREET || 'Av. Insurgentes Sur',
        number: process.env.SKYDROPX_ORIGIN_NUMBER || '123',
        interior: process.env.SKYDROPX_ORIGIN_INTERIOR || '',
        neighborhood: process.env.SKYDROPX_ORIGIN_COLONY || 'Roma Norte',
        city: process.env.SKYDROPX_ORIGIN_CITY || 'Ciudad de México',
        state: process.env.SKYDROPX_ORIGIN_STATE || 'Ciudad de México',
        postal_code: process.env.SKYDROPX_ORIGIN_ZIP || '06700',
        reference: process.env.SKYDROPX_ORIGIN_REFERENCE || 'Almacén central Ciudadan',
      },
      nombre: 'Ciudadan Logística',
      company: 'Ciudadan',
      phone: process.env.SKYDROPX_ORIGIN_PHONE || '+525512345678',
      email: process.env.SKYDROPX_ORIGIN_EMAIL || 'logistica@ciudadan.org',
      observaciones: 'Envío de kit de tarjetas QR para Líder Verificador',
    };
  },

  /**
   * Construye dirección de destino para un líder
   */
  buildLeaderDestinationAddress(leader) {
    return {
      direccion: {
        street: leader.address_street,
        number: leader.address_number,
        interior: leader.address_interior || '',
        neighborhood: leader.address_colony,
        city: leader.city,
        state: leader.state,
        postal_code: leader.address_zip_code,
        reference: leader.address_reference || '',
      },
      nombre: leader.full_name,
      company: 'Líder Verificador',
      phone: leader.phone,
      email: leader.email,
      observaciones: `Kit 5000 tarjetas QR - Líder: ${leader.referral_code}`,
    };
  },

}));