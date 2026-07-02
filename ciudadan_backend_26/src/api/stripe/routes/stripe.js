module.exports = {
  routes: [
    {
      method: "POST",
      path: "/stripe/onboarding-link",
      handler: "stripe.onboardingLink",
      config: { auth: false, policies: [] },
    },
    {
      method: "POST",
      path: "/stripe/webhook",
      handler: "stripe.webhook",
      config: {
        auth: false,
        policies: [],
        middlewares: ["global::raw-body"],
      },
    },
    {
      method: "POST",
      path: "/checkout",
      handler: "stripe.createCheckout",
      config: { auth: false, policies: [] },
    },
    {
      method: "POST",
      path: "/stripe/create-session",
      handler: "stripe.createSession",
      config: { auth: false, policies: [] },
    },
  ],
};
