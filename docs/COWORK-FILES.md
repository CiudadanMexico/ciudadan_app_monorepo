# Módulo CoWork — Archivos relacionados

Listado completo de archivos de código (backend y frontend) que componen o se relacionan con el módulo **CoWork**, según la exploración real del repositorio (`ciudadan_backend_26/src/` y `ciudadan_frontend/src/`).

> Se incluyen archivos exclusivos del módulo CoWork y submódulos relacionados (agencia, postulacion, wallet/laborys, cartera, ganar). Se excluyen archivos de módulos ajenos (ej. `conductores-cercanos` — módulo taxi/trip).

---

## 📦 Backend — `ciudadan_backend_26/src/`

### Content-types (schemas + lifecycles) — Módulo principal

| Archivo | Rol |
|---|---|
| `src/api/todo/content-types/todo/schema.json` | Schema de la tarea original (`todo`) |
| `src/api/todo/content-types/todo/lifecycles.js` | Hooks de `todo` |
| `src/api/tarea/content-types/tarea/schema.json` | Schema de la resolución (`tarea`) — incluye relación `agencia` |
| `src/api/tarea/content-types/tarea/lifecycles.js` | Máquina de estados (8 estados) + pago automático de laborys |
| `src/api/area/content-types/area/schema.json` | Schema de áreas/subáreas |
| `src/api/area/content-types/area/lifecycles.js` | 5 áreas raíz fijas + anti-circular |
| `src/api/skill/content-types/skill/schema.json` | Schema de habilidades (habilidad para CoWork) |
| `src/api/cartera/content-types/cartera/schema.json` | Wallet de laborys (`cartera`) |

### Controllers — Módulo principal

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

### Routes — Módulo principal

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

### Services — Módulo principal

| Archivo | Rol |
|---|---|
| `src/api/todo/services/todo.js` | Servicio `todo` |
| `src/api/tarea/services/tarea.js` | Servicio `tarea` |
| `src/api/area/services/area.js` | Servicio `area` |
| `src/api/skill/services/skill.js` | Servicio `skill` |
| `src/api/cartera/services/cartera.js` | Servicio `cartera` |

---

### Submódulos relacionados (CoWork + ecosistema laborys)

#### Agencia (`agencia`) — Cooperativa / agencia de trabajo

| Archivo | Rol |
|---|---|
| `src/api/agencia/content-types/agencia/schema.json` | Schema: `localidad`, `miembros_json`, `miembros` |
| `src/api/agencia/content-types/agencia/lifecycles.js` | Hooks de agencia |
| `src/api/agencia/controllers/agencia.js` | CRUD `agencia` |
| `src/api/agencia/routes/agencia.js` | Rutas `agencia` |
| `src/api/agencia/services/agencia.js` | Servicio `agencia` |

> Relación: `tarea.schema.json` incluye campo `agencia` (relación con agencia cooperativa).

---

#### Postulaciones (`postulacion`) — Aplicaciones a tareas / puestos

| Archivo | Rol |
|---|---|
| `src/api/postulacion/content-types/postulacion/schema.json` | Schema: `postulante`, `posicion`, `archivos`, `revision`, `status`, `revisada`, `citada` |
| `src/api/postulacion/content-types/postulacion/lifecycles.js` | Hooks de postulacion |
| `src/api/postulacion/controllers/postulacion.js` | CRUD `postulacion` |
| `src/api/postulacion/routes/postulacion.js` | Rutas `postulacion` |
| `src/api/postulacion/services/postulacion.js` | Servicio `postulacion` |

---

#### Gen-Wallet (`gen-wallet`) — Ecosistema laborys / wallet

| Archivo | Rol |
|---|---|
| `src/api/gen-wallet/content-types/gen-wallet/schema.json` | Schema: `WalletIdx`, `Coin` |
| `src/api/gen-wallet/content-types/gen-wallet/lifecycles.js` | Hooks wallet |
| `src/api/gen-wallet/controllers/gen-wallet.js` | CRUD wallet |
| `src/api/gen-wallet/routes/gen-wallet.js` | Rutas wallet |
| `src/api/gen-wallet/services/gen-wallet.js` | Servicio wallet |

---

#### World-Coin-Wallet (`world-coin-wallet`) — Ecosistema laborys / cartera

| Archivo | Rol |
|---|---|
| `src/api/world-coin-wallet/content-types/world-coin-wallet/schema.json` | Schema: `CarteraIdx`, `ammount`, `genesis`, `user_idd` |
| `src/api/world-coin-wallet/content-types/world-coin-wallet/lifecycles.js` | Hooks cartera |
| `src/api/world-coin-wallet/controllers/world-coin-wallet.js` | CRUD cartera |
| `src/api/world-coin-wallet/routes/world-coin-wallet.js` | Rutas cartera |
| `src/api/world-coin-wallet/services/world-coin-wallet.js` | Servicio cartera |

---

