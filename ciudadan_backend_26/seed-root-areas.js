// Rellena las 5 áreas raíz existentes (creadas con name/level en NULL,
// probablemente por un insert directo a la DB que bypaseó la validación de
// Strapi) con sus nombres oficiales y level=0. No crea filas nuevas: el
// lifecycle de area limita a 5 áreas raíz y ya hay exactamente 5 (vacías).
process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
process.env.NODE_OPTIONS = '--openssl-legacy-provider';
const Strapi = require('@strapi/strapi');

const ROOT_AREA_NAMES = [
  'Administrativo',
  'Técnico',
  'Comercial-difusión',
  'Software',
  'Creación multimedia',
];

(async () => {
  const app = await Strapi({ dir: process.cwd() }).load();
  try {
    const areas = await app.entityService.findMany('api::area.area', {
      fields: ['id', 'name', 'level'],
      sort: { id: 'asc' },
    });
    console.log(`Áreas encontradas: ${areas.length}`);

    const vacias = areas.filter((a) => !a.name);
    if (vacias.length !== ROOT_AREA_NAMES.length) {
      console.log(
        `Aviso: hay ${vacias.length} áreas sin nombre, pero ${ROOT_AREA_NAMES.length} nombres oficiales. ` +
        'Revisa manualmente antes de continuar.'
      );
    }

    for (let i = 0; i < vacias.length && i < ROOT_AREA_NAMES.length; i++) {
      const area = vacias[i];
      const nombre = ROOT_AREA_NAMES[i];
      const actualizada = await app.entityService.update('api::area.area', area.id, {
        data: { name: nombre, level: 0 },
      });
      console.log(`Área #${area.id} -> name="${actualizada.name}", level=${actualizada.level}`);
    }

    const final = await app.entityService.findMany('api::area.area', {
      fields: ['id', 'name', 'level', 'is_active'],
      sort: { id: 'asc' },
    });
    console.log('Estado final:', JSON.stringify(final, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    await app.destroy();
    process.exit(process.exitCode || 0);
  }
})();
