// src/api/shipping/routes/shipping.js

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/shipping/calcular',
      handler: 'shipping.calcular',
      config: {
        policies: [],
        auth: false, // o true si quieres protegerlo
      },
    },
  ],
};
