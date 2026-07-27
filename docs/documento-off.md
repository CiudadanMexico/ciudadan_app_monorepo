# Módulo CoWork — Proyecto Ciudadan

Especificación funcional y técnica para el desarrollo backend, frontend y modelado de datos del módulo CoWork.

## 📋 Contexto

El módulo CoWork permite:
- Publicar tareas
- Filtrarlas por nivel de especialidad
- Registrar resoluciones de usuarios
- Verificación documental por área
- Pago automático en **laborys** al calificar una resolución

---

## 🧩 Glosario de términos
este e
| Término | Definición |
|---|---|
| **Tarea original / todo** | Registro maestro de una tarea a realizar. Ficha base publicada y consultada. |
| **Tarea resuelta / tareas** | Registro de una resolución enviada por un usuario sobre una tarea original. |
| **Área** | Categoría general superior (Administrativo, Técnico, Comercial-difusión, Software, Creación multimedia). |
| **Subárea** | Carrera, oficio o especialidad concreta que cuelga de un área. |
| **Habilidad** | Capacidad puntual que puede habilitar tareas especializadas sin requerir un área completa. |
| **Socio** | Usuario con permisos para crear, editar, eliminar y calificar tareas. |
| **Verificador** | Rol que revisa documentación y valida áreas/subáreas de un usuario. |

---

## 🔒 Reglas de visibilidad y acceso

- Las tareas generales se muestran a **todo el mundo**, incluso visitantes no registrados.
- Si un visitante quiere resolver una tarea, el sistema debe pedirle registro/ingreso.
- Las tareas especializadas **solo** se muestran si el usuario tiene área, subárea o habilidades verificadas correspondientes.
- Si el usuario tiene datos capturados pero no validados → mostrar estado **"pendiente de verificación"**.
- El menú y herramientas de socio solo aparecen para usuarios con ese permiso.
- En el MVP, la revisión de tareas periódicas/programadas es **manual**.

---

## 🗄️ Modelo de datos

Se recomienda mantener **dos entidades centrales separadas**: tarea original y resolución de usuario.

### `todo` (tarea original)

| Campo | Tipo | Descripción |
|---|---|---|
| `title` | string | Título visible de la tarea |
| `description` | text | Descripción completa y lineamientos |
| `type` | enum/string | Diferencia tarea única, recurrente, etc. (⚠️ pendiente de decisión) |
| `level` | enum | `general` \| `becario` \| `especialidad` \| `experto` \| `personalizada`. En UI, los últimos tres se agrupan como "especializadas" |
| `scope` / `ambito` | enum | `plataforma` \| `privada`. Informativo, **no** se usa como filtro |
| `areas` | relación/json | Áreas aplicables (vacío si la tarea es general) |
| `subareas` | relación/json | Subáreas aplicables |
| `skills` | relación/json | Habilidades requeridas (preparado, no explotado aún) |
| `has_deadline` | boolean | Indica si maneja fecha de entrega |
| `due_date` | datetime | Fecha de entrega si `has_deadline=true` |
| `is_periodic` | boolean | Indica si es tarea periódica/recurrente |
| `reward_laborys` | decimal | Recompensa en laborys |
| `reward_cash` | decimal | Recompensa en efectivo (preparado, no usado en MVP) |
| `status` | enum | `borrador` \| `publicada` \| `asignada` \| `en_proceso` \| `pendiente_revision` \| `corregir` \| `corregida` \| `calificada` \| `pagada` \| `cancelada` |
| `agency` | relación | Agencia dueña/emisora de la tarea |
| `created_by` | relación | Usuario socio/admin que la creó |

> Nota: el nombre de la colección puede ser `todo` o `todos`; lo importante es conservar la función de colección maestra.

### `tareas` (resoluciones de usuario)

| Campo | Tipo | Descripción |
|---|---|---|
| `todo` | relación | Apunta a la tarea original |
| `user` | relación | Usuario que resuelve |
| `type` | enum/string | Si se conserva, aclarar si diferencia resolución, subtarea o formato de entrega |
| `media` | array/relación múltiple | Archivos adjuntos (soporta múltiples elementos) |
| `status` | enum | `en_proceso` \| `completada` \| `corregir` \| `corregida` \| `calificada` \| `pagada` \| `cancelada` \| `modificada` |
| `notes` | text | Observaciones del usuario o revisor |
| `score` | number | Calificación de la resolución |
| `reviewed_by` | relación | Socio/verificador que revisó |
| `resolved_at` | datetime | Fecha de entrega o cierre |
| `payment_status` | enum | `pendiente` \| `procesado`. En MVP el pago se ejecuta al calificar |

### `users` (campos relevantes)

