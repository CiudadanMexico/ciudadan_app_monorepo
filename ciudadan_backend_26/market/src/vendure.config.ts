import { DefaultSearchPlugin } from '@vendure/search-plugin';

export const config: VendureConfig = {
  // ...otras configuraciones
  plugins: [
    DefaultSearchPlugin.init({
      bufferUpdates: false, // o true si prefieres indexación en lotes
      indexStockStatus: true,
    }),
    // ...otros plugins
  ],
};
