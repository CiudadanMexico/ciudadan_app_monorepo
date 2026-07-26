'use strict';

const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: 'C:/Users/root/Desktop/projects/public/ciudadan_backend_26/.tmp/data.db' },
  useNullAsDefault: true,
});

(async () => {
  try {
    for (const t of ['todos', 'tareas', 'up_users', 'areas', 'skills', 'carteras', 'categorias_herramientas']) {
      try {
        const cols = await knex.raw(`PRAGMA table_info(${t})`);
        console.log(`=== ${t} ===`);
        console.log(cols.map(c => `${c.name}:${c.type}${c.pk ? '(PK)' : ''}`).join(', '));
        const cnt = await knex(t).count('* as c').first();
        console.log(`  rows: ${cnt.c}`);
      } catch (e) {
        console.log(`=== ${t} === ERROR: ${e.message}`);
      }
    }
    await knex.destroy();
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();