### Policies (compartidas, usadas por rutas CoWork y submódulos)

| Archivo | Permite |
|---|---|
| `src/policies/is-authenticated-auth0.js` | Cualquier autenticado Auth0 |
| `src/policies/is-admin-or-socio.js` | admin, socio |
| `src/policies/is-verificador.js` | admin, verificador |
| `src/policies/is-admin-or-socio-or-verificador.js` | admin, socio, verificador |
| `src/policies/auth.js` | Helper de auth Auth0 |

---

### Scripts auxiliares de permisos / flujo CoWork

| Archivo | Rol |
|---|---|
| `fix-perms.js` | Crea/enlaza permisos CoWork (tarea/todo/area/skill) a roles Strapi |
| `list-perms.js` | Lista permisos |
| `list-perms2.js` | Lista permisos (variante) |
| `assign-roles.js` | Asigna roles nativos |
| `test-cowork-e2e.js` | Test E2E del flujo CoWork |

---

## 🖥️ Frontend — `ciudadan_frontend/src/`

### Páginas (ruta-level) — Módulo principal

| Archivo | Rol |
|---|---|
| `src/Pages/Coowork/Coowork.jsx` | Hub principal del módulo CoWork |
| `src/Pages/Coowork/AgregarTarea.jsx` | Formulario de creación de `todo` |
| `src/Pages/Coowork/Agencia.jsx` | Vista de agencia cooperativa |
| `src/Pages/CoWork/Skills/SkillsManagement.jsx` | Gestión de habilidades |

---

### Páginas — Submódulo Herramientas (socio / gestión de tareas)

| Archivo | Rol |
|---|---|
| `src/Pages/Herramientas/CalificarTarea.jsx` | Calificar resolución (`useTodos.rateTask`) |
| `src/Pages/Herramientas/CorregirTarea.jsx` | Corregir resolución (`useTodos.corregirTarea`) |
| `src/Pages/Herramientas/GestionTareas.jsx` | Gestión CRUD de tareas (`useTarea`) |
| `src/Pages/Herramientas/ResolverApelaciones.jsx` | Resolver apelaciones (`useTodos.apelaciones`) |

---

### Páginas — Submódulo Cartera / Laborys (wallet)

| Archivo | Rol |
|---|---|
| `src/Pages/Cartera/Billetera.jsx` | Vista de billetera / wallet laborys |
| `src/Pages/Cartera/ITokens.jsx` | Tokens (enlace a `/cartera/freeboocks`) |
| `src/Pages/Cartera/FreeBoocks/Catalogo.jsx` | Catálogo de cartera / free books |

---

### Páginas — Submódulo Gana (ganar laborys)

| Archivo | Rol |
|---|---|
| `src/Pages/Gana/Gana.jsx` | Hub "Ganar con Ciudadan" (anuncios, encuestas) |
| `src/Pages/Gana/GeneraContenidos.jsx` | Generación de contenidos (gana laborys) |
| `src/Pages/Gana/PromueveMembresias.jsx` | Promoción de membresías |
| `src/Pages/Gana/VendePage.jsx` | Venta / comercio |

---

### Componentes — Módulo principal

| Archivo | Rol |
|---|---|
| `src/components/Cowork/Tareas.jsx` | Listado de tareas |
| `src/components/Cowork/TareasEspecializadas.jsx` | Tareas especializadas (filtro por área/subárea/skill) |
| `src/components/Cowork/HerramientrasGrid.jsx` | Grid de herramientas (socio) |
| `src/components/Cowork/ConductoresAgencia.jsx` | Conductores de agencia |
| `src/components/Cowork/Upload/TaskUpload.jsx` | Subida de evidencias (media múltiple) |
| `src/components/Cowork/Verification/UserVerification.jsx` | Verificación documental de área |

---

### Componentes — Submódulo Cartera / Laborys

| Archivo | Rol |
|---|---|
| `src/components/Cartera/CrearBilleteraCentralWld.jsx` | Creación de billetera central (ethers.js) |
| `src/components/Cartera/ImagenInteractiva.jsx` | Imagen interactiva (mapa de roles) |
| `src/components/Cartera/IngresosInfo.jsx` | Info de ingresos / agencias cooperativas |

---

### Componentes — Submódulo Gana

| Archivo | Rol |
|---|---|
| `src/components/Ganar/Ganar.jsx` | Hub "Ganar con Ciudadan" — opciones: anuncios, encuestas (hasta 50 Laborys) |

---

### Componentes — Otros relacionados

| Archivo | Rol |
|---|---|
| `src/components/LaboryBadge.jsx` | Badge / logo de moneda laborys (SVG animado) |

---

### Hooks — Módulo principal

| Archivo | Rol |
|---|---|
| `src/hooks/useTodos.jsx` | CRUD de `todo` + `rateTask()` (calificar) + apelaciones |
| `src/hooks/useTarea.jsx` | CRUD de `tarea` (resolución) — `fetchTareas`, `eliminarTarea`, `canCRUD` |
| `src/hooks/useSkills/useSkills.js` | Hook de habilidades |

