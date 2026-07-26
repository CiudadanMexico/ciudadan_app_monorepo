# Módulo CoWork — Archivos relacionados

Listado de archivos de código (backend y frontend) que componen el módulo **CoWork**, según la documentación oficial (`docs/documento-off.md`).

> Solo archivos con código. Se excluyen `README.md`, `.md` de docs, `build/`, `node_modules/`, etc.

---

## 📦 Backend — `ciudadan_backend_26/`

### Content-types (schemas + lifecycles)

| Archivo | Rol |
|---|---|
| `src/api/todo/content-types/todo/schema.json` | Schema de la tarea original (`todo`) |
| `src/api/todo/content-types/todo/lifecycles.js` | Hooks de `todo` |
| `src/api/tarea/content-types/tarea/schema.json` | Schema de la resolución (`tarea`) |
| `src/api/tarea/content-types/tarea/lifecycles.js` | Máquina de estados + pago automático de laborys |
| `src/api/area/content-types/area/schema.json` | Schema de áreas/subáreas |
| `src/api/area/content-types/area/lifecycles.js` | 5 áreas raíz fijas + anti-circular |
| `src/api/skill/content-types/skill/schema.json` | Schema de habilidades |
| `src/api/cartera/content-types/cartera/schema.json` | Wallet de laborys |

### Controllers

| Archivo | Endpoint / función |
|---|---|
| `src/api/todo/controllers/todo.js` | CRUD nativo `todo` |
| `src/api/tarea/controllers/tarea.js` | CRUD nativo `tarea` |
| `src/api/tarea/controllers/resolver.js` | `POST /tareas/resolver` (01) |
| `src/api/tarea/controllers/completar.js` | `POST /tareas/completar` (02) |
| `src/api/tarea/controllers/calificar.js` | `POST /tareas/calificar` (03) — pago laborys |
| `src/api/tarea/controllers/corregir.js` | `POST /tareas/corregir` (04) |
| `src/api/tarea/controllers/find-filtered.js` | `GET /tareas` filtrado (05) |
| `src/api/tarea/controllers/subir-evidencia.js` | `POST /tareas/subir-evidencia` (06) |
| `src/api/tarea/controllers/apelar.js` | `POST /tareas/apelar` (07) |
| `src/api/tarea/controllers/resolver-apelacion.js` | `POST /tareas/resolver-apelacion` (08) |
| `src/api/area/controllers/area.js` | CRUD nativo `area` |
| `src/api/area/controllers/verificar-area.js` | Verificación documental de área |
| `src/api/skill/controllers/skill.js` | CRUD nativo `skill` |
| `src/api/cartera/controllers/cartera.js` | CRUD nativo `cartera` |

### Routes

| Archivo | Ruta custom |
|---|---|
| `src/api/todo/routes/todo.js` | Rutas nativas `todo` |
| `src/api/tarea/routes/tarea.js` | Rutas nativas `tarea` |
| `src/api/tarea/routes/01-tarea-resolver.js` | `/tareas/resolver` |
| `src/api/tarea/routes/02-tarea-completar.js` | `/tareas/completar` |
| `src/api/tarea/routes/03-tarea-calificar.js` | `/tareas/calificar` |
| `src/api/tarea/routes/04-tarea-corregir.js` | `/tareas/corregir` |
| `src/api/tarea/routes/05-tarea-find-filtered.js` | `/tareas` (find filtrado) |
| `src/api/tarea/routes/06-tarea-subir-evidencia.js` | `/tareas/subir-evidencia` |
| `src/api/tarea/routes/07-tarea-apelar.js` | `/tareas/apelar` |
| `src/api/tarea/routes/08-tarea-resolver-apelacion.js` | `/tareas/resolver-apelacion` |
| `src/api/area/routes/area.js` | Rutas nativas `area` |
| `src/api/area/routes/01-area-verificar.js` | `/areas/verificar` |
| `src/api/skill/routes/skill.js` | Rutas nativas `skill` |
| `src/api/cartera/routes/cartera.js` | Rutas nativas `cartera` |

