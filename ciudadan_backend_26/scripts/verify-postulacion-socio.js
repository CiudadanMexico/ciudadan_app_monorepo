#!/usr/bin/env node
'use strict';

/**
 * Verificación de persistencia: lista las postulaciones-socio desde la BD
 * real (vía Strapi entityService). Solo lectura.
 *
 *   cd ciudadan_backend_26 && node scripts/verify-postulacion-socio.js
 */

const Strapi = require('@strapi/strapi');

async function main() {
  await Strapi().load();

  const posts = await strapi.entityService.findMany('api::postulacion-socio.postulacion-socio', {
    sort: { id: 'asc' },
    limit: 20,
  });

  const lista = Array.isArray(posts) ? posts : posts ? [posts] : [];
  console.log(`TOTAL=${lista.length}`);
  for (const p of lista) {
    console.log(
      `  id=${p.id} email=${p.email} nombre="${p.nombre_completo}" estado=${p.estado}`
    );
  }

  const publia = lista.find((p) => p.email === 'publia.mx@gmail.com');
  console.log(publia ? `PUBLIA_OK id=${publia.id}` : 'PUBLIA_MISSING');

  process.exit(0);
}

main().catch((err) => {
  console.error('VERIFY_ERROR', err);
  process.exit(1);
});
