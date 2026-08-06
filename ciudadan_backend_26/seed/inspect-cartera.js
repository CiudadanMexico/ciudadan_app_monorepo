'use strict';

const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: 'C:/Users/root/Desktop/projects/public/ciudadan_backend_26/.tmp/data.db' },
  useNullAsDefault: true,
});

(async () => {
  try {
    const r = await knex.raw(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'cartera%'`);
    console.log('=== cartera tables ===');
    console.log(JSON.stringify(r, null, 2));
    const r2 = await knex.raw(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%links%' AND name LIKE '%cartera%'`);
    console.log('=== cartera link tables ===');
    console.log(JSON.stringify(r2, null, 2));
    // Check carteras usuarios relation
    const rel = await knex.raw(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'carteras%'`);
    console.log(`=== carteras* (${rel.length}) ===`);
    console.log(JSON.stringify(rel.map(t => t.name), null, 2));

    // schema de carteras_usuario_links si existe
    const linkTables = await knex.raw(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%carteras_usuario%'`);
    if (linkTables.length) {
      const c = await knex.raw(`PRAGMA table_info(${linkTables[0].name})`);
      console.log(`=== ${linkTables[0].name} ===`);
      console.log(JSON.stringify(c, null, 2));
    }
    // schema carteras full
    const c = await knex.raw("PRAGMA table_info(carteras)");
    console.log('=== carteras full ===');
    console.log(JSON.stringify(c.map(x => `${x.name}:${x.type}`), null, 2));

    await knex.destroy();
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();
