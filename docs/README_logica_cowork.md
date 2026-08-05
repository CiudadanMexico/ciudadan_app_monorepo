

# Lógica del módulo "Cowork" — Sesión 27 jul 2026

> Extraído de la transcripción de la sesión con el cliente (Ciudadan Mex). Solo se incluye lo relacionado a la **lógica de negocio del módulo Cowork** (`components/cowork/...`): roles, agencias, tareas, asignación y calificación. Se omite todo lo demás (debug de UI, Zoom, herramientas de IA, etc).

---

## Fase 1 — Roles del sistema

Roles manejados actualmente (a nivel Strapi, campo de rol de usuario):

- **Usuario normal (sin rol extra)**: no ve ninguna de las 3 secciones de tareas de socio, no puede editar/eliminar/agregar tareas. En "tareas generales/especializadas" solo ve la tarea sin las opciones de editar/eliminar.
- **Socio**: pertenece a una agencia y a un área. Puede crear tareas, asignar y calificar según las reglas de las Fases 2-5.
- **Administrador (admin)**: es el administrador de una agencia. Tiene los mismos permisos que socio (editar, eliminar, agregar, resolver tarea) más gestión administrativa.
- **Root / Súper Root (futuro, no implementar aún)**: mencionado como próximo nivel por encima de admin, para cuando exista más de una agencia federal coordinando la red. No requiere cambios de código todavía, solo tenerlo en mente.

**Regla de visibilidad de UI (tabs superiores):**
- Si el usuario **no** es socio ni admin → no debe mostrarse la tab de "socio/admin" en absoluto.
- Si es **socio** → mostrar icono y texto "Socio".
- Si es **admin** → mostrar icono y texto "Admin".
- Nunca deben mostrarse ambos botones/tabs a la vez; se muestra solo el que corresponda al rol activo del usuario.

---

## Fase 2 — Tipos de tareas

Existen 3 categorías de tareas:

1. **Generales**: no requieren un área específica. Las puede resolver cualquier usuario.
2. **Especializadas**: pertenecen a una de las 5 áreas (ver Fase 3). Solo las pueden resolver usuarios con esa especialidad. (El criterio "sin asignar" que se había mencionado para esta categoría **se descartó**: asignación es un criterio aparte e independiente del tipo de tarea).
3. **Asignadas**: tareas (generales o especializadas) que además fueron asignadas a uno o varios usuarios específicos (lista concreta de usuarios). Solo esos usuarios pueden resolverlas.

---

## Fase 3 — Agencias, niveles y áreas

- Cada **agencia** tiene un campo nuevo `level` (enumeración): `federal` | `local`.
  - **Agencia federal**: coordina toda la red, es la de mayor jerarquía (ej. "gobierno federal"). Alcance: todas las agencias del país.
  - **Agencia local**: alcance limitado a sus propios socios (ejemplo usado: 10-15 socios).
- Cada **usuario** tiene una relación `agencia` (a qué agencia pertenece).
- Cada **socio** pertenece además a un **área** (relación `area`). Existen 5 áreas: administración, multimedia, desarrollo/software, técnico, didáctico (los nombres exactos quedaron abiertos, pero son 5 fijas).
- Un socio de agencia federal en un área (ej. software) puede actuar sobre tareas especializadas de esa misma área **en toda la red**, no solo en su agencia.
- Un socio de agencia local solo puede actuar sobre tareas de **su propia agencia**.

---

## Fase 4 — Regla de calificación (¿quién puede calificar una tarea?)

La calificación siempre la hace un **socio** (nunca un usuario normal). La regla depende del tipo de tarea:

| Tipo de tarea | Quién puede calificar |
|---|---|
| **General** | Cualquier socio de la agencia a la que pertenece el usuario que resolvió la tarea. Si el socio pertenece a una agencia **federal**, puede calificar tareas generales de **toda la red**. Si es de agencia **local**, solo las generales de su propia agencia. |
| **Especializada** | Cualquier socio **de esa misma área**. Si el socio es de agencia **federal**, puede calificar tareas especializadas de su área en **toda la red**. Si es de agencia **local**, solo las de su área **dentro de su agencia**. |
| **Asignada** | Únicamente el socio que **asignó** la tarea (sin importar si es de agencia federal o local; esta regla no cambia). |

