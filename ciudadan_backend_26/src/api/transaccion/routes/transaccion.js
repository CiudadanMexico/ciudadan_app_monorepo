'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/transaccion',
      handler: 'transaccion.find',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/transaccion/:id',
      handler: 'transaccion.findOne',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    // Provisional - ledger
    {
      method: 'POST',
      path: '/transaccion/pago-con-subsidio',
      handler: 'transaccion.pagoConSubsidio',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/transaccion/earn-laborys',
      handler: 'transaccion.earnLaborys',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/transaccion/direcciones',
      handler: 'transaccion.consultarDirecciones',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/transaccion/saldo',
      handler: 'transaccion.consultarSaldo',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/transaccion/verificar/:hash',
      handler: 'transaccion.verificar',
      config: { auth: false },
    },
    // Aliases cortos para frontend (sin /transaccion prefix repetido)
    {
      method: 'POST',
      path: '/pago-con-subsidio',
      handler: 'transaccion.pagoConSubsidio',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/earn-laborys',
      handler: 'transaccion.earnLaborys',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/direcciones',
      handler: 'transaccion.consultarDirecciones',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/saldo',
      handler: 'transaccion.consultarSaldo',
      config: { auth: false, policies: ['global::is-authenticated-auth0'] },
    },
    {
      method: 'GET',
      path: '/verificar/:hash',
      handler: 'transaccion.verificar',
      config: { auth: false },
    },
  ],
};
