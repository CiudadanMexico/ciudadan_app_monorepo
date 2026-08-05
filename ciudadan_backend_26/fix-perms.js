const knex = require('knex')({ client: 'sqlite3', connection: { filename: '.tmp/data.db' }, useNullAsDefault: true });

// APIs that need permissions created and assigned
// Format: [apiName, [actions]]
const apisToFix = [
  ['notificacion', ['find', 'findOne', 'create', 'update']],
  ['carrito', ['find', 'findOne', 'create', 'update', 'delete']],
  ['membresia', ['find', 'findOne', 'create', 'update']],
  ['evento', ['find', 'findOne', 'create', 'update']],
  // Also add these common ones that the frontend likely needs
  ['pedido', ['find', 'findOne', 'create', 'update']],
  ['producto', ['find', 'findOne']],
  ['curso', ['find', 'findOne']],
  ['contenido', ['find', 'findOne']],
  ['enlace', ['find', 'findOne']],
  ['direccion', ['find', 'findOne', 'create', 'update', 'delete']],
  ['favorito', ['find', 'findOne', 'create', 'delete']],
  ['rating', ['find', 'findOne', 'create']],
  ['resena', ['find', 'findOne', 'create', 'update', 'delete']],
  ['comentario-publicacion', ['find', 'findOne', 'create', 'delete']],
  ['publicacion', ['find', 'findOne']],
  ['reaccion', ['find', 'create']],
  ['skill', ['find', 'findOne', 'create', 'update', 'delete']],
  ['postulacion', ['find', 'findOne', 'create', 'update']],
  ['servicio', ['find', 'findOne', 'create', 'update', 'delete']],
  ['credencial', ['find', 'findOne', 'create', 'update']],
  ['pago', ['find', 'findOne', 'create', 'update']],
  ['checkout', ['find', 'findOne', 'create']],
  ['stripe', ['find', 'findOne', 'create']],
  ['message', ['find', 'findOne', 'create', 'update', 'delete']],
  ['respuesta', ['find', 'findOne', 'create', 'update', 'delete']],
  ['agenda', ['find', 'findOne', 'create', 'update', 'delete']],
  ['bitacora', ['find', 'findOne', 'create', 'update']],
  ['cartera', ['find', 'findOne', 'create', 'update']],
  ['gen-wallet', ['find', 'findOne', 'create', 'update']],
  ['world-coin-wallet', ['find', 'findOne', 'create', 'update']],
  ['club', ['find', 'findOne', 'create', 'update', 'delete']],
  ['codigosreferido', ['find', 'findOne', 'create']],
  ['solicitudafiliacion', ['find', 'findOne', 'create', 'update']],
  ['lista-suscripcion', ['find', 'findOne', 'create', 'update']],
  ['membresias-tipo', ['find', 'findOne']],
  ['categoria-contenido', ['find', 'findOne']],
  ['categoria-curso', ['find', 'findOne']],
  ['categoria-enlace', ['find', 'findOne']],
  ['categoria-evento', ['find', 'findOne']],
  ['categoria-herramienta', ['find', 'findOne']],
  ['categoria-wikimapa', ['find', 'findOne']],
  ['planta', ['find', 'findOne', 'create', 'update', 'delete']],
  ['solicitudplanta', ['find', 'findOne', 'create', 'update']],
  ['kitjardinero', ['find', 'findOne', 'create', 'update']],
  ['pregunta-producto', ['find', 'findOne', 'create', 'update', 'delete']],
  ['store', ['find', 'findOne', 'create', 'update', 'delete']],
  ['store-categorie', ['find', 'findOne', 'create', 'update', 'delete']],
  ['ad', ['find', 'findOne', 'create', 'update', 'delete']],
  ['ad-view', ['find', 'findOne', 'create']],
  ['agencia', ['find', 'findOne', 'create', 'update', 'delete']],
  ['autocomplete', ['find']],
  ['cars-evidence', ['find', 'findOne', 'create', 'update']],
  ['cars-validation', ['find', 'findOne', 'create', 'update']],
  ['cars-validation-event', ['find', 'findOne', 'create']],
  ['cofepristramite', ['find', 'findOne', 'create', 'update']],
  ['conductores-cercanos', ['find', 'findOne']],
  ['configuracion-sistema', ['find', 'findOne', 'create', 'update']],
  ['configuracion-usuario', ['find', 'findOne', 'create', 'update', 'delete']],
  ['driver', ['find', 'findOne', 'create', 'update']],
  ['driver-location', ['find', 'findOne', 'create', 'update']],
  ['mienvio', ['find', 'findOne', 'create', 'update']],
  ['registrobitacora', ['find', 'findOne', 'create', 'update']],
  ['shipping', ['find', 'findOne', 'create', 'update', 'delete']],
  ['trip', ['find', 'findOne', 'create', 'update', 'delete']],
  ['triprequest', ['find', 'findOne', 'create', 'update', 'delete']],
  ['viaje', ['find', 'findOne', 'create', 'update', 'delete']],
  ['carro', ['find', 'findOne', 'create', 'update', 'delete']],
  // --- CoWork (Fix B) ---
  // Políticas nativas de Strapi deben habilitarse en roles para que las
  // policies custom (is-admin-or-socio, is-authenticated-auth0, etc.) corran.
  // Las policies custom se ejecutan DESPUÉS del check nativo de Strapi:
  // si el rol no tiene el permiso nativo, Strapi bloquea antes de que la
  // policy custom pueda decidir.
  //
  // find/findOne en todo/area/skill: públicos (lectura de tareas generales).
  // todo: create/update/delete sólo authenticated (policies custom validan socio/admin).
  // tarea: create/update sólo authenticated (resolver, completar, calificar). delete no se expone.
  // skill/area: write restringido a authenticated/admin via policies.
  ['todo', ['find', 'findOne', 'create', 'update', 'delete']],
  ['tarea', ['find', 'findOne', 'create', 'update']],
  ['area', ['find', 'findOne', 'create', 'update', 'delete']],
  ['skill', ['find', 'findOne', 'create', 'update', 'delete']],
];

