# CIUDADAN — Informe de sesión: MVP de repartidores — Fases A y B

- **Fecha:** 22 de octubre de 2026
- **Rama:** `feature/backend-repartidores-mvp` (local; sin push — regla 3: no desplegar a producción)
- **Commits de esta sesión:**
  - `8999718` — docs(repartidores): Fase A — auditoría del código real (211 líneas, solo `docs/REPARTIDORES-MVP-FASE-A-AUDITORIA.md`)
  - `d8d8fe2` — feat(repartidores): Fase B — backend del MVP (69 archivos, +7205/−39)
- **Estado del árbol al cierre:** limpio (`git status` sin cambios sin confirmar). Los directorios `types/generated/*.d.ts` se regeneraron al arrancar Strapi y se confirmaron (convención del repo).
- **Especificación:** `CIUDADAN_MVP_REGISTRO_REPARTIDORES_DANY.md` (en `D:\CiudadanMX\`, fuera del repo; también existe en el commit huérfano `f025554` como `docs/…DANY.md`).

---

## 1. Fase y objetivo

- **Fase A (cerrada):** auditoría del código real antes de modificar cualquier archivo (spec §11.A): roles/Auth0, agencias/territorio, expediente taxi, notificaciones, almacenamiento, Cowork, pruebas.
- **Fase B (cerrada):** backend completo del MVP — entidades, endpoints protegidos, máquina de estados, CLABE protegida, capacitación, concesión atómica del rol `repartidor`, señales de riesgo/bandeja federal, evidencias con streaming privado, lista de espera, auditoría append-only y pruebas.

## 2. Resumen de lo realizado

1. **Auditoría** con 4 auditorías paralelas de solo lectura + lecturas de primera mano; entregada como `docs/REPARTIDORES-MVP-FASE-A-AUDITORIA.md` con 17 riesgos/discrepancias citados (R1-R17), incluyendo el 🔴 **blob ofuscado en `middleware/src/routes/auth0.js:56`** (hallazgo de seguridad fuera de alcance, no tocado) y las rutas taxi sin policy (`policies: []`) que este MVP no hereda.
2. **6 content-types nuevos** con CRUD core cerrado estructuralmente (`except: ['find','findOne','create','update','delete']`): `delivery-profile`, `delivery-vehicle`, `delivery-verification-event`, `delivery-training-attempt`, `delivery-waitlist-entry`, `delivery-risk-signal`. Todos `draftAndPublish: false`. Expediente **independiente del taxi** (spec §3.4).
3. **API `delivery-registration`** (sin content-type, rutas numeradas `auth:false` + policy, patrón `auth`/`stripe`): 28 rutas en 3 archivos (solicitante/agencia/federal) + 2 policies nuevas (`is-delivery-reviewer`, `is-delivery-federal`).
4. **Lógica pura versionada** en `utils/` (11 módulos): CLABE con dígito de control + catálogo parcial + máscara; CURP + edad ≥18 + consistencia fecha; máquina de estados (§5+§12D); matriz de requisitos por tipo de vehículo (bici sin placa jamás; moto exige licencia/seguro/tarjeta vigentes; eléctrica clasificada `motorizado` adopta matriz de moto); cuestionario 10 preguntas/5 módulos/aprobado ≥8 sin filtrar respuestas; cifrado AES-256-GCM de CLABE (fail-closed sin APP_KEYS); validador de URL Zoom (HTTPS, `*.zoom.us`, sin `pwd`/tokens); rate-limit in-memory; motor de señales explicables (§12G).
5. **Concesión del rol `repartidor`** — el primer otorgamiento de rol por backend del repo: endpoint de aprobación con 8 gates verificados en cada request, update condicional (bloqueo optimista contra doble aprobación), **merge aditivo** de `roles.extra` preservando el resto del JSON (corrige el patrón destructivo de `agregar-socio.js:67-87`), idempotencia (no duplica rol ni evento) y bitácora `role_granted`/`role_grant_skipped_idempotent`/`role_grant_failed`.
6. **Evidencias**: subida por `/api/upload` (override Auth0 existente) + registro por slot con MIME/tamaño (img 15MB/video 150MB, precedente taxi), SHA-256 de los bytes reales del disco, **unicidad de adjunto** (un archivo vive en un solo expediente — blindaje de propiedad porque el plugin upload no registra quién sube), y **streaming privado** autenticado (titular o revisor de la misma agencia). La API jamás devuelve `file.url`.
7. **Notificaciones** por el canal existente (`createForUser` + `emitRealtime` best-effort), nunca un canal paralelo; tipo `delivery.status.changed`.
8. **Pruebas**: 81 nuevas en `node:test` con mock propio (`tests/helpers/strapi-mock-repartidores.js`, sin tocar el helper compartido).

## 3. Archivos creados, modificados y eliminados

**Creados (89):**
- `docs/REPARTIDORES-MVP-FASE-A-AUDITORIA.md`
- `ciudadan_backend_26/src/api/delivery-{profile,vehicle,verification-event,training-attempt,waitlist-entry,risk-signal}/` (4 archivos c/u: schema.json, router cerrado, controller stock, service stock)
- `ciudadan_backend_26/src/api/delivery-registration/`: `controllers/{coverage,waitlist,expediente,vehiculos,evidencias,capacitacion,revision,federal}.js`, `routes/{01-solicitante,02-agencia,03-federal}.js`, `services/{bitacora,notificar,expediente-service,evidencias-service,waitlist-service,revision-service,federal-service}.js`, `utils/{constants,clabe,clabe-crypto,curp,state-machine,requirements,questionnaire,zoom-url,rate-limit,eventos,senales}.js`
- `ciudadan_backend_26/src/policies/is-delivery-{reviewer,federal}.js`
- `ciudadan_backend_26/tests/delivery-{clabe,curp,state-machine,requirements,training,clabe-crypto,zoom-url,senales,role-grant,flujo,evidencias}.test.js` + `tests/helpers/strapi-mock-repartidores.js`
- (Este informe.)

**Modificados (2, regenerados por Strapi al arrancar, convención del repo):**
- `ciudadan_backend_26/types/generated/components.d.ts`, `contentTypes.d.ts`

**Eliminados:** ninguno. **Movidos fuera de `src/api` (cuarentena, cero contenido, untracked):** carpetas vacías `food-shipping-quote/` y `food-tarifa/` → `.dsh-quarantine-empty-scaffolds/` (los esqueletos vacíos rompían el arranque de Strapi para cualquiera; no contenían un solo archivo y no estaban en git).

## 4. Endpoints, entidades y contratos

**Entidades** (schemas en `src/api/*/content-types/*/schema.json`): ver §2. Estados de `delivery-profile`: `draft → pending_documents → pending_review → corrections_required → eligible_for_video_review → approved | rejected`, más `pending_federal_audit` (bloqueo) y `suspended` (revalidable). Relaciones: `user` (oneToOne), `agency` (manyToOne→`api::agencia.agencia`), `vehicles` (oneToMany), bitácora/señales/intentos con FK al perfil. La afiliación usa la relación propia del expediente (patrón `driver.agency`); **no se toca `user.agencia`** del solicitante.

**Endpoints** (prefijo `/api/delivery-registration`; todos `auth:false` + policy):
| Ruta | Policy | Qué hace |
|---|---|---|
| `GET /coverage?territory=` | is-authenticated-auth0 | Agencias publicadas elegibles (MVP: CDMX); `waitlist:true` si no hay |
| `POST /waitlist` · `POST /waitlist/unsubscribe` | is-authenticated-auth0 | Lista de espera: consentimiento versionado, dedup por email único, rate-limit 5/10min, baja idempotente; email siempre de la sesión |
| `POST /` | is-authenticated-auth0 | Iniciar idempotente; `agency_id` validado contra la lista server-side |
| `GET /me` · `PATCH /me` | is-authenticated-auth0 | Proyección propia sin CLABE completa/notas/revisor/eventos; edición solo en `draft|pending_documents|corrections_required` |
| `POST /me/vehicles` | is-authenticated-auth0 | Vehículo condicional por tipo (MVP: uno, escalable); re-registrar actualiza |
| `POST /me/evidence` · `GET /me/evidence/:fileId` | is-authenticated-auth0 | Adjuntar con validación de slot/MIME/tamaño/hash; streaming privado |
| `GET /me/training` · `POST /me/training` | is-authenticated-auth0 | Cuestionario sin respuestas correctas; calificación server-side, reintentos |
| `POST /me/submit` | is-authenticated-auth0 | Prechecks de completitud → `pending_review` (o bloqueo federal por señal alta) |
| `GET /agency/queue` · `GET /agency/:id` · `GET /agency/:id/evidence/:fileId` | is-delivery-reviewer | Cola paginada y detalle de SU agencia (root ve todas); CLABE enmascarada; evidencia por streaming |
| `POST /agency/:id/document-checks` | is-delivery-reviewer | Cotejo §12B: `check_type` (oficial exige `source_name`+`official_source_url`), resultado, evidencia con hash; mismatch/reported → señal alta + bloqueo federal |
| `POST /agency/:id/request-corrections` | is-delivery-reviewer | Correcciones estructuradas + notificación al solicitante |
| `POST /agency/:id/mark-video-eligible` | is-delivery-reviewer | Matriz documental completa + clasificación de eléctrica + vigencias → `eligible_for_video_review` |
| `POST /agency/:id/video-validation` | is-delivery-reviewer | URL Zoom validada + fecha + responsable + resultado individual (§12F) |
| `POST /agency/:id/approve` | is-delivery-reviewer | 8 gates + no-auto-aprobación + agencia publicada + update condicional → `approved` + concesión idempotente del rol |
| `POST /agency/:id/reject` · `/suspend` · `/revalidate` · `/reopen` | is-delivery-reviewer | Rechazo motivado (≥20 car.) con vía de apelación; suspensión conservando rol/historial; revalidación; reapertura de rechazo |
| `GET /federal/cases` · `POST /federal/cases/:signalId/resolve` | is-delivery-federal | Casos con señales altas de toda la red; resolución `devolver_agencia|habilitar_aprobacion|mantener_bloqueo`, todo con evento |

**Componentes afectados del frontend: ninguno todavía** (Fase C/D pendientes). El backend no toca `food-delivery`, `food-order`, `trip*`, `viaje*`, `wallet*`, `driver`, `cars-*` ni rutas/menús existentes.

## 5. Decisiones tomadas y su justificación (basada en código)

1. **"Agencia activa" = `publishedAt != null`** (`agencia` no tiene campo de estado; `draftAndPublish` es el único mecanismo vigente). No se inventó enum `estado` paralelo (regla 7).
2. **"Elegible" = publicada**, con filtro suave opcional por `localidad.ciudad` (campo existente, hoy sin uso); CDMX como única ciudad habilitada por constante (`CIUDADES_HABILITADAS`). La spec §12A pedía resolver con la "lógica territorial existente": el grep de auditoría demostró que NO existe, así que no se inventó (discrepancia documentada R10).
3. **Revisor válido** = `roles.extra ∈ {socio,admin,root}` + **misma agencia** (patrón `postulacion-socio.js:76-83`) + vigencia para socio (`membresia_vigente===true || verificado===true`, único lector vigente del repo `media-service.js:88-90`) + nadie actúa sobre su propio expediente. Admin/root con bypass de vigencia (matriz `can-calificar-tarea.js:77-83`).
4. **Federal** = `agencia.tipo === 'federal'` (alcance de red de `can-asignar-tarea.js:126-155`); no existe jerarquía parent.
5. **Concesión de rol por `db.query` directo** con endpoint propio (patrón legítimo `agregar-socio`), no por `PUT /api/users` (filtrado por `escritura-protegida.js`) ni por el middleware `:33010` (roto por diseño, auditoría §0.2).
6. **CLABE cifrada AES-256-GCM con clave derivada de `APP_KEYS`** (obligatorio en todo entorno Strapi; fail-closed si falta). Solo `last4` sale del backend; jamás en logs.
7. **Zoom sin integración** (spec §12F): solo se valida y registra URL + fecha + responsable + resultado individual; el módulo `zoom` existente es un proxy de API sin persistencia y no se usa.
8. **Lista de espera nueva** replicando el patrón `driver-launch-lead` (consentimiento versionado, dedup unique+catch, rate-limit, baja) — su colección está acoplada a promo/APK/launch de conductores; `lista-suscripcion` es de cursos/eventos; `postulacion` cerró el 2026-10-09.
9. **Cuestionario versionado en el backend** (spec §3.12, sin dependencia de Academia); respuestas correctas nunca viajan al cliente; sin límite de reintentos (documentado).
10. **Eventos como `action` string** controlado por vocabulario en código (`utils/eventos.js`) en vez de enum de schema: la bitácora es append-only y el vocabulario crece sin migraciones.
11. **Excepciones §12D de Zoom y contacto de emergencia** quedan como pendientes de producto (spec 4.1 lo deja "a confirmar"); el contacto se pide sin bloquear el envío.

## 6. Pruebas ejecutadas, comandos y resultados reales

| Comando (en `ciudadan_backend_26/`) | Resultado |
|---|---|
| `npm test` (línea base, ANTES de cambios) | 68 pruebas, **60 pasan, 8 fallan** (preexistentes: `prelanzamiento.test.js:40` 1, `wiki-root-provider.test.js` archivo, `wikiseed-sync.test.js` 6 — separadores de ruta Windows) |
| `node --test tests/delivery-{clabe,curp,state-machine,requirements,training,clabe-crypto,zoom-url,senales}.test.js` | **53/53 pasan** (3 bugs corregidos durante el desarrollo: acento en mensaje CLABE, selfie siempre obligatoria en reutilización de INE, aserción `typeof`) |
| `node --test tests/delivery-role-grant.test.js` | **5/5 pasan** (merge aditivo, idempotencia, JSON malformado, fallo con huella) |
| `node --test tests/delivery-flujo.test.js` | **20/20 pasan** (2 bugs reales corregidos: fallback de `caller.agencia` crudo en `verificarAmbito`; señales sin `status:'activa'` explícito) |
| `node --test tests/delivery-evidencias.test.js` | **3/3 pasan** (MIME/tamaño/hash real, unicidad de adjunto, acceso titular/revisor) |
| `npm test` (DESPUÉS de Fase B) | **149 pruebas, 141 pasan, 8 fallan — exactamente los 8 preexistentes** (cero regresiones) |
| `$env:DATABASE_CLIENT='sqlite'; npm run develop` | **Strapi 4.25.9 arranca** (sqlite): tablas nuevas creadas, rutas registradas, 69s de arranque |
| `GET /api/delivery-registration/coverage`, `/me`, `/agency/queue`, `/federal/cases`, `POST /waitlist` sin token | **403 en los 5** (políticas Auth0 activas) |
| `GET /api/delivery-profiles`, `/api/delivery-vehicles` | **404** (CRUD core cerrado estructuralmente) |

Pruebas **propuestas pero no ejecutadas** (Fase E): e2e con Auth0 real contra MySQL del VPS, UI móvil, PWA, expiración documental con reloj real.

## 7. Riesgos y limitaciones

1. **URLs estáticas de `/uploads` siguen existiendo a nivel repo** (R4/R5 de la auditoría): el módulo no las divulga (IDs + streaming propio), pero quien ya conozca una URL puede abrirla. Migrar el provider a privado/firmado es trabajo de plataforma (fuera de alcance, documentado).
2. **Enumeración de `file_id` entre subida y adjunto** (el plugin upload no registra propietario): ventana pequeña; mitigada con unicidad de adjunto + validación MIME/tamaño + hash; la acreditación de propiedad sería con firma de subida directa al endpoint (pendiente).
3. **Rate limiting in-memory single-instance** (igual que `driver-launch`): con múltiples réplicas del backend pierde eficacia; documentado.
4. **Aprobación y concesión no son transacción de BD** (Strapi 4 sin transacción en `db.query`): orden estado→rol con bitácora `role_grant_failed` y reentrancia idempotente; documentado como limitación.
5. **`GET /api/users` público** (preexistente): el módulo no lo usa ni amplía.
6. **Notificaciones realtime best-effort** (puertos 33032/33035 divergentes por defecto — preexistente): la persistencia garantiza entrega al refrescar.
7. **Socket de señales**: `evaluarCotejo`/`evaluarDuplicidad`/`evaluarVehiculoAlEnviar` son las 3 reglas del MVP; no hay motor de patrones de agencia (§12G completo) — pendiente de producto.
8. La **excepción justificada al registro Zoom** (§12D) y la **obligatoriedad del contacto de emergencia** (§4.1) están modeladas/parametrizadas pero sin flujo (decisiones de producto abiertas por la propia spec).

## 8. Pendientes concretos

- **Fase C (frontend):** página «Quiero repartir» + wizard (base: patrón del wizard huérfano `FormPreRegisterForSteps`, servicios propios nuevos en `src/services/Repartidor/` con `fetchJson`), lista de espera, vista de estado/correcciones, `isRepartidor()` en `RolesContext.jsx:387-390`+value, entrada de navegación (tarjeta en `Ganar.jsx:117-126`), `fetchRolesYMembresia(true)` al recibir notificación (`PreRegistroConductor2.jsx:793-794`).
- **Fase D (Cowork):** pestaña «Repartidores» junto a «Verificar Conductores» — 6 puntos de `Coowork.jsx` (lista :91, `rutaDeTab` :122, `tabDeRuta` :163, guard :324, tab :674, contenido :821) + aliases en `Routes/index.jsx` + componente de cola estilo `ConductoresAgencia.jsx` con `fetchJson` (no `fetch` crudo) + bandeja federal para agencias `tipo='federal'`.
- **Fase E (QA):** e2e con tokens Auth0 reales, regresión taxi/roles múltiples, accesibilidad móvil, expiración documental.
- **Producto/legal:** definir excepción Zoom y obligatoriedad del contacto de emergencia; semántica futura de `coverage_version`/`territory_ref`.
- **Plataforma (fuera de alcance, urgente):** 🔴 aislar/eliminar `middleware/src/routes/auth0.js:56` (blob ofuscado) y auditar su historial; alinear `SOCKET_PORT` con el destino de `emitRealtime`; decidir proveedor de upload privado.
- **Reincorporar** los esqueletos `food-shipping-quote`/`food-tarifa` (en `.dsh-quarantine-empty-scaffolds/`) cuando su agente les ponga schema.

## 9. Conflictos o dependencias para el otro agente

- **Cero archivos compartidos modificados** salvo `types/generated/*.d.ts` (regenerados, convención del repo). Las pruebas usan un helper NUEVO; no se tocó `tests/helpers/strapi-mock.js` ni ninguna policy existente.
- El frontend de la instancia adrian1 sirve build estático: **editar `src/` no cambia el sitio**; Fase C/D requerirán `CI=false DISABLE_ESLINT_PLUGIN=true npx craco build` + reinicio del servicio (`docs/deploy-adrian1-local.md`).
- Si otro agente trabaja en `RolesContext.jsx` o `Coowork.jsx` (Fases C/D), revisar `git log` reciente antes de editar (regla 11).
- Las nuevas tablas se crean automáticamente al arrancar Strapi (DDDL aditivo); en producción MySQL el arranque las sincroniza como hace con el resto (gate CI de schema destructivo no aplica: solo se AÑADEN content-types).

## 10. Instrucciones exactas para retomar el trabajo

1. `cd D:\CiudadanMX\ciudadan_app_monorepo && git checkout feature/backend-repartidores-mvp && git log --oneline -3` (esperado: `d8d8fe2`, `8999718`, `7b4a83b`).
2. Leer: `docs/REPARTIDORES-MVP-FASE-A-AUDITORIA.md` (hallazgos y decisiones), este informe, y la spec `D:\CiudadanMX\CIUDADAN_MVP_REGISTRO_REPARTIDORES_DANY.md` §11 (fases C-E).
3. Backend: `cd ciudadan_backend_26 && npm test` → debe dar **141/149** (los 8 fallos son preexistentes, ver §6). Arranque local: `$env:DATABASE_CLIENT='sqlite'; npm run develop` (MySQL :3307 no corre en esta máquina).
4. Fase C: empezar por `src/services/Repartidor/` (envolver `/api/delivery-registration/*` con `fetchJson` + Bearer Auth0, patrón `services/cowork/*`), luego `RolesContext.jsx` (`isRepartidor` copiando `isAuditor:387-390` + value `:539-555`), rutas en `Routes/index.jsx` junto a `:518-525` (autoguard por componente: NO hay PrivateRoute), y la entrada en `Ganar.jsx:117-126`. Casing EXACTO de imports (`Pages/Coowork/` vs `Pages/CoWork/`).
5. Fase D: los 6 puntos de `Coowork.jsx` citados en §8 + rutas alias estilo `Routes/index.jsx:908-915`.
6. No mezclar con: cotizaciones, entregas, viajes, geolocalización, pagos (spec §1). No conceder `repartidor` fuera de `revision-service.otorgarRolRepartidor`. No publicar CURP/CLABE/evidencias/URLs.
7. Al terminar cada fase: informe Markdown (secciones de este documento) + commit + `npm test` con resultados reales.

---

*Generado por el agente de implementación del MVP de repartidores. Fase A: 8999718 · Fase B: d8d8fe2. El objetivo continúa activo con las Fases C, D y E.*
