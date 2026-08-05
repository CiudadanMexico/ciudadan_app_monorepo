'use strict';

/**
 * seed-endpoints.js — Inyecta datos realistas en SQLite para probar los
 * endpoints CoWork via curl/Postman sin depender del admin de Strapi.
 *
 * No requiere Strapi levantado. Idempotente (re-ejecutable).
 * Correr después de seed-cowork.js (que crea áreas + roles + users demo).
 *
 * Crea:
 *   - 6 herramientas publicadas en categorias_herramientas (provee el grid FE)
 *   - 3 skills de demo
 *   - 1 cartera por cada usuario existente + link user_id
 *   - 2 todos publicadas con reward_laborys (para calificar)
 *   - 2 tareas completadas ligadas a esos todos + usuario (listas para calificar)
 *
 * Uso:
 *   node seed/seed-endpoints.js
 */

const path = require('path');
const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: path.resolve(__dirname, '..', '.tmp', 'data.db') },
  useNullAsDefault: true,
});

const HERRAMIENTAS = [
  { titulo: 'Calificar Tarea',      slug: 'calificar-tarea',      nivel: 1, descripcion: 'Calificar resoluciones de tareas' },
  { titulo: 'Corregir Tarea',       slug: 'corregir-tarea',       nivel: 1, descripcion: 'Solicitar corrección de una resolución' },
  { titulo: 'Gestionar Tareas',     slug: 'gestionar-tareas',     nivel: 1, descripcion: 'CRUD de tareas originales (todo)' },
  { titulo: 'Carpetas y Enlaces',   slug: 'carpetas-enlaces',     nivel: 2, descripcion: 'Gestor de carpetas y recursos' },
  { titulo: 'Mi Agencia',           slug: 'mi-agencia',           nivel: 1, descripcion: 'Panel administrativo de agencia' },
  { titulo: 'Conductores',          slug: 'conductores',          nivel: 2, descripcion: 'Gestión de conductores de agencia' },
];

const SKILLS = [
  { name: 'React',     description: 'Frontend framework' },
  { name: 'Strapi',    description: 'Headless CMS' },
  { name: 'PostgreSQL',description: 'Relational database' },
];

const TODOS_DEMO = [
  {
    titulo: 'Revisión de traducción ES-EN',
    descripcion: 'Traducir 200 frases técnicas y revisarlas.',
    status: 'publicada',
    nivel: 'general',
    ambito: 'plataforma',
    tipo: 'tarea',
    recurrencia: 'unica',
    reward_laborys: 50,
    recompensa: 50,
    minutos_desarrollo: 60,
    vence: 0,
    is_periodic: 0,
    has_deadline: 0,
  },
  {
    titulo: 'Maquetar landing de prueba',
    descripcion: 'Implementar una landing en React+MUI siguiendo un mockup dado.',
    status: 'publicada',
    nivel: 'general',
    ambito: 'plataforma',
    tipo: 'tarea',
    recurrencia: 'abierta',
    reward_laborys: 120,
    recompensa: 120,
    minutos_desarrollo: 180,
    vence: 0,
    is_periodic: 0,
    has_deadline: 0,
  },
];

