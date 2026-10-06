/**
 * Seed para prueba FASE 2 — crea store, productos y pedido con items
 * en la sqlite temporal. Imprime el PEDIDO_ID para las pruebas HTTP.
 *
 * Uso:
 *   DATABASE_CLIENT=sqlite DATABASE_FILENAME=.tmp/fase2-test.db node scripts/seed-fase2-test.js
 */
'use strict';

process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
process.env.DATABASE_FILENAME = process.env.DATABASE_FILENAME || '.tmp/fase2-test.db';

const Strapi = require('@strapi/strapi');

async function main() {
  await Strapi().load();

  const store = await strapi.entityService.create('api::store.store', {
    data: {
      name: 'Tienda Fase2',
      email: 'tienda-fase2@test.com',
      slug: 'tienda-fase2',
      publishedAt: new Date().toISOString(),
    },
  });

  const producto1 = await strapi.entityService.create('api::producto.producto', {
    data: {
      nombre: 'Producto A', precio: 100, activo: true,
      largo: 10, ancho: 10, alto: 10, peso: 1,
      store: store.id, publishedAt: new Date().toISOString(),
    },
  });

  const producto2 = await strapi.entityService.create('api::producto.producto', {
    data: {
      nombre: 'Producto B', precio: 200, activo: true,
      largo: 20, ancho: 15, alto: 5, peso: 2,
      store: store.id, publishedAt: new Date().toISOString(),
    },
  });

  const pedido = await strapi.entityService.create('api::pedido.pedido', {
    data: {
      tipo: 'tienda',
      timestamp_creacion: new Date().toISOString(),
      status: 'pendiente_envio',
      monto_subtotal: 400,
      monto_envio: 150,
      monto_total: 550,
      store: store.id,
      store_email: store.email,
      skydropx_quotation_id: 'quot_seed_1',
      skydropx_rate_id: 'rate_seed_1',
      skydropx_rate: {
        id: 'rate_seed_1',
        provider_display_name: 'Estafeta',
        provider_service_name: 'Terrestre',
        amount: '120.00', service_fee: '10.00', vat_fee: '20.00', total: '150.00',
        currency_code: 'MXN', days: 3,
        office_pickup: false, office_delivery: false, office_delivery_only: false,
      },
      item: [
        { producto: producto1.id, nombre: 'Producto A', cantidad: 2, precio_unitario: 100, subtotal: 200 },
        { producto: producto2.id, nombre: 'Producto B', cantidad: 1, precio_unitario: 200, subtotal: 200 },
      ],
      publishedAt: new Date().toISOString(),
    },
  });

  console.log(`SEED_OK store=${store.id} pedido=${pedido.id} productos=${producto1.id},${producto2.id}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('SEED_ERROR', err);
  process.exit(1);
});
