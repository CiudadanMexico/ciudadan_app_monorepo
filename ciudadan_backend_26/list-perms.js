const knex = require('knex')({ client: 'sqlite3', connection: { filename: '.tmp/data.db' }, useNullAsDefault: true });

(async () => {
  try {
    const tables = await knex.raw("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'up%'");
    console.log('Tables:', JSON.stringify(tables, null, 2));

    const roles = await knex.select('id', 'name', 'type').from('up_roles');
    console.log('Roles:', JSON.stringify(roles, null, 2));

    const perms = await knex.select('id', 'action').from('up_permissions').limit(20);
    console.log('Sample permissions:', JSON.stringify(perms, null, 2));

    // Check for junction table
    const permsCount = await knex.count('* as c').from('up_permissions');
    console.log('Total permissions:', permsCount);

    await knex.destroy();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
