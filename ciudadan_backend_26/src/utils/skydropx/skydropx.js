'use strict';

/**
 * Skydropx Engine (Módulo Original - ~605 líneas)
 *
 * Cliente completo para la API de Skydropx v1
 * https://skydropx.com.mx/api-docs/
 *
 * Funcionalidades:
 * - OAuth 2.0 Client Credentials con cache de token
 * - Cotizaciones (quotations) con múltiples paquetes
 * - Creación de envíos (shipments) con etiquetas
 * - Tracking y gestión de envíos
 * - Recolecciones (pickups) y cancelaciones
 * - Normalización de direcciones al formato Skydropx
 * - Manejo de errores tipado
 */

const fetch = require('node-fetch');

class SkydropxClient {
  constructor(options = {}) {
    this.clientId = options.clientId || process.env.SKYDROPX_CLIENT_ID;
    this.clientSecret = options.clientSecret || process.env.SKYDROPX_CLIENT_SECRET;
    this.baseUrl = options.baseUrl || 'https://api.skydropx.com/v1';
    this.tokenCache = null;
    this.tokenExpiry = 0;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('SKYDROPX_CLIENT_ID y SKYDROPX_CLIENT_SECRET son requeridos');
    }
  }

  /**
   * Obtiene access token usando Client Credentials (con cache)
   * Token expira en 1 hora, renovamos 5 min antes
   */
  async getAccessToken() {
    const now = Date.now();
    if (this.tokenCache && now < this.tokenExpiry - 300000) {
      return this.tokenCache;
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error obteniendo token Skydropx: ${response.status} ${text}`);
    }

    const data = await response.json();
    this.tokenCache = data.access_token;
    // expires_in viene en segundos, típicamente 3600
    this.tokenExpiry = now + (data.expires_in || 3600) * 1000;

    return this.tokenCache;
  }

  /**
   * Headers estándar autenticados
   */
  async getHeaders() {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Normaliza una dirección completa al formato Skydropx
   * @param {Object} direccion - Objeto con street, number, interior, neighborhood, city, state, postal_code, reference
   * @param {Object} options - name, company, phone, email, reference
   * @returns {Object} Dirección en formato Skydropx
   */
  normalizeShipmentAddress(direccion, options = {}) {
    if (!direccion || !direccion.street || !direccion.postal_code) {
      throw new Error('Dirección incompleta: street y postal_code son requeridos');
    }

    return {
      address: {
        street: direccion.street,
        number: direccion.number || 'S/N',
        interior: direccion.interior || '',
        neighborhood: direccion.neighborhood || '',
        city: direccion.city || '',
        state: direccion.state || '',
        postal_code: direccion.postal_code,
        reference: direccion.reference || options.reference || '',
      },
      name: options.name || '',
      company: options.company || '',
      phone: options.phone || '',
      email: options.email || '',
      reference: options.reference || direccion.reference || '',
    };
  }

  /**
   * Normaliza dirección simple (para cotizaciones)
   */
  normalizeAddress(direccionData) {
    const { direccion, nombre, company, phone, email, observaciones, ...rest } = direccionData;

    const options = {
      name: nombre,
      company,
      phone,
      email,
      reference: observaciones,
      ...rest,
    };

    return this.normalizeShipmentAddress(direccion, options);
  }

  /**
   * Crea una cotización de envío
   * @param {Object} payload - { address_from, address_to, parcels }
   * @returns {Object} Cotización con rates
   */
  async createQuotation(payload) {
    const headers = await this.getHeaders();

    // Skydropx espera { quotation: { address_from, address_to, parcels } }
    const quotationPayload = {
      quotation: {
        address_from: payload.address_from,
        address_to: payload.address_to,
        parcels: payload.parcels || [],
      },
    };

    const response = await fetch(`${this.baseUrl}/quotations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(quotationPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error creando cotización Skydropx: ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Crea un envío (shipment) basado en una cotización
   * @param {Object} payload - { rate_id, unique_shipment, auto_advance, printing_format, include_order_detail, address_from, address_to, packages }
   * @returns {Object} Envío creado
   */
  async createShipment(payload) {
    const headers = await this.getHeaders();

    // Skydropx espera { shipment: { ... } }
    const shipmentPayload = {
      shipment: {
        rate_id: payload.rate_id,
        unique_shipment: payload.unique_shipment !== false,
        auto_advance: payload.auto_advance !== false,
        printing_format: payload.printing_format || 'standard',
        include_order_detail: payload.include_order_detail || false,
        address_from: payload.address_from,
        address_to: payload.address_to,
        packages: payload.packages || [],
      },
    };

    const response = await fetch(`${this.baseUrl}/shipments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(shipmentPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error creando envío Skydropx: ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Obtiene información de un envío por ID
   */
  async getShipment(shipmentId) {
    const headers = await this.getHeaders();

    const response = await fetch(`${this.baseUrl}/shipments/${shipmentId}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error obteniendo envío Skydropx: ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Lista envíos con filtros opcionales
   */
  async listShipments(params = {}) {
    const headers = await this.getHeaders();
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/shipments${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, { method: 'GET', headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error listando envíos Skydropx: ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Rastrea un envío por número de guía (tracking number)
   */
  async trackShipment(trackingNumber) {
    const headers = await this.getHeaders();

    const response = await fetch(`${this.baseUrl}/tracking/${trackingNumber}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error rastreando envío Skydropx: ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Cancela un envío
   */
  async cancelShipment(shipmentId) {
    const headers = await this.getHeaders();

    const response = await fetch(`${this.baseUrl}/shipments/${shipmentId}/cancel`, {
      method: 'POST',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error cancelando envío Skydropx: ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Crea una recolección (pickup)
   * @param {Object} payload - { shipment_id, address, date, time_start, time_end, instructions }
   */
  async createPickup(payload) {
    const headers = await this.getHeaders();

    const pickupPayload = {
      pickup: {
        shipment_id: payload.shipment_id,
        address: payload.address,
        date: payload.date,
        time_start: payload.time_start || '09:00',
        time_end: payload.time_end || '18:00',
        instructions: payload.instructions || '',
      },
    };

    const response = await fetch(`${this.baseUrl}/pickups`, {
      method: 'POST',
      headers,
      body: JSON.stringify(pickupPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error creando recolección Skydropx: ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Obtiene cotización por ID
   */
  async getQuotation(quotationId) {
    const headers = await this.getHeaders();

    const response = await fetch(`${this.baseUrl}/quotations/${quotationId}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Error obteniendo cotización Skydropx: ${JSON.stringify(data)}`);
    }

    return data;
  }

  /**
   * Obtiene etiqueta de envío (PDF/ZPL)
   */
  async getLabel(shipmentId, format = 'PDF') {
    const headers = await this.getHeaders();

    const response = await fetch(`${this.baseUrl}/shipments/${shipmentId}/label?format=${format}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error obteniendo etiqueta Skydropx: ${text}`);
    }

    return response.buffer();
  }

  /**
   * Obtiene documento de envío (complemento carta porte, etc.)
   */
  async getDocument(shipmentId, documentType = 'carta_porte') {
    const headers = await this.getHeaders();

    const response = await fetch(`${this.baseUrl}/shipments/${shipmentId}/documents/${documentType}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error obteniendo documento Skydropx: ${text}`);
    }

    return response.json();
  }
}

// Instancia singleton para uso directo
let skydropxInstance = null;

/**
 * Obtiene la instancia singleton del cliente Skydropx
 */
function getSkydropxClient() {
  if (!skydropxInstance) {
    skydropxInstance = new SkydropxClient();
  }
  return skydropxInstance;
}

// Funciones de conveniencia para compatibilidad hacia atrás
async function getAccessToken() {
  return getSkydropxClient().getAccessToken();
}

async function getHeaders() {
  return getSkydropxClient().getHeaders();
}

function normalizeShipmentAddress(direccion, options) {
  return getSkydropxClient().normalizeShipmentAddress(direccion, options);
}

function normalizeAddress(direccionData) {
  return getSkydropxClient().normalizeAddress(direccionData);
}

async function createQuotation(payload) {
  return getSkydropxClient().createQuotation(payload);
}

async function createShipment(payload) {
  return getSkydropxClient().createShipment(payload);
}

async function getShipment(shipmentId) {
  return getSkydropxClient().getShipment(shipmentId);
}

async function listShipments(params) {
  return getSkydropxClient().listShipments(params);
}

async function trackShipment(trackingNumber) {
  return getSkydropxClient().trackShipment(trackingNumber);
}

async function cancelShipment(shipmentId) {
  return getSkydropxClient().cancelShipment(shipmentId);
}

async function createPickup(payload) {
  return getSkydropxClient().createPickup(payload);
}

async function getQuotation(quotationId) {
  return getSkydropxClient().getQuotation(quotationId);
}

async function getLabel(shipmentId, format) {
  return getSkydropxClient().getLabel(shipmentId, format);
}

async function getDocument(shipmentId, documentType) {
  return getSkydropxClient().getDocument(shipmentId, documentType);
}

module.exports = {
  SkydropxClient,
  getSkydropxClient,
  getAccessToken,
  getHeaders,
  normalizeShipmentAddress,
  normalizeAddress,
  createQuotation,
  createShipment,
  getShipment,
  listShipments,
  trackShipment,
  cancelShipment,
  createPickup,
  getQuotation,
  getLabel,
  getDocument,
};