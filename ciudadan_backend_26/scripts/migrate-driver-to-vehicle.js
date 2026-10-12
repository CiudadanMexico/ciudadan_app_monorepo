'use strict';

/**
 * Migración driver → vehicle (Etapa 4).
 *
 * Crea un registro `vehicle` por cada `driver` que tenga datos legacy de
 * unidad (vehicle_brand/model/year/color, license_plate, vin_number,
 * vehicle_type, passenger_capacity, medias vehicle_*) y enlaza ambas puntas
 * (driver.vehicle ↔ vehicle.driver).
 *
 * Uso:
 *   node scripts/migrate-driver-to-vehicle.js            # dry-run (default)
 *   node scripts/migrate-driver-to-vehicle.js --apply    # escribe en BD
 *
 * Idempotente: salta drivers que ya tengan vehicle enlazado o cuyo vehicle
 * ya exista por vin_number/plates. NO borra campos legacy (compatibilidad
 * con el panel de verificación actual que lee driver.*).
 */
const DRY_RUN = !process.argv.includes('--apply');

const statusFromDriver = (driverStatus) => {
  if (driverStatus === 'approved') return 'aprobado';
  if (driverStatus === 'pending_review') return 'en_revision';
  if (driverStatus === 'documents_rejected' || driverStatus === 'rejected') return 'suspenso';
  if (driverStatus === 'pending_documents') return 'preregistrado';
  return 'preregistrado';
};

async function main() {
  const { createStrapi } = require('@strapi/strapi');
  const app = await createStrapi({ distDir: './dist' }).load();
  await app.db.init();

  try {
    const drivers = await app.db.query('api::driver.driver').findMany({
      populate: ['user', 'agency', 'vehicle'],
    });

    let created = 0;
    let skipped = 0;
    let linked = 0;

    for (const driver of drivers) {
      if (driver.vehicle) {
        skipped += 1;
        continue;
      }
      const hasLegacy =
        driver.vehicle_brand ||
        driver.license_plate ||
        driver.vin_number ||
        driver.vehicle_front_photo ||
        driver.vehicle_registration_card;
      if (!hasLegacy) {
        skipped += 1;
        continue;
      }

      // Reuso por identidad única de la unidad (evita duplicados en re-runs).
      let existing = null;
      if (driver.vin_number) {
        existing = await app.db.query('api::vehicle.vehicle').findOne({
          where: { vin_number: driver.vin_number },
        });
      }
      if (!existing && driver.license_plate) {
        existing = await app.db.query('api::vehicle.vehicle').findOne({
          where: { plates: driver.license_plate },
        });
      }

      let vehicle = existing;
      if (!vehicle && DRY_RUN) {
        console.log(`[dry-run] crearía vehicle para driver #${driver.id} (${driver.license_plate || 'sin placa'})`);
        continue;
      }
      if (!vehicle) {
        vehicle = await app.db.query('api::vehicle.vehicle').create({
          data: {
            user: driver.user?.id ?? null,
            agency: driver.agency?.id ?? null,
            driver: driver.id,
            plates: driver.license_plate || null,
            vin_number: driver.vin_number || null,
            brand: driver.vehicle_brand || null,
            model: driver.vehicle_model || null,
            year: driver.vehicle_year || null,
            color: driver.vehicle_color || null,
            vehicle_type: driver.vehicle_type || null,
            passenger_capacity: driver.passenger_capacity || null,
            status: statusFromDriver(driver.status),
            publishedAt: new Date().toISOString(),
          },
        });
        created += 1;
      }

      if (!DRY_RUN) {
        await app.db.query('api::driver.driver').update({
          where: { id: driver.id },
          data: { vehicle: vehicle.id },
        });
        if (!vehicle.driver) {
          await app.db.query('api::vehicle.vehicle').update({
            where: { id: vehicle.id },
            data: { driver: driver.id },
          });
        }
        linked += 1;
      }
    }

    console.log(`Migración driver→vehicle ${DRY_RUN ? '(dry-run)' : '(APLICADA)'}: creados=${created} vinculados=${linked} omitidos=${skipped}`);
  } finally {
    await app.destroy();
  }
}

main().catch((err) => {
  console.error('[migrate-driver-to-vehicle] ERROR:', err.message);
  process.exit(1);
});
