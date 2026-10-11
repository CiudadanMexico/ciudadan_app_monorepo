#!/usr/bin/env node
'use strict';

/**
 * Seed: crea una postulacion-socio de prueba con la cuenta publia.mx@gmail.com
 * en la base real (MySQL). Carga Strapi contra el .env del backend.
 *
 * Uso:
 *   cd ciudadan_backend_26 && node scripts/seed-postulacion-socio.js
 *
 * Idempotente: si ya existe una postulacion con ese email, la reutiliza.
 */

const Strapi = require('@strapi/strapi');

const EMAIL = 'publia.mx@gmail.com';

async function main() {
  await Strapi().load();

  // Reutiliza si ya existe (idempotente).
  const existentes = await strapi.entityService.findMany('api::postulacion-socio.postulacion-socio', {
    filters: { email: EMAIL },
    limit: 1,
  });

  if (Array.isArray(existentes) && existentes.length > 0) {
    console.log(`SEED_OK_EXISTENTE id=${existentes[0].id} email=${EMAIL}`);
    process.exit(0);
  }

  const creada = await strapi.entityService.create('api::postulacion-socio.postulacion-socio', {
    data: {
      nombre_completo: 'Publia MX (prueba)',
      email: EMAIL,
      telefono: '5500000000',
      codigo_pais: '+52',
      descripcion: 'Postulacion de prueba creada por seed.',
      estado: 'pendiente',
      fecha_solicitud: new Date().toISOString(),
      metadata: { origen: 'seed', creado: new Date().toISOString() },
      publishedAt: new Date().toISOString(),
    },
  });

  console.log(`SEED_OK id=${creada.id} email=${EMAIL}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('SEED_ERROR', err);
  process.exit(1);
});
