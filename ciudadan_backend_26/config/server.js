module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  dirs: {
    public: './public',
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  stripe: {
    secretKey: env('STRIPE_SECRET_KEY'),
    priceId: env('STRIPE_PRICE_ID'),
    successUrl: env('STRIPE_SUCCESS_URL'),
    cancelUrl: env('STRIPE_CANCEL_URL'),
  },
});

// touch 2026-07-25 18:36:39
