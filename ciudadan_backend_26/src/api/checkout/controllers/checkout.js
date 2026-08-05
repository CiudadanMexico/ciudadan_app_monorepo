"use strict";

// @ts-ignore
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const priceIdMap = {
  mensual: process.env.STRIPE_PRICE_ID_MENSUAL,
  semestral: process.env.STRIPE_PRICE_ID_SEMESTRAL,
  anual: process.env.STRIPE_PRICE_ID_ANUAL,
};

module.exports = {
  // @ts-ignore
  async createSession(ctx) {
    const { email, plan } = ctx.request.body;

    if (!email || !plan) {
      return ctx.badRequest("Faltan parámetros: email o plan");
    }

    // Ensure plan is a string before using it to index priceIdMap
    const planKey = typeof plan === "string" ? plan.toLowerCase() : "";
    // @ts-ignore
    const priceId = priceIdMap[planKey];
    if (!priceId) {
      return ctx.badRequest("Tipo de plan no válido");
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: process.env.STRIPE_SUCCESS_URL,
        cancel_url: process.env.STRIPE_CANCEL_URL,
      });

      return { url: session.url };
    } catch (err) {
      strapi.log.error("Error en Stripe:", err);
      return ctx.internalServerError("No se pudo crear la sesión");
    }
  },
};
