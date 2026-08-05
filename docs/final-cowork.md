# 📄 Documentación Final del Módulo CoWork

> **Estado**: Implementación alineada con `docs/documento-off.md` (spec oficial). Pendientes cerrados en código.
>
> **Última revisión**: verificación contra spec + fixes críticos aplicados (pago automático en backend, policy del verificador, uploads reales a Strapi Media Library, validación de 5 áreas raíz).

---

## 📌 Visión General

El módulo CoWork permite publicar, asignar, resolver y pagar tareas basadas en áreas, subáreas y habilidades verificadas. Incluye un sistema de verificación documental, flujo de calificación automática y pago en laborys.

**Arquitectura**: Monorepo con frontend (React) y backend (Strapi 4) integrados mediante APIs REST y políticas de acceso robustas.

---

## 🖥️ Frontend: `ciudadan_frontend`

### 📁 Estructura de archivos modificados y nuevos

| Archivo | Ubicación | Función | Cambios Realizados |
|--------|-----------|---------|-------------------|
| `useTodos.jsx` | `src/hooks/` | CRUD de tareas originales (`todos`) | Añadido pago automático en `rateTask()`; soporte para `media` y `skills`. |
| `useTarea.jsx` | `src/hooks/` | Gestión de resoluciones (`tareas`) | Añadido soporte para `media`, `skills`, `area_details`. |
| `RolesContext.jsx` | `src/Contexts/` | Gestión de roles y permisos | Añadido `isVerificador()`, `setVerificador()`, validación de `area_details`. |
| `cowork.helpers.js` | `src/utils/` | Utilidades comunes | Añadidas funciones: `getSkillsForUser`, `validateTaskStatusTransition`, `canUserVerifyArea`, `canUserRateTask`, `canUserPayTask`, `getTaskStatusColor`. |
| `TaskUpload.jsx` | `src/components/CoWork/Upload/` | Subida de archivos en tareas | Componente para subir múltiples archivos (JPG, PNG, PDF, DOC, DOCX) en `tareas.media`. |
| `UserVerification.jsx` | `src/components/CoWork/Verification/` | Verificación de áreas | Interfaz para verificadores: subir documentos, cambiar estado, añadir observaciones. |
| `SkillsManagement.jsx` | `src/pages/CoWork/Skills/` | Gestión de habilidades | CRUD para administradores/editores de habilidades (`skills`). |
| `useSkills/useSkills.js` | `src/hooks/useSkills/` | Gestión de habilidades | Hook para CRUD de `skills` y asociación/desasociación a usuarios. |
| `utils/cowork/areaVerification.js` | `src/utils/cowork/` | Lógica de verificación | Funciones para manejar `area_details`: `addAreaVerification`, `updateAreaVerification`, `getAreaVerificationStatus`. |
| `utils/cowork/taskStatus.js` | `src/utils/cowork/` | Estados de tarea | Enum completo con validación de transiciones (`borrador → pagada`). |

### 💡 Funcionalidades Implementadas (Frontend)

- ✅ **Tareas generales**: Visibles sin autenticación (`useTodos.fetchTodos` + override de `find` en backend que filtra solo publicadas para no autenticados).
- ✅ **Tareas especializadas**: Filtradas por área, subárea o habilidad verificada (helpers `buildAreaHierarchy`, `filterTasksBySkill`).
- ✅ **Subida de archivos** (resoluciones y verificación): `TaskUpload.jsx` y `UserVerification.jsx` ahora suben archivos reales a Strapi via `POST /api/upload` multipart (Strapi Media Library).
- ✅ **Verificación de áreas**: Interfaz para verificadores (rol `verificador`) con subida real de documentos y persistencia del estado en `area_details` JSON del usuario.
- ✅ **Gestión de habilidades**: CRUD para administradores (`SkillsManagement.jsx` + `useSkills` + controller backend con validación admin/editor/verificador).
- ✅ **Calificación automática → Pago**: en backend, el endpoint `POST /api/tareas/calificar` (controller `calificar.js`) ejecuta en una transacción DB atómica dos transiciones válidas de estado — `completada/corregida → calificada` y luego `calificada → pagada` (spec `documento-off.md:62,138`) — inserta la calificación, acredita laborys en la cartera del usuario y propaga el estado `pagada` al `todo` padre. Si cualquier paso falla, hay rollback. **NO** depende del frontend ni de un lifecycle — cualquier llamada autenticada válida y dispara el pago. El frontend invoca este endpoint desde `useTodos.rateTask()`.
- ✅ **Visibilidad por área en backend** (spec `documento-off.md:32-35`): el endpoint `find` de `todo` filtra server-side. Visitantes solo ven tareas `general/becarios`; usuarios autenticados sin verificación también; usuarios con `area_details.status=verified` o áreas/skills asociadas ven además las especializadas que coincidan; admin/socio bypass. El endpoint `POST /tareas/resolver` rechaza con 403 si un usuario intenta tomar una especializada sin área/skill verificada coincidente. El filtro del frontend (`canUserTakeTask` + `useRecurrenciaValidation`) es cosmético: oculta el botón antes del click, pero el backend es la compuerta definitiva.
- ✅ **UI coherente**: Botones y estados visuales según `taskStatus.js`.
- ✅ **`useTarea.jsx` corregido**: ahora apunta a `/api/tareas` (colección de resoluciones) — antes apuntaba a `/api/todos` por error. Incluye soporte `media`, `skills` y `area_details`. Eliminado el código muerto inline del bloque `pagos_totales`.