| Campo | Tipo | Descripción |
|---|---|---|
| `area_relations` | relación múltiple | Áreas/subáreas asociadas al usuario |
| `area_details` | json | Estado de verificación por área/subárea, incluyendo documentos y metadatos |
| `skills` | relación múltiple | Habilidades del usuario |
| `role` | enum/string | invitado, registrado, conductor, socio, verificador, etc. (ajustable) |

> La verificación de áreas puede vivir inicialmente en `area_details` (JSON) y migrar a colección propia si el proceso crece.

### `areas`

| Campo | Tipo | Descripción |
|---|---|---|
| `name` | string | Nombre del área o subárea |
| `parent_area` | relación | Área superior (nivel 0 = sin padre) |
| `level` | integer | 0 = área general, 1+ = subárea/especialización |
| `is_active` | boolean | Habilita/deshabilita el registro |

### `skills`

Colección simple: nombre + estado activo. Abierta a crecer después.

---

## 🔄 Flujos principales

1. **Tareas generales** — visibles para todos; visitante ve, usuario registrado resuelve.
2. **Tareas especializadas** — visibles según coincidencia con área, subárea o habilidades verificadas.
3. **Perfil de usuario** — captura carrera/especialidad (de lista o texto libre) y sube documentación.
4. **Verificación** — socio/verificador revisa documentos y marca área como verificada o en proceso.
5. **Gestión de tareas** — socios crean, editan, eliminan y califican tareas.
6. **Resolución** — usuario sube avances (media múltiple) → en proceso → revisión → calificada/pagada.

---

## 📐 Reglas de negocio

- Tarea general: no depende de área, subárea ni habilidad.
- Tarea especializada: se filtra por área general, subárea exacta o habilidades.
- Las subáreas pertenecen a una de **5 áreas raíz**: Administrativo, Técnico, Comercial-difusión, Software, Creación multimedia.
- La tabla de subáreas se carga manualmente por el equipo (ej. *Lic. Administración de Empresas*, *Lic. en Derecho* dentro de Administrativo).
- Recompensa principal del MVP: **laborys**.
- Al calificar una tarea, el pago de laborys se ejecuta **automáticamente**.
- No hay pagos en efectivo en este MVP (campo preparado, sin uso).
- Tareas periódicas/programadas: revisión manual en esta etapa.
- `ambito` es solo informativo, **nunca** filtro de visibilidad.

---

## 🏷️ Estados sugeridos

| Entidad | Estados |
|---|---|
| **Tarea original** | borrador → publicada → asignada → en_proceso → pendiente_revision → corregir → corregida → calificada → pagada → cancelada |
| **Resolución** | en_proceso → completada → corregir → corregida → calificada → pagada → cancelada → modificada |

> Recomendación: usar un enum cerrado en backend y mapearlo a etiquetas legibles en frontend, para evitar estados ambiguos.

---
 
## 🧩 Extensiones implementadas (no en la spec original)

### Apelación de calificaciones

**Endpoint**: `POST /api/tareas/apelar` (controller `apelar.js`).

Permite a un socio impugnar una calificación baja. Reglas:
- Solo aplica si la tarea está en estado `calificada` o `pagada`.
- Solo si `score <= 3` (umbral `SCORE_UMBRAL_APELABLE`).
- Solo si no existe ya una apelación abierta (sin resolver) para la misma tarea.
- Body: `tareaId` (obligatorio), `motivo` (obligatorio, ≥10 chars), `scoreSolicitado` (opcional, 1-5).

La apelación se registra en `tarea.apelaciones` (campo JSON array) con estado
`abierta`. Un admin/socio resuelve después (no hay endpoint de resolución
formal todavía — ver "Pendientes" abajo). El estado de la `tarea` **no** se
mueve a `apelada` (ese enum no existe); la tarea queda donde está y la
apelación vive como metadata.

> El listado de tareas con apelaciones abiertas se obtiene con
> `GET /api/tareas?filters[apelaciones][$notNull]=true` (no por `status=apelada`).

---

## ⚠️ Pendientes y decisiones abiertas