Ejemplo usado en la sesión para fijar el concepto (agencia federal "Enrique Peña Nieto" del área administrativa, "Osorio Chong" del área software; agencia local CDMX "Clara Brugada" en administración, "Pablito" en software; usuario "Rowan" pertenece a la agencia local CDMX):
- Pablito (software, CDMX) crea una tarea **especializada de software** y se la asigna a Rowan.
- Peña Nieto (federal, pero de administración) **no puede** calificarla, aunque sea federal, porque no es de esa área.
- Sí pueden calificarla: Osorio Chong (federal, software) o Pablito (local CDMX, software, si pertenece a la agencia de Rowan).
- Un socio de software de otra agencia local (ej. Oaxaca) **no puede** calificarla porque Rowan no pertenece a esa agencia y no es federal.
- Si la tarea fuera **general**, la podrían calificar Peña Nieto (federal), Osorio Chong (federal) o cualquier socio de la agencia local de Rowan (Clara Brugada, Pablito), pero no un socio de otra agencia local.

---

## Fase 5 — Campo "asignable" y flujo de creación de tarea

- Se agrega un campo booleano **`asignable`** a la colección de tareas.
- Al crear una tarea (stepper/formulario existente), se agrega un **Switch** "¿Es asignable?" (opcional, no obligatorio marcarlo).
- Si el socio activa `asignable = true`, aparece un paso adicional opcional para asignarla de una vez a uno o varios usuarios. No es obligatorio asignarla en ese momento; puede quedar `asignable = true` sin asignar a nadie todavía.
- Una tarea con `asignable = false` (o sin asignar aún) puede resolverla cualquiera (según sea general o especializada de esa área).
- Una tarea ya **asignada** (con usuarios en la lista de asignados) solo puede resolverla esa lista de usuarios, y solo calificarla quien la asignó (Fase 4).

---

## Fase 6 — Vista "Asignar tarea" (`/asignar-tarea`)

Ruta/módulo nuevo dentro de `components/cowork/herramientas`, agregado junto a "Agregar tarea" y "Calificar tarea".

**Listado de tareas asignables:**
- Muestra únicamente las tareas con `asignable = true` creadas por el socio en sesión (`asignada_por = usuario_actual`), estén o no ya asignadas a alguien.
- Al entrar a una tarea desde esta vista se puede: agregar más usuarios asignados o quitar usuarios ya asignados (edición continua, no es un paso de una sola vez).

**Selector de "a quién se le puede asignar" (2 preguntas en cadena):**

1. **¿La agencia del socio que asigna es local o federal?**
   - **Local** → subgrupo inicial = usuarios cuyo campo `agencia` = la agencia del socio.
   - **Federal** → subgrupo inicial = todos los usuarios de la red (de cualquier agencia).

2. **¿La tarea es general o especializada?**
   - **General** → no se aplica filtro adicional sobre el subgrupo anterior.
   - **Especializada** → se filtra el subgrupo anterior dejando solo los usuarios cuya `área` coincide con el área de especialidad de la tarea.

Resultado combinado (4 casos):

| Agencia del socio | Tipo de tarea | A quién se le puede asignar |
|---|---|---|
| Local | General | Todos los usuarios de esa agencia |
| Local | Especializada | Usuarios de esa agencia **y** de esa área |
| Federal | General | Todos los usuarios de la red |
| Federal | Especializada | Usuarios de toda la red que tengan esa área de especialidad |

**UI del selector de usuario:**
- Para agencia **local** (pocos usuarios, ~10-15): en la versión inicial se planteó lista simple; se decidió al final usar **autocompletar** en ambos casos (local y federal) por consistencia, aunque el caso federal es el que realmente lo necesita por volumen (cientos/miles de registros → requiere autocompletar buscando por nombre/correo, no una lista completa).

