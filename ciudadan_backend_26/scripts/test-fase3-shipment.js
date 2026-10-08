/**
 * Prueba funcional FASE 3 — creación de envío Skydropx desde ShipmentPackages.
 *
 * - Levanta Strapi con sqlite temporal (no toca MySQL).
 * - Simula (stub) la API de Skydropx y el servicio de saldo logístico.
 * - Siembra: usuario, tienda, direcciones, productos, pedido (pendiente_envio)
 *   y un Shipment preparado con 2 ShipmentPackages + items.
 * - Ejecuta POST /api/skydropx/shipment y verifica:
 *   Shipment: provider_shipment_id, master_tracking_number, status, raw_response
 *   Packages: provider_package_id, tracking_number, tracking_url, label_url, status
 * - Ejecuta GET /api/skydropx/shipment/:id (sync) y verifica actualización.
 *
 * Uso:
 *   DATABASE_CLIENT=sqlite DATABASE_FILENAME=.tmp/fase3-test.db node scripts/test-fase3-shipment.js
 */
'use strict';

process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
process.env.DATABASE_FILENAME = process.env.DATABASE_FILENAME || '.tmp/fase3-test.db';
process.env.PORT = process.env.PORT || '1349';

require('fs').appendFileSync('.tmp/fase3-progress.log', 'inicio script\n');

// --- Stub de la API Skydropx ANTES de cargar Strapi ---
const skydropxService = require('../src/api/skydropx/services/skydropx.js');

const FAKE_SHIPMENT_ID = 'ship_fake_fase3';

skydropxService.createShipment = async (payload) => {
  console.log('STUB createShipment packages:', JSON.stringify(payload.packages));
  return {
    data: {
      id: FAKE_SHIPMENT_ID,
      attributes: {
        workflow_status: 'created',
        carrier_name: 'Estafeta',
        master_tracking_number: 'MASTER-FASE3',
        payment_status: 'paid',
        total: '150.00',
      },
    },
    included: [
      {
        type: 'package',
        id: 'pkg_fake_1',
        attributes: {
          tracking_number: 'TRK-F3-1',
          tracking_url_provider: 'https://track.example/TRK-F3-1',
          label_url: 'https://labels.example/TRK-F3-1.pdf',
          tracking_status: 'ready',
        },
      },
      {
        type: 'package',
        id: 'pkg_fake_2',
        attributes: {
          tracking_number: 'TRK-F3-2',
          tracking_url_provider: 'https://track.example/TRK-F3-2',
          label_url: 'https://labels.example/TRK-F3-2.pdf',
          tracking_status: 'ready',
        },
      },
    ],
  };
};

skydropxService.getShipment = async (id) => ({
  data: {
    id,
    attributes: {
      workflow_status: 'in_transit',
      carrier_name: 'Estafeta',
      master_tracking_number: 'MASTER-FASE3',
    },
  },
  included: [
    {
      type: 'package',
      id: 'pkg_fake_1',
      attributes: {
        tracking_number: 'TRK-F3-1',
        tracking_url_provider: 'https://track.example/TRK-F3-1',
        label_url: 'https://labels.example/TRK-F3-1.pdf',
        tracking_status: 'in_transit',
      },
    },
    {
      type: 'package',
      id: 'pkg_fake_2',
      attributes: {
        tracking_number: 'TRK-F3-2',
        tracking_url_provider: 'https://track.example/TRK-F3-2',
        label_url: 'https://labels.example/TRK-F3-2.pdf',
        tracking_status: 'in_transit',
      },
    },
  ],
});

const fs = require('fs');
process.on('uncaughtException', (e) => {
  fs.writeFileSync('.tmp/fase3-error.log', 'UNCAUGHT: ' + (e?.stack ?? e));
  process.exit(2);
});
process.on('unhandledRejection', (e) => {
  fs.writeFileSync('.tmp/fase3-error.log', 'REJECTION: ' + (e?.stack ?? e));
  process.exit(3);
});

const Strapi = require('@strapi/strapi');

const mark = (m) => fs.appendFileSync('.tmp/fase3-progress.log', m + '\n');