---

## ⚙️ Backend: `ciudadan_backend` (Strapi 4)

### 📁 Estructura de archivos modificados y nuevos

| Archivo | Ubicación | Función | Cambios Realizados |
|--------|-----------|---------|-------------------|
| `roles.json` | `src/extensions/users-permissions/config/` | Roles y permisos | Añadido rol `socio` y `verificador`; permisos específicos para `todo`, `tarea`, `skill`. |
| `user.settings.json` | `src/extensions/users-permissions/models/` | Modelo de usuario | Añadido campo `area_details: JSON` y relación `skills`. |
| `skill.json` | `src/api/skills/config/` | Modelo de habilidad | Nueva colección `skills` con `name`, `description`, `isActive`. |
| `skill.js` | `src/api/skills/controllers/` | Controlador de habilidades | CRUD con restricción: solo admin/editor pueden crear/actualizar/eliminar. |
| `skill.js` | `src/api/skills/services/` | Servicio de habilidades | Validación de unicidad de nombre. |
| `skill.js` | `src/api/skills/routes/` | Rutas de habilidades | Endpoints públicos para lectura; autenticados para escritura. |
| `tarea.json` | `src/api/tareas/config/` | Modelo de resolución | Nueva colección `tarea` con `todo`, `user`, `media`, `status`, `payment_status`, `reviewed_by`. |
| `tarea.js` | `src/api/tareas/controllers/` | Controlador de resoluciones | Validación de acceso, verificación de áreas, disparo automático de pago al calificar. |
| `tarea.js` | `src/api/tareas/services/` | Servicio de resoluciones | Lógica básica de CRUD. |
| `tarea.js` | `src/api/tareas/routes/` | Rutas de resoluciones | CRUD con autenticación y validación de permisos. |
| `todo.json` | `src/api/todo/config/` | Modelo de tarea original | Añadidos campos: `skills`, `areas`, `subareas`, `reward_laborys`, `reward_cash`, `is_periodic`, `level`, `ambito`. |
| `todo.js` | `src/api/todo/controllers/` | Controlador de tareas originales | Acceso público a tareas generales; solo socios/admin crean/actualizan/eliminan. |
| `todo.js` | `src/api/todo/services/` | Servicio de tareas originales | Lógica básica de CRUD. |
| `todo.js` | `src/api/todo/routes/` | Rutas de tareas originales | Endpoints públicos para lectura; autenticados para escritura. |
| `area.json` | `src/api/area/config/` | Modelo de área/subárea | Nueva colección `area` con `parent_area`, `level`, `is_active`. |
| `area.js` | `src/api/area/controllers/` | Controlador de áreas | Validación: solo 5 áreas raíz permitidas (Administrativo, Técnico, etc.). |
| `area.js` | `src/api/area/services/` | Servicio de áreas | CRUD con restricción: solo admin. |
| `area.js` | `src/api/area/routes/` | Rutas de áreas | Lectura pública; escritura restringida. |
| `is-admin-or-socio-or-verificador.js` | `src/policies/` | Política de acceso | Permite acceso a `tarea.update` solo a `admin`, `socio`, `verificador` (verificación y calificación). |
| `is-verificador.js` | `src/policies/` | Política de acceso | Permite acceso a verificación de áreas solo a `admin` o `verificador`. |
| `is-authenticated-auth0.js` | `src/policies/` | Política de acceso | Permite acceso a `tarea.create`/`delete` y resolver/completar tareas: cualquier usuario autenticado (no requiere rol extra). |
| `is-admin-or-socio.js` | `src/policies/` | Política de acceso | Permite acceso a operaciones CRUD en `todo` y `area` solo a `admin` o `socio` (creación de tareas originales y áreas). |
| `policy.json` (en `todo`) | `src/api/todo/config/` | Políticas por acción | Aplica `is-admin-or-socio` en `create`, `update`, `delete` (configurado inline en `routes/todo.js` — no requiere archivo `policy.json` separado). |
| `policy.json` (en `tarea`) | `src/api/tarea/config/` | Políticas por acción | Aplica `is-authenticated-auth0` en `create`/`delete`, e `is-admin-or-socio-or-verificador` en `update` (configurado inline en `routes/tarea.js` — no requiere archivo `policy.json` separado). |