---

## Fase 7 — Pendientes al cierre de la sesión (siguiente sprint)

- **Resolver tarea**: falta definir/mostrar el flujo desde la vista de tareas (generales/especializadas/asignadas) para usuarios que no son socios; diferenciar claramente "editar tarea" vs "resolver tarea".
- **Calificar tarea**: falta completar el módulo/vista de calificación aplicando las reglas de la Fase 4.
- **Asignar tarea**: falta terminar de implementar el filtrado de las Fases 5-6 (por ahora solo se conceptualizó, sin condicionales de agencia/área todavía).
- **Agregar socio**: nuevo formulario sencillo para dar de alta a un socio como miembro de una agencia.
- **Roles Root / Súper Root**: contemplarlos a futuro, sin tocar código todavía.

---

## Campos nuevos requeridos en Strapi (resumen técnico)

- `agencia.level`: enum `federal` | `local`.
- `user.agencia`: relación a la colección `agencias`.
- `user.area`: relación a la colección `areas` (ya existía).
- `tarea.asignable`: boolean.
- `tarea.asignada_por`: relación al socio que creó/asignó la tarea (usado para filtrar en "Asignar tarea" y para la regla de calificación de asignadas).
- `tarea.status`: campo existente que indica si está asignada, etc. (nombre real de colección en Strapi: `task`/`tarea`, hay confusión de alias por el "screen name" puesto en Strapi — el endpoint real sigue siendo `tarea` en español).

---

## Auditoría back vs front — 28 jul 2026

Comparación de la lógica de negocio entre backend (`ciudadan_backend_26/src/api/tarea/`) y frontend (`ciudadan_frontend/src/services/cowork/`, `src/hooks/useAutocompletarAsignacion.jsx`).

### ✅ Coincidencias confirmadas

1. **State machine de `tarea`** (`content-types/tarea/lifecycles.js`): `VALID_TRANSITIONS` coincide con los controllers (`resolver`→`en_proceso`, `completar`→`completada`, `corregir`→`corregir`, `calificar`→`calificada`+`pagada`). El lifecycle valida transiciones en `beforeUpdate` y propaga `pagada`/`cancelada` al `todo` padre en `afterUpdate`.
2. **State machine de `todo`** (`content-types/todo/lifecycles.js`): `VALID_TRANSITIONS` independiente, valida transiciones del todo.
3. **Matriz Fase 6 (asignación)**: `can-asignar-tarea.js` (backend) y `useAutocompletarAsignacion.jsx` (frontend) implementan la misma matriz agencia-local/federal × general/especializada. Coinciden en `NIVELES_ESPECIALIZADA = ['especialidad','experto','personalizada']` y filtro por área.
4. **Calificación (Fase 4)**: `can-calificar-tarea.js` valida permisos por tipo de tarea (general/especializada/asignada) y agencia del reviewer. `calificar.js` ejecuta el pago atómico en transacción DB.
5. **Payloads frontend → backend**: `mutationsServices.js` envía los payloads esperados por los controllers (`{ todoId }` para resolver, `{ tareaId, score, notes }` para calificar, `{ todoId, userIds }` para asignar).

### ⚠️ Discrepancias detectadas

#### D1. `asignar.js` no envuelve la creación de tareas en transacción
- **Backend** (`controllers/asignar.js`): crea N `tarea` con `entityService.create` en un loop, luego actualiza el `todo` con `entityService.update`. **No usa `strapi.db.transaction`**. Si falla a mitad del loop, quedan tareas huérfanas sin `todo` actualizado.
- **Comparación**: `calificar.js` sí usa `strapi.db.transaction` (atómico). `asignar.js` no sigue el mismo patrón.
- **Impacto**: medio. Si el proceso muere a mitad, el `todo` queda sin `status='asignada'` pero ya hay tareas creadas.
- **Arreglo propuesto**: envolver el loop + update del todo en `strapi.db.transaction(async () => { ... })`.

