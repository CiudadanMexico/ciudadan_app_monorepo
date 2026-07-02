module.exports = ({ env }) => ({
  "users-permissions": {
    config: {
      providers: {
        auth0: {
          clientId: env("AUT_CLIENT_ID"),
          clientSecret: env("AUT_CLIENT_SECRET"),
          redirectUri: "https://back.ciudadan.org/api/connect/auth0/callback"
        }
      }
    }
  }
});