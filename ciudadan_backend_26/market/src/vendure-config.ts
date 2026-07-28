import { VendureConfig } from '@vendure/core';
import { DefaultSearchPlugin } from '@vendure/core';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { join } from 'path';
import { LanguageCode } from '@vendure/core';
import { StripePlugin } from '../plugins/stripe/stripe.plugin.ts';
import { stripePaymentMethodHandler } from '../plugins/stripe/stripe.handler.ts';


export const config: VendureConfig = {
  apiOptions: {
    port: 4000,
    adminApiPath: 'admin-api',
    shopApiPath: 'shop-api',
  },
  authOptions: {
    superadminCredentials: { identifier: 'admin', password: 'admin' },
    requireVerification: false,
  },
  dbConnectionOptions: {
    type: 'sqlite',
    synchronize: true,
    logging: false,
    database: join(__dirname, '../vendure.sqlite'),
  },
  paymentOptions: {
    paymentMethodHandlers: [stripePaymentMethodHandler],
    paymentMethodEligibilityCheckers: [],
  },
  plugins: [
    DefaultSearchPlugin.init({
      bufferUpdates: false,
      indexStockStatus: true,
    }),
    AdminUiPlugin.init({
      route: 'admin',
      port: 5001,
    }),
    StripePlugin,
  ],
  customFields: {
  Product: [
    {
      name: 'storeId',
      type: 'string',
      label: [{ languageCode: LanguageCode.es, value: 'ID de Tienda (Strapi)' }],
      nullable: true, // esto evita el error si no se asigna desde el panel
    },
  ],
},

};
