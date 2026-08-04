// Publica (published_at) las entradas de CoWork que quedaron en borrador
// al crearse vía entityService.create (draftAndPublish está activo en
// area/skill/agencia/todo/tarea, y create() no publica por default).
process.env.DATABASE_CLIENT = process.env.DATABASE_CLIENT || 'sqlite';
process.env.NODE_OPTIONS = '--openssl-legacy-provider';
const Strapi = require('@strapi/strapi');

const UIDS = ['api::area.area', 'api::skill.skill', 'api::agencia.agencia', 'api::todo.todo', 'api::tarea.tarea'];

(async () => {
  const app = await Strapi({ dir: process.cwd() }).load();
  try {
    for (const uid of UIDS) {
      const drafts = await app.entityService.findMany(uid, {
        filters: { publishedAt: { $null: true } },
        fields: ['id'],
      });
      let count = 0;
      for (const d of drafts) {
        await app.entityService.update(uid, d.id, {
          data: { publishedAt: new Date().toISOString() },
        });
        count++;
      }
      console.log(`${uid}: ${count} entradas publicadas`);
    }
    console.log('\n=== PUBLISH DRAFTS: LISTO ===');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    await app.destroy();
    process.exit(process.exitCode || 0);
  }
})();
