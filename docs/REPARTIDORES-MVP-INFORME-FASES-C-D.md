# CIUDADAN — Informe de sesión: MVP de repartidores — Fases C y D

- **Fecha:** 22 de octubre de 2026
- **Rama:** `feature/backend-repartidores-mvp` (local; sin push — sin despliegue a producción)
- **Commits de esta sesión:**
  - `e2e6d28` — feat(repartidores): Fase C — frontend «Quiero repartir» (14 archivos, +1651)
  - `3814ff6` — feat(repartidores): Fase D — Cowork Verificar Repartidores + bandeja federal (9 archivos, +942) — incluye un **hueco funcional de Fase B corregido**: endpoint de clasificación normativa de la eléctrica
- **Estado del árbol al cierre:** limpio.
- **Antes de editar archivos compartidos** (`RolesContext.jsx`, `Routes/index.jsx`, `Ganar.jsx`, `Coowork.jsx`) se verificó `git log` por archivo (regla 11): sin cambios recientes no integrados.

---

## 1. Fase y objetivo

- **Fase C:** frontend del solicitante — «Quiero repartir», lista de espera, wizard con reanudación, estado/correcciones y visibilidad del rol `repartidor` (spec §6).
- **Fase D:** pestaña Cowork → Verificaciones → **Repartidores** junto a la de conductores, con cola por agencia, cotejos §12B, Zoom §12F, decisiones y bandeja federal (spec §11.D, §12C/§12G).

## 2. Resumen de lo realizado

**Fase C (frontend solicitante):**
- Cliente de API propio (`services/Repartidor/repartidorService.js`) con `fetchJson` + Bearer Auth0 (patrón vigente; nunca `fetch` crudo ni token fijo).
- Wizard de 7 pasos con **autoguardado contra `GET /me`** (el backend es la fuente de verdad; reanuda donde quedó) y **guard propio** de login con `returnTo` (no existe PrivateRoute en el repo):
  1. **Cobertura:** agencias activas del backend (radio) o **lista de espera** con consentimiento (sin INE/CURP/CLABE) — el alta usa el email de la sesión, nunca del payload.
  2. **Identidad:** teléfono, fecha de nacimiento, CURP (enmascarada en respuestas), contacto de emergencia opcional.
  3. **Vehículo:** condicional por tipo (bici sin placa; moto con licencia/seguro/tarjeta; eléctrica con potencia/velocidad y aviso de clasificación).
  4. **Evidencias:** subida por `/api/upload` (override Auth0 existente) + registro por slot validado en backend (MIME/tamaño/hash).
  5. **CLABE + términos:** captura con máscara de 14+4, titular, aceptación versionada; aviso explícito de que no se mueven fondos y que la aprobación no implica conformidad laboral/fiscal.
  6. **Capacitación:** 10 preguntas renderizadas SIN respuestas correctas; calificación server-side; reintentos visibles.
  7. **Resumen:** faltantes según el servidor y envío a revisión.
- `EstadoRepartidor.jsx` (`/repartidor/estado`, destino del enlace de notificaciones): estado, faltantes, correcciones estructuradas de la agencia, zoom, y al aprobar **refresca roles en caliente** (`fetchRolesYMembresia(true)`).
- `RolesContext`: `isRepartidor()` copiando el patrón de `isAuditor` (el rol solo lo concede el backend; el frontend solo navega).
- Rutas `/repartidor/registro` y `/repartidor/estado`; entrada «🚴 Repartiendo» en `Ganar.jsx` junto a «Conduciendo» (registro independiente del taxi).

**Fase D (Cowork revisores):**
- **Hueco de Fase B corregido:** `POST /agency/:id/vehicle-classification` — sin él, ninguna eléctrica podía superar `mark-video-eligible` (exige clasificación). El revisor clasifica con **base normativa obligatoria**; `motorizado` endurece la matriz a documentos de moto (prueba: tras clasificar, la matriz exige `insurance_policy_photo`/`circulation_card_photo`; solo aplica a eléctricas).
- Cliente `revisionService.js` (cola, detalle, cotejos, clasificación, correcciones, Zoom, decisiones, reabrir) + `federalService` (casos, resolución); **evidencias por blob autenticado efímero** (`createObjectURL` revocado al desmontar) — jamás URL pública.
- `RepartidoresAgencia.jsx`: cola con filtros por estado + diálogo de expediente con identidad/CURP/CLABE enmascaradas, clasificación de eléctrica, evidencias privadas, **formulario de cotejo §12B** (el cotejo «oficial» exige fuente+URL; sin ellos es marcación falsa y el backend lo rechaza), validación Zoom (URL+resultado individual), decisiones con motivo (rechazo ≥20, suspensión/reapertura ≥10), historial append-only legible y **bandeja federal** para usuarios de agencia `tipo='federal'` con resolución auditada (devolver/habilitar/mantener).
- `Coowork.jsx`: pestaña «Verificar Repartidores» tocando los **6 puntos** del router por URL (lista blanca, `rutaDeTab`, `tabDeRuta`, guard, `StyledTab`, contenido) — visible solo para socio/admin/root (`tienePermisoCRUD`); el verificador puro **no** la ve (spec §8); la verificación de conductores existente queda intacta.