#### D2. `asignar.js` setea `resolved_at: ahora` al crear la tarea
- **Backend** (`asignar.js` línea ~50): `resolved_at: ahora` (timestamp de ahora) al crear la tarea.
- **Comentario en `calificar.js`** (línea ~94): "resolved_at se sobreescribe aquí como timestamp de cierre (antes fue seteado como timestamp de toma en resolver.js)".
- **Discrepancia**: `resolver.js` setea `resolved_at` como timestamp de **toma**; `asignar.js` también lo setea al crear. Pero `calificar.js` lo sobreescribe como timestamp de **cierre**. El campo `resolved_at` se usa para dos propósitos distintos según el flujo (toma vs cierre), lo que es confuso y potencialmente incorrecto.
- **Impacto**: bajo-medio. Reportes/queries que dependan de `resolved_at` pueden dar resultados inconsistentes según si la tarea fue asignada o resuelta directamente.
- **Arreglo propuesto**: renombrar a `taken_at` (toma) y `resolved_at` (cierre), o documentar explícitamente que `resolved_at` se sobreescribe al calificar.

#### D3. `asignar.js` mantiene `asignado_a` como o2o (solo primer usuario)
- **Backend** (`asignar.js` línea ~70): `asignado_a: usuarios[0].id` — solo guarda el **primer** usuario destino. El comentario lo justifica: "Mantenemos o2o en `asignado_a` (decisión de diseño confirmada: multi-asignación = N tareas, no migración de schema)".
- **Spec Fase 5**: "asignarla a uno o varios usuarios" — la multi-asignación es funcional (N tareas), pero el campo `asignado_a` del `todo` solo refleja al primero.
- **Impacto**: bajo. Funcionalmente correcto (N tareas = N asignaciones), pero el `todo.asignado_a` es engañoso para queries que asuman que es el único asignado.
- **Arreglo propuesto**: documentar en el schema que `todo.asignado_a` es "el primer asignado (representativo)" y que la lista completa vive en las `tarea` asociadas. No requiere cambio de código.

#### D4. `useAutocompletarAsignacion.jsx` no filtra al propio socio de la lista de candidatos
- **Frontend** (`useAutocompletarAsignacion.jsx`): filtra usuarios por agencia/área pero **no excluye al socio en sesión** de la lista de candidatos.
- **Spec Fase 6**: no explicita si el socio puede auto-asignarse. La matriz no lo prohíbe, pero conceptualmente un socio asignándose a sí mismo es raro.
- **Backend** (`can-asignar-tarea.js`): tampoco excluye al asignador de `userIds`.
- **Impacto**: bajo. Ambos lados son consistentes (no filtran), pero podría ser un bug de UX.
- **Arreglo propuesto**: decidir con el cliente si un socio puede auto-asignarse. Si no, filtrar `u.id !== socio.id` en el hook y validar en la policy.

#### D5. `npm run develop` falla (exit code 1)
- **Bloqueador**: el backend no arranca, impide validar los endpoints en vivo (fetch real).
- **Estado**: no se diagnosticó la causa raíz en esta sesión.
- **Arreglo propuesto**: ejecutar `npm run develop` capturando el error completo y diagnosticar (posibles causas: `DATABASE_CLIENT`, `APP_KEYS` faltantes, conflictos de schema, Node version).

### 📋 Resumen de acciones

| ID | Severidad | Acción |
|---|---|---|
| D1 | Media | Envolver `asignar.js` en `strapi.db.transaction` |
| D2 | Baja-media | Clarificar semántica de `resolved_at` (toma vs cierre) |
| D3 | Baja | Documentar `todo.asignado_a` como "primer asignado" |
| D4 | Baja | Confirmar con cliente si socio puede auto-asignarse |
| D5 | Bloqueador | Diagnosticar fallo de `npm run develop` |

**Conclusión**: la lógica de negocio (state machine, matriz Fase 6, reglas de calificación Fase 4) está **alineada** entre backend y frontend. Las discrepancias son de robustez (transacción en `asignar.js`), semántica (`resolved_at`) y entorno (`npm run develop`). No hay bugs funcionales críticos en el happy path.