- [x] ~~Confirmar nombre final de la colección maestra: `todo`, `todos` o equivalente.~~ **Decidido (MVP)** — `collectionName: "todos"` (tabla plural), `singularName: "todo"`, API `api::todo.todo`. Patrón estándar de Strapi (tabla plural, singular en API). Ver `src/api/todo/content-types/todo/schema.json:3-6`.
- [x] ~~Decidir si `type` se conserva o elimina en ambas colecciones.~~ **Decidido (MVP)** — Se conserva en ambas como `tipo` (enumeration `tarea`\|`subtarea`): en `todo.schema.json:40` y `tarea.schema.json:25` (con default `"tarea"`).
- [x] ~~Definir si la verificación de áreas se queda en `area_details` (JSON) o pasa a colección propia (fase 2).~~ **Decidido (MVP)** — Se queda en `area_details` JSON (`user.schema.json:330`). La colección propia de verificaciones queda marcada como posible fase 2 (no iniciada).
- [x] ~~Precisar la relación usuario–área–subárea (¿muchos a muchos con tabla intermedia, o JSON controlado?).~~ **Decidido (MVP)** — Híbrido: relación manyToMany Strapi `areas` (tabla intermedia, `user.schema.json:324` ↔ `area.schema.json:60`) para pertenencia al catálogo, + JSON `area_details` (`user.schema.json:330`) para el estado de verificación documental por área (verified/pending/rejected + metadata del documento).
- [x] ~~Aclarar si las habilidades también requieren validación documental o solo relación simple.~~ **Decidido (MVP)** — Relación simple solamente manyToMany `skills` (`skill.schema.json:32` ↔ `user.schema.json:333`). No hay `skill_details` ni flujo de validación documental de skills (a diferencia de áreas).
- [x] ~~Terminar el flujo visual de calificación y el disparo del pago automático de laborys.~~ Hecho — ver Fix #5: controller `calificar.js` con transición `completada/corregida → calificada → pagada` atómica. Frontend invoca `POST /api/tareas/calificar` desde `useTodos.rateTask()`.
- [x] ~~Endpoint de resolución de apelaciones (cambia `apelaciones[i].estado` de `abierta` a `aprobada`/`rechazada` y, si se aprueba, ajusta `score` y re-paga si corresponde). Hoy no existe.~~ **Hecho** — `POST /api/tareas/resolver-apelacion` (controller `resolver-apelacion.js`, ruta `08-tarea-resolver-apelacion.js`, policy `is-admin-or-socio`). Transacción atómica con re-pago de laborys en cartera (origen `auto-repago-apelacion`) cuando `decision=aprobada` y `scoreFinal > scoreActual`. ⚠️ Gap: no valida que el apelante sea dueño de la tarea. ❌ Falta UI en el frontend (el servicio `apelarTarea` existe en `mutationsServices.js:128-144` pero no hay hook ni componente que lo consuma).
- [x] ~~Política Strapi nativa: habilitar `create`/`update`/`delete` en `Todo`, `Tarea`, `Area`, `Skill` para el rol `Authenticated` desde el panel admin (las policies custom corren *después* del check nativo).~~ **Hecho** — correr `node fix-perms.js` desde la raíz del backend. El script crea los permisos para `tarea`/`todo`/`area`/`skill` en `up_permissions`, los enlaza a los roles `Authenticated`/`Public`/`Socio`/`Verificador`, y crea los roles `Socio` y `Verificador` si no existen (en `up_roles`). Es idempotente: re-ejecutable. Cuando entra un nuevo content-type de CoWork, añadirlo al array `apisToFix` y al array `coworkApis` del bloque Fix B y volver a correr.
- [x] Asignar `role = Socio` o `Verificador` a cada usuario en Strapi Admin (Settings → Users-permissions → Users) o programáticamente. El `user.roles.extra` (JSON libre) que usa el frontend es solo una convención para el gateo de UI; el rol nativo de Strapi es el que define los permisos server-side. Recomendación: setear AMBOS (role nativo + `roles.extra`) para que policies custom y FE coincidan. (Ver `docs/ROLES-SETUP.md` para guía paso a paso, y `fix-perms.js` - crea roles si no existen)
- [x] Decisión: `tarea.media` queda como `json` (decisión arquitectónica — evidencias con metadata de autor, no relación a Strapi Media Library). Los archivos viven en `public/uploads/` y son inmutables. (Ver tarea.schema.json: "media": { "type": "json" })
- [x] Decisión: `todo.pagos_laborys` / `todo.pagos_efectivo` (decimal) son campos legacy duplicados de `reward_laborys` / `reward_cash`, usados por el frontend en formularios de creación. Unificar en una refactor posterior del FE (`AgregarTarea.jsx`, `Coowork.jsx`). **Hecho** — Cleanup FE completado: removidos los fallbacks `?? attrs.pagos_laborys ?? 0` y `?? attrs.pagos_efectivo ?? 0` de `cowork.helpers.js:47-48` (`normalizeTask`) y de `useTarea.jsx:94-95`. `Coowork.jsx:194-199` ahora usa `normalizeTask` del helper (DRY, ya sin mapeo manual duplicado). `AgregarTarea.jsx`, `useTodos.jsx` y los payloads de `createTodo`/`updateTodo` ya usaban `reward_laborys`/`reward_cash`. Queda `recompensa` como alias histórico de lectura para registros previos al cleanup. Notar: `pagos_laborys` en el schema de `tarea` (JSON array de pagos) es un concepto distinto (entradas de pago históricas) y sigue usándose legítimamente en `payTask`/`calificar.js`/`resolver-apelacion.js`.