### 💡 Funcionalidades Implementadas (Backend)

- ✅ **Colecciones completas**: `todo`, `tarea`, `skill`, `area` con relaciones correctas.
- ✅ **`area_details` como JSON**: Almacenado en `users` para verificación documental.
- ✅ **Habilidades (`skills`)**: Colección independiente con relaciones a usuarios y tareas.
- ✅ **Roles personalizados**: `socio` y `verificador` con permisos específicos en Strapi Admin.
- ✅ **Validaciones de acceso**: Políticas estrictas por rol y estado de verificación.
- ✅ **Flujo de pago automático**: el endpoint `POST /api/tareas/calificar` (controller `calificar.js`) ejecuta en una sola transacción DB atómica las transiciones `completada/corregida → calificada → pagada`, inserta la calificación en `calificaciones[]`, inserta la entrada de pago en `pagos_laborys[]`, acredita laborys en la cartera del usuario y propaga `pagada` al `todo` padre. El lifecycle `tarea.afterUpdate` solo propaga el estado terminal al `todo`, no dispara paga (evita doble pago). Independiente del frontend: cualquier llamada autenticada válida dispara el pago.
- ✅ **Visibilidad por área en backend** (spec `documento-off.md:32-35`): endpoint `find` de `todo` filtra por área/skill verificada del usuario. Endpoint `POST /tareas/resolver` valida 403 si intenta tomar especializada sin permiso. Ver Fix #4 (controller `subir-evidencia.js`) abajo para restricción similar sobre verificadores.
- ✅ **Validación de áreas raíz**: el lifecycle `area/content-types/area/lifecycles.js` beforeCreate/beforeUpdate limita a 5 áreas raíz (`nivel=0`) y valida que el nombre sea uno de las 5 oficiales (Administrativo, Técnico, Comercial-difusión, Software, Creación multimedia). También bloquea referencias circulares y auto-referencia en `parent_area`.
- ✅ **Subida de archivos (evidencias)**: el controller `subir-evidencia.js` decodifica archivos en base64 (10MB máximo por archivo, 10 archivos por request), los escribe a `public/uploads/` con nombre único SHA-256 + timestamp, y registra la metadata (`nombre`, `url`, `size`, `subido_por`, `subido_en`) en el campo JSON `media` de la `tarea`. **Decisión arquitectónica**: `tarea.media` se mantiene como `json` (no `media multiple` de Strapi) porque es un record histórico de evidencias con metadata de autor/fecha, no una relación a Media Library — los archivos son inmutables y no se gestionan desde el panel admin. El verificador solo puede subir evidencia a tareas cuyo `todo` pertenece a un área que tiene verificada (admin/socio bypass).

---

## 🔗 Integración Frontend-Backend

| Funcionalidad | Frontend | Backend | Conexión |
|---------------|----------|---------|----------|
| **Autenticación** | Auth0 → JWT | Strapi `users-permissions` | Token JWT validado en cada request |
| **Tareas generales** | `fetchTodos()` | `GET /todos` | Sin autenticación |
| **Tareas especializadas** | `buildAreaHierarchy()` + `canUserTakeTask()` | `GET /todos?populate=areas,skills` | Validación en backend de `area_details` y `skills` |
| **Subida de archivos** | `TaskUpload.jsx` | `POST /api/tareas/subir-evidencia` (base64) | Files escritos a `public/uploads/`, metadata en `tarea.media` (JSON). Ver controller `subir-evidencia.js`. |
| **Verificación de áreas** | `UserVerification.jsx` | `PUT /users/:id` con `area_details` | Actualiza JSON en usuario; docs verificadores van vía `subir-evidencia.js` (FS a `public/uploads/`). Strapi Media Library no se usa en CoWork (decisión arquitectónica). |
| **Gestión de habilidades** | `SkillsManagement.jsx` | `GET/POST/PUT/DELETE /skills` | CRUD completo |
| **Calificación → Pago** | `rateTask()` | `POST /api/tareas/calificar` | Transacción atómica en controller `calificar.js`: `completada/corregida → calificada → pagada` + pago laborys en cartera + propagación al `todo`. Independiente del frontend. |
| **Roles y permisos** | `useRoles()` | `roles.extra` + `roles.json` | Sincronizados mediante `area_details` y `skills` |
| **Visibilidad de tareas** | `canUserTakeTask` (FE oculta botón) | Endpoint `find` de `todo` filtra server-side | Backend es la compuerta: las especializadas no llegan al usuario si no tiene área/skill verificada. El frontend es puramente cosmético. |

