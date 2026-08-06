# Roles Socio / Verificador — Setup manual en Strapi Admin

> Tarea operacional bloqueante del módulo CoWork: asignar los roles
> **Socio** y **Verificador** a usuarios específicos en Strapi Admin.
>
> No es código. Es **configuración manual** que se hace una sola vez por
> entorno (local / staging / producción). El doc canónico
> (`docs/documento-off.md:178`) ya está marcado `[x]`; este archivo
> detalla **cómo** ejecutarlo en cualquier instancia.

---

## 0. Resumen

Hay **dos** representaciones del rol en Ciudadan, y **ambas deben
coincidir** para que el frontend (`RolesContext.isSocio()` /
`isVerificador()`) y el backend (las policies custom
`is-admin-or-socio`, `is-verificador`, `is-admin-or-socio-or-verificador`)
gateen igual:

| Capa | Dónde vive el rol | Quién lo lee |
|---|---|---|
| **Rol nativo Strapi** (`up_roles.name` = `Socio` / `Verificador`) | DB `up_roles`, enlazado al usuario en `up_users.role_links` | Starpi core → Las policies custom corren **después** del check nativo de permisos. Sin este rol, Strapi bloquea el request **antes** de que la policy custom pueda decidir. |
| **`roles.extra`** (JSON libre en `up_users.roles`) | DB `up_users.roles` (campo JSON array) | Las policies custom (`is-admin-or-socio`, `is-verificador`, etc.) y el frontend `RolesContext` leen este array para gatear UI. |

⚠️ **Setear AMBOS** (rol nativo + `roles.extra`) para que server-side y
client-side coincidan. Si solo seteas uno, tendrás rifts de permisos.

---

## 1. Requisitos previos

1. Strapi backend corriendo:
   ```bash
   cd ciudadan_backend_26
   npm run develop   # http://localhost:1337/admin
   ```
2. Tienes acceso a la cuenta admin de Strapi (la que se crea la primera
   vez con `node scripts/create-admin.js` o vía el asistente de
   primer arranque).
3. La DB existe (sqlite en `.tmp/data.db` por defecto; en prod es
   mysql/postgres — ver `config/database.js`).

---

## 2. Crear los roles `Socio` y `Verificador` (una sola vez)

Los roles nativos los crea el script **idempotente**
`ciudadan_backend_26/fix-perms.js` junto con todos los permisos CoWork
(`todo`, `tarea`, `area`, `skill`) enlazados a los cuatro roles
(`Authenticated`, `Public`, `Socio`, `Verificador`).

```bash
cd ciudadan_backend_26
node fix-perms.js
```

Salida esperada:
```
➕ Created role: Socio (id=3)
➕ Created role: Verificador (id=4)
🔗 CoWork role-permission links: ...
✅ Done! Restart Strapi to apply changes.
```

Reinicia Strapi después de correrlo:
```bash
# Ctrl+C y luego
npm run develop
```

> El script es **idempotente**: re-ejecutarlo no duplica filas, sólo
> confirma/enlaza lo que falta. Si añades un nuevo content-type CoWork,
> agregalo al array `apisToFix` y al array `coworkApis` del bloque Fix B,
> y vuelve a correrlo.

Verificación vía DB (opcional):
```bash
node -e "require('knex')({client:'sqlite3',connection:{filename:'.tmp/data.db'},useNullAsDefault:true}).select('id','name','type').from('up_roles').then(r=>{console.log(r);process.exit(0)})"
```
Debes ver 4 filas: `Public`, `Authenticated`, `Socio`, `Verificador`.

---

## 3. Asignar rol a un usuario existente (panel Admin)

1. Entrar a `http://localhost:1337/admin` (o la URL de tu entorno).
2. Sidebar → **Content Manager** → Collection type **User** (`up_users`).
3. Abrir el usuario destino.
4. En el campo **Roles**, marcar:
   - `Socio` → para que pueda crear/editar/eliminar/calificar tareas.
   - `Verificador` → para que pueda revisar documentación y validar áreas.
   - `Authenticated` → **siempre** debe quedar marcado (es el rol base
     que engancha las policies custom).
5. Guardar.

---

## 4. Setear `roles.extra` al mismo usuario

El `roles.extra` es un JSON array libre almacenado en la columna
`up_users.roles`. Las policies custom lo leen para gatear (junto con
`role.name`). Para que coincida con el rol nativo del paso 3:

1. En el mismo registro de usuario del paso 3, abrir el campo
   **Roles (extra)** o **roles (json)**.
2. Pegar el array JSON correspondiente:
   - **Socio**: `["socio"]`
   - **Verificador**: `["verificador"]`
   - **Admin**: `["admin"]`
   - Combinado (raro, sólo si el usuario cumple dos funciones):
     `["socio","verificador"]`
3. Guardar.

