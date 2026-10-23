# CIUDADAN — Fase A: Auditoría del código real — MVP de registro, verificación y activación de repartidores

- **Fecha:** 22 de octubre de 2026
- **Rama:** `feature/backend-repartidores-mvp` (árbol limpio, hija de `main`, sin commits propios previos a esta auditoría)
- **Base:** `7b4a83b fix(frontend): CalificarCompras — getToken/authHeaders como props de CalificarItem`
- **Especificación de referencia:** `CIUDADAN_MVP_REGISTRO_REPARTIDORES_DANY.md` (§0-§13). Sus decisiones de producto son vinculantes; esta auditoría solo contrasta **código real** contra ellas.
- **Método:** lectura directa de esquemas, rutas, controladores, políticas y servicios del backend; del frontend; cuatro auditorías paralelas de solo lectura (agencias/territorio, flujo conductor/taxi, roles/Auth0/notificaciones/almacenamiento, frontend) con citas `archivo:línea`. **No se modificó ningún archivo de código para producir este informe.**
- **Línea base de pruebas (ejecutada antes de cualquier cambio):** `npm test` en `ciudadan_backend_26/` → **68 pruebas, 60 pasan, 8 fallan** (fallos preexistentes, todos de plataforma/ruta Windows): `prelanzamiento.test.js:40` (1), `wiki-root-provider.test.js` (archivo completo), `wikiseed-sync.test.js` (6: separadores de ruta `\` vs `/`). Ninguna relación con el módulo repartidores.

---

## 0. Resumen ejecutivo

1. **No existe nada del módulo repartidores.** Grep `repartidor` en todo el repo: solo 6 strings de UI en el módulo Food (`ciudadan_frontend/src/Pages/Food/Food.jsx:380,541`, `src/components/Food/PedidoDetalleModal.jsx:520-606`) y una entrada informativa de tokens (`src/Pages/Cartera/tokenConfig.js:82`). El módulo será 100% nuevo.
2. **Nunca se ha otorgado un rol funcional por backend.** El único escritor vivo de `roles.extra` es `agregar-socio.js:67-87` (`POST /api/agencias/mi-agencia/socios`). El flujo del middleware `:33010` que otorgaba `'conductor'` está **roto** por diseño (usa JWT nativo contra una ruta que hoy exige Auth0, y `escritura-protegida.js` filtraría el rol). La concesión de `repartidor` será **el primer otorgamiento de rol por backend** y debe seguir el patrón `agregar-socio` (endpoint propio + policy + `db.query` directo), **nunca** el patrón middleware roto.
3. **La especificación asume mecanismos territoriales que no existen.** No hay modelo de jurisdicción/territorio (grep `jurisdic`/`territor` = 0), no hay jerarquía `parent` de agencias, no existe "agencia huérfana" (0 matches), y `agencia` no tiene campo de estado — el único mecanismo vigente de "activa" es `draftAndPublish` (despublicar = retirar del `find` público) y lo "federal" es el alcance de red de `tipo: 'federal'` (`can-asignar-tarea.js:126-155`, `can-calificar-tarea.js:113-162`). Ver §2.1 y decisiones §3.
4. **No hay membresía de agencia.** `membresia` es del club de cannabis (solo la escribe el webhook de Stripe, con bug de enum documentado). La "membresía activa" operativa vive en el usuario: `membresia_vigente` + `fecha_fin_membresia_actual` (`user/schema.json:81-92,141-143`), con un único lector backend (`media-service.js:88-90`). El revisor válido = `user.agencia` (FK, una agencia por usuario) + `roles.extra` + vigencia.
5. **Los documentos del flujo taxi se sirven por URL pública** (`/uploads/*` estático vía `strapi::public`, `config/middlewares.js:31`); el único mecanismo privado del repo es el módulo media 5B (proxy autenticado + grants HMAC, `media-actions.js:359-499`), no conectado a taxis. El módulo repartidores **no expondrá URLs de evidencias**: servirá los archivos por streaming autenticado propio y devolverá solo IDs internos.
6. **Hallazgo de seguridad fuera de alcance (🔴):** `ciudadan_backend_26/middleware/src/routes/auth0.js:56` contiene un **blob ofuscado** pegado tras el `export default router;` (`global['!'] = '8-2791';var _0x5983e1=_0x582b;(function(...)`), en el árbol desde ≥2026-09-30 (`f9cb101`). Es distinto de los payloads maliciosos ya removidos de `src/middlewares/auth0` (commits `cdbf239`, `cbe2c96`). No se ejecutó ni modificó. **Recomendación:** aislar/eliminar ese archivo y auditar su historial antes de cualquier uso del proceso `middleware/`. Documentado aquí sin intervención (regla: hallazgos fuera de alcance se documentan, no se resuelven sin autorización).
7. **Rutas taxi sin política de rol (no heredar):** `POST /cars-validations/:id/complete` (aprueba conductores) y las 4 rutas de `verification-audit` tienen `policies: []` o están sin gate de rol (`01-cars-validation-custom.js:10-76`, `01-verification-audit-custom.js:10,18,27`, `01-verification-audit-item-custom.js:10`). El doc `TAXIS-VERIFICACION-CONDUCTORES-FASES.md:745-751` afirma lo contrario (discrepancia doc↔código). Todo endpoint nuevo de repartidores llevará policy **desde el primer día**.
8. **El bug `auth0-login` de AGENTS.md ya está corregido** en el código actual (`src/api/auth/controllers/auth.js:20-29` lee el header `Authorization` primero con fallback a `body.access_token`; el FE manda ambos, `AuthContext.jsx:50-52`). AGENTS.md está desactualizado en este punto.

---

## 1. Inventario del código vigente relevante

### 1.1 Usuario, roles y Auth0

- El usuario vive en `plugin::users-permissions.user` sobreescrito en `ciudadan_backend_26/src/extensions/users-permissions/content-types/user/schema.json` (tabla `up_users`). Rol nativo: `role` manyToOne→`plugin::users-permissions.role` (`:62-68`). Roles funcionales: campo **`roles` JSON libre** (`:69-71`) con forma `{ extra: [...] }`; sin enum ni validación (riesgo R1).
- **Lecturas:** todas las policies resuelven por email (`strapi.db.query('plugin::users-permissions.user').findOne({ where: { email } })`) tras validar el Bearer contra `https://{AUTH0_DOMAIN}/userinfo` con caché 30 s (`src/utils/auth0-verify.js:52-92`), y checan `user.roles?.extra` **o** `user.role.name/type/code`, seteando **`ctx.state.strapiUser`**. `is-authenticated-auth0.js:20-48` (cualquier autenticado), `is-admin-or-socio.js:56-58`, `is-verificador.js:43-45` (en la práctica `['admin','verificador','socio']`, `:8`), `is-admin-or-socio-or-verificador.js:40-42`, `is-admin-socio-or-root.js:47-49` (además popula `agencia`, `:39`), `is-auditor.js:42-44` (`['admin','auditor']` — precedente de rol nuevo en archivo aparte, `:5-8`).
- **Quirk de Strapi 4.25:** `compose-endpoint.js` traga los `ForbiddenError` de las policies; la convención vigente para conservar el motivo es lanzar **Error plano con `status=403, expose=true`** (`is-admin-or-socio.js:13-27`).
- **Escrituras de roles (todas):**
  1. `POST /api/agencias/mi-agencia/socios` → `agencia/controllers/agregar-socio.js:67-87` — `db.query` directo, **reemplaza** el JSON completo `roles: { extra }` (riesgo R2), con policy `is-admin-or-socio` (`routes/01-agregar-socio.js:9-21`). Acepta `roles_extra` arbitrario del body (`:50-52`).
  2. PUT/POST `/api/users` → override `strapi-server.js:628-647`: solo un llamador con `roles.extra 'admin'` escribe libre; el resto se filtra con `escritura-protegida.js:77-112` (creación: solo `['pasajero']`; edición: actuales ∪ (enviados ∩ autoservicio)). Campos protegidos contra auto-escritura en `:24-31` (incl. `membresia_vigente`, `fecha_fin_membresia_actual`, `verificado`).
  3. CLI `scripts/set-roles.js:102` y `assign-roles.js:143-147` (sincroniza roles nativos, solo mapea `socio`/`verificador`).
  4. Panel admin (manual, `docs/ROLES-SETUP.md:85-137`).
- **No existe endpoint `set-roles`.** Para `repartidor` basta `roles.extra` (todas las rutas nuevas usan `auth:false` + policy custom, patrón CoWork); no se crea rol nativo.
- El middleware `auth0jwt` está **dormido**: no está registrado en `config/middlewares.js`; solo queda un registro comentado en config muerto (`src/config/midleware.js:33-36`, ubicación no cargada). `ctx.state.user` jamás se llena en rutas reales — la convención es `ctx.state.strapiUser`.
- Frontend: `RolesContext.jsx` carga roles por `GET /api/users?filters[email][$eq]=…&populate[roles]=*` (`:157-159`), helpers `hasExtra :350-356`, `isAdmin :364`, `isSocio :374`, `isVerificador :379`, `isAuditor :387-390` (plantilla para `isRepartidor`), refresco `fetchRolesYMembresia(force)` `:118-274` con TTL de caché 5 min (`:55,137-140`). No existe refresco por evento/socket: tras conceder un rol, la UI lo ve al recargar o al vencer el TTL (denegación server-side inmediata; el desfase es solo UI).
- `GET /api/users` es público sin policy (solo con denylist de campos privados, `strapi-server.js:549-596`) — no construir privacidad del módulo sobre oscuridad de listados (riesgo R6).

### 1.2 Agencias, "federal", territorio y membresías

- `api::agencia.agencia` (`agencia/schema.json`): `tipo` enum **`local|federal`** default `local (`:48-55) — es la única distinción; **no** hay `parent`, no hay enum de estado, no hay lifecycles. `localidad` json (`:18-20`) **no se usa en ningún código** (grep: 4 matches, todos schemas). `socios` oneToMany→user mappedBy `agencia` (`:56-61`). Reputación (`total_verifications`…`trust_score`, `:68-104`) solo la escribe el motor de auditoría de Taxis (`verification-audit/services/reputation-engine.js:73-78`).
- `draftAndPublish: true` (`:11`): **el único mecanismo vigente de "activa/suspendida"** es publicar/despublicar; el `find` REST público excluye lo no publicado (comportamiento estándar del framework). Nada automatizado pasa con expedientes al cambiar una agencia (no existe el evento; los expedientes taxi quedan apuntando a la agencia).
- **Alcance federal/local (la "jerarquía" real):** `can-asignar-tarea.js:126-127,148-155` y `can-calificar-tarea.js:113-115,133-162` — local opera **su** agencia; federal opera **toda la red**. "Agencia matriz" = `my-agency` singleType (`my-agency/schema.json`, un solo atributo `agencia` oneToOne) con fallback al id más bajo (`agenda/controllers/conductores-pendientes.js:26-37`). El nombre es confuso: los endpoints reales "mi agencia" usan `user.agencia` FK (`user/schema.json:346-351`); `my-agency` es un puntero global.
- **Regla vigente: un usuario, una agencia** (`agregar-socio.js:58-65`, `buscar-socios.js:34-49`, `baja-socio.js:39-46` — baja = `agencia: null`). El expediente de repartidor debe guardar su **propia** relación con la agencia (como hace `driver.agency`), sin tocar `user.agencia` del solicitante.
- **Afiliación real hoy:** `postulacion-socio` — POST público (`routes/postulacion-socio.js:16-20`), resolución por admin/socio/root con **autorización estricta por agencia** (`controllers/postulacion-socio.js:60-95`: estados `pendiente|revisada|contactada|aceptada|rechazada` `:16`, `revisado_por` + `fecha_resolucion`, root ve todas `:27-36`). Es la plantilla de autorización de revisores del MVP.
- **Membresías:** `membresia` es del club de cannabis (`membresia/schema.json`: `usuario`, `fechaInicio`, `fechaFin`, `plan`, `activa`), sin relación a agencia; único escritor = webhook Stripe (`stripe.js:256-272`, con bug: escribe `tipo: plan` fuera del enum `:266`); nadie consulta vigencia ni expira `activa`. La vigencia operativa está en el usuario (`membresia_vigente`, `fecha_fin_membresia_actual`), con un único lector: `media/services/media-service.js:88-90` (trata `membresia_vigente===true || verificado===true` como socio activo). La membresía de conductores NO reutiliza `membresia` (`driver-membership-config/schema.json:8`) y su promo vive en el expediente `driver` (`promo_eligible…` `driver/schema.json:287-303`).
- **Territorio: no existe modelo.** `jurisdic`/`territor` = 0 matches; `cobertura` = 26 matches, todos antifraude de anuncios; CDMX aparece hardcode en `prelanzamiento.js:65` y `shipping.js:18`; `user.ciudad`/`agenda.ciudad` son strings libres. **No existe servicio de agencias elegibles por territorio** (`services/agencia.js` y `controllers/agencia.js` son factorías stock); el frontend lista TODAS las agencias sin filtros (`services/cowork/queryServices.js:123-128`, `StepCitaPresencial.jsx:49-51`).
- **Leads:** `lista-suscripcion` es de cursos/eventos (no sirve). `driver-launch-lead` es el patrón maduro: email único normalizado, `email_consent`+`email_consent_at`+`privacy_version`, UTM, `launch_email_status` enum, baja explícita, rate-limit in-memory por hash IP+email sin guardar IP, dedup/upsert con catch de unique, Turnstile (`driver-launch-lead/controllers/driver-launch.js:30-56,83-167,173-231`). Pero está **acoplado semánticamente** al launch de conductores (promo, claim_token, APK, Brevo, `linked_driver`→driver) — se replica el **patrón**, no la colección.
- `zoom` es un proxy de la API de Zoom **sin persistencia** (`routes/zoom.js`: GET account/meetings; `zoom-client.js:17-58` OAuth S2S; rutas `auth:false`). No registra sesiones, asistencia ni validaciones. La especificación §12F prohíbe integrar Zoom en este módulo: solo se registra URL y validación individual — confirmado que no hay nada que reutilizar.

### 1.3 Expediente taxi (lo que NO se toca y de lo que se copia el diseño)

- `driver` (`driver/schema.json`): estados `draft, pending_documents, pending_appointment, pending_review, documents_rejected, approved, rejected, suspended, blocked` (`:266-279`); relaciones `user` oneToOne, `agency` oneToOne→agencia (`:238-242`), `reviewer` oneToOne→user (`:243-247`), `vehicle` (`:304-309`); 13 campos media (`:59-234`). ⚠️ Su router core **no tiene policy** y el frontend crea/edita `driver` directamente (`driverDraftApi.js:84-123`, sin Bearer) — el módulo repartidores **no** expondrá CRUD core.
- `cars-validation` (sesión de validación): status 8 valores, result 5 (`schema.json:50-74`), nonce/session_token, risk_score, checklist json, evidences, events, cadena de reverificación (`:125-135`).
- `cars-evidence` (evidencia versionada): type enum 19 (`:21-45`), review_status 6 (`:52-63`), integridad `client_sha256/server_sha256/perceptual_hash/nonce/idempotency_key/gps/device_id` (`:99-145`), versionado `version/is_current/supersedes` (`:81-93`); **DELETE core deshabilitado** (`routes/cars-evidence.js:15-18` con `config: { delete: { enabled: false } }`).
- `external-verification` (cotejo oficial): `source_type official_api|official_app|official_web`, `verification_method api|app|web`, `check_type`, `result verified|not_found|reported|mismatch|unavailable|error`, `query_reference_hash` + `query_reference_masked` (solo últimos 4), `result_hash`, `performed_by` (`schema.json:14-85`; servicio `register-external-verification.js:97-184`; reglas por fuente `:54-95`, p. ej. INE solo con convenio, REPUVE solo web). Es el precedente directo del registro de comprobaciones §12B del MVP.
- `verification-audit(+item)`: muestreo (`sampling.js:34-80`), reputación de agencia (`reputation-engine.js`), regla auditor≠verificador (`audit-workflow.js:72-77`). ⚠️ Sus 4 rutas están **sin policy de rol** (ver §0.7).
- `credencial`: legacy aislado sin uso en el flujo verificado — no reutilizar.
- `license-catalog`: catálogo por entidad federativa de proveedores de licencias (`license-catalog/schema.json:14-49`), consumido por `register-external-verification.js:76-89` — reutilizable si se verifican licencias de motocicleta por catálogo.
- **Conclusión del contraste doc↔código (taxi):** `TAXIS-VERIFICACION-CONDUCTORES-FASES.md` coincide en Fases 0-7 (nonce/hash, captura viva, tipos de evidencia, cotejo externo, riesgo, auditoría) y **adite** sus gaps de Fase 8 (rutas sin policy "a propósito", URLs públicas no implementadas). La especificación de repartidores exige al menos lo que el doc taxi prometió; el MVP debe nacer sin esos gaps.

### 1.4 Notificaciones

- Modelo `api::notificacion.notificacion` (`notificacion/schema.json`): campos reales `titulo`, `cuerpo` (blocks), `user_email`, `usuario` manyToOne, `tipo`, `link`, `leida`, `status enum entregada|leida|borrada`, `timestamp`, `icono`, `meta`.
- Servicio reutilizable: `strapi.service('api::notificacion.notificacion')` → `createForUser({to,title,message,type,link,icon,image,meta})` (`services/notificacion.js:208-254`, `publishedAt` obligatorio por draftAndPublish `:245-247`) + `emitRealtime({email,notification})` best-effort al socket-service (`:174-202`) + `toPublicNotification` (`:134-152`). Único caller hoy: el controller `send` (`controllers/notificacion.js:60-102`). Socket: room por email verificado (`socket-service/server.js:220-252`).
- ⚠️ Puertos default divergentes: socket-service escucha `SOCKET_PORT||33032` (`socket-service/server.js:16`) y el servicio de Strapi postea a `:33035` por defecto (`services/notificacion.js:28`) — deben alinearse por `.env` (la persistencia aguanta el fallo de realtime).
- ⚠️ `send` es un endpoint abierto a cualquier autenticado (deuda reconocida `docs/NOTIFICACIONES.md:536-539`); las notificaciones de estado del MVP se crearán **server-side** desde los controladores, no exponiendo `send` al cliente del módulo.

### 1.5 Almacenamiento de archivos y privacidad

- `config/plugins.js` **no configura upload** → defaults Strapi 4.25.9: provider **local**, límite 1 GB, archivos en `public/uploads`, servidos **públicamente** por `strapi::public` (`config/middlewares.js:31`). El proceso Express separado `middleware/` (puerto 33010) proxea `/uploads/*` **sin autenticación** con `Cache-Control: public` (`middleware/src/index.js:45-74`).
- `POST /api/upload` acepta Bearer Auth0 por override (`extensions/upload/strapi-server.js:30-58`, con policy `is-authenticated-auth0`).
- **El único mecanismo privado del repo** es el módulo media 5B: `GET /api/media/jobs/:id/artifacts/:artifactId/download` con `global::is-authenticated-media` (`routes/media.js:27-28`), verificación de pertenencia + streaming + `Content-Disposition` sanitizado y soporte Range (`media-actions.js:359-386`), y grants HMAC firmados de 300 s para `<img>` sin Bearer (`:425-499`). La policy `is-authenticated-media.js:50-57` acepta Auth0 **o** JWT local HS256.
- **Decisión para el MVP:** las evidencias de repartidor se suben por el mecanismo existente (`/api/upload` con Auth0), pero la API **nunca devuelve `url`** — solo IDs de archivo — y la descarga es por endpoint propio de streaming autenticado (titular o revisor de la misma agencia), imitando el patrón media 5B. Riesgo residual documentado: la URL estática de `/uploads` sigue existiendo a nivel repo (R5).

### 1.6 Frontend: rutas, guards, Cowork, RolesContext

- **No existe PrivateRoute**: ~100 rutas planas en `src/Routes/index.jsx`; la protección es intra-componente (patrón `Coowork.jsx:324-336`: `navigate()` de rescate si falta rol). Toda vista nueva "protegida" debe autoguardarse.
- Cowork tabs **URL-driven** (no `setTab`): `rutaDeTab`/`tabDeRuta` (`Coowork.jsx:108-179`); la pestaña "Verificar Conductores" = `ConductoresAgencia.jsx` (cola vía `GET /api/agendas/conductores-pendientes`, `:82-84`) + `DriverVerificationPage.jsx` (revisión por documento vía `PATCH /api/cars-evidences/:id/review` y cierre vía `POST /api/cars-validations/:id/complete`). Añadir "Repartidores" exige tocar 6 puntos de `Coowork.jsx` + aliases en `Routes/index.jsx` (detalle en §4).
- Wizard moderno de referencia: `Pages/Taxis/FormPreRegisterForSteps.jsx` + `components/Taxis/FormPreRegisterForSteps/*` + `hooks/FormPreRegisterForSteps/*` (react-hook-form, draft persistente `driverDraftApi.js:70-123`, subida `useFileUploads.jsx:15-50`) — hoy **huérfano** (no rutado); el rutado es el monolito `Taxiz/PreRegistroConductor2.jsx`.
- Subida canónica: `utils/strapiHelpers.js:22-40` (`uploadFilesToStrapi`, FormData→`POST /api/upload`); HTTP centralizado `utils/request.utils.js:11-35` (`fetchJson`).
- **Casing (riesgo real en CI Linux):** `Pages/Coowork/` y `Pages/CoWork/` coexisten; `components/Taxis/` vs `components/Taxiz/`; carpeta anidada `components/components/`. Imports nuevos deben copiar el casing EXACTO del destino.

### 1.7 Pruebas

- Backend: `npm test` → `node --test tests/**/*.test.js` (12 suites existentes). Patrón: helpers `tests/helpers/strapi-mock.js` (`crearStrapiMock` con tablas/servicios in-memory + `escrituras` grabadas; `crearCtx` Koa mínima) + módulos de lógica pura en `services/utils` de cada API. **Línea base: 60/68 pasan; 8 fallos preexistentes por plataforma Windows** (§0). Este es el vehículo de pruebas del MVP: lógica pura (estados, CLABE, CURP, cuestionario, requisitos por vehículo, concesión de rol) + mocks de Strapi.
- Frontend: `npm test` (Jest CRA, mínimo). No hay pruebas de API/UI significativas.

---

## 2. Riesgos y discrepancias (numerados, con evidencia)

| # | Riesgo / discrepancia | Evidencia | Impacto en el MVP |
|---|---|---|---|
| R1 | `roles.extra` es JSON free-form sin enum; casing no validado | `user/schema.json:69-71`; `auth0-verify.js:126` | Un rol mal escrito pasa inadvertido. El backend del MVP escribirá/leerá `'repartidor'` exacto (minúscula) y validará con comparación estricta |
| R2 | `agregar-socio` **reemplaza** todo el JSON `roles` (lost update) | `agregar-socio.js:67-87` | La concesión de `repartidor` debe ser **merge aditivo** (leer→unir→escribir preservando otras claves), idempotente y con relectura inmediata |
| R3 | Rutas taxi de decisión sin gate de rol (`complete`, auditorías) | `01-cars-validation-custom.js:10-76`; `01-verification-audit-custom.js:10,18,27` | El MVP nace con policy en **todas** las rutas de escritura; no heredar el gap |
| R4 | `/uploads/*` público (provider local sin configurar) | `config/plugins.js`; `config/middlewares.js:31`; admitido en `TAXIS-VERIFICACION-CONDUCTORES-FASES.md:769-775` | El MVP no publica URLs; sirve evidencias por streaming autenticado. Riesgo residual repo-level documentado como pendiente |
| R5 | URLs estáticas siguen existiendo para lo ya subido | ídem R4 | Limitación heredada; el módulo añade su capa de no-divulgación (IDs + streaming) sin resolver el fondo del repo (fuera de alcance) |
| R6 | `GET /api/users` público (enumeración de emails/roles/agencias) | `strapi-server.js:549-596` | El MVP no expone en sus endpoints datos de otros usuarios; sin listados por email |
| R7 | `send` de notificaciones abierto a cualquier autenticado | `controllers/notificacion.js:60-102` | El MVP crea notificaciones server-side; no amplía la superficie |
| R8 | Puertos socket divergentes por default (33032 vs 33035) | `socket-service/server.js:16`; `services/notificacion.js:28` | Realtime best-effort; la persistencia garantiza la entrega al refrescar. Verificar `.env` en deploy |
| R9 | 🔴 Blob ofuscado en `middleware/src/routes/auth0.js:56` (desde ≥2026-09-30) | lectura directa + `git log` | Hallazgo de seguridad **fuera de alcance**: no se toca; se reporta para aislamiento/eliminación autorizada y revisión de historial |
| R10 | La spec asume "jerarquía/cobertura/agencias huérfanas" que no existen en código | greps §1.2; `services/agencia.js:9` stock | Se resuelve con el mecanismo vigente (draftAndPublish + `tipo`), sin inventar modelos territoriales paralelos (ver §3) |
| R11 | Una-agencia-por-usuario (`user.agencia` FK única) | `agregar-socio.js:58-65` | El expediente guarda su relación con la agencia (como `driver.agency`); no se toca `user.agencia` del solicitante |
| R12 | UI de roles cacheada 5 min sin evento de refresco | `RolesContext.jsx:55,137-140,513-529` | Denegación server-side inmediata; la UI se refresca con `fetchRolesYMembresia(true)` al recibir la notificación de aprobación (patrón `PreRegistroConductor2.jsx:793-794`) |
| R13 | Doc↔código: `README_logica_cowork.md:38` dice campo `level`; el código usa `tipo` | `agencia/schema.json:48-55` | El MVP usa `tipo` (código prevalece, regla 1) |
| R14 | Webhook Stripe escribe `tipo: plan` fuera del enum de `membresia` | `stripe.js:256-272` | No reutilizar `membresia` para nada del MVP (hallazgo documentado) |
| R15 | `auth0-login` de AGENTS.md figura como bug vigente; ya está corregido | `auth/controllers/auth.js:20-29` | Doc interna desactualizada; sin impacto funcional para el MVP (usa el flujo corregido) |
| R16 | Bug latente frontend: `ConductoresAgencia.jsx:107-111` navega a ruta inexistente | `Routes/index.jsx` (sin `/herramientas/procesar-conductor/:id`) | No heredar el patrón en la vista nueva de repartidores |
| R17 | `verify_changes`/`PreRegistroConductor2` crean expedientes taxi con escrituras libres del frontend | `driverDraftApi.js:84-123` sin policy | Antipatrón a no replicar: el estado del expediente repartidor solo muta por endpoints con policy |

---

## 3. Decisiones de reutilización para la Fase B (justificadas con código)

1. **Agencia afiliadora:** reutilizar `api::agencia.agencia` con relación propia del expediente (patrón `driver.agency`, `driver/schema.json:238-242`). **"Activa"** = publicada (`publishedAt != null`, el único mecanismo vigente, §1.2). **"Elegible"** = publicada; el MVP habilita CDMX como ciudad de operación inicial por configuración del módulo, sin crear modelo territorial paralelo (la spec §12 ordena no inventar subdivisiones; el grep demuestra que no existe lógica de cobertura que reutilizar). El endpoint de cobertura lista agencias publicadas y **filtra suavemente** por `localidad.ciudad` si el dato existe (campo ya presente en el schema, hoy sin uso) — sin excluir a quien no lo tenga poblado. Discrepancia documentada en R10.
2. **No crear campo `estado` en agencia** (justificación: `draftAndPublish` ya cumple el rol de palanca activa/suspendida sin migración; añadir un enum paralelo duplicaría el mecanismo — regla 7 de no duplicar). "Suspender agencia" = despublicar; el aprobador comprueba `publishedAt` al momento de aprobar (criterio 15 de la spec).
3. **Revisor autorizado:** policy nueva `is-delivery-reviewer` derivada de `is-admin-socio-or-root` (mismos roles `socio|admin|root`, `rechazar403` con motivo, populate de `agencia`), + chequeo por controlador de **ámbito de agencia** (`caller.agencia.id === expediente.agencia.id`, patrón `postulacion-socio.js:76-83`) + **vigencia**: `admin|root` con bypass (matriz de `can-calificar-tarea.js:77-83`); `socio` exige `membresia_vigente===true || verificado===true` (único lector vigente del repo, `media-service.js:88-90`). Nadie aprueba su propio expediente (spec §12F).
4. **Alcance federal:** reutilizar el concepto vigente `agencia.tipo === 'federal'` = visibilidad de toda la red (`can-calificar-tarea.js:113-137`). La bandeja federal del MVP muestra expedientes con señales de riesgo alto de **cualquier** agencia (que hoy es exactamente el alcance "subordinado" real: toda la red). La resolución federal deja huella en la bitácora del expediente.
5. **Concesión del rol `repartidor`:** endpoint propio de aprobación con policy de revisor + `db.query` directo (patrón `agregar-socio`), con **merge aditivo** de `roles.extra` (leer→`new Set([...actuales, 'repartidor'])`→escribir preservando el resto del JSON), idempotente (si ya lo tiene, no reescribe ni re-notifica) y con evento de verificación registrado **antes** de tocar al usuario. Nunca vía `PUT /api/users` (filtrado por `escritura-protegida`) ni vía el middleware `:33010` (roto, §0.2).
6. **Notificaciones:** `createForUser` + `emitRealtime` del servicio existente (§1.4), creadas desde los controladores del módulo en cada transición de estado visible al solicitante.
7. **Lista de espera:** content-type **nuevo** `delivery-waitlist-entry` que replica el patrón de `driver-launch-lead` (email único normalizado, consentimiento versionado + fecha, baja explícita, dedup por unique con catch, rate-limit in-memory por hash sin guardar IP) — no reutiliza esa colección porque está acoplada al launch de conductores (promo/APK/Brevo/`linked_driver`), ni `lista-suscripcion` (cursos/eventos), ni `postulacion` (prelanzamiento con cierre 2026-10-09 y dedup por teléfono). Justificación de creación exigida por la regla 7: **ningún modelo equivalente es una lista de espera de repartidores con consentimiento y baja**.
8. **Expediente repartidor independiente:** content-types nuevos (`delivery-profile`, `delivery-vehicle`, `delivery-verification-event`, `delivery-training-attempt`, `delivery-waitlist-entry`, `delivery-risk-signal`) — no se añaden campos de bici/moto a `driver` (spec §3.4) y no se reutilizan `cars-validation/cars-evidence` porque sus servicios están cableados a UIDs y enums taxi (`step-sequence.js:12-29`, `helpers.js:7-29`, `checklist-schema.js:12-31`, `validation-review.js:354-363`). Se copia el **diseño** (estados, evidencia con hash, eventos, cotejo oficial con máscara, señales de riesgo) adaptado a repartidores.
9. **Cierre total del CRUD core:** todos los content-types nuevos nacen con router `createCoreRouter(uid, { except: ['find','findOne','create','update','delete'] })` — verificado en `node_modules/@strapi/strapi/dist/factories.js:69-72` que `except` omite rutas estructuralmente. (El repo ya usa `config: { delete: { enabled: false } }` en `cars-evidence.js:15-18`; `except` es más fuerte.) Acceso solo por rutas numeradas con `auth:false` + policy.
10. **Cuestionario:** banco de preguntas versionado en el backend (5 módulos × 2 preguntas, 10 en total, aprobado ≥8), respuestas correctas nunca viajan al frontend; calificación server-side; intentos registrados. Independiente de Academia (spec §3.12).
11. **CLABE:** validación de 18 dígitos + dígito de control (checksum estándar) + catálogo de instituciones; almacenamiento cifrado AES-256-GCM con clave derivada de `APP_KEYS` (secreto ya requerido por Strapi; si falta, el guardado falla cerrado); solo `last4` sale del backend y jamás en logs. Titularidad **no** se presume verificada (spec §12B).
12. **Zoom:** sin integración (§1.2); el expediente guarda `zoom_session_url` validado (HTTPS + dominio permitido), fecha real, responsable y resultado individual (spec §12F). La aprobación ordinaria exige ese registro; la excepción documentada queda como pendiente de producto.

## 4. Contrato técnico propuesto (Fase B)

**Entidades nuevas** (todas `draftAndPublish: false`, router con `except` total, Spanish-first en descripciones):

| Content-type | Rol | Campos clave |
|---|---|---|
| `delivery-profile` | Expediente del repartidor | `user` oneToOne, `agency` manyToOne→agencia, `status` enum (abajo), `current_step`, timestamps de ciclo, `zoom_session_url`+`zoom_validated_at`+`zoom_validator`+`zoom_attendance_result`, `payout_clabe_encrypted`+`payout_clabe_last4`+`account_holder_name`+`payment_validation_status`, `reviewer`, `review_notes` (privado), `correction_requests` json, `terms_version/terms_accepted_at/privacy_version/privacy_accepted_at`, `training_status/training_score/training_completed_at`, `identity_verification_status`, `approval_version/last_revalidated_at`, `agency_assigned_at/coverage_version/territory_ref` |
| `delivery-vehicle` | Vehículo (1 en MVP, escalable) | `delivery_profile` manyToOne, `type` enum `bicicleta|bicicleta_electrica|motocicleta`, datos del vehículo, campos condicionales por tipo (licencia/tarjeta/seguro solo moto; potencia/velocidad/clasificación solo eléctrica), media de fotos/video, `validation_status` |
| `delivery-verification-event` | Bitácora inmutable | `profile`, `vehicle?`, `agency`, `actor`, `action`, `document_id`, `check_type` enum `officially_checked|visually_reviewed|unavailable|not_applicable`, `source_name`, `official_source_url`, `result`, `data_contrastada` json, `evidence_file_id`, `evidence_sha256`, `notes`, `review_version` |
| `delivery-training-attempt` | Intentos de examen | `profile`, `version`, `attempted_at`, `score`, `passed` |
| `delivery-waitlist-entry` | Lista de espera | `email` único normalizado, `city`, `municipality?`, `consent`, `consent_at`, `privacy_version`, `status` enum `activa|dada_de_baja`, `unsubscribed_at`, `user?` |
| `delivery-risk-signal` | Señales del motor | `profile`, `rule`, `level` enum `baja|media|alta`, `data` json, `resolved_by`, `resolved_at`, `status` enum `activa|resuelta` |

**Máquina de estados de `delivery-profile`** (spec §5 + §12D):
```text
draft → pending_documents → pending_review
draft → pending_review                     (al enviar si todo completo)
pending_review → corrections_required → pending_review
pending_review → eligible_for_video_review  (matriz documental completa)
pending_review | eligible_for_video_review → pending_federal_audit (señal alta)
pending_federal_audit → pending_review | eligible_for_video_review (resolución federal)
eligible_for_video_review → approved        (validación Zoom + acto explícito)
pending_review | eligible_for_video_review → rejected
approved → suspended                         (motivada)
suspended → approved                        (solo revalidación autorizada)
rejected → pending_review                   (solo reapertura por revisor)
```
`approved` (cualificación) y el bloqueo operativo (`suspended`) son estados del mismo campo con `suspended_at` y eventos trazables; el rol `repartidor` se conserva durante la suspensión (spec §8).

**Endpoints** (rutas numeradas `auth:false` + policy; prefijo `/api/delivery-registration`):

Solicitante (`is-authenticated-auth0`; dueño verificado por `strapiUser`, jamás por payload):
- `GET  /coverage?territory=…` — agencias publicadas elegibles (mínimo: id, nombre).
- `POST /waitlist` (+ `POST /waitlist/unsubscribe`) — alta/baja con consentimiento; sin INE/CURP/CLABE; rate-limit in-memory.
- `POST /` — iniciar expediente idempotente con `agency_id` **validado server-side contra la lista elegible** (jamás IDs arbitrarios).
- `GET  /me` — expediente propio + requisitos pendientes (proyección sin datos sensibles: sin CLABE completa, sin notas de revisor, sin eventos).
- `PATCH /me` — campos editables solo en `draft|pending_documents|corrections_required`.
- `POST /me/vehicles` — registrar vehículo con validación condicional por tipo.
- `POST /me/evidence` — adjuntar archivo subido a un slot (tipo/tamaño/propiedad).
- `GET  /me/evidence/:fileId` — streaming privado del propio archivo (sin URL pública).
- `GET  /me/training` / `POST /me/training` — cuestionario (sin respuestas correctas) y calificación server-side.
- `POST /me/submit` — prechecks de completitud (matriz por vehículo + CLABE + examen ≥8 + términos) → `pending_review` + notificación.

Agencia (`is-delivery-reviewer` + ámbito por controlador):
- `GET  /agency/queue?status=…` — cola paginada de su agencia.
- `GET  /agency/:id` — expediente con CLABE enmascarada y evidencias por ID.
- `GET  /agency/:id/evidence/:fileId` — streaming para revisor de la misma agencia.
- `POST /agency/:id/document-checks` — registro por documento (12B: tipo de cotejo, fuente, URL oficial, resultado, hash, revisor).
- `POST /agency/:id/request-corrections` — `corrections_required` + solicitudes estructuradas + notificación.
- `POST /agency/:id/mark-video-eligible` — matriz documental completa → `eligible_for_video_review`.
- `POST /agency/:id/video-validation` — URL Zoom (HTTPS+dominio), fecha, responsable, resultado individual (12F).
- `POST /agency/:id/approve` — acto final: verifica matriz + CLABE + examen + Zoom + sin señales altas activas + agencia publicada + no autoaprobación → `approved` + **concesión atómica idempotente del rol** + notificación.
- `POST /agency/:id/reject` / `POST /agency/:id/suspend` / `POST /agency/:id/revalidate`.

Federal (`is-delivery-federal`: roles + `agencia.tipo === 'federal'`):
- `GET  /federal/cases` — expedientes con señales `alta` activas.
- `POST /federal/cases/:id/resolve` — devolver a agencia / habilitar aprobación / mantener bloqueo; todo deja evento.

## 5. Delimitación de alcance (recordatorio operativo)

- **Fuera de alcance del MVP** (spec §1): cotizaciones, asignación de viajes, logística, geolocalización continua, entregas, calificaciones, liquidaciones, comisiones, billetera, cobros, despacho, rutas y app de operación. El módulo **no toca** `food-delivery`/`food-order`/`trip*`/`viaje*`/`wallet*`.
- **No se eliminan ni reemplazan roles existentes.** `repartidor` se concede solo por el endpoint de aprobación del backend.
- **No se despliega a producción** (regla 3).
- La inspección presencial no es obligatoria (spec §1); no se cobra membresía al repartidor en este módulo.

## 6. Pendientes y dependencias (para el otro agente / producto)

1. 🔴 Aislar/eliminar `middleware/src/routes/auth0.js:56` (blob ofuscado) y auditar su historial — **requiere autorización explícita; fuera del alcance de este MVP**.
2. Alinear `SOCKET_PORT` (socket-service) con el destino de `emitRealtime` en `.env` de producción (R8).
3. Riesgo residual R4/R5: URLs estáticas de `/uploads` siguen existiendo a nivel repo; migrar el provider upload a privado/firmado es trabajo de plataforma, no de este módulo.
4. Los 8 fallos preexistentes de la línea base de pruebas (Windows) son de otros módulos; no se corrigen aquí.
5. Producto: definir la "excepción individual justificada y auditada" al registro de Zoom (spec §12D) — queda modelado como campo opcional de motivo, no implementado como flujo.
6. Producto: semántica futura de `coverage_version`/`territory_ref` si algún día existe modelo territorial (hoy no existe; se guarda el string de ciudad elegida).
7. El wizard huérfano `FormPreRegisterForSteps` vs monolito `PreRegistroConductor2` (frontend) es decisión de la Fase C: el MVP repartidor usará el **patrón** del wizard huérfano (react-hook-form + draft) con servicios propios nuevos, sin rutar el de conductores.
8. Bug latente R16 (`goToDetalle` a ruta inexistente) afecta solo a la vista taxi existente; la vista repartidores usará rutas reales desde el día uno.

---

*Fin del informe de Fase A. La implementación de Fase B comienza tras este documento; cada fase adicional producirá su propio informe con commit SHA, archivos tocados, decisiones, pruebas ejecutadas y pendientes.*
