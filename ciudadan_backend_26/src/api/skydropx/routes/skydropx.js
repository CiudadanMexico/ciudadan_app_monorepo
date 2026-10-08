"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/skydropx/test-auth",
      handler: "skydropx.testAuth",
      config: {
        auth: false,
        policies: ['global::try-auth0-user'],
      },
    },
    // Consultar catalogo de carta portes
    {
      method: "GET",
      path: "/skydropx/consignment-notes",
      handler: "skydropx.getConsignmentNotes",
      config: {
        auth: false,
      },
    },
    // Consultar catalogo de tipos de empaque
    {
      method: "GET",
      path: "/skydropx/packagings",
      handler: "skydropx.getPackagings",
      config: {
        auth: false,
      },
    },
    // Consultar catalogo de puntos de oficina
    {
      method: "GET",
      path: "/skydropx/office-points",
      handler: "skydropx.getOfficePoints",
      config: {
        auth: false,
      },
    },
    // Crear una cotización
    {
      method: "POST",
      path: "/skydropx/quotation",
      handler: "skydropx.createQuotation",
      config: {
        auth: false,
        policies: ['global::try-auth0-user']
      },
    },
    // Consultar datos de una cotización
    {
      method: "GET",
      path: "/skydropx/quotation/:id",
      handler: "skydropx.getQuotation",
      config: {
        auth: false,
        policies: ['global::try-auth0-user']
      },
    },
    // Crear envío
    {
      method: "POST",
      path: "/skydropx/shipment",
      handler: "skydropx.createShipment",
      config: {
        auth: false,
        policies: ['global::try-auth0-user']
      },
    },
    // Consultar datos de un envío
    {
      method: "GET",
      path: "/skydropx/shipment/:id",
      handler: "skydropx.getShipment",
      config: {
        auth: false,
        policies: ['global::try-auth0-user']
      },
    },
    // Solicitar recolección (pickup) de un envío
    {
      method: "POST",
      path: "/skydropx/shipment/:id/pickup",
      handler: "skydropx.requestPickup",
      config: {
        auth: false,
        policies: ['global::try-auth0-user'],
      },
    },
    // Webhook de Skydropx (sin auth; se valida con SKYDROPX_WEBHOOK_SECRET)
    {
      method: "POST",
      path: "/skydropx/shipment/webhook",
      handler: "skydropx.shipmentWebhook",
      config: {
        auth: false,
      },
    },
  ],
};