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
  ],
};