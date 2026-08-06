# Fix B — Políticas nativas de Strapi para CoWork

> **Objetivo**: habilitar los permisos nativos (`up_permissions`) que Strapi chequea **antes** de
> ejecutar las policies custom (`is-admin-or-socio`, `is-verificador`, `is-authenticated-auth0`, …).
> Sin el permiso nativo en el rol, Strapi bloquea el request 403 y la policy custom nunca corre.

Existen **3 vías** para dejar estos permisos en su lugar; **2 son automáticas y 1 manual**.
Recomendado: vía programática (`fix-perms.js`) en cada despliegue. La vía declarativa (`roles.json`)
sirve de semilla en instalaciones nuevas. La vía manual (panel admin) solo se necesita si
quieres tocar permisos extra desde la UI.

---

## 1) Vía programática (recomendada) — `fix-perms.js`

Desde la raíz del backend (`ciudadan_backend_26/`):

```bash
node fix-perms.js
```

Qué hace el script (idempotente — re-ejecutable):

- Lee `apisToFix[]` (línea 5) que incluye `todo`/`tarea`/`area`/`skill` con sus acciones.
- Crea los permisos faltantes en `up_permissions` con `action = api::<api>.<api>.<accion>`.
- Crea los roles custom `Socio` y `Verificador` en `up_roles` si no existen
  (bloque `CUSTOM_ROLES_TO_ENSURE`, línea 96).
- Enlaza cada permiso a los roles correspondientes en `up_permissions_role_links`:
  - `find`/`findOne` → `Public` + `Authenticated` + `Socio` + `Verificador`.
  - `create`/`update`/`delete` → `Authenticated` + `Socio` + `Verificador` (según proceda).
- Imprime un SUMMARY con el total de permisos y enlaces por rol.

**Añadir un content-type CoWork nuevo**:

1. Agregarlo al array `apisToFix[]` (línea 5) con sus acciones.
2. Agregarlo al array `coworkApis` (línea 308) si debe tener los enlaces custom.
3. Volver a correr `node fix-perms.js` y reiniciar Strapi.

---

## 2) Vía declarativa (semilla) — `roles.json`

Archivo: `src/extensions/users-permissions/config/roles.json`

Strapi 4 lo lee al **primera inicialización** del plugin `users-permissions` y aplica los permisos
definidos por rol. Estructura:

```json
{
  "Authenticated": {
    "permissions": {
      "application": {
        "api::todo.todo":  ["find", "findOne"],
        "api::tarea.tarea": ["find", "findOne", "create"],
        ...
      }
    }
  },
  "Public": { ... },
  "Socio": { ... },
  "Verificador": { ... }
}
```

**Caveats**:

- Strapi **no** sobreescribe permisos ya asignados manualmente; este archivo solo crea los que falten
  en una instalación nueva.
- Tras editar este archivo en un entorno ya inicializado, forzar re-sync manualmente desde el panel
  (ver abajo) o correr `fix-perms.js`.

---

## 3) Vía manual — panel admin de Strapi

Solo necesaria si quieres tocar permisos extra desde la UI, o si no puedes correr `fix-perms.js`.

### 3.1 Habilitar permisos por rol

1. Abrir panel admin (`http://localhost:1337/admin`).
2. Sidebar → **Settings** (engrane abajo-izquierda).
3. Sección **Users-permissions** → **Roles**.
4. Abrir cada rol y habilitar las casillas según esta tabla:

| Colección \ Acción | Public | Authenticated | Socio | Verificador |
|---|---|---|---|---|
| `Todo.find` / `findOne` | ✅ | ✅ | ✅ | ✅ |
| `Todo.create` / `update` / `delete` | ✗ | ✗ | ✅ | ✗ |
| `Tarea.find` / `findOne` | ✅ | ✅ | ✅ | ✅ |
| `Tarea.create` | ✗ | ✅ | ✅ | ✅ |
| `Tarea.update` | ✗ | ✅ | ✅ | ✅ |
| `Area.find` / `findOne` | ✅ | ✅ | ✅ | ✅ |
| `Area.create` / `update` / `delete` | ✗ | ✗ | ✅ | ✗ |
| `Skill.find` / `findOne` | ✅ | ✅ | ✅ | ✅ |
| `Skill.create` / `update` / `delete` | ✗ | ✗ | ✅ | ✗ |

5. Botón **Save** en cada rol (arriba-derecha).

> ⚠️ Las policies custom corren **después** del check nativo. Si no marcas la casilla aquí, Strapi
> bloquea 403 y la policy nunca se ejecuta.

### 3.2 Crear roles Socio y Verificador

Si `fix-perms.js` no se corrió, los roles `Socio` y `Verificador` no existen:

1. **Settings → Users-permissions → Roles** → botón **Add new role**.
2. Name: `Socio` → Description: `Crea/edita/califica tareas CoWork`.
3. En **Permissions**, marcar las acciones de la columna `Socio` de la tabla de arriba.
4. **Save**. Repetir con `Verificador`.

### 3.3 Asignar rol a un usuario

1. Sidebar → **Content Manager** → **User** (collection type bajo `Users-permissions`).
2. Abrir el usuario → campo **Role** → elegir `Socio` o `Verificador`.
3. **Save**.
4. ⚠️ Además setear `roles = {"extra": ["socio"]}` (o `"verificador"`, `"admin"`) en el campo
   `roles` (JSON libre) — el frontend (`RolesContext`) gatea la UI con ese valor. El rol nativo
   controla permisos server-side; `roles.extra` controla el gateo client-side. **Recomendación:
   setear ambos** para que coincidan.

---

## Orden para una fresh install

```bash
# 1) Instalar deps y levantar Strapi una vez (crea la DB y carga roles.json)
cd ciudadan_backend_26
npm install
npm run develop    # Ctrl-C cuando termine el primer boot

# 2) Aplicar permisos CoWork + crear roles Socio/Verificador
node fix-perms.js

# 3) Reiniciar
npm run develop

# 4) (manual) Asignar rol Socio/Verificador a usuarios existentes desde panel admin
```

---

## Estado de los artefactos Fix B

| Archivo | Función |
|---|---|
| `src/extensions/users-permissions/config/roles.json` | **NUEVO** — semilla declarativa de permisos por rol. |
| `fix-perms.js` | Script idempotente que aplica permisos + crea roles Socio/Verificador en DB. |
| `src/api/{todo,tarea,area}/routes/*.js` | Configuran `auth: false` + policies custom por acción. |
| `src/policies/is-*.js` | Policies custom (corren tras el check nativo). |

## Verificación rápida

Tras aplicar permisos, validar con curl:

```bash
# Lecciones generales deben funcionar sin auth (Public.find)
curl http://localhost:1337/api/todos

# Crear un todo sin auth -> 401 (policy is-admin-or-socio)
curl -X POST http://localhost:1337/api/todos -H "Content-Type: application/json" -d '{}'
```
