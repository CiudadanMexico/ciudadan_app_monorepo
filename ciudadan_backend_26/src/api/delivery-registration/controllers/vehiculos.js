'use strict';

module.exports = {
  async registrar(ctx) {
    const { registrarVehiculo } = require('../services/expediente-service');
    const vehicle = await registrarVehiculo({ user: ctx.state.strapiUser, body: ctx.request.body || {} });
    ctx.body = {
      ok: true,
      vehicle: { id: vehicle.id, type: vehicle.type, validation_status: vehicle.validation_status },
    };
  },
};
