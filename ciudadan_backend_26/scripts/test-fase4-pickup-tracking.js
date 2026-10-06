/**
 * Prueba funcional FASE 4 — pickup, tracking comprador, webhook.
 *
 * Uso:
 *   DATABASE_CLIENT=sqlite DATABASE_FILENAME=.tmp/fase4-test.db node scripts/test-fase4-pickup-tracking.js
 */
'use strict';

process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
process.env.DATABASE_FILENAME = process.env.DATABASE_FILENAME || '.tmp/fase4-test.db';
process.env.PORT = process.env.PORT || '1350';

const fs = require('fs');
const mark = (m) => fs.appendFileSync('.tmp/fase4-progress.log', m + '\n');

// --- Stub Skydropx ---
const skydropxService = require('../src/api/skydropx/services/skydropx.js');

skydropxService.createPickup = async (payload) => {
  mark('STUB createPickup: ' + JSON.stringify(payload));
  return {
    data: {
      id: 'pickup_fake_1',
      attributes: {
        status: 'requested',
        scheduled_at: payload.date + 'T' + payload.time_from + ':00',
      },
    },
  };
};

skydropxService.getShipment = async (id) => ({
  data: {
    id,
    attributes: {
      workflow_status: 'in_transit',
      carrier_name: 'Estafeta',
      master_tracking_number: 'MASTER-F4',
    },
  },
  included: [
    {
      type: 'package',
      id: 'pkg_f4_1',
      attributes: {
        tracking_number: 'TRK-F4-1',
        tracking_url_provider: 'https://track.example/TRK-F4-1',
        label_url: 'https://labels.example/TRK-F4-1.pdf',
        tracking_status: 'in_transit',
      },
    },
  ],
});

// Capturar stack completo de errores
process.on('uncaughtException', (e) => {
  fs.writeFileSync('.tmp/fase4-error.log', 'UNCAUGHT: ' + (e?.stack ?? e));
  process.exit(2);
});
process.on('unhandledRejection', (e) => {
  fs.writeFileSync('.tmp/fase4-error.log', 'REJECTION: ' + (e?.stack ?? e));
  process.exit(3);
});

const Strapi = require('@strapi/strapi');