---

### Hooks — Submódulos relacionados

| Archivo | Rol |
|---|---|
| `src/hooks/useAgencia.jsx` | Fetch de socios (token Auth0, audience `https://api.ciudadan.org`) |

---

### Services — Módulo principal

| Archivo | Rol |
|---|---|
| `src/services/cowork/queryServices.js` | Queries (GET) CoWork |
| `src/services/cowork/mutationsServices.js` | Mutaciones (POST/PUT/DELETE) — incluye `apelarTarea` |

---

### Utils — Módulo principal

| Archivo | Rol |
|---|---|
| `src/utils/cowork.helpers.js` | `getAttributes()`, `normalizeAreas()`, helpers Strapi v4 |

---

### Utils — Submódulo verificación / tareas

| Archivo | Rol |
|---|---|
| `src/utils/cowork/areaVerification.js` | `initializeAreaDetails()`, `addAreaVerification()` — gestión JSON `area_details` |
| `src/utils/cowork/taskStatus.js` | Enum `TASK_STATUS` (11 estados: borrador, publicada, asignada, en_proceso, pendiente_revision, corregir, corregida, calificada, pagada, cancelada, modificada) + `getStatusLabel()` |
| `src/utils/cowork/canUserTakeTask.selftest.js` | Self-test de capacidad de usuario para tomar tareas |

---

### Context (gateo de UI por rol — transversal, usado por CoWork)

| Archivo | Rol |
|---|---|
| `src/Contexts/RolesContext.jsx` | `isAdmin()`, `isSocio()`, `isVerificador()`, `isEditor()`, `isRoot()` |

---

### Routes (archivo central de rutas — define rutas CoWork)

| Archivo | Rol |
|---|---|
| `src/Routes/index.jsx` | Definición de rutas del módulo CoWork (`/cowork`, `/herramientas/*`, `/cartera/*`, `/gana/*`, etc.) |

---

## 📚 Documentación de referencia

- `docs/documento-off.md` — Spec canonical CoWork
- `docs/final-cowork.md` — Estado de implementación
- `docs/RESUMEN-AVANCES-COWORK.md` — Avances
- `docs/TAREAS-CRUD-PERMISOS.md` — Auth/permisos detalle
- `docs/DATABASE-SCHEMA.md` — Esquema de base de datos (60 tablas)
- `docs/AGENDA-VALIDATION-SYNC.md` — Migración de agenda
- `docs/COWORK-FILES.md` — Este documento (archivo de referencia de archivos)

---

## 📊 Resumen de archivos por categoría

| Categoría | Archivos |
|---|---|
| Backend — Content-types (principal) | 8 |
| Backend — Controllers (principal) | 14 |
| Backend — Routes (principal) | 14 |
| Backend — Services (principal) | 5 |
| Backend — Submódulo `agencia` | 5 |
| Backend — Submódulo `postulacion` | 5 |
| Backend — Submódulo `gen-wallet` | 5 |
| Backend — Submódulo `world-coin-wallet` | 5 |
| Backend — Policies | 5 |
| Backend — Scripts auxiliares | 5 |
| **Subtotal Backend** | **71** |
| Frontend — Páginas (principal) | 4 |
| Frontend — Páginas Herramientas | 4 |
| Frontend — Páginas Cartera | 3 |
| Frontend — Páginas Gana | 4 |
| Frontend — Componentes (principal) | 6 |
| Frontend — Componentes Cartera | 3 |
| Frontend — Componentes Gana | 1 |
| Frontend — Componentes Otros | 1 |
| Frontend — Hooks (principal) | 3 |
| Frontend — Hooks Submódulos | 1 |
| Frontend — Services | 2 |
| Frontend — Utils (principal) | 1 |
| Frontend — Utils Submódulos | 3 |
| Frontend — Context | 1 |
| Frontend — Routes | 1 |
| **Subtotal Frontend** | **42** |
| **Total archivos relacionados con CoWork** | **113** |

> Nota: `conductores-cercanos` (taxi/trip) NO se incluye — es un módulo independiente que usa `GOOGLE_MAPS_API_KEY` y `socket-service`, no relacionado con CoWork.

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

## roles:

- ´´


Mismas agencias:

---------------------------------------------------------
Tareas generales:
todos los socios califican las tareas de esa agencia
cualquier usario als resuelve

tareas especializadas:
sin asignar
todos los socios del area de la tarea las pueden calificar
cualquier usario con esa especialidad las resuelve

tareas asignadas:
Solamente las califica quien las asigno
Solamente el socio las puede calificar
tareas asignadas a usarios especificos

---------------------------------------------------------

Agencias Federales:

Puede calificar todas las tareas generales
Pueden calificar todas las tareas generales de toda la red (todas as agencias)
Todas las tareas de su area (socio de area de toda la la red)