async function main() {
  mark('antes de Strapi()');
  const app = Strapi();
  mark('antes de load');
  await app.load();
  mark('despues de load');

  // Stub del servicio de saldo logístico
  const balanceService = strapi.service('api::logistics-balance.logistics-balance');
  balanceService.reserveShipmentBalance = async () => ({ transactionId: 'tx-fase3' });
  balanceService.commitShipmentCharge = async () => ({});
  balanceService.releaseShipmentReservation = async () => ({});
  balanceService.refundShipmentCharge = async () => ({});

  mark('antes de start');
  await app.start();
  mark('despues de start');

  const SHIPMENT_UID = 'api::shipment.shipment';

  // --- Seed ---
  const usuario = await strapi.db.query('plugin::users-permissions.user').create({
    data: {
      username: 'comprador-fase3',
      email: 'comprador-fase3@test.com',
      provider: 'local',
      confirmed: true,
    },
  });

  const dirOrigen = await strapi.entityService.create('api::direccion.direccion', {
    data: {
      cp: '06600', estado: 'Ciudad de México', ciudad: 'CDMX', colonia: 'Juárez',
      route: 'Calle Origen', numero: '1',
    },
  });

  const dirDestino = await strapi.entityService.create('api::direccion.direccion', {
    data: {
      cp: '44100', estado: 'Jalisco', ciudad: 'Guadalajara', colonia: 'Centro',
      route: 'Calle Destino', numero: '2', usuario_email: usuario.email,
    },
  });

  const store = await strapi.entityService.create('api::store.store', {
    data: {
      name: 'Tienda Fase3',
      email: 'tienda-fase3@test.com',
      slug: 'tienda-fase3',
      direccion: dirOrigen.id,
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
      monto_subtotal: 400, monto_envio: 150, monto_total: 550,
      store: store.id,
      store_email: store.email,
      usuario: usuario.id,
      direccion_origen: dirOrigen.id,
      direccion_destino: dirDestino.id,
      skydropx_quotation_id: 'quot_fase3',
      skydropx_rate_id: 'rate_fase3',
      skydropx_rate: {
        id: 'rate_fase3', provider_display_name: 'Estafeta', provider_service_name: 'Terrestre',
        amount: '120.00', service_fee: '10.00', vat_fee: '20.00', total: '150.00',
        currency_code: 'MXN', days: 3,
        office_pickup: false, office_delivery: false, office_delivery_only: false,
      },
      delivery_contact_information: { name: 'Comprador Test', phone: '5500000001' },
      pickup_contact_information: { name: 'Tienda Test', phone: '5500000002' },
      item: [
        { producto: producto1.id, nombre: 'Producto A', cantidad: 2, precio_unitario: 100, subtotal: 200 },
        { producto: producto2.id, nombre: 'Producto B', cantidad: 1, precio_unitario: 200, subtotal: 200 },
      ],
      publishedAt: new Date().toISOString(),
    },
  });

  // Shipment preparado (Fase 2) con 2 paquetes
  const shipment = await strapi.entityService.create(SHIPMENT_UID, {
    data: {
      pedido: pedido.id,
      provider: 'skydropx',
      status: 'pending',
      total: 150,
      currency_code: 'MXN',
    },
  });

  const pkg1 = await strapi.entityService.create('api::shipment-package.shipment-package', {
    data: {
      shipment: shipment.id, package_number: '1',
      length: 20, width: 15, height: 10, weight: 2.5,
      declared_value: 200, package_protected: true,
      status: 'pending',
    },
  });
  await strapi.entityService.create('api::shipment-package-item.shipment-package-item', {
    data: { shipment_package: pkg1.id, producto: producto1.id, quantity: 2, nombre: 'Producto A', precio_unitario: 100 },
  });

  const pkg2 = await strapi.entityService.create('api::shipment-package.shipment-package', {
    data: {
      shipment: shipment.id, package_number: '2',
      length: 30, width: 20, height: 15, weight: 2,
      declared_value: 200, package_protected: false,
      status: 'pending',
    },
  });
  await strapi.entityService.create('api::shipment-package-item.shipment-package-item', {
    data: { shipment_package: pkg2.id, producto: producto2.id, quantity: 1, nombre: 'Producto B', precio_unitario: 200 },
  });

  console.log(`SEED_OK pedido=${pedido.id} shipment=${shipment.id}`);

  // --- 1. Crear envío en Skydropx (stub) ---
  const res = await fetch(`http://127.0.0.1:${process.env.PORT}/api/skydropx/shipment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pedido_id: pedido.id }),
  });
  const resBody = await res.json();
  console.log('POST /api/skydropx/shipment →', res.status, JSON.stringify(resBody?.shipment?.id ?? resBody));

  if (res.status !== 202) throw new Error(`Se esperaba 202, llegó ${res.status}: ${JSON.stringify(resBody)}`);

  // --- 2. Verificar Shipment persistido ---
  const shipmentDb = await strapi.entityService.findOne(SHIPMENT_UID, shipment.id, {
    populate: { packages: { populate: { items: true } } },
  });

  const checks = [
    ['provider_shipment_id', shipmentDb.provider_shipment_id === FAKE_SHIPMENT_ID],
    ['master_tracking_number', shipmentDb.master_tracking_number === 'MASTER-FASE3'],
    ['carrier_name', shipmentDb.carrier_name === 'Estafeta'],
    ['status processing/ready', ['processing', 'ready'].includes(shipmentDb.status)],
    ['raw_response guardado', Boolean(shipmentDb.raw_response)],
    ['2 paquetes', shipmentDb.packages.length === 2],
  ];

  const pkg1Db = shipmentDb.packages.find((p) => p.package_number === '1');
  const pkg2Db = shipmentDb.packages.find((p) => p.package_number === '2');
  checks.push(
    ['pkg1 provider_package_id', pkg1Db?.provider_package_id === 'pkg_fake_1'],
    ['pkg1 tracking_number', pkg1Db?.tracking_number === 'TRK-F3-1'],
    ['pkg1 label_url', pkg1Db?.label_url === 'https://labels.example/TRK-F3-1.pdf'],
    ['pkg1 status labeled', pkg1Db?.status === 'labeled'],
    ['pkg2 provider_package_id', pkg2Db?.provider_package_id === 'pkg_fake_2'],
    ['pkg2 tracking_number', pkg2Db?.tracking_number === 'TRK-F3-2'],
  );

  // Compatibilidad: pedido legacy actualizado
  const pedidoDb = await strapi.entityService.findOne('api::pedido.pedido', pedido.id);
  checks.push(['pedido.skydropx_shipment_id (legacy)', pedidoDb.skydropx_shipment_id === FAKE_SHIPMENT_ID]);

  // --- 3. Sync (polling) GET shipment ---
  const syncRes = await fetch(`http://127.0.0.1:${process.env.PORT}/api/skydropx/shipment/${FAKE_SHIPMENT_ID}`);
  const syncBody = await syncRes.json();
  console.log('GET sync →', syncRes.status, 'packages en respuesta:', syncBody?.shipment?.packages?.length);

  const shipmentAfterSync = await strapi.entityService.findOne(SHIPMENT_UID, shipment.id, {
    populate: { packages: true },
  });
  checks.push(
    ['shipment status in_transit tras sync', shipmentAfterSync.status === 'in_transit'],
    ['pkg1 status in_transit tras sync', shipmentAfterSync.packages.find((p) => p.package_number === '1')?.status === 'in_transit'],
    ['pkg2 status in_transit tras sync', shipmentAfterSync.packages.find((p) => p.package_number === '2')?.status === 'in_transit'],
  );

  // --- 4. Idempotencia: segundo POST debe rechazarse ---
  const res2 = await fetch(`http://127.0.0.1:${process.env.PORT}/api/skydropx/shipment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pedido_id: pedido.id }),
  });
  checks.push(['segundo POST rechazado (400)', res2.status === 400]);

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

  console.log('\n✅ FASE 3: todas las verificaciones pasaron');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error en prueba FASE 3:', err);
  process.exit(1);
});