### Services

| Archivo | Rol |
|---|---|
| `src/api/todo/services/todo.js` | Servicio `todo` |
| `src/api/tarea/services/tarea.js` | Servicio `tarea` |
| `src/api/area/services/area.js` | Servicio `area` |
| `src/api/skill/services/skill.js` | Servicio `skill` |
| `src/api/cartera/services/cartera.js` | Servicio `cartera` |

### Policies (compartidas, usadas por rutas CoWork)

| Archivo | Permite |
|---|---|
| `src/policies/is-authenticated-auth0.js` | Cualquier autenticado Auth0 |
| `src/policies/is-admin-or-socio.js` | admin, socio |
| `src/policies/is-verificador.js` | admin, verificador |
| `src/policies/is-admin-or-socio-or-verificador.js` | admin, socio, verificador |
| `src/policies/auth.js` | Helper de auth Auth0 |

### Scripts auxiliares de permisos

| Archivo | Rol |
|---|---|
| `fix-perms.js` | Crea/enlaza permisos CoWork (tarea/todo/area/skill) a roles Strapi |
| `list-perms.js` | Lista permisos |
| `list-perms2.js` | Lista permisos (variante) |
| `assign-roles.js` | Asigna roles nativos |
| `test-cowork-e2e.js` | Test E2E del flujo CoWork |

---

## 🖥️ Frontend — `ciudadan_frontend/`

### Páginas (ruta-level)

| Archivo | Rol |
|---|---|
| `src/Pages/Coowork/Coowork.jsx` | Hub principal del módulo CoWork |
| `src/Pages/Coowork/AgregarTarea.jsx` | Formulario de creación de `todo` |
| `src/Pages/Coowork/Agencia.jsx` | Vista de agencia |
| `src/Pages/CoWork/Skills/SkillsManagement.jsx` | Gestión de habilidades |

### Componentes

| Archivo | Rol |
|---|---|
| `src/components/Cowork/Tareas.jsx` | Listado de tareas |
| `src/components/Cowork/TareasEspecializadas.jsx` | Tareas especializadas (filtro por área/subárea/skill) |
| `src/components/Cowork/HerramientrasGrid.jsx` | Grid de herramientas (socio) |
| `src/components/Cowork/ConductoresAgencia.jsx` | Conductores de agencia |
| `src/components/Cowork/Upload/TaskUpload.jsx` | Subida de evidencias (media múltiple) |
| `src/components/Cowork/Verification/UserVerification.jsx` | Verificación documental de área |

### Hooks

| Archivo | Rol |
|---|---|
| `src/hooks/useTodos.jsx` | CRUD de `todo` + `rateTask()` (calificar) |
| `src/hooks/useTarea.jsx` | CRUD de `tarea` (resolución) |
| `src/hooks/useSkills/useSkills.js` | Hook de habilidades |

### Services

| Archivo | Rol |
|---|---|
| `src/services/cowork/queryServices.js` | Queries (GET) CoWork |
| `src/services/cowork/mutationsServices.js` | Mutaciones (POST/PUT/DELETE) — incluye `apelarTarea` |

### Utils

| Archivo | Rol |
|---|---|
| `src/utils/cowork.helpers.js` | `getAttributes()`, `normalizeAreas()`, helpers Strapi v4 |

### Context (gateo de UI por rol)

| Archivo | Rol |
|---|---|
| `src/Contexts/RolesContext.jsx` | `isAdmin()`, `isSocio()`, `isVerificador()`, `isEditor()`, `isRoot()` |

---

## 📚 Documentación de referencia

- `docs/documento-off.md` — Spec canonical CoWork
- `docs/final-cowork.md` — Estado de implementación
- `docs/RESUMEN-AVANCES-COWORK.md` — Avances
- `docs/TAREAS-CRUD-PERMISOS.md` — Auth/permisos detalle
