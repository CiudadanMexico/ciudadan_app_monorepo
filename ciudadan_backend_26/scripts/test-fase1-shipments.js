/**
 * Prueba de humo FASE 1 — modelo logístico Marketplace.
 *
 * Verifica (contra sqlite temporal, sin tocar MySQL):
 * 1. Creación de ShippingQuote ligada a un pedido.
 * 2. Creación de Shipment ligado al pedido y a la quote.
 * 3. Un Shipment con N ShipmentPackages (3).
 * 4. ShipmentPackageItems con cantidades por producto.
 * 5. validatePackingAgainstOrder: acepta packing correcto y rechaza incorrecto.
 *
 * Uso:
 *   DATABASE_CLIENT=sqlite DATABASE_FILENAME=.tmp/fase1-test.db node scripts/test-fase1-shipments.js
 */
'use strict';

process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
process.env.DATABASE_FILENAME = process.env.DATABASE_FILENAME || '.tmp/fase1-test.db';

const Strapi = require('@strapi/strapi');

async function main() {
  const app = await Strapi().load();

  const PEDIDO = 'api::pedido.pedido';
  const QUOTE = 'api::shipping-quote.shipping-quote';
  const SHIPMENT = 'api::shipment.shipment';
  const PACKAGE = 'api::shipment-package.shipment-package';
  const PACKAGE_ITEM = 'api::shipment-package-item.shipment-package-item';

  // 1. Pedido mínimo
  const pedido = await strapi.entityService.create(PEDIDO, {
    data: {
      tipo: 'tienda',
      timestamp_creacion: new Date().toISOString(),
      status: 'pendiente_envio',
      monto_subtotal: 500,
      monto_envio: 150,
      monto_total: 650,
      publishedAt: new Date().toISOString(),
    },
  });
  console.log('✔ pedido creado:', pedido.id);

  // 2. ShippingQuote (snapshot de tarifa)
  const quote = await strapi.entityService.create(QUOTE, {
    data: {
      pedido: pedido.id,
      provider: 'skydropx',
      quotation_id: 'quot_test_123',
      rate_id: 'rate_test_456',
      carrier_name: 'Estafeta',
      provider_service_name: 'Terrestre',
      amount: 120,
      service_fee: 10,
      vat_fee: 20,
      total: 150,
      currency_code: 'MXN',
      delivery_days: 3,
      estimated_parcels: [{ length: 10, width: 10, height: 10, weight: 2 }],
      rate_snapshot: { id: 'rate_test_456', total: '150.00' },
      status: 'selected',
      selected_at: new Date().toISOString(),
    },
  });
  console.log('✔ shipping-quote creada:', quote.id);

  // 3. Shipment
  const shipment = await strapi.entityService.create(SHIPMENT, {
    data: {
      pedido: pedido.id,
      shipping_quote: quote.id,
      provider: 'skydropx',
      provider_shipment_id: 'ship_test_789',
      master_tracking_number: 'MASTER123',
      carrier_name: 'Estafeta',
      status: 'pending',
      total: 150,
      currency_code: 'MXN',
    },
  });
  console.log('✔ shipment creado:', shipment.id);

  // 4. Tres paquetes con contenido
  const packageIds = [];
  for (let i = 1; i <= 3; i++) {
    const pkg = await strapi.entityService.create(PACKAGE, {
      data: {
        shipment: shipment.id,
        package_number: String(i),
        length: 20 * i,
        width: 15,
        height: 10,
        weight: 1.5 * i,
        declared_value: 200,
        package_protected: i === 3,
        tracking_number: `TRK00${i}`,
        tracking_url: `https://track.example/TRK00${i}`,
        label_url: `https://labels.example/LBL00${i}.pdf`,
        status: 'pending',
      },
    });
    packageIds.push(pkg.id);

    await strapi.entityService.create(PACKAGE_ITEM, {
      data: {
        shipment_package: pkg.id,
        order_item_id: i,
        quantity: i,
        nombre: `Producto ${i}`,
        precio_unitario: 100,
      },
    });
  }
  console.log('✔ 3 paquetes + items creados:', packageIds);

  // 5. Leer shipment con paquetes e items poblados
  const full = await strapi.entityService.findOne(SHIPMENT, shipment.id, {
    populate: { packages: { populate: { items: true } }, pedido: true, shipping_quote: true },
  });

  console.log('✔ shipment.packages.length =', full.packages.length);
  console.log('✔ pedido vinculado =', full.pedido?.id === pedido.id);
  console.log('✔ quote vinculada =', full.shipping_quote?.id === quote.id);
  console.log('✔ items por paquete =', full.packages.map((p) => p.items.length));

  if (full.packages.length !== 3) throw new Error('Se esperaban 3 paquetes');

  // 6. Validación de packing
  const shipmentService = strapi.service(SHIPMENT);
  const orderItems = [
    { producto: 1, cantidad: 2 },
    { producto: 2, cantidad: 1 },
  ];

  shipmentService.validatePackingAgainstOrder(orderItems, [
    { items: [{ producto_id: 1, quantity: 2 }] },
    { items: [{ producto_id: 2, quantity: 1 }] },
  ]);
  console.log('✔ validatePackingAgainstOrder acepta packing correcto');

  let rechazo = false;
  try {
    shipmentService.validatePackingAgainstOrder(orderItems, [
      { items: [{ producto_id: 1, quantity: 1 }] },
      { items: [{ producto_id: 2, quantity: 1 }] },
    ]);
  } catch (e) {
    rechazo = true;
    console.log('✔ validatePackingAgainstOrder rechaza packing incorrecto:', e.message);
  }
  if (!rechazo) throw new Error('La validación debió rechazar el packing incorrecto');

  // Limpieza
  for (const id of packageIds) {
    await strapi.db.query(PACKAGE_ITEM).deleteMany({ where: { shipment_package: id } });
    await strapi.entityService.delete(PACKAGE, id);
  }
  await strapi.entityService.delete(SHIPMENT, shipment.id);
  await strapi.entityService.delete(QUOTE, quote.id);
  await strapi.entityService.delete(PEDIDO, pedido.id);
  console.log('✔ limpieza completada');

  await app.destroy();
  console.log('\n✅ FASE 1: todas las verificaciones pasaron');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error en prueba FASE 1:', err);
  process.exit(1);
});
