# CRUD de Tareas — Permisos (Admin / Socio)

## Objetivo

Restringir `create`, `update` y `delete` de las colecciones `todo` y `tarea` a usuarios con rol
`admin` o `socio`. Lectura (`find`/`findOne`) se mantiene pública, según la especificación del
módulo CoWork: *"Las tareas generales se muestran a todo el mundo, incluso a visitantes no
registrados."*

## Cómo se determina hoy "admin" o "socio"

No existe un sistema formal de roles en este proyecto. Todo pasa por un campo JSON libre:

- **`up_users.roles`** (tipo `json`, sin schema/validación) — se espera la forma `{ "extra": [...] }`.
- El frontend (`RolesContext.jsx`) calcula `isAdmin()`, `isEditor()`, `isRoot()` como
  `roles.extra.includes('admin' | 'editor' | 'root')`.
- **`socio` no existía como valor antes de este cambio.** Se agrega aquí como un valor más de
  `roles.extra`, mismo mecanismo que `admin`/`editor`/`root`.
- ⚠️ **No confundir con `membresiatipo: 'socio'`** — ese es un campo distinto (tipo de membresía de
  club de cannabis: `consumo | cultivo | jardinero | socio`), sin relación con permisos de Cowork.

Para dar acceso a un usuario hoy: Strapi Admin → Gestor de Contenidos → `User` → editar → campo
`roles` → `{ "extra": ["socio"] }` (o `"admin"`).

## Implementación

- **Policy**: `src/policies/is-admin-or-socio.js`
  - Lee `Authorization: Bearer <token>` (el access token de Auth0 que ya manda el frontend).
  - Valida el token llamando a `https://{AUTH0_DOMAIN}/userinfo` (reutiliza el patrón que ya
    existía, sin usar, en `extensions/users-permissions/controllers/auth0.js`).
  - Busca al usuario de Strapi por `email`.
  - Permite continuar solo si `roles.extra` contiene `'admin'` o `'socio'`; si no, `403 Forbidden`.
  - Si el token no es válido o no hay usuario con ese email → `401 Unauthorized`.
- **Rutas protegidas**: `src/api/tarea/routes/tarea.js` y `src/api/todo/routes/todo.js` — la policy
  se aplica solo a `create`/`update`/`delete` vía la config de `createCoreRouter`. `find`/`findOne`
  no tienen policy (dependen solo del permiso nativo de Strapi para el rol Public/Authenticated).

## Requisitos para que esto funcione en la práctica (pendientes, viven en el panel de Strapi, no en código)

1. **Permisos nativos de Strapi**: Settings → Roles → `Authenticated` → habilitar `create`,
   `update`, `delete` en `Todo` y `Tarea`. La policy corre *después* de este check nativo — si
   Strapi bloquea aquí primero, la policy nunca se ejecuta.
2. **Al menos un usuario de prueba con `roles.extra` real** (`{"extra": ["socio"]}` o `["admin"]`)
   para poder comparar "con permiso" vs "sin permiso".

## Bugs encontrados en el camino (relacionados, sin resolver)

Durante la investigación aparecieron **4 intentos distintos** de conectar Auth0 con Strapi en este
backend. Solo uno está realmente conectado, y tiene un bug:

| Archivo | Estado |
|---|---|
| `src/api/auth/routes/auth.js` + `controllers/auth.js` (`POST /auth/auth0-login`) | **Conectado y se ejecuta** en cada login (llamado desde `Contexts/AuthContext.jsx`), pero **roto**: el frontend manda el token en el header `Authorization`, el backend lo busca en `ctx.request.body.access_token` → siempre falla silenciosamente. |
| `src/middlewares/auth0jwt/` + `src/policies/auth.js` | Código muerto — el archivo que lo registraría (`src/config/midleware.js`) está mal ubicado (debería estar en `config/middlewares.js`, no en `src/config/`) y todo comentado. |
| `src/extensions/users-permissions/controllers/auth0.js` + `routes/auth0.js` | Código muerto — `strapi-server.js` de esa extensión solo registra `assignAreas`, nunca engancha este controller/ruta. |
| `src/extensions/auth0-authentication/services/auth0.js` | Código muerto — no tiene ningún `strapi-server.js` ni ruta que lo invoque. |

Los tres códigos muertos además usan dominios de Auth0 hardcodeados con typos distintos entre sí
(`ciudadan.auth0.com`, `ciudadadan.us.auth0.com`), evidencia de intentos previos abandonados.

**Nota**: el `access_token` de Auth0 que el frontend ya manda en los headers de `useTodos.jsx`
funciona perfectamente para la policy `is-admin-or-socio` (llama a `/userinfo` directo), así que
**no depende de arreglar el bug de `/auth/auth0-login`** para operar. Ese bug queda documentado
aparte porque afecta al flujo de `AuthContext.jsx`/`strapiUser`, no al de esta policy.

## Simulación en frontend (solo para visualizar UI, no seguridad real)

En `Pages/Coowork/Coowork.jsx`, el query param `?mockRole=admin|socio|usuario` controla si se
muestra el botón "Editar" en las cards de Tareas Generales. Es **puramente cosmético** — no llama
al backend ni respeta `roles.extra` real. Sirve para revisar diseño antes de que el permiso real
esté configurado en Strapi.

## Pendientes / decisiones abiertas

- Arreglar el bug de `/auth/auth0-login` (leer el token del header, no del body) si se quiere usar
  ese flujo de sincronización.
- Decidir si `roles.extra` se queda como JSON libre o se formaliza (enum, colección de roles,
  o roles nativos nativos de Strapi vía `plugin::users-permissions.role`).
- Quitar el `?mockRole=` del frontend y conectar `tienePermisoCRUD` al rol real una vez que haya
  usuarios de prueba configurados en Strapi.
