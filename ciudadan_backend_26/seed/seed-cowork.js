'use strict';

/**
 * Fix E — Seed de CoWork: 5 áreas raíz + perm/rol de prueba.
 *
 * Acceso directo a la SQLite vía knex (igual que fix-perms.js), NO requiere
 * Strapi levantado. Idempotente: re-ejecutable.
 *
 * Hace:
 *   1. Inserta las 5 áreas raíz oficiales en `areas` (nivel=0, is_active=true)
 *      si no existen ya. Nombres exactos del lifecycle `area/lifecycles.js`.
 *   2. Crea roles nativos en `up_roles` (Socio, Verificador) si faltan.
 *      Fix E no duplica la lógica de permisos (Fix B vía fix-perms.js).
 *   3. Crea 3 usuarios de demo en `up_users` con `roles.extra` configurado,
 *      para probar el flujo de policies custom:
 *        demo-admin      → roles.extra = ["admin"]
 *        demo-socio      → roles.extra = ["socio"]      + tipo_membresia != 'socio'
 *        demo-verificador→ roles.extra = ["verificador"]
 *      Solo crea si no existe un user con ese email.
 *
 * ⚠️ Decisiones abiertas (doc l.146/152): `roles.extra` es JSON libre —
 * aquí lo dejamos como convención para que las policies custom y el FE
 * coincidan. Los usuarios NO requieren password para tests vía Auth0 (token
 * se valida contra /userinfo del proveedor, no contra la pass local).
 *
 * Uso:
 *   node seed/seed-cowork.js
 */

const path = require('path');
const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: path.resolve(__dirname, '..', '.tmp', 'data.db') },
  useNullAsDefault: true,
});

const ROOT_AREA_NAMES = [
  'Administrativo',
  'Técnico',
  'Comercial-difusión',
  'Software',
  'Creación multimedia',
];

const CUSTOM_ROLES = [
  { name: 'Socio', type: 'authenticated', description: 'Crea/edita/califica tareas CoWork (dueño)' },
  { name: 'Verificador', type: 'authenticated', description: 'Verifica áreas y sube evidencia a tareas' },
];

const DEMO_USERS = [
  {
    username: 'demo-admin',
    email: 'demo-admin@ciudadan.org',
    roles_extra: ['admin'],
    confirmed: 1,
    blocked: 0,
  },
  {
    username: 'demo-socio',
    email: 'demo-socio@ciudadan.org',
    roles_extra: ['socio'],
    confirmed: 1,
    blocked: 0,
  },
  {
    username: 'demo-verificador',
    email: 'demo-verificador@ciudadan.org',
    roles_extra: ['verificador'],
    confirmed: 1,
    blocked: 0,
  },
];

(async () => {
  try {
    const now = new Date().toISOString();
    let areasCreated = 0;
    let rolesCreated = 0;
    let usersCreated = 0;

    // ---------- 1. Áreas raíz ----------
    for (const nombre of ROOT_AREA_NAMES) {
      const exists = await knex('areas').where({ nombre, nivel: 0 }).first();
      if (!exists) {
        await knex('areas').insert({
          nombre,
          nivel: 0,
          is_active: 1,
          created_at: now,
          updated_at: now,
          created_by_id: null,
          updated_by_id: null,
          // draftAndPublish está habilitado en el schema → published_at null
          // significa "borrador". Lo dejamos como draft: el admin decide publicar.
        });
        areasCreated++;
        console.log(`Área creada: ${nombre}`);
      } else {
        console.log(`Área ya existe: ${nombre} (id=${exists.id})`);
      }
    }

    // ---------- 2. Roles nativos ----------
    let maxRoleId = 0;
    const existingRoles = await knex.select('id', 'name').from('up_roles');
    maxRoleId = existingRoles.reduce((m, r) => Math.max(m, r.id), 0);
    const roleIds = {};
    for (const def of CUSTOM_ROLES) {
      let role = existingRoles.find((r) => r.name === def.name);
      if (!role) {
        maxRoleId++;
        await knex('up_roles').insert({
          id: maxRoleId,
          name: def.name,
          type: def.type,
          description: def.description,
          created_at: now,
          updated_at: now,
        });
        role = { id: maxRoleId, name: def.name };
        rolesCreated++;
        console.log(`Rol creado: ${def.name} (id=${maxRoleId})`);
      } else {
        console.log(`Rol ya existe: ${def.name} (id=${role.id})`);
      }
      roleIds[def.name] = role.id;
    }

    // ---------- 3. Usuarios de demo ----------
    for (const def of DEMO_USERS) {
      const exists = await knex('up_users').where({ email: def.email }).first();
      if (exists) {
        console.log(`Usuario ya existe: ${def.email} (id=${exists.id})`);
        continue;
      }
      await knex('up_users').insert({
        username: def.username,
        email: def.email,
        provider: 'local',
        confirmed: def.confirmed,
        blocked: def.blocked,
        roles: JSON.stringify({ extra: def.roles_extra }),
        created_at: now,
        updated_at: now,
        // Sin password — este user solo se usa vía Auth0 (token validado por /userinfo)
        password: '',
      });
      usersCreated++;
      console.log(`Usuario creado: ${def.email} (roles.extra=${JSON.stringify(def.roles_extra)})`);
    }

    // ---------- Summary ----------
    console.log('\n=== SEED COWORK - SUMMARY ===');
    console.log(`Áreas raíz nuevas:    ${areasCreated}/${ROOT_AREA_NAMES.length}`);
    console.log(`Roles nuevos:         ${rolesCreated}/${CUSTOM_ROLES.length}`);
    console.log(`Usuarios demo nuevos: ${usersCreated}/${DEMO_USERS.length}`);
    console.log(`Role IDs: ${JSON.stringify(roleIds)}`);

    // Listar áreas finales
    const allAreas = await knex.select('id', 'nombre', 'nivel', 'is_active').from('areas').where({ nivel: 0 });
    console.log(`\nÁreas raíz actuales (${allAreas.length}):`);
    allAreas.forEach((a) => console.log(`  [${a.id}] ${a.nombre} (active=${a.is_active})`));

    await knex.destroy();
    console.log('\n✅ Seed completo. Correr `node fix-perms.js` después para enlazar permisos a los roles.');
  } catch (e) {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  }
})();