async function main() {
  mark('inicio');
  const app = Strapi();
  mark('Strapi() ok');
  await app.load();
  mark('load ok');

  // Stub balance
  const balanceService = strapi.service('api::logistics-balance.logistics-balance');
  balanceService.reserveShipmentBalance = async () => ({ transactionId: 'tx-f4' });
  balanceService.commitShipmentCharge = async () => ({});
  balanceService.releaseShipmentReservation = async () => ({});
  balanceService.refundShipmentCharge = async () => ({});

  await app.start();
  mark('start ok');

  const SHIPMENT_UID = 'api::shipment.shipment';
  const PEDIDO_UID = 'api::pedido.pedido';

  // --- Seed ---
  const usuario = await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: 'comprador-f4', email: 'comprador-f4@test.com', provider: 'local', confirmed: true },
  });

  const dirOrigen = await strapi.entityService.create('api::direccion.direccion', {
    data: { cp: '06600', estado: 'CDMX', ciudad: 'CDMX', colonia: 'Juárez', route: 'Calle O', numero: '1' },
  });

  const dirDestino = await strapi.entityService.create('api::direccion.direccion', {
    data: { cp: '44100', estado: 'Jalisco', ciudad: 'Guadalajara', colonia: 'Centro', route: 'Calle D', numero: '2', usuario_email: usuario.email },
  });

  const store = await strapi.entityService.create('api::store.store', {
    data: { name: 'Tienda F4', email: 'tienda-f4@test.com', slug: 'tienda-f4', direccion: dirOrigen.id, publishedAt: new Date().toISOString() },
  });

  const producto = await strapi.entityService.create('api::producto.producto', {
    data: { nombre: 'Prod F4', precio: 100, activo: true, largo: 10, ancho: 10, alto: 10, peso: 1, store: store.id, publishedAt: new Date().toISOString() },
  });

  const pedido = await strapi.entityService.create(PEDIDO_UID, {
    data: {
      tipo: 'tienda', timestamp_creacion: new Date().toISOString(), status: 'pendiente_envio',
      monto_subtotal: 100, monto_envio: 150, monto_total: 250,
      store: store.id, store_email: store.email, usuario: usuario.id,
      direccion_origen: dirOrigen.id, direccion_destino: dirDestino.id,
      skydropx_quotation_id: 'quot_f4', skydropx_rate_id: 'rate_f4',
      skydropx_rate: { id: 'rate_f4', provider_display_name: 'Estafeta', total: '150.00', currency_code: 'MXN' },
      delivery_contact_information: { name: 'Test', phone: '5500000001' },
      pickup_contact_information: { name: 'Tienda', phone: '5500000002' },
      item: [{ producto: producto.id, nombre: 'Prod F4', cantidad: 1, precio_unitario: 100, subtotal: 100 }],
      publishedAt: new Date().toISOString(),
    },
  });

  // Shipment con provider_shipment_id (simula que ya fue creado en Skydropx)
  const shipment = await strapi.entityService.create(SHIPMENT_UID, {
    data: {
      pedido: pedido.id, provider: 'skydropx', provider_shipment_id: 'ship_f4',
      master_tracking_number: 'MASTER-F4', carrier_name: 'Estafeta', status: 'ready',
      total: 150, currency_code: 'MXN',
    },
  });

  const pkg = await strapi.entityService.create('api::shipment-package.shipment-package', {
    data: {
      shipment: shipment.id, package_number: '1',
      length: 20, width: 15, height: 10, weight: 1.5,
      declared_value: 100, package_protected: false,
      provider_package_id: 'pkg_f4_1',
      tracking_number: 'TRK-F4-1', tracking_url: 'https://track.example/TRK-F4-1',
      label_url: 'https://labels.example/TRK-F4-1.pdf', status: 'labeled',
    },
  });

  await strapi.entityService.create('api::shipment-package-item.shipment-package-item', {
    data: { shipment_package: pkg.id, producto: producto.id, quantity: 1, nombre: 'Prod F4', precio_unitario: 100 },
  });

  mark('seed ok pedido=' + pedido.id);

  const checks = [];
  const base = `http://127.0.0.1:${process.env.PORT}`;

  // --- 1. Tracking del comprador ---
  const trackRes = await fetch(`${base}/api/pedidos/${pedido.id}/tracking`);
  const trackBody = await trackRes.json();
  checks.push(['tracking 200', trackRes.status === 200]);
  checks.push(['tracking tiene shipment', trackBody?.shipment?.id === shipment.id]);
  checks.push(['tracking master', trackBody?.shipment?.master_tracking_number === 'MASTER-F4']);
  checks.push(['tracking 1 paquete', trackBody?.packages?.length === 1]);
  checks.push(['tracking pkg tracking_number', trackBody?.packages?.[0]?.tracking_number === 'TRK-F4-1']);
  checks.push(['tracking pkg items', trackBody?.packages?.[0]?.items?.length === 1]);

  // --- 2. Solicitar pickup ---
  const pickupRes = await fetch(`${base}/api/skydropx/shipment/ship_f4/pickup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-10-02', time_from: '09:00', time_to: '18:00', instructions: 'Llamar al llegar' }),
  });
  const pickupBody = await pickupRes.json();
  checks.push(['pickup 201', pickupRes.status === 201]);
  checks.push(['pickup provider_pickup_id', pickupBody?.pickup?.provider_pickup_id === 'pickup_fake_1']);

  // Verificar persistencia
  const shipmentDb = await strapi.entityService.findOne(SHIPMENT_UID, shipment.id);
  checks.push(['shipment pickup_status requested', shipmentDb.pickup_status === 'requested']);
  checks.push(['shipment provider_pickup_id', shipmentDb.provider_pickup_id === 'pickup_fake_1']);
  checks.push(['shipment pickup_requested_at', Boolean(shipmentDb.pickup_requested_at)]);

  // --- 3. Pickup idempotente (segundo intento) ---
  const pickupRes2 = await fetch(`${base}/api/skydropx/shipment/ship_f4/pickup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-10-03', time_from: '09:00', time_to: '18:00' }),
  });
  const pickupBody2 = await pickupRes2.json();
  checks.push(['pickup duplicado 200', pickupRes2.status === 200]);
  checks.push(['pickup duplicado flag', pickupBody2?.duplicated === true]);

  // --- 4. Webhook con envío conocido ---
  const webhookRes = await fetch(`${base}/api/skydropx/shipment/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { id: 'ship_f4', attributes: { shipment_id: 'ship_f4' } } }),
  });
  const webhookBody = await webhookRes.json();
  checks.push(['webhook 200', webhookRes.status === 200]);
  checks.push(['webhook procesado', webhookBody?.success === true]);

  // --- 5. Webhook con envío desconocido (no debe fallar) ---
  const webhookRes2 = await fetch(`${base}/api/skydropx/shipment/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { id: 'ship_desconocido' } }),
  });
  checks.push(['webhook desconocido 200', webhookRes2.status === 200]);

  // --- 6. Webhook sin shipment_id ---
  const webhookRes3 = await fetch(`${base}/api/skydropx/shipment/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  checks.push(['webhook sin id 200', webhookRes3.status === 200]);

  let fallidos = 0;
  for (const [nombre, ok] of checks) {
    console.log(`${ok ? '✔' : '✘'} ${nombre}`);
    if (!ok) fallidos++;
  }

  await app.destroy();

  if (fallidos > 0) {
    console.error(`\n❌ ${fallidos} verificaciones fallaron`);
    process.exit(1);
  }

  console.log('\n✅ FASE 4: todas las verificaciones pasaron');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error en prueba FASE 4:', err);
  process.exit(1);
});
