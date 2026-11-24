'use strict';

/**
 * Mercado Pago Service
 *
 * Servicio compartido para integración con Mercado Pago.
 * Usado por: driver-membership, state-partner, leader
 *
 * Funcionalidades:
 * - Crear preferencias de pago (checkout único)
 * - Crear suscripciones recurrentes (preapproval)
 * - Manejar webhooks (pagos y suscripciones)
 * - Cancelar suscripciones
 * - Obtener información de pagos/suscripciones
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::mercado-pago.mercado-pago', ({ strapi }) => ({

  /**
   * Obtiene el access token de Mercado Pago
   */
  getAccessToken() {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN no configurado en variables de entorno');
    }
    return accessToken;
  },

  /**
   * Headers estándar para requests a MP
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAccessToken()}`,
      'Content-Type': 'application/json',
    };
  },

  /**
   * Crea una preferencia de pago (checkout único)
   * @param {Object} params
   * @param {string} params.externalReference - Referencia externa (ID de membership, state-partner, leader)
   * @param {string} params.title - Título del item
   * @param {string} params.description - Descripción
   * @param {number} params.amount - Monto en MXN
   * @param {string} params.payerEmail - Email del pagador
   * @param {string} params.backUrl - URL base del frontend
   * @param {string} params.notificationUrl - URL del webhook
   * @param {string} params.purpose - Propósito: 'membership', 'state_partner_entry', 'leader_kit'
   * @param {Object} params.metadata - Metadatos adicionales
   */
  async createPreference(params) {
    const {
      externalReference,
      title,
      description,
      amount,
      payerEmail,
      backUrl,
      notificationUrl,
      purpose,
      metadata = {},
    } = params;

    const preferenceData = {
      items: [{
        id: externalReference,
        title,
        description,
        quantity: 1,
        unit_price: Number(amount),
        currency_id: 'MXN',
      }],
      payer: { email: payerEmail },
      back_urls: {
        success: `${backUrl}/${purpose}/success`,
        failure: `${backUrl}/${purpose}/failure`,
        pending: `${backUrl}/${purpose}/pending`,
      },
      auto_return: 'approved',
      external_reference: externalReference,
      notification_url: notificationUrl,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        purpose,
        ...metadata,
      },
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error creando preferencia MP: ${text}`);
    }

    return await response.json();
  },

  /**
   * Crea una suscripción recurrente (preapproval)
   * @param {Object} params
   * @param {string} params.externalReference - Referencia externa
   * @param {string} params.reason - Descripción de la suscripción
   * @param {string} params.payerEmail - Email del pagador
   * @param {string} params.cardToken - Token de tarjeta guardada en MP
   * @param {number} params.amount - Monto mensual en MXN
   * @param {string} params.startDate - Fecha de inicio (ISO string)
   * @param {string} params.endDate - Fecha de fin (ISO string, opcional)
   * @param {string} params.backUrl - URL de retorno
   * @param {string} params.notificationUrl - URL del webhook
   * @param {string} params.purpose - Propósito: 'membership', 'state_partner_entry'
   */
  async createPreapproval(params) {
    const {
      externalReference,
      reason,
      payerEmail,
      cardToken,
      amount,
      startDate,
      endDate,
      backUrl,
      notificationUrl,
      purpose,
    } = params;

    const preapprovalData = {
      reason,
      external_reference: externalReference,
      payer_email: payerEmail,
      card_token_id: cardToken,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Number(amount),
        currency_id: 'MXN',
        start_date: startDate,
        end_date: endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 año por defecto
      },
      back_url: `${backUrl}/${purpose}/success`,
      notification_url: notificationUrl,
    };

    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(preapprovalData),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error creando preapproval MP: ${text}`);
    }

    return await response.json();
  },

  /**
   * Cancela una suscripción (preapproval)
   */
  async cancelPreapproval(preapprovalId) {
    const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      strapi.log.error('Error cancelando preapproval MP:', text);
      return false;
    }

    return true;
  },

  /**
   * Obtiene información de un pago
   */
  async getPayment(paymentId) {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  },

  /**
   * Obtiene información de una suscripción (preapproval)
   */
  async getPreapproval(preapprovalId) {
    const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  },

  /**
   * Obtiene información de un cliente
   */
  async getCustomer(customerId) {
    const response = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  },

  /**
   * Busca pagos por referencia externa
   */
  async searchPaymentsByExternalReference(externalReference) {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/search?external_reference=${externalReference}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      return { results: [] };
    }

    return await response.json();
  },

  /**
   * Busca suscripciones por referencia externa
   */
  async searchPreapprovalsByExternalReference(externalReference) {
    const response = await fetch(
      `https://api.mercadopago.com/preapproval/search?external_reference=${externalReference}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      return { results: [] };
    }

    return await response.json();
  },

  /**
   * Valida la firma del webhook de Mercado Pago según docs oficiales
   * @see https://www.mercadopago.com.mx/developers/es/docs/checkout-api/additional-content/your-integrations/webhooks
   * @param {Object} ctx - Contexto de Koa con headers y body
   * @param {Object} payload - Payload del webhook (debe contener data.id)
   * @returns {boolean} true si la firma es válida
   */
  validateWebhookSignature(ctx, payload) {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (!secret) {
      // En producción, fallar cerrado si no hay secreto
      if (process.env.NODE_ENV === 'production') {
        strapi.log.error('MERCADO_PAGO_WEBHOOK_SECRET no configurado en producción - rechazando webhook');
        return false;
      }
      strapi.log.warn('MERCADO_PAGO_WEBHOOK_SECRET no configurado, saltando validación de firma (desarrollo)');
      return true;
    }

    const signature = ctx.request.header['x-signature'];
    const requestId = ctx.request.header['x-request-id'];

    if (!signature || !requestId) {
      strapi.log.warn('Webhook MP sin headers de firma (x-signature, x-request-id)');
      return false;
    }

    // Extraer timestamp y hash de la firma
    // Formato: ts=1234567890,v1=a1b2c3d4...
    const parts = signature.split(',');
    let ts = null, v1 = null;
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') v1 = value;
    }

    if (!ts || !v1) {
      strapi.log.warn('Formato de firma MP inválido (falta ts o v1)');
      return false;
    }

    // Verificar que el timestamp no sea muy antiguo (5 min)
    const now = Math.floor(Date.now() / 1000);
    const tsInt = parseInt(ts, 10);
    if (isNaN(tsInt) || Math.abs(now - tsInt) > 300) {
      strapi.log.warn('Timestamp de webhook MP fuera de rango o inválido', { now, ts: tsInt, diff: Math.abs(now - tsInt) });
      return false;
    }

    // Obtener data.id del payload (requerido por MP docs)
    const dataId = payload?.data?.id;
    if (!dataId) {
      strapi.log.warn('Webhook MP sin data.id en payload');
      return false;
    }

    // Construir manifest según docs oficiales: id:{data.id};request-id:{x-request-id};ts:{ts};
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const crypto = require('crypto');
    const expectedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    // Comparar hashes (timing-safe)
    const providedHash = Buffer.from(v1, 'utf8');
    const expectedHashBuf = Buffer.from(expectedHash, 'utf8');

    if (providedHash.length !== expectedHashBuf.length ||
        !crypto.timingSafeEqual(providedHash, expectedHashBuf)) {
      strapi.log.warn('Firma de webhook MP inválida', { dataId, requestId, ts });
      return false;
    }

    return true;
  },

  /**
   * Procesa webhook de Mercado Pago con validación de firma
   * @param {Object} ctx - Contexto de Koa
   * @param {Object} payload - Payload del webhook (requerido para validación)
   * @returns {Object} Resultado del procesamiento
   */
  async handleWebhook(ctx, payload) {
    // Validar firma con payload (requerido para data.id)
    if (ctx && !this.validateWebhookSignature(ctx, payload)) {
      return { ok: false, error: 'Firma inválida' };
    }

    const { type, data } = payload;

    if (!type || !data?.id) {
      strapi.log.warn('Webhook MP sin type o data.id', { type, data });
      return { ok: false, error: 'Payload inválido' };
    }

    switch (type) {
      case 'payment':
        return this.handlePaymentWebhook(data.id);
      case 'preapproval':
        return this.handlePreapprovalWebhook(data.id);
      case 'merchant_order':
        return this.handleMerchantOrderWebhook(data.id);
      default:
        strapi.log.info(`Webhook MP no manejado: ${type}`);
        return { ok: true, ignored: true };
    }
  },

  /**
   * Maneja webhook de pago
   */
  async handlePaymentWebhook(paymentId) {
    const payment = await this.getPayment(paymentId);
    if (!payment) {
      return { ok: false, error: 'Pago no encontrado' };
    }

    const externalReference = payment.external_reference;

    if (payment.status === 'approved') {
      return {
        ok: true,
        type: 'payment_approved',
        externalReference,
        amount: payment.transaction_amount,
        paymentId: payment.id,
        payerEmail: payment.payer?.email,
        paymentMethod: payment.payment_method_id,
        paymentType: payment.payment_type_id,
      };
    } else if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(payment.status)) {
      return {
        ok: true,
        type: 'payment_failed',
        externalReference,
        status: payment.status,
        paymentId: payment.id,
      };
    }

    return { ok: true, type: 'payment_pending', externalReference, status: payment.status };
  },

  /**
   * Maneja webhook de suscripción (preapproval)
   */
  async handlePreapprovalWebhook(preapprovalId) {
    const preapproval = await this.getPreapproval(preapprovalId);
    if (!preapproval) {
      return { ok: false, error: 'Suscripción no encontrada' };
    }

    const externalReference = preapproval.external_reference;

    // Estados: pending, authorized, cancelled, paused
    let type = 'preapproval_update';
    if (preapproval.status === 'authorized') type = 'preapproval_authorized';
    else if (preapproval.status === 'cancelled') type = 'preapproval_cancelled';
    else if (preapproval.status === 'paused') type = 'preapproval_paused';

    return {
      ok: true,
      type,
      externalReference,
      preapprovalId: preapproval.id,
      status: preapproval.status,
      payerId: preapproval.payer_id,
      nextPaymentDate: preapproval.next_payment_date,
    };
  },

  /**
   * Maneja webhook de orden de comerciante
   */
  async handleMerchantOrderWebhook(merchantOrderId) {
    // Para casos donde se necesite validar la orden completa
    const response = await fetch(`https://api.mercadopago.com/merchant_orders/${merchantOrderId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      return { ok: false };
    }

    const order = await response.json();
    return { ok: true, order };
  },

  /**
   * Crea preferencia para membresía de conductor
   */
  async createMembershipPreference(membership, payerEmail, backUrl) {
    const isFirstPayment = membership.activation_mode === 'pay_now' || membership.status === 'pending';

    return this.createPreference({
      externalReference: membership.id,
      title: `Membresía Ciudadan Taxi - ${membership.plan === 'promo' ? 'Promo $300' : 'Normal $500'}`,
      description: `Membresía mensual para conductor${isFirstPayment ? ' (primer pago)' : ' (renovación)'}`,
      amount: membership.price_mxn,
      payerEmail,
      backUrl,
      notificationUrl: `${process.env.STRAPI_URL}/api/driver-membership/webhook/mercadopago`,
      purpose: 'membership',
      metadata: {
        membershipId: membership.id,
        plan: membership.plan,
        activationMode: membership.activation_mode,
        driverId: membership.driver?.id,
      },
    });
  },

  /**
   * Crea preapproval para membresía de conductor
   */
  async createMembershipPreapproval(membership, payerEmail, cardToken, backUrl) {
    return this.createPreapproval({
      externalReference: membership.id,
      reason: `Membresía Ciudadan Taxi - ${membership.plan === 'promo' ? 'Promo $300' : 'Normal $500'}`,
      payerEmail,
      cardToken,
      amount: membership.price_mxn,
      startDate: membership.next_payment_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      backUrl,
      notificationUrl: `${process.env.STRAPI_URL}/api/driver-membership/webhook/mercadopago`,
      purpose: 'membership',
    });
  },

  /**
   * Crea preferencia para cuota de ingreso de Socio Estatal (con MSI opcional)
   */
  async createStatePartnerEntryFeePreference(statePartner, payerEmail, backUrl) {
    const msiMonths = statePartner.entry_fee_msi_months || 0;

    const preferenceData = {
      items: [{
        id: statePartner.id,
        title: `Cuota de ingreso Socio Estatal - ${statePartner.state}`,
        description: `Cuota de ingreso para Socio Estatal de ${statePartner.state} (${msiMonths > 0 ? `${msiMonths} MSI` : 'pago único'})`,
        quantity: 1,
        unit_price: Number(statePartner.entry_fee_mxn),
        currency_id: 'MXN',
      }],
      payer: { email: payerEmail },
      back_urls: {
        success: `${backUrl}/state-partner/entry-fee/success`,
        failure: `${backUrl}/state-partner/entry-fee/failure`,
        pending: `${backUrl}/state-partner/entry-fee/pending`,
      },
      auto_return: 'approved',
      external_reference: statePartner.id,
      notification_url: `${process.env.STRAPI_URL}/api/state-partner/webhook/mercadopago`,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        purpose: 'state_partner_entry',
        statePartnerId: statePartner.id,
        state: statePartner.state,
        msiMonths: msiMonths,
      },
    };

    // Agregar configuración de MSI si aplica
    if (msiMonths > 0) {
      preferenceData.payment_methods = {
        default_installments: msiMonths,
        // Excluir tipos de pago que no soportan MSI (ej. ticket, atm, etc.)
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'atm' },
          { id: 'bank_transfer' },
        ],
        // Solo permitir tarjetas de crédito/débito para MSI
        // installments: msiMonths, // También se puede especificar aquí
      };
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Error creando preferencia MP: ${text}`);
    }

    return await response.json();
  },

  /**
   * Crea preapproval para cuota de ingreso con MSI
   */
  async createStatePartnerEntryFeePreapproval(statePartner, payerEmail, cardToken, backUrl) {
    // Solo si tiene MSI
    if (!statePartner.entry_fee_msi_months || statePartner.entry_fee_msi_months <= 0) {
      throw new Error('No hay MSI configurado para esta cuota');
    }

    // Para MSI, creamos una preapproval con la cantidad de meses
    // Nota: MP maneja MSI diferente, esto es para pagos recurrentes
    // Para MSI real se usa preference con payment_methods.excluded_payment_types
    return this.createPreapproval({
      externalReference: statePartner.id,
      reason: `Cuota de ingreso Socio Estatal - ${statePartner.state} (${statePartner.entry_fee_msi_months} MSI)`,
      payerEmail,
      cardToken,
      amount: statePartner.entry_fee_mxn / statePartner.entry_fee_msi_months, // Monto mensual
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + statePartner.entry_fee_msi_months * 30 * 24 * 60 * 60 * 1000).toISOString(),
      backUrl,
      notificationUrl: `${process.env.STRAPI_URL}/api/state-partner/webhook/mercadopago`,
      purpose: 'state_partner_entry',
    });
  },

  /**
   * Crea preferencia para compra de kit de líder
   */
  async createLeaderKitPreference(leader, kitPrice, shippingFee, payerEmail, backUrl) {
    const totalAmount = kitPrice + shippingFee;

    return this.createPreference({
      externalReference: leader.id,
      title: `Kit 5000 tarjetas QR - Líder ${leader.full_name}`,
      description: `Kit de 5000 tarjetas físicas QR personalizadas + envío a ${leader.city}, ${leader.state}`,
      amount: totalAmount,
      payerEmail,
      backUrl,
      notificationUrl: `${process.env.STRAPI_URL}/api/leader/webhook/mercadopago`,
      purpose: 'leader_kit',
      metadata: {
        leaderId: leader.id,
        kitPrice,
        shippingFee,
        totalAmount,
        city: leader.city,
        state: leader.state,
      },
    });
  },

}));