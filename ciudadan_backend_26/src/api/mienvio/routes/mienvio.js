module.exports = {
  routes: [
    {
      method: "GET",
      path: "/mienvio/connect",
      handler: "mienvio.connect",
      config: {
        policies: [],
        auth: false // cámbialo si quieres proteger con JWT
      }
    }
  ]
};
