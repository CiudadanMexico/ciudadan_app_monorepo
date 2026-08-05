const knex = require('knex')({ client: 'sqlite3', connection: { filename: '.tmp/data.db' }, useNullAsDefault: true });

(async () => {
  try {
    // All permissions
    const perms = await knex.select('id', 'action').from('up_permissions').orderBy('id');
    console.log('=== ALL PERMISSIONS ===');
    perms.forEach(p => console.log(`${p.id}: ${p.action}`));
    console.log(`\nTotal: ${perms.length}`);

    // Role links
    const links = await knex.select('*').from('up_permissions_role_links');
    console.log('\n=== ROLE LINKS ===');
    console.log(JSON.stringify(links, null, 2));

    // Role links schema
    const schema = await knex.raw("PRAGMA table_info(up_permissions_role_links)");
    console.log('\n=== up_permissions_role_links SCHEMA ===');
    console.log(JSON.stringify(schema, null, 2));

    await knex.destroy();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
