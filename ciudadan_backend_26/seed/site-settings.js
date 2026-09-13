'use strict';

/**
 * Seed de configuración de Líderes Verificadores de Conductores.
 *
 * Acceso directo a la SQLite vía knex (igual que seed/seed-cowork.js y
 * seed/fix-perms.js), NO requiere Strapi levantado. Idempotente:
 * re-ejecutable sin duplicar registros ni pisar valores ajenos.
 *
 * Hace (sobre el Single Type EXISTENTE `site-setting`, sin duplicarlo):
 *   1. Si no existe entidad, la crea (y la PUBLICA — usa draftAndPublish).
 *   2. Si ya existe, actualiza SOLO los campos de esta funcionalidad.
 *   3. Preserva `labory_to_pesos_exchange_rate` y cualquier otro campo.
 *
 * Uso:
 *   node seed/site-settings.js
 */

const path = require('path');
const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: path.resolve(__dirname, '..', '.tmp', 'data.db') },
  useNullAsDefault: true,
});

const TESTING_DAYS = 15;
const REQUIRED_REFERRALS = 10;
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/Kfc6OeZCTNlChmMMZwoQkh';

const TABLE = 'site_settings';

async function main() {
  if (!(await knex.schema.hasTable(TABLE))) {
    console.error(
      `❌ La tabla "${TABLE}" no existe todavía.`
    );
    console.error(
      '   Arranca primero el backend (strapi develop) para que cree el schema,'
    );
    console.error('   y vuelve a correr: node seed/site-settings.js');
    process.exit(1);
  }

  const existing = await knex(TABLE).select('*').first();
  const nowIso = new Date().toISOString();

  if (existing) {
    const labory = existing.labory_to_pesos_exchange_rate;
    await knex(TABLE)
      .where({ id: existing.id })
      .update({
        driver_verifier_testing_days: TESTING_DAYS,
        driver_verifier_required_referrals: REQUIRED_REFERRALS,
        verifier_candidates_whatsapp_group_url: WHATSAPP_GROUP_URL,
        updated_at: nowIso,
      });
    console.log(
      `✅ site-setting actualizado (id=${existing.id}). ` +
        `labory_to_pesos_exchange_rate preservado: ${labory}`
    );
  } else {
    const [id] = await knex(TABLE).insert({
      labory_to_pesos_exchange_rate: null,
      driver_verifier_testing_days: TESTING_DAYS,
      driver_verifier_required_referrals: REQUIRED_REFERRALS,
      verifier_candidates_whatsapp_group_url: WHATSAPP_GROUP_URL,
      // draftAndPublish: publicar desde el seed para que la landing y el
      // endpoint lean los valores publicados.
      published_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    });
    console.log(
      `✅ site-setting creado y publicado (id=${id}) con los valores del reto.`
    );
  }

  const check = await knex(TABLE).select(
    'id',
    'driver_verifier_testing_days',
    'driver_verifier_required_referrals',
    'verifier_candidates_whatsapp_group_url',
    'labory_to_pesos_exchange_rate',
    'published_at'
  ).first();
  console.log('   → estado final:', JSON.stringify(check, null, 2));

  await knex.destroy();
}

main().catch((err) => {
  console.error('❌ Error en el seed:', err.message);
  process.exit(1);
});