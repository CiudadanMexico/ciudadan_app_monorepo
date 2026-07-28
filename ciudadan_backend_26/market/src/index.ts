import { bootstrap } from '@vendure/core';
import { config } from './vendure-config';

bootstrap(config).catch(err => {
  console.error('❌ Error al iniciar Vendure:');
  console.error(err);
});
