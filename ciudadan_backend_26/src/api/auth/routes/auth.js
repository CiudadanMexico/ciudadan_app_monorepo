module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth/auth0-login',
      handler: 'auth.auth0Login',
      config: {
        auth: false, // no requiere token para esta ruta
      },
    },
  ],
};
