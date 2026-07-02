// ciudadan-backend/market/plugins/stripe/stripe.handler.ts
import {
  LanguageCode,
  PaymentMethodHandler,
  CreatePaymentResult,
  SettlePaymentResult,
} from '@vendure/core';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY!, {
  apiVersion: '2024-04-10',
});

export const stripePaymentMethodHandler = new PaymentMethodHandler({
  code: 'stripe',
  description: [{ languageCode: LanguageCode.es, value: 'Stripe' }],
  args: {
    apiKey: { type: 'string', required: true },
  },
  createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'mxn',
      metadata: {
        orderCode: order.code,
        channelToken: ctx.channel.token,
      },
    });

    return {
      amount,
      state: 'Authorized',
      transactionId: paymentIntent.id,
      metadata: {
        paymentIntentId: paymentIntent.id,
      },
    };
  },
  settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult> => {
    const intentId = payment.metadata?.paymentIntentId;
    if (!intentId) {
      throw new Error('No paymentIntentId in metadata');
    }

    await stripe.paymentIntents.confirm(intentId);
    return { success: true };
  },
});
