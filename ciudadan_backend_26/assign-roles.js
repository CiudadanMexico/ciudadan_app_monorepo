/**
 * assign-roles.js — Asigna el rol nativo de Strapi (Socio/Verificador) a los
 * usuarios cuyo `roles.extra` (JSON libre usado por el FE) así lo indica.
 *
 * Spec documento-off.md (punto 8.8): "Asignar `role = Socio` o `Verificador`
 * a cada usuario en Strapi Admin o programáticamente... Recomendación:
 * setear AMBOS (role nativo + `roles.extra`) para que policies custom y FE
 * coincidan."
 *
 * Idempotente: solo enlaza si faltaba. Si el usuario ya tiene el rol correcto,
 * no escribe nada. El rol nativo de Strapi es el define los permisos server-side;
 * `roles.extra` queda intacto (lo usa el FE para gateo UI).
 *
 * Uso:
 *     node assign-roles.js              # sincroniza todo `up_users`
 *     node assign-roles.js <email>      # solo un usuario por email
 *
 * Requiere que `fix-perms.js` ya haya corrido antes (crea los roles Socio/
 * Verificador en `up_roles`). Si no existen, los crea aquí también.
 */
const knex = require('knex')({
  client: 'sqlite3',
  connection: { filename: '.tmp/data.db' },
  useNullAsDefault: true,
});

const TARGET_ROLES = ['Socio', 'Verificador'];

// Mapea nombres en `roles.extra` (variaciones del FE) al nombre canónico
// de Strapi. El FE usa variaciones case-insensitive; estandarizamos aquí.
const EXTRA_TO_STRAPI = {
  socio: 'Socio',
  'socio ': 'Socio',
  verificador: 'Verificador',
};

(async () => {
  try {
    console.log('=> assign-roles: sincronizando roles nativos de Strapi con roles.extra');

    // --- 1. Asegurar que los roles target existen en up_roles ---
    let roles = await knex.select('id', 'name', 'type').from('up_roles');
    const existingNames = new Set(roles.map((r) => r.name));

    for (const name of TARGET_ROLES) {
      if (!existingNames.has(name)) {
        const [id] = await knex('up_roles').insert({
          name,
          type: 'authenticated',
          description: `Rol CoWork: ${name} (creado por assign-roles.js)`,
        });
        console.log(`[+] Rol creado: ${name} (id=${id})`);
      } else {
        console.log(`[ok] Rol ya existía: ${name}`);
      }
    }

    // Refrescar lista de roles con ids
    roles = await knex.select('id', 'name', 'type').from('up_roles');
    const roleByName = {};
    for (const r of roles) roleByName[r.name] = r.id;
    const socioId = roleByName['Socio'];
    const verifId = roleByName['Verificador'];

    if (!socioId || !verifId) {
      throw new Error('No se encontraron los roles Socio/Verificador en up_roles. ¿Corriste fix-perms.js?');
    }

    // --- 2. Leer usuarios (todos o uno solo) ---
    // Strapi usa tabla intermedia up_users_role_links (user_id, role_id) —
    // no columna `role` directa en up_users.
    const targetEmail = process.argv[2];
    let usersQuery = knex.select('id', 'email', 'roles').from('up_users');
    if (targetEmail) {
      usersQuery = usersQuery.where('email', targetEmail);
    }
    const users = await usersQuery;

    if (users.length === 0) {
      console.log('No se encontraron usuarios.');
      await knex.destroy();
      return;
    }

    // Carga enlaces usuario<->rol existentes para evitar dupes
    const existingLinks = await knex.select('user_id', 'role_id').from('up_users_role_links');
    const linkSet = new Set(existingLinks.map((l) => `${l.user_id}-${l.role_id}`));

    // max(user_order) por user_id para insertar con orden correcto
    const orderMap = {};
    for (const l of existingLinks) {
      orderMap[l.user_id] = Math.max(orderMap[l.user_id] || 0, l.user_order || 0);
    }

    let linkedCount = 0;
    let skippedCount = 0;

    for (const u of users) {
      // Parsear roles.extra (JSON libre: { extra: ['admin','socio', ...], ... } | array | null)
      let extraRoles = [];
      if (u.roles) {
        try {
          const parsed = typeof u.roles === 'string' ? JSON.parse(u.roles) : u.roles;
          if (Array.isArray(parsed)) {
            extraRoles = parsed;
          } else if (Array.isArray(parsed.extra)) {
            extraRoles = parsed.extra;
          } else if (parsed.role) {
            extraRoles = [parsed.role];
          }
        } catch {
          // roles.corrupto = no nos fiamos → ignoramos
          extraRoles = [];
        }
      }

      const normalized = extraRoles.map((r) => String(r).trim().toLowerCase());
      const wantSocio = normalized.some(
        (r) => r === 'socio' || r === 'admin' || r === 'root'
      );
      const wantVerif = normalized.some((r) => r === 'verificador');

      // Decidir rol objetivo (prioridad: socio sobre verificador — un usuario
      // que es ambas usualmente es socio con capacidad de verificar).
      let targetRoleId = null;
      if (wantSocio) targetRoleId = socioId;
      else if (wantVerif) targetRoleId = verifId;

      if (!targetRoleId) {
        console.log(`  [-] ${u.email}: sin rol CoWork en roles.extra (extra=${JSON.stringify(extraRoles)})`);
        skippedCount++;
        continue;
      }

      if (linkSet.has(`${u.id}-${targetRoleId}`)) {
        console.log(`  [ok] ${u.email}: ya enlazado a role_id=${targetRoleId}`);
        skippedCount++;
        continue;
      }

      // Insertar enlace en up_users_role_links (no pisamos enlaces existentes).
      const nextOrder = (orderMap[u.id] || 0) + 1;
      await knex('up_users_role_links').insert({
        user_id: u.id,
        role_id: targetRoleId,
        user_order: nextOrder,
      });
      orderMap[u.id] = nextOrder;
      linkSet.add(`${u.id}-${targetRoleId}`);
      console.log(`  [+] ${u.email}: enlazado a role_id=${targetRoleId} (order=${nextOrder})`);
      linkedCount++;
    }

    // --- 3. Summary ---
    const socioLinksCount = await knex
      .count('* as c')
      .from('up_users_role_links')
      .where('role_id', socioId)
      .first();
    const verifLinksCount = await knex
      .count('* as c')
      .from('up_users_role_links')
      .where('role_id', verifId)
      .first();
    const totalUsers = await knex.count('* as c').from('up_users').first();

    console.log('\n=== SUMMARY ===');
    console.log(`Usuarios procesados: ${users.length}`);
    console.log(`Enlaces creados: ${linkedCount}`);
    console.log(`Sin cambios (sin rol o ya enlazado): ${skippedCount}`);
    console.log(`Total enlaces a rol Socio: ${socioLinksCount.c}`);
    console.log(`Total enlaces a rol Verificador: ${verifLinksCount.c}`);
    console.log(`Total usuarios en up_users: ${totalUsers.c}`);

    await knex.destroy();
    console.log('\n✓ Done!');
  } catch (e) {
    console.error('✗ Error:', e);
    process.exit(1);
  }
})();