(async () => {
  try {
    const now = new Date().toISOString();
    let inserted = { herramientas: 0, skills: 0, carteras: 0, todos: 0, tareas: 0 };

    // ---------- 1. Herramientas ----------
    console.log('=== Insertando herramientas ===');
    for (const h of HERRAMIENTAS) {
      const exists = await knex('categorias_herramientas').where({ slug: h.slug }).first();
      if (exists) {
        console.log(`  existe: ${h.slug} (id=${exists.id})`);
        continue;
      }
      const [id] = await knex('categorias_herramientas').insert({
        titulo: h.titulo,
        descripcion: h.descripcion,
        slug: h.slug,
        nivel: h.nivel,
        activa: 1,
        created_at: now,
        updated_at: now,
        published_at: now, // publicada (draftAndPublish=true)
      });
      inserted.herramientas++;
      console.log(`  creada: ${h.slug} (id=${id})`);
    }

    // ---------- 2. Skills ----------
    console.log('=== Insertando skills ===');
    for (const s of SKILLS) {
      const exists = await knex('skills').where({ name: s.name }).first();
      if (exists) {
        console.log(`  existe: ${s.name} (id=${exists.id})`);
        continue;
      }
      const [id] = await knex('skills').insert({
        name: s.name,
        description: s.description,
        is_active: 1,
        created_at: now,
        updated_at: now,
        published_at: now,
      });
      inserted.skills++;
      console.log(`  creada: ${s.name} (id=${id})`);
    }

    // ---------- 3. Carteras para usuarios existentes ----------
    console.log('=== Asegurar cartera por cada up_user ===');
    const users = await knex.select('id', 'username', 'email').from('up_users');
    for (const u of users) {
      const link = await knex('carteras_user_id_links').where({ user_id: u.id }).first();
      if (link) {
        console.log(`  ya tiene cartera: ${u.username} (cartera_id=${link.cartera_id})`);
        continue;
      }
      const [carId] = await knex('carteras').insert({
        laborys_ganados: 0,
        laborys_saldo: 100, // laborys inicial saludo al usuario
        ciudadan_tokens: 0,
        ciudadan_rendimientos: 0,
        created_at: now,
        updated_at: now,
        published_at: now,
      });
      await knex('carteras_user_id_links').insert({
        cartera_id: carId,
        user_id: u.id,
      });
      inserted.carteras++;
      console.log(`  cartera creada para ${u.username} (car_id=${carId}, +100 laborys)`);
    }

    // ---------- 4. Tareas publicadas (todo) + 5. resoluciones (tarea) ----------
    // Necesitamos un usuario socio (roles.extra contiene 'socio') como propietario
    //     y un usuario regular para resolver.
    const socio = users.find((u) => {
      try {
        const r = JSON.parse(u.roles || '{}');
        return Array.isArray(r.extra) && r.extra.includes('socio');
      } catch { return false; }
    }) || users[0];
    const resolvedor = users.find((u) => u.id !== socio.id) || users[0];

    if (!socio) {
      console.log('⚠️ No hay usuario socio; saltando todos/tareas. Correr seed-cowork.js primero.');
    } else {
      console.log(`=== Insertando 2 todos publicadas (creador=${socio.username}) ===`);
      const todoIds = [];
      for (const t of TODOS_DEMO) {
        // Verificar existencia por titulo único
        const exists = await knex('todos').where({ titulo: t.titulo }).first();
        if (exists) {
          console.log(`  todo ya existe: ${t.titulo} (id=${exists.id})`);
          todoIds.push(exists.id);
          continue;
        }
        const [id] = await knex('todos').insert({
          titulo: t.titulo,
          descripcion: t.descripcion,
          status: t.status,
          nivel: t.nivel,
          ambito: t.ambito,
          tipo: t.tipo,
          recurrencia: t.recurrencia,
          reward_laborys: t.reward_laborys,
          pagos_laborys: t.reward_laborys, // legacy decimal duplicado (Fix C mantiene retrocompat)
          recompensa: t.recompensa,
          minutos_desarrollo: t.minutos_desarrollo,
          vence: t.vence ? 1 : 0,
          is_periodic: t.is_periodic ? 1 : 0,
          has_deadline: t.has_deadline ? 1 : 0,
          created_at: now,
          updated_at: now,
          published_at: now, // publicada
          created_by_id: socio.id,
        });
        inserted.todos++;
        todoIds.push(id);
        console.log(`  todo creado: ${t.titulo} (id=${id}, reward=${t.reward_laborys})`);
      }

      // Resolver: crear 1 tarea completada por cada todo publicado (listas para calificar)
      console.log(`=== Insertando 1 tarea completada por todo (resolver=${resolvedor.username}) ===`);
      for (const todoId of todoIds) {
        // Verificar si ya existe una tarea completada para este todo+usuario
        const existingTarea = await knex.raw(
          `SELECT t.id FROM tareas t
           JOIN tareas_todo_links l ON l.tarea_id = t.id
           WHERE l.todo_id = ? AND t.status = 'completada'
           LIMIT 1`,
          [todoId]
        );
        if (existingTarea && existingTarea.length) {
          console.log(`  tarea completada ya existe para todo_id=${todoId}`);
          continue;
        }
        const [tareaId] = await knex('tareas').insert({
          titulo: `Resolución de tarea ${todoId}`,
          descripcion: 'Resolución de prueba creada por seed-endpoints.js',
          tipo: 'tarea',
          status: 'completada',
          payment_status: 'pendiente',
          score: 0,
          created_at: now,
          updated_at: now,
          published_at: now,
          created_by_id: resolvedor.id,
        });
        // Link tarea -> todo (relación manyToOne se materializa en tareas_todo_links)
        await knex.raw(`INSERT INTO tareas_todo_links (tarea_id, todo_id) VALUES (?, ?)`, [tareaId, todoId]);
        // Link tarea -> usuario (resolvedor)
        await knex.raw(`INSERT INTO tareas_usuario_links (tarea_id, user_id) VALUES (?, ?)`, [tareaId, resolvedor.id]);
        inserted.tareas++;
        console.log(`  tarea creada: id=${tareaId}, todo=${todoId}, usuario=${resolvedor.id}`);
      }
    }

    // ---------- Resumen ----------
    console.log('\n=== SEED ENDPOINTS - SUMMARY ===');
    console.log(`Herramientas: ${inserted.herramientas}/${HERRAMIENTAS.length}`);
    console.log(`Skills:       ${inserted.skills}/${SKILLS.length}`);
    console.log(`Carteras:     ${inserted.carteras}/${users.length}`);
    console.log(`Todos:        ${inserted.todos}/${TODOS_DEMO.length}`);
    console.log(`Tareas:       ${inserted.tareas}`);

    // Listar herramientas finales
    const allH = await knex('categorias_herramientas').select('id', 'titulo', 'slug', 'activa', 'published_at');
    console.log(`\nHerramientas totales en DB (${allH.length}):`);
    allH.forEach((h) => console.log(`  [${h.id}] ${h.titulo} (slug=${h.slug}, activa=${h.activa}, pub=${h.published_at ? 'SÍ' : 'NO'})`));

    await knex.destroy();
    console.log('\n✅ Seed endpoints completo.');
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();