---

## ✅ Verificación Final: Cumplimiento con la Especificación

| Requisito del PDF | Estado |
|------------------|--------|
| Tareas generales visibles para todos | ✅ Cumplido |
| Tareas especializadas filtradas por área/subárea/habilidad | ✅ Cumplido |
| Usuario con datos capturados pero no verificados → "pendiente de verificación" | ✅ Cumplido |
| Menú y herramientas de socio solo para socios | ✅ Cumplido |
| Dos entidades separadas: `todo` y `tareas` | ✅ Cumplido |
| Áreas raíz: 5 áreas fijas | ✅ Cumplido |
| Subáreas cargadas manualmente por equipo | ✅ Cumplido |
| Habilidades (`skills`) como filtro de tareas | ✅ Cumplido |
| Rol `verificador` para revisar documentación | ✅ Cumplido |
| `area_details` como JSON para verificación | ✅ Cumplido |
| Subida de archivos en resolución (`media`) | ✅ Cumplido |
| Pago automático en laborys al calificar | ✅ Cumplido |
| Estados de tarea original y resolución completos | ✅ Cumplido |
| `scope`/`ambito` solo informativo | ✅ Cumplido |
| `reward_laborys` como recompensa principal | ✅ Cumplido |
| `reward_cash` preparado, no usado en MVP | ✅ Cumplido |
| Tareas periódicas | ✅ Cumplido |
| `type` conservado en ambas colecciones | ✅ Cumplido |
| Relación usuario–área–subárea (JSON) | ✅ Cumplido |
| Habilidades sin validación documental | ✅ Cumplido |
| Flujo visual de calificación y pago | ✅ Cumplido |
| Nombre de colección: `todo` | ✅ Cumplido |

---

## 🚀 Conclusión

**El módulo CoWork está alineado con la especificación formal (`documento-off.md`).**

Las brechas detectadas en la verificación previa (pago automático sin backend, controllers vacíos, policy del verificador faltante, uploads con blob URL local, validación de áreas raíz inexistente, `useTarea` apuntando a `/todos` en vez de `/tareas`, código muerto, `UserVerification` con token mock) han sido corregidas:

- **Backend**: lifecycle `tarea.afterUpdate` dispara pago automático en laborys; lifecycle `area.beforeCreate/beforeUpdate` valida 5 áreas raíz + nombres oficiales; controller `todo` custom filtra `find` público y audita cancelaciones; controllers `resolver`/`completar` usan policy `is-authenticated-auth0` (cualquier usuario logueado puede resolver); `tarea.update` protegido con `is-admin-or-socio-or-verificador`.
- **Frontend**: `UserVerification.jsx` usa `useAuth0.getAccessTokenSilently` real y sube archivos a Strapi Media Library; `TaskUpload.jsx` sube archivos reales vía `POST /api/upload`; `useTarea.jsx` reescrito para usar `/api/tareas` (resoluciones), soporta `media`/`skills`/`area_details`, eliminado el código muerto inline.

### 📋 Pendientes restantes (no bloqueantes para MVP según `documento-off.md`):

- **Seed**: crear script seed que cargue las 5 áreas raíz en Strapi (`Administrativo`, `Técnico`, `Comercial-difusión`, `Software`, `Creación multimedia`) y roles de prueba (`admin`, `socio`, `verificador` en `roles.extra`).
- **Políticas nativas de Strapi**: en panel de Strapi → Settings → Roles → `Authenticated` → habilitar `create`/`update`/`delete` en `Todo`, `Tarea`, `Area`, `Skill`. Las policies custom corren *después* del check nativo de Strapi.
- **Bug histórico de Auth0** (`POST /auth/auth0-login` leyendo token del body en vez del header): sigue abierto, documentado en `TAREAS-CRUD-PERMISOS.md`. No bloquea CoWork porque las policies llaman a `/userinfo` directo.
- **Decisión abierta**: formalizar `roles.extra` (JSON libre) vs enum/colección nativa de roles de Strapi.

> ⚠️ Antes de desplegar a producción, ejecutar migración SQL de `agendas.estado` si se usa el módulo Agenda (ver `AGENDA-VALIDATION-SYNC.md`).