## 3. Archivos creados, modificados y eliminados

**Creados (12):**
- `ciudadan_frontend/src/services/Repartidor/repartidorService.js`
- `ciudadan_frontend/src/services/Repartidor/revisionService.js`
- `ciudadan_frontend/src/components/Repartidor/{helpers.jsx, QuieroRepartir.jsx, EstadoRepartidor.jsx}`
- `ciudadan_frontend/src/components/Repartidor/steps/Step{Cobertura,Identidad,Vehiculo,Evidencias,Pago,Capacitacion,Resumen}.jsx` (7)
- `ciudadan_frontend/src/components/Cowork/RepartidoresAgencia.jsx`

**Modificados (6, todos compartidos ya revisados en git):**
- `ciudadan_frontend/src/Contexts/RolesContext.jsx` (+`isRepartidor` y su export)
- `ciudadan_frontend/src/Routes/index.jsx` (2 rutas + imports + comentario de vistas)
- `ciudadan_frontend/src/components/Ganar/Ganar.jsx` (tarjeta «Repartiendo»)
- `ciudadan_frontend/src/Pages/Coowork/Coowork.jsx` (los 6 puntos + imports)
- `ciudadan_backend_26/src/api/delivery-registration/{services/revision-service.js, controllers/revision.js, routes/02-agencia.js, utils/eventos.js}` (clasificación de vehículo)

**Eliminados:** ninguno.

## 4. Endpoints, entidades, componentes y contratos afectados

- **Endpoint nuevo:** `POST /api/delivery-registration/agency/:id/vehicle-classification` (policy `is-delivery-reviewer`; body `{ classification: bicicleta_asistida|motorizado, motivo }`; evento `vehicle_classified` con `result` y `data_contrastada.base_normativa`).
- **Rutas frontend nuevas:** `/repartidor/registro`, `/repartidor/estado`, y `/coowork/verificar-repartidores` (tab `repartidores` del Cowork, vía la ruta genérica `/coowork/:vista`).
- **Componentes nuevos:** los 12 de §3. **Componentes afectados:** `Coowork.jsx` (nueva pestaña, sin tocar la de conductores), `Ganar.jsx` (nueva tarjeta), `RolesContext` (nuevo helper, API compatible).
- **Entidades backend:** sin cambios de schema; una acción nueva de bitácora (`vehicle_classified`).

## 5. Decisiones tomadas y su justificación (basada en código)

1. **Wizard con estado en el servidor, no en localStorage:** el repo ya tiene el patrón de draft persistente (`FormPreRegisterForSteps`), pero la spec exige que el backend valide todo; el wizard reconsulta `GET /me` tras cada paso y reanuda por `faltantes`/estado — cero riesgo de desincronización y sin datos sensibles en el cliente.
2. **Guard propio + `loginWithRedirect` con `returnTo`** (patrón `Coowork.jsx:302-308` y `03-Frontend.md` §2.1): no existe PrivateRoute (auditoría §1.6) y la solución canónica del repo es redirect con `appState.returnTo`.
3. **`Grid2 as Grid`** (patrón `ConductoresAgencia.jsx:7` con MUI 6.5.0): el primer build compiló con `Grid` legacy + `size` — detectado en revisión y corregido antes de consignar (el legacy Grid ignora `size`).
4. **La pestaña de repartidores solo para socio/admin/root:** spec §8 cierra la revisión a esos roles de la agencia; el verificador puro mantiene únicamente «Verificar Conductores» (mismo modelo de acceso reducido de `soloVerificador`).
5. **Bandeja federal visible para `userData.agencia.tipo === 'federal'`:** cosmética; la seguridad real es la policy `is-delivery-federal` (el alcance federal vigente del repo es «toda la red», `can-calificar-tarea.js:113-137`).
6. **Evidencias del revisor por blob efímero:** el patrón grants HMAC del módulo media 5B está cableado a su servicio remoto; para upload local, el equivalente honesto es streaming autenticado → `createObjectURL` con `revokeObjectURL` al cerrar.
7. **Clasificación de eléctrica como endpoint de revisor (no del solicitante):** la clasificación jurídica es una decisión de revisión con base normativa (spec §4.3/§12B), no un dato del solicitante; el solicitante solo declara potencia/velocidad.

## 6. Pruebas ejecutadas, comandos y resultados reales