// Roles personalizados del módulo CoWork que deben existir en up_roles.
// Strapi crea por defecto Public (id típicamente 1) y Authenticated (id 2),
// pero el id puede variar según migración; aquí los buscamos por name.
// Estos roles son los que las policies custom leen en `user.role.name`
// (is-admin-or-socio = name 'Socio'/'Admin').
const CUSTOM_ROLES_TO_ENSURE = [
  { name: 'Socio', type: 'authenticated', description: 'Crea/edita/califica tareas (dueño de tareas CoWork)' },
  { name: 'Verificador', type: 'authenticated', description: 'Verifica áreas y sube evidencia a tareas' },
];

(async () => {
  try {
    const now = new Date().toISOString();
    let permCount = 0;
    let linkCount = 0;

    // Get existing permissions
    const existingPerms = await knex.select('id', 'action').from('up_permissions');
    const permSet = new Set(existingPerms.map(p => p.action));
    const permMap = new Map(existingPerms.map(p => [p.action, p.id]));

    // Get max permission id
    let maxPermId = existingPerms.reduce((max, p) => Math.max(max, p.id), 0);

    // Get existing role links
    const existingLinks = await knex.select('permission_id', 'role_id').from('up_permissions_role_links');
    const linkSet = new Set(existingLinks.map(l => `${l.permission_id}-${l.role_id}`));

    // Get max link id and max permission_order per role
    let maxLinkId = existingLinks.reduce((max, l) => Math.max(max, l.id), 0);
    const roleOrder = {};
    existingLinks.forEach(l => {
      roleOrder[l.role_id] = Math.max(roleOrder[l.role_id] || 0, l.permission_order || 0);
    });

    // Ensure role 1 and 2 have order tracking
    roleOrder[1] = roleOrder[1] || 0;
    roleOrder[2] = roleOrder[2] || 0;

    const newPerms = [];
    const newLinks = [];

    for (const [apiName, actions] of apisToFix) {
      for (const action of actions) {
        const actionStr = `api::${apiName}.${apiName}.${action}`;

        let permId;
        if (!permSet.has(actionStr)) {
          // Create permission
          maxPermId++;
          permId = maxPermId;
          newPerms.push({
            id: permId,
            action: actionStr,
            created_at: now,
            updated_at: now,
            created_by_id: 1,
            updated_by_id: 1
          });
          permSet.add(actionStr);
          permMap.set(actionStr, permId);
          permCount++;
        } else {
          permId = permMap.get(actionStr);
        }

        // Link to Authenticated role (id=1)
        const linkKey1 = `${permId}-1`;
        if (!linkSet.has(linkKey1)) {
          maxLinkId++;
          roleOrder[1]++;
          newLinks.push({
            id: maxLinkId,
            permission_id: permId,
            role_id: 1,
            permission_order: roleOrder[1]
          });
          linkSet.add(linkKey1);
          linkCount++;
        }

        // Link find/findOne to Public role (id=2) as well
        if (action === 'find' || action === 'findOne') {
          const linkKey2 = `${permId}-2`;
          if (!linkSet.has(linkKey2)) {
            maxLinkId++;
            roleOrder[2]++;
            newLinks.push({
              id: maxLinkId,
              permission_id: permId,
              role_id: 2,
              permission_order: roleOrder[2]
            });
            linkSet.add(linkKey2);
            linkCount++;
          }
        }
      }
    }

    // Also ensure existing API permissions (tarea, todo, area) are linked to both roles
    const existingApiPerms = existingPerms.filter(p =>
      p.action.startsWith('api::tarea.') ||
      p.action.startsWith('api::todo.') ||
      p.action.startsWith('api::area.')
    );

    for (const perm of existingApiPerms) {
      const action = perm.action.split('.').pop();
      // Link to Authenticated (id=1)
      const linkKey1 = `${perm.id}-1`;
      if (!linkSet.has(linkKey1)) {
        maxLinkId++;
        roleOrder[1]++;
        newLinks.push({
          id: maxLinkId,
          permission_id: perm.id,
          role_id: 1,
          permission_order: roleOrder[1]
        });
        linkSet.add(linkKey1);
        linkCount++;
      }
      // Link find/findOne to Public (id=2)
      if (action === 'find' || action === 'findOne') {
        const linkKey2 = `${perm.id}-2`;
        if (!linkSet.has(linkKey2)) {
          maxLinkId++;
          roleOrder[2]++;
          newLinks.push({
            id: maxLinkId,
            permission_id: perm.id,
            role_id: 2,
            permission_order: roleOrder[2]
          });
          linkSet.add(linkKey2);
          linkCount++;
        }
      }
    }

    // Also ensure users-permissions user.find, user.findOne, role.find, role.findOne are linked to Authenticated
    const userPerms = existingPerms.filter(p =>
      p.action === 'plugin::users-permissions.user.find' ||
      p.action === 'plugin::users-permissions.user.findOne' ||
      p.action === 'plugin::users-permissions.user.me' ||
      p.action === 'plugin::users-permissions.role.find' ||
      p.action === 'plugin::users-permissions.role.findOne'
    );

    for (const perm of userPerms) {
      const linkKey1 = `${perm.id}-1`;
      if (!linkSet.has(linkKey1)) {
        maxLinkId++;
        roleOrder[1]++;
        newLinks.push({
          id: maxLinkId,
          permission_id: perm.id,
          role_id: 1,
          permission_order: roleOrder[1]
        });
        linkSet.add(linkKey1);
        linkCount++;
      }
    }

    // ====================================================================
    // Fix B: asegurar roles custom (Socio, Verificador) + enlazar permisos
    // CoWork (todo, tarea, area, skill) a TODOS los roles authenticated.
    // CORRE ANTES DE LOS INSERTS para acumular en newPerms/newLinks y se
    // inserten en el batch único de abajo.
    // ====================================================================

    // 1. Crear roles Socio y Verificador si no existen
    const existingRoles = await knex.select('id', 'name', 'type').from('up_roles');
    const roleIds = existingRoles.map((r) => r.id);
    let maxRoleId = roleIds.reduce((m, id) => Math.max(m, id), 0);

    let roleNames = {}; // name -> id

    for (const def of CUSTOM_ROLES_TO_ENSURE) {
      let role = existingRoles.find((r) => r.name === def.name);
      if (!role) {
        maxRoleId++;
        // Insertar inmediatamente para que el id quede fijo en este run.
        await knex('up_roles').insert({
          id: maxRoleId,
          name: def.name,
          type: def.type,
          description: def.description,
          created_at: now,
          updated_at: now,
        });
        role = { id: maxRoleId, name: def.name, type: def.type };
        console.log(`➕ Created role: ${def.name} (id=${maxRoleId})`);
      }
      roleNames[def.name] = role.id;
    }

    // 2. Encontrar ids de Authenticated y Public por name (más robusto que hardcodear)
    const authenticatedRole = existingRoles.find((r) => r.name === 'Authenticated')
      || { id: 1 };
    const publicRole = existingRoles.find((r) => r.name === 'Public')
      || { id: 2 };
    const authenticatedRoleIds = [
      authenticatedRole.id,
      roleNames['Socio'],
      roleNames['Verificador'],
    ].filter(Boolean);

    console.log(`Authenticated role id: ${authenticatedRole.id}`);
    console.log(`Public role id: ${publicRole.id}`);
    console.log(`Socio role id: ${roleNames['Socio']}, Verificador role id: ${roleNames['Verificador']}`);

    // 3. Para api::todo, api::tarea, api::area, api::skill: enlazar
    //    - find/findOne a Public
    //    - todas las acciones a Authenticated/Socio/Verificador
    const coworkApis = ['todo', 'tarea', 'area', 'skill'];
    const coworkPerms = existingPerms
      .concat(newPerms)
      .filter((p) => coworkApis.some((api) => p.action.startsWith(`api::${api}.`)));

    let coworkLinkCount = 0;
    for (const perm of coworkPerms) {
      const action = perm.action.split('.').pop();

      // Public: find/findOne
      if (action === 'find' || action === 'findOne') {
        const pubKey = `${perm.id}-${publicRole.id}`;
        if (!linkSet.has(pubKey)) {
          maxLinkId++;
          roleOrder[publicRole.id] = (roleOrder[publicRole.id] || 0) + 1;
          newLinks.push({
            id: maxLinkId,
            permission_id: perm.id,
            role_id: publicRole.id,
            permission_order: roleOrder[publicRole.id],
          });
          linkSet.add(pubKey);
          linkCount++;
          coworkLinkCount++;
        }
      }

      // Authenticated/Socio/Verificador: todas las acciones
      for (const rid of authenticatedRoleIds) {
        const key = `${perm.id}-${rid}`;
        if (!linkSet.has(key)) {
          maxLinkId++;
          roleOrder[rid] = (roleOrder[rid] || 0) + 1;
          newLinks.push({
            id: maxLinkId,
            permission_id: perm.id,
            role_id: rid,
            permission_order: roleOrder[rid],
          });
          linkSet.add(key);
          linkCount++;
          coworkLinkCount++;
        }
      }
    }
    console.log(`🔗 CoWork role-permission links: ${coworkLinkCount} (cumulative new links: ${newLinks.length})`);

    // ====================================================================

    // Insert new permissions
    if (newPerms.length > 0) {
      await knex('up_permissions').insert(newPerms);
      console.log(`✅ Created ${permCount} new permissions`);
    } else {
      console.log('ℹ️  No new permissions needed');
    }

    // Insert new role links
    if (newLinks.length > 0) {
      await knex('up_permissions_role_links').insert(newLinks);
      console.log(`✅ Created ${linkCount} new role-permission links`);
    } else {
      console.log('ℹ️  No new role links needed');
    }

    // Summary
    const totalPerms = await knex.count('* as c').from('up_permissions').first();
    const totalLinks = await knex.count('* as c').from('up_permissions_role_links').first();
    const role1Links = await knex.count('* as c').from('up_permissions_role_links').where('role_id', authenticatedRole.id).first();
    const role2Links = await knex.count('* as c').from('up_permissions_role_links').where('role_id', publicRole.id).first();

    console.log('\n=== SUMMARY ===');
    console.log(`Total permissions: ${totalPerms.c}`);
    console.log(`Total role links: ${totalLinks.c}`);
    console.log(`Authenticated (id=${authenticatedRole.id}) links: ${role1Links.c}`);
    console.log(`Public (id=${publicRole.id}) links: ${role2Links.c}`);
    for (const def of CUSTOM_ROLES_TO_ENSURE) {
      const rid = roleNames[def.name];
      if (rid) {
        const c = await knex.count('* as c').from('up_permissions_role_links').where('role_id', rid).first();
        console.log(`${def.name} (id=${rid}) links: ${c.c}`);
      }
    }

    await knex.destroy();
    console.log('\n✅ Done! Restart Strapi to apply changes.');
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();
