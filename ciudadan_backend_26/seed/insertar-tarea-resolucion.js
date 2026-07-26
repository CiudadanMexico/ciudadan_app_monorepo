// seed/insertar-tarea-resolucion.js
// Script de una sola vez para crear registros `tarea` (resoluciones) de prueba,
// sin pasar por HTTP/policies. Usa entityService directo (bypass total de permisos).
//
// Uso: node seed/insertar-tarea-resolucion.js

const strapi = require('@strapi/strapi');

const USUARIO_ID = 1; // Rowan abisai Ojeda kumul
const TODO_IDS = [1];  // ids de `todo` a los que se les crea una resolución

async function seed() {
  const app = await strapi().load();

  for (const todoId of TODO_IDS) {
    const todo = await app.entityService.findOne('api::todo.todo', todoId, {
      fields: ['id', 'titulo', 'status'],
    });

    if (!todo) {
      console.log(`⚠️  No existe el todo con id ${todoId}, se omite.`);
      continue;
    }

    const tarea = await app.entityService.create('api::tarea.tarea', {
      data: {
        usuario: USUARIO_ID,
        todo: todoId,
        tipo: 'tarea',
      },
    });

    console.log(`✅ Tarea creada: id=${tarea.id} (todo "${todo.titulo}" → usuario ${USUARIO_ID})`);
  }

  await app.destroy();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error en el seed:', err);
  process.exit(1);
});
