module.exports = {
  routes: [
    {
      method: "POST",
      path: "/checkout",
      handler: "checkout.createSession",
      config: {
        auth: false, // Puedes poner true más adelante si haces verificación
      },
    },
  ],
};