| Comando | Resultado |
|---|---|
| `npx craco build` (CI=false DISABLE_ESLINT_PLUGIN=true, tras Fase C) | **Compila** (1.51 MB, +10.41 kB) |
| `npx craco build` (tras corrección Grid2) | **Compila** (1.51 MB, +4 B) |
| `npx craco build` (tras Fase D) | **Compila** (1.52 MB, +7.13 kB) |
| `node --test tests/delivery-flujo.test.js` (con clasificación) | 1 fallo → corregido helper de prueba (campos de eléctrica) y aserción (matriz endurecida) → **21/21** |
| `node --test tests/delivery-{flujo,role-grant,evidencias}.test.js` | **29/29** |
| `npm test` (backend, completo) | **150 pruebas, 142 pasan, 8 fallan — exactamente los 8 preexistentes** (sin regresiones) |

**Pruebas propuestas, no ejecutadas** (Fase E, requieren entorno): e2e con tokens Auth0 reales + MySQL del VPS, navegación en móvil real (accesibilidad), comportamiento PWA/Capacitor, expiración documental con reloj real en operación.

## 7. Riesgos y limitaciones

1. **UI de revisor densa:** el diálogo de expediente concentra cotejos+Zoom+decisiones; en móvil puede requerir scroll largo (usabilidad por pulir en QA).
2. **`correction_requests` con `document_id:'expediente'` genérico** en el botón rápido «Pedir correcciones»: el flujo fino por documento existe en la API, pero el atajo UI usa motivo libre — el revisor debe concretar en el texto.
3. **Bandeja federal resuelve señales en cascada** (una por una en el mismo expediente): aceptable para el volumen del MVP; una resolución masiva sería trabajo futuro.
4. Los riesgos estructurales del módulo siguen siendo los documentados en el informe A-B §7 (URLs estáticas de `/uploads` a nivel repo, rate-limit in-memory, aprobación→rol sin transacción de BD, enumeración de `file_id` con ventana pequeña).

## 8. Pendientes concretos

- **Fase E (QA):** e2e con Auth0/MySQL reales, accesibilidad móvil, PWA/Capacitor, regresión visual del tab de conductores junto al nuevo, y difuminado de la UI federal.
- **Producto:** excepción justificada al registro Zoom (§12D), obligatoriedad del contacto de emergencia (§4.1), semántica de `coverage_version`.
- **Plataforma (fuera de alcance):** 🔴 blob ofuscado en `middleware/src/routes/auth0.js:56`; alinear `SOCKET_PORT`; proveedor de upload privado; reincorporar los esqueletos `food-shipping-quote`/`food-tarifa` cuando tengan schema.

## 9. Conflictos o dependencias para el otro agente

- Se tocaron 4 archivos frontend compartidos (`RolesContext`, `Routes`, `Ganar`, `Coowork`) con ediciones mínimas y aditivas; revisar `git log -p e2e6d28 3814ff6 -- <archivo>` antes de editarlos en paralelo.
- El frontend de adrian1 sirve **build estático**: estos cambios requieren `CI=false DISABLE_ESLINT_PLUGIN=true npx craco build` + reinicio de `ciudadan-frontend.service` para verse (runbook `docs/deploy-adrian1-local.md`).
- Cero cambios en el flujo taxi: `ConductoresAgencia`/`DriverVerificationPage`/`driver`/`cars-*` intactos; la prueba de que no se rompió es que el tab de conductores comparte exactamente el mismo router que se extendió.

## 10. Instrucciones exactas para retomar el trabajo

1. `cd D:\CiudadanMX\ciudadan_app_monorepo && git checkout feature/backend-repartidores-mvp && git log --oneline -6` (esperado: `3814ff6`, `e2e6d28`, `5d34acc`, `d8d8fe2`, `8999718`, `7b4a83b`).
2. Verificación rápida: `cd ciudadan_backend_26 && npm test` → 142/150 (8 fallos preexistentes); `cd ciudadan_frontend && CI=false DISABLE_ESLINT_PLUGIN=true npx craco build` → compila.
3. Fase E: arrancar backend + frontend (`npm run develop` con `DATABASE_CLIENT=sqlite` local) y recorrer: `/gana` → tarjeta «Repartiendo» → wizard completo → envío; luego como socio en `/coowork/verificar-repartidores`: cotejos con fuente, clasificar eléctrica, Zoom, aprobar; verificar el rol en `/repartidor/estado` + `isRepartidor()`.
4. Mantener las reglas: no conceder `repartidor` fuera del backend; no mezclar con operación de entregas; no publicar CURP/CLABE/evidencias; informar por fase con commits reales.

---

*Informe de las Fases C y D. Fase A: 8999718 · Fase B: d8d8fe2 · Informe A-B: 5d34acc · Fase C: e2e6d28 · Fase D: 3814ff6. Con esto, el alcance A-D del objetivo está completo; queda Fase E (QA en entorno) como pendiente documentado.*
