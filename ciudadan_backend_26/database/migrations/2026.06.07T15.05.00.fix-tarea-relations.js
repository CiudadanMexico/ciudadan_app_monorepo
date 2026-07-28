'use strict';

const TASK_USER_LINKS_TABLE = 'tareas_usuario_links';
const TASK_USER_LINKS_BACKUP_TABLE = `${TASK_USER_LINKS_TABLE}_legacy`;

async function hasTable(knex, tableName) {
  return knex.schema.hasTable(tableName);
}

async function sqliteForeignKeys(knex, tableName) {
  return knex.raw(`PRAGMA foreign_key_list(${tableName})`).then((result) => result || []);
}

async function rebuildSqliteTaskUserLinks(knex) {
  const exists = await hasTable(knex, TASK_USER_LINKS_TABLE);
  if (!exists) return;

  const foreignKeys = await sqliteForeignKeys(knex, TASK_USER_LINKS_TABLE);
  const userForeignKey = foreignKeys.find((key) => key.from === 'user_id');

  if (userForeignKey?.table === 'up_users') return;

  const hasBackup = await hasTable(knex, TASK_USER_LINKS_BACKUP_TABLE);
  if (hasBackup) {
    await knex.schema.dropTable(TASK_USER_LINKS_BACKUP_TABLE);
  }

  await knex.schema.renameTable(TASK_USER_LINKS_TABLE, TASK_USER_LINKS_BACKUP_TABLE);

  await knex.schema.createTable(TASK_USER_LINKS_TABLE, (table) => {
    table.increments('id').primary();
    table.integer('tarea_id').nullable();
    table.integer('user_id').nullable();
    table.foreign('tarea_id').references('id').inTable('tareas').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('up_users').onDelete('CASCADE');
  });

  await knex.raw(`
    INSERT INTO ${TASK_USER_LINKS_TABLE} (id, tarea_id, user_id)
    SELECT legacy.id, legacy.tarea_id, legacy.user_id
    FROM ${TASK_USER_LINKS_BACKUP_TABLE} AS legacy
    INNER JOIN tareas ON tareas.id = legacy.tarea_id
    INNER JOIN up_users ON up_users.id = legacy.user_id
  `);

  await knex.schema.dropTable(TASK_USER_LINKS_BACKUP_TABLE);

  await knex.schema.alterTable(TASK_USER_LINKS_TABLE, (table) => {
    table.index(['tarea_id'], 'tareas_usuario_links_fk');
    table.index(['user_id'], 'tareas_usuario_links_inv_fk');
    table.unique(['tarea_id', 'user_id'], 'tareas_usuario_links_unique');
  });
}

module.exports = {
  async up(knex) {
    if (knex.client.config.client === 'sqlite') {
      await rebuildSqliteTaskUserLinks(knex);
    }
  },
};
