// ciudadan-backend/market/plugins/stripe/stripe.plugin.ts
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { stripePaymentMethodHandler } from './stripe.handler.ts';



@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [],
})
export class StripePlugin {}
