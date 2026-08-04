const knex = require('knex')({ client: 'sqlite3', connection: { filename: '.tmp/data.db' }, useNullAsDefault: true });

// Entradas nuevas de `categorias_herramientas` para el hub de CoWork v2.
// Idempotente: si el slug ya existe, no vuelve a insertarlo.
const HERRAMIENTAS = [
  {
    titulo: 'Agregar Socio',
    descripcion: 'Da de alta a un usuario como socio miembro de una agencia.',
    slug: 'agregar-socio',
    nivel: 1,
  },
  {
    titulo: 'Asignar Tarea',
    descripcion: 'Asigna una tarea asignable a uno o varios usuarios (Fase 5/6).',
    slug: 'asignar-tarea',
    nivel: 1,
  },
];

(async () => {
  try {
    const now = new Date().toISOString();
    const existing = await knex('categorias_herramientas').select('id', 'slug');
    const existingSlugs = new Set(existing.map((r) => r.slug));
    const maxId = existing.reduce((max, r) => Math.max(max, r.id), 0);

    let nextId = maxId;
    let inserted = 0;
    for (const h of HERRAMIENTAS) {
      if (existingSlugs.has(h.slug)) {
        console.log(`Ya existe: ${h.slug} — omitido`);
        continue;
      }
      nextId += 1;
      await knex('categorias_herramientas').insert({
        id: nextId,
        titulo: h.titulo,
        descripcion: h.descripcion,
        slug: h.slug,
        nivel: h.nivel,
        sup: null,
        activa: 1,
        created_at: now,
        updated_at: now,
        published_at: now,
        created_by_id: 1,
        updated_by_id: 1,
      });
      console.log(`Creado: ${h.slug} (id ${nextId})`);
      inserted += 1;
    }
    console.log(`Listo. ${inserted} entrada(s) nueva(s) insertada(s).`);
  } catch (err) {
    console.error('Error al sembrar herramientas:', err);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();
