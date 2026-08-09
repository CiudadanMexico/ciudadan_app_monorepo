// Crea las 5 áreas raíz oficiales (level=0) desde cero. Idempotente: si ya
// existe un área raíz con ese nombre, no la duplica.
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
    const existentes = await app.entityService.findMany('api::area.area', {
      filters: { level: 0 },
      fields: ['id', 'name'],
    });
    const existentesNombres = new Set(existentes.map((a) => a.name));

    for (const nombre of ROOT_AREA_NAMES) {
      if (existentesNombres.has(nombre)) {
        console.log(`Área raíz ya existe: ${nombre}`);
        continue;
      }
      const creada = await app.entityService.create('api::area.area', {
        data: { name: nombre, level: 0, is_active: true },
      });
      console.log(`Área raíz creada: ${nombre} (#${creada.id})`);
    }

    const final = await app.entityService.findMany('api::area.area', {
      filters: { level: 0 },
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