> ⚠️ Si Strapi Admin no muestra el campo `roles.extra` en el formulario
> de usuario (porque no está expuesto en el content-type
> `user.settings.json`), hay dos alternativas:
>
> **A) Exponerlo temporalmente** — en `src/extensions/users-permissions/models/user.settings.json`, añadir a `attributes`:
> ```json
> "roles": { "type": "json", "editable": true }
> ```
> Reiniciar Strapi. Aparecerá en el form. Tras editar puedes revertir.
>
> **B) Directamente vía SQL** (más rápido en prod):
> ```sql
> -- mysql/postgres
> UPDATE up_users
> SET roles = JSON_ARRAY('socio')        -- o 'verificador', o JSON_ARRAY('socio','verificador')
> WHERE email = 'usuario@dominio.com';
> ```
> Para **sqlite** (dev local):
> ```sql
> UPDATE up_users
> SET roles = '["socio"]'
> WHERE email = 'usuario@dominio.com';
> ```

---

## 5. Verificación final

Para confirmar que un usuario tiene ambos roles seteados correctamente:

```sql
SELECT id, email, username, role_links.role_id, up_roles.name AS role_name, roles
FROM up_users
LEFT JOIN role_links ON role_links.user_id = up_users.id
LEFT JOIN up_roles ON up_roles.id = role_links.role_id
WHERE email = 'usuario@dominio.com';
```

Debes ver **una fila por cada rol nativo** vinculado (p.ej. 2 filas si
tiene `Authenticated`+`Socio`) y en la columna `roles` el JSON `["socio"]`.

Desde el frontend, loguea con ese usuario y en la consola del navegador:
```js
localStorage.getItem('roles_extra')   // si RolesContext lo cachea
// o revisa el hook:
window.__ROLES__?.isSocio()   // si expuesto para debug
```

El endpoint de validación server-side directo (para confirmar que las
policies corren):
```bash
# Calificar requiere is-admin-or-socio → si responde 200 o 403 (no 401), las policies están activas.
curl -X POST http://localhost:1337/api/tareas/calificar \
  -H "Authorization: Bearer <Auth0-access-token>" \
  -H "Content-Type: application/json" \
  -d '{"tareaId":1,"score":5}'
```
- `401` → Auth0 falló (token inválido).
- `403` + mensaje "rol insuficiente" → policies corren pero falta el rol.
- `200` → todo OK.

---

## 6. Quick reference — quién puede qué

| Acción | Policy custom | Roles nativos aceptados | `roles.extra` aceptados |
|---|---|---|---|
| Resolver / completar tarea | `is-authenticated-auth0` | `Authenticated`, `Socio`, `Verificador` | cualquiera (sólo requiere Auth0 válido) |
| Crear/editar/eliminar `todo` / `area` | `is-admin-or-socio` | `Admin`, `Socio` | `admin`, `socio` |
| Calificar tarea (`POST /api/tareas/calificar`) | `is-admin-or-socio` | `Admin`, `Socio` | `admin`, `socio` |
| Resolver apelación (`POST /api/tareas/resolver-apelacion`) | `is-admin-or-socio` | `Admin`, `Socio` | `admin`, `socio` |
| Corregir tarea (`POST /api/tareas/corregir`) | `is-verificador` | `Admin`, `Verificador` | `admin`, `verificador` |
| Subir evidencia a tarea (`POST /api/tareas/subir-evidencia`) | `is-admin-or-socio-or-verificador` | `Admin`, `Socio`, `Verificador` | `admin`, `socio`, `verificador` |
| Actualizar `tarea` (`PUT /api/tareas/:id`) | `is-admin-or-socio-or-verificador` | `Admin`, `Socio`, `Verificador` | `admin`, `socio`, `verificador` |

---

## 7. Checklist

- [ ] Strapi backend corriendo en el entorno destino.
- [ ] `node fix-perms.js` ejecutado y sin errores (roles `Socio` y
     `Verificador` presentes en `up_roles`).
- [ ] Strapi reiniciado después del script.
- [ ] Para cada usuario que debe ser **Socio**:
   - [ ] Marcado `Socio` + `Authenticated` en el campo **Roles** del admin.
   - [ ] `roles` (JSON) = `["socio"]`.
- [ ] Para cada usuario que debe ser **Verificador**:
   - [ ] Marcado `Verificador` + `Authenticated` en el campo **Roles** del admin.
   - [ ] `roles` (JSON) = `["verificador"]`.
- [ ] Smoke test: usuario logueado en el frontend puede ver el subtab
     **"Calificar Tareas"** si es socio (sólo lo ve `tienePermisoCRUD =
     isAdmin() || isSocio()` en `src/Pages/Coowork/Coowork.jsx`).
- [ ] Smoke test: PETición a `/api/tareas/calificar` responde 200 (no 403)
     con ese usuario socio.

---

## 8. Notas

- La distinción **rol nativo** vs **`roles.extra`** es histórica: el
  sistema empezó sólo con `roles.extra` (JSON libre), y luego se añadieron
  roles nativos porque las policies de Strapi corren después del check
  de `up_permissions`+`up_permissions_role_links`. Por compat con
  las policies custom existentes no se han unificado en un único
  source-of-truth (ver `docs/documento-off.md:152` — "Decisión
  abierta: formalizar roles.extra vs enum/colección nativa").
- **No** uses `membresiatipo: 'socio'` (campo de membresía de cannabis
  club) como sustituto. Son conceptos distintos — ver `AGENTS.md` sección
  Domain Concepts.
