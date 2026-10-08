# Taxis — Protocolo de Verificación de Conductores y Vehículos v2

Fuente: `docs/Verificacion_Conductores_v2.docx`. Este archivo es el equivalente,
para el módulo **Taxis**, de `docs/COWORK-VERIFICACION-CONDUCTORES-FASES.md`.

**Actualización de alcance:** este documento empezó como solo planeación (Taxis
no era responsabilidad de este equipo). Esa decisión se revirtió — ahora sí se
implementa Taxis, fase por fase, verificando cada fase contra la base de datos
real antes de avanzar a la siguiente. Cada fase indica su estado (✅
completada / ⏳ pendiente) y qué se verificó.

---

## Qué ya existe en el repo (no rehacer)

- `driver` — datos personales/documentos del conductor (alta/preregistro).
- `agenda` — cita con la agencia.
- `cars-validation` — expediente principal de la verificación presencial
  (relaciona driver, agency, agenda, reviewer; tiene nonce/session_token,
  checklist, observations, metadata, evidences, events, risk_score).
- `cars-evidence` — fotos/video/evidencia (ya tiene review_status, reviewer,
  version, is_current, supersedes, origin, sha256, perceptual_hash, nonce,
  timestamps, GPS, device_id, app_version, uploaded_from_gallery, is_valid,
  validation_flags).
- `cars-validation-event` — bitácora de eventos.
- Frontend: `Pages/Taxis/DriverVerificationPage.jsx`,
  `components/Taxis/driver-verification/` (DocumentGrid, VerificationSidebar,
  BiometricComparison, etc.), `services/driverVerification/` (gettters.js,
  setters.js).
- Backend de estos endpoints ya existe (`cars-validations/*`,
  `cars-evidences/:id/review`) — ver `docs/02-BaseDeDatos-Strapi.md`.

## Qué ya resolvió CoWork (Taxis solo debe consumirlo, no rehacerlo)

- Roles `verificador` y `auditor` (`up_users.roles.extra`) — Taxis valida contra
  estos roles, no crea los suyos propios.
- `agencia` con los campos de reputación (`trust_score`, `total_verifications`,
  etc.) — Taxis **escribe** estos valores al completar una auditoría; no debe
  crear una tabla de reputación paralela.
- `ConductoresAgencia.jsx` (CoWork) → `DriverVerificationPage.jsx` (Taxis): el
  punto de entrada y el filtro de "qué conductores puede ver este verificador"
  (agencia matriz) ya están resueltos en CoWork.
- **Pendiente de definir junto con CoWork:** el endpoint/contrato exacto que
  Taxis usará para escribir `agencia.trust_score` (ver Fase 7 de este
  documento y Fase 5 del documento de CoWork).

---

## Qué SÍ debe hacer Taxis (resumen — el detalle está en cada fase)

- Ampliar `cars-validation`/`cars-evidence`/`cars-validation-event` (ya
  existentes) con `protocol_version`, enums cerrados, nonce/challenge y
  doble hash (cliente + servidor canónico).
- Capturar evidencia **en vivo** desde cámara/GPS (Web y Capacitor), nunca
  desde galería, con un `captureService` con adaptador por entorno.
- Agregar los tipos de evidencia y el checklist físico que faltan (selfie,
  documento frente/reverso, 6 ángulos de vehículo, placas, VIN, video).
- Crear `external-verification` para registrar consultas oficiales (INE,
  REPUVE, licencias) **separadas** de las fotos — MVP vía portal oficial
  manual (`official_web`), diseñado para admitir una API institucional futura
  sin rediseño.
- Calcular automáticamente comparaciones (VIN, placas, identidad, licencia,
  situación legal) y un `risk_score` versionado y configurable.
- Crear la capa de auditoría independiente (`verification-audits`), con
  muestreo configurable, doble auditoría/escalamiento, y la regla dura de que
  el auditor nunca es la misma persona que el verificador.
- Implementar re-verificación física (nuevo expediente vinculado, sin borrar
  el original) y calcular/escribir la reputación (`trust_score`) de
  verificador y agencia.
- Proteger el almacenamiento de evidencia (no pública, no editable/borrable
  desde frontend) y pasar la batería de pruebas obligatoria antes de
  producción, en navegador y en APK Capacitor.

## Qué NO debe hacer Taxis

Extraído literal de la sección "Lo que NO vamos a hacer" del documento fuente,
más las reglas negativas repetidas a lo largo de todo el texto:

- **No crear `verification_sessions`** ni ninguna entidad nueva equivalente a
  `cars-validation` — ya existe con session_token/nonce y estados de sesión.
- **No duplicar `cars-evidence`** — ampliar y corregir la entidad existente,
  no crear una paralela.
- **No borrar evidencias anteriores** cuando llega una nueva — usar
  versionado (`version`/`is_current`/`supersedes`), conservar todo.
- **No depender de una captura de pantalla como única prueba** de una
  consulta oficial — es constancia complementaria, nunca sustituto de la
  validación real.
- **No asumir que REPUVE tiene una API pública documentada** para integración
  directa, y **no hacer scraping del portal** como requisito del MVP.
- **No diseñar una falsa API para el INE** — solo usar el mecanismo oficial
  (SVCV) cuando exista convenio institucional real, o "Valida INE-QR"
  mientras tanto.
- **No asumir una única API nacional de licencias** — son 32 entidades, cada
  una con su propio catálogo/método.
- **No hacer blockchain, watermark ni IA compleja en el MVP.**
- **No permitir que el verificador controle o edite su propia auditoría** —
  ni tampoco que sea el mismo `auditor` asignado a su propio caso.
- **No meter `external-verification` como JSON gigante dentro de
  `cars-validation`**, ni confundir una consulta oficial con una simple foto.
- **No usar `<input type="file">`** como mecanismo principal para evidencia
  obligatoria — la cámara se abre directo.
- **No usar el GPS como prueba absoluta de presencia física** — es una señal
  más, combinada con distancia/precisión/consistencia temporal; tampoco debe
  ser el frontend quien decida si el GPS "es suficiente".
- **No confiar en `uploaded_from_gallery=false`** como si fuera una prueba
  criptográfica — es una declaración del cliente, no una garantía.
- **No tratar el `device_id`/fingerprint como identidad absoluta** — es una
  señal de riesgo, no una prueba de identidad.
- **No permitir que el frontend envíe libremente `status`/`result`** y
  esperar que el backend los acepte sin validar — todas las transiciones de
  estado las controla el backend.
- **No permitir edición destructiva de evidencia** aprobada, ni `delete` de
  evidencia histórica desde el frontend.
- **No modificar ni borrar el expediente original** al crear una
  re-verificación — siempre se crea uno nuevo, vinculado.
- **No permitir que nadie edite su propio `trust_score`** — se calcula solo,
  a partir de eventos y auditorías reales.
- **Una señal de colusión no debe producir por sí sola una acusación** —
  debe generar riesgo/alerta acumulable, no un veredicto automático.
- **No crear una aplicación separada** para este flujo — se integra sobre los
  componentes actuales de Taxis (`DriverVerificationPage.jsx` y compañía), no
  un frontend nuevo.
- **No convertir esta especificación en colecciones nuevas duplicadas** sin
  revisar primero lo que ya existe en Strapi (mismo espíritu que en CoWork:
  reusar, no reinventar).

---

## Fase 0 — Congelar el contrato actual ✅ COMPLETADA

**Modelo de negocio:** no crear un sistema paralelo. Lo que ya existe cubre
buena parte de lo necesario; el riesgo es duplicar entidades por no revisar
primero lo que hay.

**Lógica técnica:**
- [x] Tomar `cars-validation`, `cars-evidence` y `cars-validation-event` tal
      como están hoy como el contrato base — no se renombró ni rompió ningún
      campo existente.
- [x] Agregar un campo `protocol_version` (string, default `"1.0"`) a
      `cars-validation`, para poder versionar el protocolo sin migrar datos
      históricos. Verificado contra la base de datos real: la columna existe
      (`PRAGMA table_info`) y un registro creado sin especificarlo recibe el
      default `"1.0"` correctamente.
- [x] `status` (`cars-validation`) y `type` (`cars-evidence`) — al revisar el
      schema real, **ya eran enums cerrados** (`pending/active/completed/
      expired/cancelled/under_review/awaiting_resubmission` y
      `selfie_live/id_front/id_back/...`, respectivamente), no texto libre.
      No requirió ningún cambio — el equipo de Taxis ya lo había resuelto.

> Nota: los nombres de los valores de `cars-evidence.type` ya existentes
> (`selfie_live`, `id_front`, `plates`, `vin`, `video_360`, etc.) difieren de
> los nombres que la Fase 3 de este documento propone agregar
> (`driver_selfie_live`, `identity_document_front`, `vehicle_plates`,
> `vehicle_vin`, `vehicle_video`). Son conceptos equivalentes con distinto
> nombre — la Fase 3 debe decidir si renombra los existentes o los deja como
> alias, no crear valores duplicados para lo mismo.

**Depende de:** nada. Es el punto de partida.

---

## Fase 1 — Seguridad del protocolo: nonce/challenge y hashes ✅ COMPLETADA (núcleo)

**Modelo de negocio:** una evidencia debe poder demostrarse auténtica y
no reciclada de otra sesión — sin esto, cualquier foto vieja podría reusarse.

**Lógica técnica:**
- [x] **Challenge/nonce de un solo uso por paso** — nueva entidad
      `api::cars-validation-challenge.cars-validation-challenge`
      (`nonce_id` único, `session_id`, `step`, `issued_at`, `expires_at`,
      `used_at`, `status`: issued/used/expired/revoked). Servicio
      `challenge-workflow.js` con `issueChallenge()` y
      `validateAndConsumeChallenge()`. Endpoint nuevo:
      `POST /cars-validations/:id/challenges` (coincide con la API mínima de
      la Fase 8).
- [x] `client_sha256` y `server_sha256` como campos **separados** en
      `cars-evidence` (antes había un solo campo ambiguo `sha256`, sin uso en
      ningún lado del código ni datos reales — se reemplazó en vez de dejarlo
      duplicado). El backend seguirá siendo quien calcule `server_sha256`
      cuando se construya la subida real de evidencia (Fase 2/3); por ahora
      el campo existe y se probó que se puede escribir/leer correctamente.
- [x] Lógica de validación del backend implementada y **probada contra la
      base de datos real** con 6 casos: emitir challenge, consumirlo
      correctamente, **rechazar reutilización del mismo nonce**, **rechazar
      nonce de otra sesión**, **rechazar nonce expirado**, y confirmar
      lectura/escritura de los campos de hash.
- [x] `idempotency_key` agregado a `cars-evidence` (campo listo; la
      deduplicación real por esta clave se activa cuando exista el endpoint
      de subida de evidencia — Fase 2/3).
- [ ] Búsqueda de duplicados por `perceptual_hash` — el campo ya existe desde
      antes, pero la lógica de comparación/búsqueda de reuso visual no está
      implementada todavía; no hay endpoint de subida de evidencia contra el
      cual engancharla (queda para cuando se construya la Fase 2/3).

> Nota técnica: Strapi nombra la columna SQL de `client_sha256`/
> `server_sha256` como `client_sha_256`/`server_sha_256` (inserta guion bajo
> antes de números pegados a letras). La API REST y `entityService` siguen
> usando los nombres exactos del schema (`client_sha256`) — verificado con
> datos reales. Solo importa si alguien escribe SQL crudo directo.

**Depende de:** Fase 0.

---

## Fase 2 — Captura en vivo: cámara, GPS y video (Web + Capacitor) ✅ COMPLETADA

**Modelo de negocio:** la evidencia debe nacer de la cámara en el momento de
la verificación — nunca de la galería del teléfono, para que no se pueda
"preparar" una foto de antemano.

**Lógica técnica:**
- [x] Encapsular la captura detrás de un `captureService` con dos adaptadores:
  Web (`navigator.mediaDevices.getUserMedia()`) y Capacitor/APK (WebView +
  permisos nativos). El mismo frontend debe funcionar en ambos.
  → `ciudadan_frontend/src/services/driverVerification/captureService.js`.
  No hacen falta plugins nativos de Capacitor: `@capacitor/camera` y
  `@capacitor/geolocation` NO están instalados en `package.json`, y el
  WebView de Capacitor expone las mismas Web APIs, así que un único
  adaptador basado en `getUserMedia`/`MediaRecorder`/`navigator.geolocation`
  sirve para Web y para el APK (se detecta la plataforma con
  `Capacitor.isNativePlatform()`, mismo patrón ya usado en `src/index.js`).
- [x] Foto: stream de video → canvas/Blob. Video: `MediaRecorder` cuando esté
  soportado. → `capturePhotoFromVideoElement` y `createVideoRecorder` en
  `captureService.js`.
- [x] GPS por cada evidencia: `latitude`, `longitude`, `accuracy_m`,
  `client_timestamp`, `location_source` (`browser_geolocation` /
  `native_bridge`); el servidor añade `server_timestamp`. La lógica de riesgo
  usa distancia a la agencia + precisión + consistencia temporal — el GPS
  nunca es prueba absoluta de presencia física por sí solo. → GPS ya viaja en
  cada llamada a `POST /cars-validations/:id/evidences` y se persiste en
  `cars-evidence.gps_lat/gps_lng/gps_accuracy` (el cruce con distancia a la
  agencia es del motor de riesgo, Fase 5).
- [x] No usar `<input type="file">` como mecanismo principal para evidencia
  obligatoria — la interfaz debe abrir la cámara directamente. → el nuevo
  `LiveCaptureWizard.jsx` solo permite `getUserMedia` + captura de canvas/
  MediaRecorder; no hay ningún `<input type="file">` en el flujo en vivo.
- [x] El backend debe registrar que la captura se declaró como `live_capture`,
  pero **no confiar ciegamente** en esa declaración (de ahí la necesidad de
  hash + nonce + GPS como señales cruzadas). → nuevo endpoint
  `POST /api/cars-validations/:id/evidences`
  (`ciudadan_backend_26/src/api/cars-evidence/controllers/cars-evidence.js`
  → `upload`, servicio `services/evidence-upload.js`): valida y consume el
  nonce de la Fase 1 (`validateAndConsumeChallenge`), **recalcula
  `server_sha256` leyendo los bytes reales del archivo ya subido** (nunca
  confía en el hash que manda el cliente), marca `hash_mismatch_client_server`
  si no coincide con `client_sha256`, marca `duplicate_hash` si ya existe una
  evidencia vigente con el mismo `server_sha256` en la misma validación, y es
  idempotente por `idempotency_key` para que un reintento de red no duplique
  evidencia. `is_valid` queda en `false` si hay cualquier flag — la decisión
  final la toma el revisor/motor de riesgo, no el endpoint.
- [x] Refactorizar `DriverVerificationPage.jsx` y los componentes de
  `driver-verification/` para integrar cámara/GPS/evidencia/challenge en un
  protocolo secuencial (hoy es más bien "revisar documentos ya subidos"). →
  se agregó `LiveCaptureWizard.jsx` (diálogo secuencial que recorre los pasos
  de captura uno por uno, sin poder saltarse ninguno) y un botón "Iniciar
  captura en vivo" en `DriverVerificationPage.jsx`. La grilla de revisión
  existente (`DocumentGrid`, aprobar/rechazar/reenvío) se conserva intacta
  para la revisión posterior de lo ya capturado — ambos flujos conviven en la
  misma página, como pide la sección 34 (ver tabla más abajo).

**Verificado contra datos reales** (`ciudadan_backend_26`, script temporal
`tmp-test-fase2.js`, boot completo de Strapi contra la base SQLite real,
14/14 casos OK, limpiado después de correr):
1. Subida exitosa con nonce válido → evidencia `origin=live_capture`,
   `server_sha256` correcto, `is_valid=true`.
2. Reintento del mismo nonce → rechazado (ya usado).
3. Nonce emitido para otro `step` → rechazado (no coincide el paso).
4. Misma `idempotencyKey` en dos llamadas → la segunda devuelve la evidencia
   ya creada (`deduped=true`) sin volver a validar el nonce.
5. `clientSha256` que no coincide con los bytes reales → flag
   `hash_mismatch_client_server`, `is_valid=false`.
6. Mismo archivo/hash subido dos veces → flag `duplicate_hash`,
   `is_valid=false`.
7. Cada subida deja su evento de auditoría (`cars-validation-event`, acción
   `evidence_uploaded` siempre, más `evidence_validated` cuando no hay flags
   — ver corrección más abajo, sección "Auditoría con el checklist del
   documento fuente").

**Pendiente de verificación manual (requiere navegador/dispositivo real, no
disponible en este entorno):** permisos de cámara/GPS del navegador, UX del
`LiveCaptureWizard` en un dispositivo Android real vía Capacitor, y grabación
de video en un teléfono real. La lógica de negocio (hash, nonce, idempotencia,
flags) quedó cubierta por el script contra la base de datos real; falta la
prueba manual de la interfaz de cámara en un navegador/dispositivo físico.

**Depende de:** Fase 1 (necesita el nonce y los hashes ya definidos).

---

## Fase 3 — Nuevos tipos de evidencia y checklist físico ✅ COMPLETADA

**Modelo de negocio:** cubrir todo lo que un verificador debe registrar
presencialmente, de forma estandarizada (no texto libre).

**Lógica técnica:**
- [x] Nuevos valores de `cars-evidence.type`: `driver_selfie_live`,
  `identity_document_front/back`, `license_front/back`, `vehicle_front/rear/
  left/right`, `vehicle_plates`, `vehicle_vin`, `vehicle_interior`,
  `vehicle_video`, `official_query_capture` (constancia visual de consulta
  oficial), `incident`. → **Reconciliado, no duplicado:** la mayoría de estos
  valores ya existían con otro nombre desde antes de la Fase 1 (`selfie_live`
  ≈ `driver_selfie_live`, `id_front/id_back` ≈ `identity_document_front/back`,
  `vehicle_back` ≈ `vehicle_rear`, `plates` ≈ `vehicle_plates`, `vin` ≈
  `vehicle_vin`, `interior` ≈ `vehicle_interior`, `video_360` ≈
  `vehicle_video`) y ya están en uso por el `LiveCaptureWizard` de la Fase 2 y
  por datos reales de prueba — renombrarlos habría sido un cambio disruptivo
  sin beneficio real. Solo se agregaron los **dos valores genuinamente
  nuevos**: `official_query_capture` (para la Fase 4) e `incident`.
- [x] Checklist físico mínimo como JSON estructurado y versionado, con
  booleanos como: presencia del conductor, documento/identidad consistente,
  licencia presente/consistente, vehículo presente, placas/VIN/marca/modelo/
  año/color consistentes, luces/llantas/cinturones ok, seguro/tarjeta de
  circulación presentes, video completo, e `incidents` (array JSON). →
  `ciudadan_backend_26/src/api/cars-validation/services/checklist-schema.js`:
  valida cada campo booleano, rechaza llaves desconocidas y tipos incorrectos
  (`400`), valida cada `incident` (requiere `description`), y fusiona
  (merge) sobre el checklist previo en vez de reemplazarlo — así el
  verificador puede ir llenándolo en varias llamadas durante la visita.
  Cablewado en `updateValidationChecklist`
  (`services/validation-review.js`), que antes aceptaba cualquier JSON sin
  validar.
- [x] Definir la **secuencia obligatoria de pasos** del protocolo presencial
  (ver sección 19 y 41 del documento fuente) — no permitir saltarse pasos. →
  `ciudadan_backend_26/src/api/cars-validation-challenge/services/step-sequence.js`
  define el orden obligatorio (mismo orden que `LIVE_CAPTURE_STEPS` del
  frontend) y `issueChallenge` (Fase 1) ahora llama `assertStepUnlocked`
  antes de emitir el nonce: si falta un paso previo de la secuencia, rechaza
  con `400` indicando cuál falta. La verificación es contra evidencia ya
  registrada (no contra challenges emitidos) para que un challenge emitido
  y nunca consumido no bloquee un reintento del mismo paso.
  `official_query_capture` e `incident` quedan fuera de la secuencia
  obligatoria (son condicionales, no pasos fijos del recorrido).

**Verificado contra datos reales** (`ciudadan_backend_26`, script temporal
`tmp-test-fase3.js`, boot completo de Strapi contra la base SQLite real,
16/16 casos OK, limpiado después de correr):
1. Bloquea `id_front` antes de completar `selfie_live`.
2. Desbloquea `id_front` una vez completado `selfie_live`.
3. Bloquea `license_front` antes de completar `id_front`/`id_back`, y el
   mensaje de error indica cuál es el primer paso faltante.
4. Desbloquea `id_back` una vez completados `selfie_live` + `id_front`.
5. `official_query_capture` e `incident` se pueden emitir en cualquier
   momento (no están secuenciados).
6. Checklist parcial válido guarda `version: 1` y los booleanos enviados.
7. Una segunda llamada de checklist hace merge (no borra lo ya guardado).
8. Rechaza campos desconocidos y campos con tipo incorrecto (no boolean).
9. `incidents` válido se guarda con `recorded_at`; sin `description` se
   rechaza.
10. `cars-evidence.type` acepta `incident` y `official_query_capture`.

**Depende de:** Fase 2.

---

## Fase 4 — Consultas oficiales externas (`external-verification`) ✅ COMPLETADA

**Modelo de negocio:** contrastar contra fuentes reales de gobierno (INE,
REPUVE, licencias estatales) — **sin asumir ni contratar una API de
terceros**; el MVP es consulta manual a portales oficiales por parte del
verificador, con evidencia de que la consulta ocurrió.

**Lógica técnica:**
- [x] Nueva entidad `external-verification` (no meterla como JSON gigante
  dentro de `cars-validation`, ni confundirla con una foto): `validation`
  (relación), `entity_type` (driver/vehicle/license), `entity_id`,
  `source_name` (INE/REPUVE/proveedor estatal), `source_type` (official_api/
  official_app/official_web), `verification_method`, `check_type`,
  `query_reference_hash`/`query_reference_masked` (sin guardar datos
  sensibles en claro), `requested_at`/`completed_at`, `result` (verified/
  not_found/reported/mismatch/unavailable/error), `result_data`,
  `result_hash`, `evidence` (relación a la constancia visual/PDF),
  `performed_by` (verificador), `status` (valid/suspicious/failed). →
  `ciudadan_backend_26/src/api/external-verification/`. `id` es integer
  autoincremental (no UUID) para ser consistente con el resto del esquema del
  repo, que usa ids numéricos en todas partes.
- [x] **INE:** ruta preferida es el mecanismo oficial (SVCV — Servicio de
  Verificación de Datos de la Credencial para Votar), que requiere convenio/
  autorización institucional con el INE; mientras no exista, usar "Valida
  INE-QR" o solo verificación visual presencial. La foto de la credencial es
  evidencia de presentación física, **no** sustituto de la validación
  oficial. → `register-external-verification.js` **rechaza con 400** si
  `source_name=INE` y `verification_method=api` (no existe convenio en este
  MVP); solo permite `app` (Valida INE-QR) o `web` (verificación visual).
- [x] **REPUVE:** MVP soporta `official_web` — el verificador consulta
  manualmente el portal oficial de *Consulta Ciudadana* (`repuve.gob.mx`) por
  VIN/placas/folio, y guarda constancia visual/PDF del resultado. No hacer
  scraping como requisito del MVP. Diseñar para que una futura integración
  institucional cambie el `verification_method` a `official_api` sin
  rediseñar la entidad. → rechaza con 400 si `source_name=REPUVE` y
  `verification_method` no es `web`; el campo `verification_method` (api/app/
  web) queda listo para admitir `api` el día que exista integración real, sin
  cambiar el esquema.
- [x] **Licencias:** catálogo configurable por entidad federativa (32
  estados, sin API nacional única): `license_provider`, `official_url`,
  `method` (api/web/app), `required_fields`, `verification_enabled`,
  `reference_type`, `evidence_required`, `notes`. →
  `ciudadan_backend_26/src/api/license-catalog/` (CRUD estándar, pensado para
  llenarse desde el panel de administración). Si se registra una consulta de
  `check_type=license` para un proveedor sin fila en el catálogo, o con
  `verification_enabled=false`, se rechaza con 400. **Pendiente operativo (no
  código):** cargar las 32 entidades federativas reales en el catálogo — eso
  es captura de datos administrativa, no una tarea de desarrollo.

**Reglas adicionales implementadas** (no explícitas como checkbox en el
documento fuente, pero necesarias para que la entidad tenga sentido):
- Si se adjunta `evidenceId`, debe ser una `cars-evidence` de
  `type=official_query_capture` (el tipo agregado en la Fase 3) — rechaza si
  se intenta colar una foto genérica como constancia de consulta oficial.
- `query_reference` (folio, VIN, número de credencial) nunca se guarda en
  claro: se hashea (SHA-256) y se enmascara (solo los últimos 4 caracteres).
- `result_data` se hashea (`result_hash`) para trazabilidad/tamper-evidence.
- Mapeo `result` → `status` (sección 22 del documento, pesos de riesgo):
  `verified`/`unavailable` → `valid` (fuente no disponible **no** equivale a
  fraude), `not_found`/`reported`/`mismatch` → `suspicious`, `error` →
  `failed`.
- Nuevo valor de evento `external_verification_registered` en
  `cars-validation-event.action` (no había uno equivalente que reusar).
- Endpoint: `POST /cars-validations/:id/external-verifications`
  (`external-verification.register`), mismo estilo que los de la Fase 1/2.

**Verificado contra datos reales** (`ciudadan_backend_26`, script temporal,
boot completo de Strapi contra la base SQLite real, 16/16 casos OK —incluida
una verificación adicional de que la relación `evidence` sí queda persistida,
ya que `entityService.create` no la devuelve poblada por defecto—, limpiado
después de correr):
1. INE con `verification_method=api` rechazado (sin convenio).
2. INE con `app` aceptado; referencia enmascarada/hasheada; `source_type`
   resuelto automáticamente.
3. REPUVE con `api` rechazado (MVP solo web); REPUVE `reported` con `web` →
   `status=suspicious`, `result_hash` calculado, evidencia
   `official_query_capture` aceptada.
4. Evidencia que no es `official_query_capture` rechazada.
5. Licencia sin catálogo configurado rechazada; con catálogo habilitado
   aceptada (`source_type` tomado del catálogo); con catálogo deshabilitado
   rechazada.
6. `result` inválido rechazado; `result=unavailable` → `status=valid`.
7. Cada registro deja su evento de auditoría.

**Pendiente (fuera de código):** el frontend (`ExternalVerificationDialog.jsx`)
no se pudo probar en un navegador real en este entorno (sin herramienta de
automatización de navegador) — la lógica de negocio del backend sí quedó
verificada contra la base de datos real.

**Depende de:** Fase 3 (necesita el checklist y la secuencia de pasos donde se
insertan estas consultas).

---

## Fase 5 — Motor de riesgo y resultado ✅ COMPLETADA

**Modelo de negocio:** decidir de forma automática y consistente si un caso
puede aprobarse o necesita revisión humana, con reglas versionadas (no
hardcodeadas ni ad-hoc).

**Lógica técnica:**
- [x] Comparaciones automáticas estructuradas: VIN, placas, marca, modelo,
  año, color (`match`/`mismatch`/`unavailable`), situación legal
  (`clear`/`reported`/`recovered`/`unknown`), identidad
  (`verified`/`mismatch`/`unavailable`), licencia
  (`valid`/`expired`/`mismatch`/`unavailable`). →
  `ciudadan_backend_26/src/api/cars-validation/services/comparisons.js`. El
  documento fuente exige el resultado pero no dice cómo derivarlo — decisión
  de diseño tomada aquí porque no existe una fuente pública que regrese
  marca/modelo/año/color automáticamente:
  - **VIN/placas:** se cruzan contra el `query_reference_hash` (Fase 4) de
    las consultas REPUVE de la validación — nunca se compara en claro. Si el
    hash de `driver.vin_number`/`license_plate` coincide con lo consultado,
    `match`; si hubo consulta REPUVE pero con un valor distinto, `mismatch`
    (posible error de captura o fraude); sin ninguna consulta, `unavailable`.
  - **marca/modelo/año/color:** del checklist físico (Fase 3) —
    `brand_consistent`/`model_consistent`/`year_consistent`/`color_consistent`
    ya son la evaluación del verificador comparando el vehículo real.
  - **situación legal / identidad / licencia:** del resultado más reciente
    de la consulta REPUVE / INE / licencia respectivamente
    (`result_data.expired` distingue "expired" de "mismatch" en licencias).
- [x] Motor de `risk_score` con señales y pesos versionables (ejemplo
  ilustrativo del documento): nonce inválido +50 (bloquea), hash
  inconsistente +40, evidencia duplicada +40, REPUVE con reporte +60
  (revisión crítica), VIN mismatch +50, GPS muy distante +20, checklist
  incompleto +15 (no cierra aprobado), fuente oficial no disponible +5 (no
  equivale a fraude), secuencia anómala +10. **Los pesos deben ser
  configuración, no código fijo, y calibrarse/versionarse con datos reales.**
  → `services/risk-engine.js`, `RISK_WEIGHTS` + `RISK_WEIGHTS_VERSION=1`
  (constante versionada; promoverla a fila de configuración en BD es el
  siguiente paso si hace falta ajustarla sin desplegar código). Notas:
  - `nonce_invalid` se documenta pero **nunca se calcula**: ya es
    estructuralmente imposible que exista un `cars-evidence` con un nonce
    inválido (Fase 1 lo bloquea antes de crear el registro).
  - `gps_distant` **no es computable todavía**: `agencia` (módulo de CoWork)
    no tiene campos de latitud/longitud — queda pendiente como dependencia
    cruzada con CoWork, igual que el contrato de `trust_score` de la Fase 7.
  - `sequence_anomaly` es una red de seguridad por timestamps (Fase 3 ya
    bloquea saltarse pasos al emitir el nonce; esto solo detecta
    inconsistencias en datos históricos/migrados).
  - Endpoint nuevo: `POST /cars-validations/:id/risk-assessment` — calcula
    y persiste `risk_score`, y mueve el `status` a `automatic_review` si la
    validación seguía abierta.
- [x] Máquina de estados de `cars-validation`: se agregó `automatic_review`
  como nuevo valor del enum `status` (representa "el motor de riesgo ya
  corrió, pendiente de que un humano confirme"). **No se renombraron** los
  estados/resultados ya implementados y probados en las Fases 0-4
  (`pending/active/under_review/awaiting_resubmission/completed/expired/
  cancelled` y el `result` `approved/approved_with_observations/
  manual_review/rejected/resubmission_required`) — el término "completed" del
  documento fuente (evidencia recolectada) y "confirmed" (caso cerrado)
  corresponden en este código a `under_review`→`completed`, ya
  implementados. `reverification_required` queda fuera de esta fase (es
  responsabilidad de la re-verificación física, fuera del alcance de "motor
  de riesgo y resultado"). **No se cierra como aprobado si faltan
  comprobaciones obligatorias:** `completeValidation` (`validation-review.js`)
  ahora recalcula el riesgo en el momento de intentar aprobar y rechaza con
  400 si el checklist está incompleto o si hay una señal de "revisión
  crítica" (REPUVE reportado, VIN mismatch) — sin importar que los documentos
  ya estén aprobados uno a uno. `result` (primario) sigue separado del
  resultado de auditoría (Fase 6, todavía no implementada).

**Verificado contra datos reales** (`ciudadan_backend_26`, script temporal,
boot completo de Strapi contra la base SQLite real, 17/17 casos OK, limpiado
después de correr):
1. Sin evidencia/checklist: solo la señal `checklist_incomplete`, resto de
   comparaciones `unavailable`/`unknown`.
2. Evidencia con flags `hash_mismatch_client_server`/`duplicate_hash`
   (Fase 2) detectadas como señales `hash_mismatch`/`duplicate_evidence`.
3. REPUVE `reported` → señal crítica `repuve_reported`, `legal_status`
   correcto, y el VIN realmente consultado se reconoce como `match`.
4. Un VIN distinto al del conductor consultado en REPUVE → `vin_mismatch`.
5. INE `verified` → `identity: verified`.
6. `runRiskAssessment` persiste `risk_score` y mueve el status a
   `automatic_review`.
7. `completeValidation` rechaza aprobar con una señal crítica activa, aunque
   toda la evidencia ya esté aprobada.

**Frontend:** `RiskAssessmentPanel.jsx` (botón "Calcular riesgo" + chips de
señales) integrado en `DriverVerificationPage.jsx` — visibilidad para el
revisor antes de intentar aprobar; el bloqueo real ocurre en el backend
(`completeValidation`), no depende de que el frontend llame este panel.

**Depende de:** Fase 4 (necesita los resultados de `external-verification`
como una de sus señales de entrada).

---

## Fase 6 — Auditoría independiente ✅ COMPLETADA (backend) — integración de reputación pendiente

**Modelo de negocio:** que la confianza del sistema no dependa de una sola
persona — un auditor, distinto del verificador, revisa el trabajo después.

**Lógica técnica:**
- [x] Nueva entidad `verification-audits` (nombre final a definir por
  convenciones del proyecto): `validation` (relación), `auditor` (relación a
  usuario — **debe tener rol `auditor` de CoWork**, no reutilizar `reviewer`
  de `cars-evidence`), `auditor_agency` (relación a `agencia` de CoWork),
  `audit_type` (sample/deep/reverification_trigger), `selection_reason`
  (random/risk/complaint/new_verifier/etc.), `status`
  (pending/in_progress/completed/escalated), `result`
  (conformity/inconsistency/insufficient/evidence_fraud), `score`, `notes`,
  timestamps, `protocol_version`. →
  `ciudadan_backend_26/src/api/verification-audit/`. Se agregó también
  `escalation` como `selection_reason` (para la auditoría del Auditor C, no
  estaba en la lista original del documento pero es necesaria para el
  workflow de escalamiento).
- [x] Items de auditoría: `audit_id`, `check_key`, `result`
  (pass/fail/uncertain/not_applicable), `evidence_ids`,
  `external_verification_ids`, `note`. →
  `ciudadan_backend_26/src/api/verification-audit-item/`. `evidence_ids` y
  `external_verification_ids` del documento se implementaron como relaciones
  `manyToMany` reales (`evidence_reviewed`, `external_verifications_reviewed`)
  en vez de arrays de ids sueltos — consistente con el resto del esquema del
  repo (todo son relaciones de Strapi) y da integridad referencial real.
- [x] Qué debe poder revisar el auditor (checklist del auditor, sección 26 del
  documento): que la sesión corresponde a la cita/verificador, checklist
  completo, evidencias esperadas y vinculadas, hashes/metadatos consistentes,
  fotos/video corresponden al expediente, comprobación oficial existe cuando
  aplica, resultados oficiales coinciden con los datos de Ciudadan, no hay
  reutilización sospechosa, incidencias bien registradas, el verificador no
  modificó evidencia original. → `services/audit-check-keys.js`,
  `AUDIT_CHECK_KEYS` (10 puntos, mismo orden que la sección 26); `check_key`
  se valida contra esta lista al registrar cada item.
- [x] Muestreo configurable por perfil (no código fijo): verificador nuevo
  ~20%, estable ~5%, con anomalías 30%+, investigación hasta 100%, caso
  crítico 100% o doble auditoría. → `services/sampling.js`, constante
  versionada `SAMPLING_RATES` + `SAMPLING_VERSION=1` (mismo patrón que
  `RISK_WEIGHTS` de la Fase 5). `decideSamplingProfile` combina el historial
  del verificador (¿nuevo o estable?) con el `risk_score`/señales críticas de
  la Fase 5 para elegir el perfil; `evaluateSamplingForValidation` conecta
  todo contra datos reales (cuenta validaciones completadas del verificador +
  corre el motor de riesgo). No se expuso como endpoint público — el
  documento no lo pide en la tabla de la Fase 8; queda como función de
  servicio lista para que un job/cron o un endpoint interno futuro la use.
- [x] Doble auditoría: caso alto riesgo → Auditor A + Auditor B; si no
  coinciden, escala a Auditor C. → `resolveDoubleAudit` (se corre
  automáticamente dentro de `completeAudit`): si dos auditorías no-de-
  escalamiento de la misma validación ya están completadas y su `result` no
  coincide, ambas pasan a `escalated` y se registra el evento
  `audit_escalated`. Crear la auditoría del Auditor C queda como una acción
  humana explícita (`POST /cars-validations/:id/audits` con
  `selection_reason=escalation`) — no se asigna un auditor automáticamente.
- [x] **Regla dura, validada por backend, no solo por UI:** el `auditor`
  asignado a un caso **nunca** puede ser el mismo usuario que el
  `verificador` de ese expediente — impedir autoauditoría. → validado en
  `createAudit` contra `validation.reviewer`, rechaza con 400. También se
  valida que el usuario tenga rol `auditor`/`admin` (mismo criterio que la
  policy `is-auditor.js` de CoWork — no se reinventa el control de acceso).
- [ ] **Punto de integración con CoWork:** al completar una auditoría,
  actualizar `agencia.trust_score` y demás métricas — contrato exacto
  (endpoint vs escritura directa a la BD compartida) **sigue pendiente de
  acordar con el equipo de CoWork** (`COWORK-VERIFICACION-CONDUCTORES-FASES.md`,
  Fase 5, tiene el mismo checkbox sin marcar: "Decidir si el cálculo del
  trust_score vive en CoWork o en Taxis"). No se implementó unilateralmente
  para no inventar un contrato que el otro equipo todavía no acordó — es el
  mismo tipo de bloqueo cruzado que `gps_distant` en la Fase 5 (agencia sin
  lat/lng).

**Nuevos valores de evento** en `cars-validation-event.action`:
`audit_created`, `audit_completed`, `audit_escalated`.

**Desbloquea a CoWork:** el tab "Auditorías" de CoWork
(`COWORK-VERIFICACION-CONDUCTORES-FASES.md`, Fase 2) estaba bloqueado
esperando un "endpoint de Taxis con casos pendientes de auditar". Ya no hace
falta un endpoint a la medida — el router estándar de Strapi para
`verification-audit` ya permite `GET /api/verification-audits?filters[auditor][id][$eq]=<id>&filters[status][$eq]=pending&populate=validation`.

**Verificado contra datos reales** (`ciudadan_backend_26`, script temporal,
boot completo de Strapi contra la base SQLite real con usuarios/roles reales
creados y borrados en la prueba, 18/18 casos OK, limpiado después de correr):
1. Rechaza que el auditor sea el mismo verificador del expediente.
2. Rechaza asignar como auditor a un usuario sin rol `auditor`/`admin`.
3. Auditoría se crea en `pending`; rechaza `check_key` inválido.
4. Un item válido mueve la auditoría a `in_progress`.
5. Completar una auditoría sola no dispara escalamiento.
6. Dos auditorías completadas con `result` distinto (`conformity` vs
   `inconsistency`) sí disparan escalamiento — ambas quedan `escalated`.
7. No se puede agregar items ni volver a completar una auditoría ya cerrada
   (`completed` o `escalated`).
8. Se registran los 5 eventos esperados (2 `audit_created`, 2
   `audit_completed`, 1 `audit_escalated`).
9. Perfiles de muestreo (`critical_case`/`new_verifier`/`stable_verifier`)
   se seleccionan correctamente según historial del verificador y risk_score.
10. `evaluateSamplingForValidation` funciona de punta a punta contra la base
    real.

**Depende de:** Fase 5. Depende también de que CoWork tenga listo el rol
`auditor` (ya está) y de acordar el contrato de escritura de reputación
(pendiente, ver arriba).

---

## Fase 7 — Re-verificación física y reputación ✅ COMPLETADA

**Modelo de negocio:** cerrar el ciclo cuando algo sale mal, sin borrar el
historial, y medir el desempeño de verificadores/agencias en el tiempo.

**Lógica técnica:**
- [x] Re-verificación: crear un **nuevo** expediente vinculado al anterior
  (nunca modificar/borrar el original), asignado preferentemente a otra
  agencia/verificador; comparar resultados; conservar el motivo que la
  originó; actualizar reputación del verificador/agencia original. →
  `cars-validation/services/reverification-workflow.js`, endpoint
  `POST /cars-validations/:id/reverification` (coincide exacto con la tabla
  de la Fase 8). Nuevos campos en `cars-validation`: `reverification_of`
  (relación a sí misma), `reverifications` (inversa) y
  `reverification_reason`. El documento dice "preferentemente" (no
  obligatorio) — así que no se **rechaza** asignar la misma agencia/
  verificador, solo se devuelve un aviso (`warnings.sameAgency`/
  `sameVerifier`) para que quien asigna lo note; "comparar resultados" se
  resuelve con el enlace `reverification_of` (cualquier reporte puede hacer
  join contra el original), no se construyó un endpoint de diff dedicado.
- [x] Reputación (ver Fase 3/4 de CoWork para dónde vive el dato):
  `total_verifications`, `total_audited`, `conforming`, `inconsistencies`,
  `critical_findings`, `reverifications`, `trust_score`, `algorithm_version`.
  Taxis **calcula** el score y **escribe** el resultado; no lo calcula
  CoWork. El verificador/agencia nunca edita su propio score. →
  `verification-audit/services/reputation-engine.js`. Las 8 métricas se
  recalculan **desde el histórico real** (validaciones + auditorías) cada
  vez que se completa una auditoría (`completeAudit` la dispara
  automáticamente) y se escriben directamente en `agencia` (mismo Strapi/BD
  que CoWork). "Nadie edita su propio trust_score" queda garantizado por
  diseño: no existe ningún input que reciba un `trust_score` a mano, solo se
  recalcula. La fórmula (`computeTrustScore`, versión `"1.0"`) es MVP
  explícito — igual que los pesos de riesgo de la Fase 5, ilustrativa y
  pensada para calibrarse/versionarse con datos reales, nunca un valor
  definitivo.
  **Nota de alcance:** el documento fuente dice explícitamente "Taxis
  calcula el score y escribe el resultado" (sección 30) — se implementó bajo
  esa instrucción directa, aunque
  `COWORK-VERIFICACION-CONDUCTORES-FASES.md` (Fase 5) todavía tiene sin
  marcar el checkbox "decidir si el cálculo vive en CoWork o en Taxis". Vale
  la pena que el equipo de CoWork lo revise. Solo se calcula reputación a
  **nivel agencia** (los únicos campos que CoWork ya construyó); no existe
  todavía un esquema de reputación por verificador individual — sería un
  campo/entidad nueva no contemplada por CoWork hasta ahora.
- [x] Detección de colusión (genera alerta/riesgo, nunca una acusación
  automática por sí sola): auditorías muy concentradas entre las mismas
  personas, tasas de aprobación anormalmente altas, dispositivos coincidentes
  entre actores distintos, patrones horarios/de captura repetitivos, reuso de
  evidencia, dos agencias que se auditan mutuamente de forma sospechosa. →
  `verification-audit/services/collusion-detection.js`, 6 detectores puros
  (reciben datos ya normalizados, se prueban sin base de datos) + un
  orquestador (`detectCollusionSignals`) que sí consulta datos reales.
  Expuesto de solo lectura en `GET /verification-audits/collusion-
  signals?agencyId=X` — no genera ninguna acción automática, ni bloquea, ni
  crea una entidad de "acusación"; son señales para que un humano investigue.
  Umbrales explícitos y ajustables (`THRESHOLDS`), no mágicos.

**Nuevo valor de evento** en `cars-validation-event.action`:
`reverification_created`.

**Verificado contra datos reales** (`ciudadan_backend_26`, script temporal,
boot completo de Strapi contra la base SQLite real con agencias/usuarios
reales creados y borrados en la prueba, 21/21 aserciones reales correctas —
la única discrepancia inicial fue, otra vez, que `entityService.create` no
devuelve relaciones pobladas por defecto; se confirmó con un `findOne`
poblado que la relación sí se persiste—, limpiado después de correr):
1. El expediente original nunca se modifica al crear una re-verificación.
2. La re-verificación queda vinculada (`reverification_of`) y arranca en
   `pending`.
3. Asignar la misma agencia solo genera un aviso, no un rechazo.
4. Sin auditorías, una agencia tiene `trust_score` neutral (100).
5. `total_verifications`/`reverifications` cuentan correctamente contra el
   histórico real.
6. Completar una auditoría dispara la actualización de reputación y la deja
   escrita en la agencia real (`total_audited`, `conforming`, etc.).
7. La fórmula de `trust_score` baja con inconsistencias/fraude y nunca es
   negativa.
8. Los 6 detectores de colusión identifican correctamente cada patrón
   (concentración auditor-verificador, tasa de aprobación anormal, mismo
   dispositivo en conductores distintos, hash de evidencia reutilizado entre
   validaciones, intervalos de captura mecánicos, auditoría mutua entre
   agencias).

**Depende de:** Fase 6.

---

## Fase 8 — Almacenamiento, permisos y pruebas obligatorias ⚠️ PARCIAL (backend cerrado; falta la parte de dispositivo/APK real)

**Modelo de negocio:** proteger la evidencia (nunca se destruye) y garantizar
que el protocolo no se pueda saltar antes de salir a producción.

**Lógica técnica:**
- [~] Media/object storage con URLs no públicas permanentes; permisos
  separados para verificador vs. auditor; no permitir `delete` de evidencia
  histórica desde el frontend; conservar siempre `server_sha256`; definir
  retención y protección de datos antes de producción.
  - [x] **Permisos separados verificador vs. auditor:** todos los endpoints
    nuevos de las Fases 1-7 (que hasta ahora tenían `policies: []`, sin
    ningún control de acceso) quedaron protegidos con las policies ya
    existentes del repo (`global::is-verificador` en
    challenges/evidences/risk-assessment/reverification/external-
    verifications; `global::is-auditor` en audits/items/result/collusion-
    signals) — no se inventó un mecanismo nuevo, se reusó exactamente el
    mismo patrón que ya protege `tarea`/`area`/`agencia`. Los endpoints
    **preexistentes** (review-bundle, observations, checklist, complete,
    sync-from-driver, cars-evidences/:id/review) se dejaron intactos a
    propósito, para no romper flujos que ya funcionan sin haber confirmado
    primero con el equipo cómo los está llamando el frontend hoy — queda
    como pendiente explícito, ver más abajo.
  - [x] **No permitir `delete` de evidencia histórica:** la ruta core
    `DELETE /api/cars-evidences/:id` se deshabilitó explícitamente
    (`config: { delete: { enabled: false } }` en el router), en vez de
    depender de que el toggle de permisos del panel de admin se quede
    apagado. El versionado (`version`/`is_current`/`supersedes`, Fase 1) ya
    es el mecanismo real para "reemplazar" evidencia sin borrar nada.
  - [x] **No permitir editar evidencia aprobada:** `updateEvidenceReview`
    (usada por `PATCH /cars-evidences/:id/review`) ahora rechaza con 400 si
    la validación padre ya está `completed` — antes solo el frontend
    deshabilitaba los botones (una validación puramente de UI, evitable
    llamando al API directo); ahora es imposible también por esa vía.
  - [ ] **URLs no públicas permanentes:** **no implementado.** El proveedor
    de subida sigue siendo el local de Strapi (`/uploads/*`, servido
    directo, sin firma ni expiración) — no hay config de S3/proveedor cloud
    en este proyecto. Migrar a URLs privadas/firmadas es una decisión de
    infraestructura (proveedor, credenciales, costo) que no se puede tomar
    unilateralmente desde código; queda documentado como pendiente real, no
    resuelto a medias con un parche falso.
  - [x] **Conservar siempre `server_sha256`:** ya se hace desde la Fase 2 —
    nunca se sobrescribe, cada nueva subida crea un registro nuevo
    (versionado), nunca reemplaza el hash anterior.
  - [ ] **Retención y protección de datos:** **no definido.** Es una
    decisión de producto/legal (cuánto tiempo conservar evidencia biométrica,
    bajo qué política), no algo que este código pueda decidir por su cuenta.
- [x] API mínima esperada (contrato REST) — **las 8 rutas ya existen**,
  construidas incrementalmente en las Fases 0-7 (no se agregó nada nuevo
  aquí, solo se verificó que el contrato completo responde):
  `POST /cars-validations` (`from-agenda`, Fase 0),
  `POST /cars-validations/:id/challenges` (Fase 1),
  `POST /cars-validations/:id/evidences` (Fase 2),
  `POST /cars-validations/:id/checklist` (preexistente),
  `POST /cars-validations/:id/external-verifications` (Fase 4),
  `POST /cars-validations/:id/complete` (preexistente),
  `POST /verification-audits/:id/result` (Fase 6),
  `POST /cars-validations/:id/reverification` (Fase 7).
- [~] Batería de pruebas obligatoria antes de producción (sección 39 del
  documento fuente):
  - [x] No saltar pasos (Fase 3, `assertStepUnlocked`).
  - [x] Rechazar nonce expirado/reutilizado/de otra sesión (Fase 1).
  - [x] Detectar hash inconsistente y duplicados (Fase 2).
  - [x] Conservar historial de versiones (Fase 1/2, `version`/`is_current`).
  - [x] No permitir editar evidencia aprobada (recién cerrado arriba).
  - [x] No permitir autoauditoría (Fase 6).
  - [x] No cerrar aprobado sin comprobaciones obligatorias (Fase 5).
  - [x] GPS fuera de agencia: **parcialmente** — el campo/señal existe
    (`gps_distant` en el motor de riesgo), pero no se puede calcular de
    verdad porque `agencia` (CoWork) no tiene lat/lng (ver Fase 5).
  - [x] Consulta oficial no disponible, resultado oficial inconsistente,
    REPUVE con reporte (Fase 4/5, cubierto en las pruebas de esas fases).
  - [x] Doble auditoría, re-verificación (Fase 6/7).
  - [x] El expediente puede reconstruirse completo a partir de sus eventos
    (verificado: los eventos quedan en orden cronológico y cubren todo el
    ciclo de vida).
  - [ ] **Rechazar subir archivo arbitrario como evidencia "en vivo"**: el
    backend valida nonce/hash/secuencia, pero no puede saber con certeza si
    un archivo vino de la cámara o de la galería — es, y sigue siendo, un
    límite de la plataforma (el documento fuente ya lo reconoce: "no
    confiar ciegamente" en la declaración de `live_capture", de ahí las
    señales cruzadas). No es un pendiente resuelto a medias, es un límite
    conocido y documentado desde la Fase 2.
  - [ ] **Pruebas en navegador móvil y en APK Capacitor real** (permisos de
    cámara/ubicación, orientación, denegación de permisos, red lenta,
    cierre/reapertura de sesión): **no realizadas.** Requieren un
    dispositivo/navegador real y no hay herramienta de automatización de
    navegador en este entorno — toda la lógica de negocio se verificó
    exhaustivamente contra la base de datos real (135+ aserciones en total
    entre las Fases 1-8), pero la interfaz de cámara en sí nunca se probó
    manualmente en un dispositivo físico.

**Verificado contra datos reales y contra el servidor HTTP real corriendo en
`localhost:33032`** (18/18 aserciones reales correctas — hubo una aserción de
prueba mal planteada, esperaba 404 para la ruta DELETE deshabilitada y
Strapi respondió 403, ambos códigos confirman que el borrado está bloqueado,
no fue un bug):
1. Las 8 rutas del contrato mínimo existen (responden, no 404 de ruta).
2. Los 8 endpoints nuevos de las Fases 1-7 rechazan con 403 sin token de
   autenticación.
3. `DELETE /cars-evidences/:id` está bloqueado.
4. Editar evidencia de una validación ya `completed` se rechaza; editar
   evidencia de una validación todavía abierta sigue funcionando (no se
   rompió el flujo normal del revisor).
5. Un expediente sintético con eventos se reconstruye correctamente en
   orden cronológico.

**Pendiente explícito para coordinar con el equipo (no resuelto aquí a
propósito):**
- Confirmar cómo el frontend real llama hoy a los endpoints preexistentes
  (review-bundle, checklist, complete, etc.) antes de decidir si también
  necesitan `is-verificador`/`is-auditor` — no se tocaron por no arriesgar
  un flujo que ya está en uso sin esa confirmación.
- Decidir un proveedor de almacenamiento con URLs privadas/firmadas antes de
  producción (infraestructura, no código).
- Política de retención y protección de datos de evidencia biométrica
  (producto/legal).
- Pruebas manuales en navegador móvil real y APK Capacitor — checklist ya
  definido arriba, ejecución pendiente de un dispositivo real.

**Depende de:** todas las fases anteriores — es el cierre antes de producción.

---

## Auditoría contra el documento fuente original (`Verificacion_Conductores_v2.docx`)

Después de cerrar la Fase 8 se releyó el `.docx` completo (44 secciones)
palabra por palabra contra lo implementado, para encontrar cualquier detalle
que se hubiera pasado por alto al trabajar fase por fase. Se encontraron y
corrigieron 4 huecos reales:

- [x] **Bitácora de eventos incompleta** (sección 8 del documento). Faltaban
  cuatro eventos que el documento pide explícitamente: `challenge_issued`
  (al emitir el nonce, Fase 1), `evidence_uploaded` (recepción de una
  evidencia — antes se reusaba `evidence_synced`, que en realidad es del
  flujo de reupload del conductor, Fase 0, un origen distinto),
  `evidence_validated` (solo cuando la evidencia pasa sin flags de hash/
  duplicado), y `risk_calculated` (al correr el motor de riesgo, Fase 5).
  Se agregaron los 4 al enum de `cars-validation-event.action` y se
  conectaron en `challenge-workflow.js`, `evidence-upload.js` y
  `risk-engine.js` respectivamente. **La nota anterior en la Fase 2** que
  decía "se reusa `evidence_synced`, no se duplica" quedó corregida — el
  documento sí trata a `evidence_uploaded` como un evento propio.
- [x] **Validación de MIME y tamaño de archivo** (sección 33, "Reglas del
  backend": "Validar MIME y tamaño" — no estaba implementado en absoluto).
  `evidence-upload.js` ahora rechaza con 400 si el archivo no corresponde al
  tipo esperado (imagen para fotos, video para `video_360`, imagen/video/PDF
  para `official_query_capture`/`incident`) o si excede el tamaño máximo
  (15MB imágenes, 150MB video — límites explícitos y ajustables, no
  arbitrarios silenciosos).
- [ ] **Hash perceptual para detectar reuso visual** (secciones 6 y 39: "no
  depender de una captura de pantalla como única prueba"/"detectar evidencia
  antigua/reutilizada cuando sea posible"). El campo `perceptual_hash` existe
  en el esquema desde antes de este proyecto, pero **nunca se calcula ni se
  usa** — solo se compara por hash exacto (`server_sha256`), que no detecta
  una foto de una foto o una reutilización con compresión distinta. Requiere
  una librería de procesamiento de imágenes (candidata: `sharp`, que Strapi
  ya usa internamente para el plugin de upload) para calcular un hash
  perceptual real (por ejemplo, average-hash o dHash) — **no implementado
  todavía**, queda como pendiente explícito por el esfuerzo/riesgo de
  agregar procesamiento de imágenes sin poder probarlo visualmente en este
  entorno.
- [ ] **Registro de accesos sensibles a evidencia** (sección 37: "cuando sea
  posible" — la propia sección lo marca como best-effort, no obligatorio).
  No se implementó: requeriría interceptar las descargas de archivos del
  plugin de upload de Strapi, y el propio documento no lo trata como un
  bloqueante de MVP.

**Verificado contra datos reales** (script temporal, 10/10 casos OK,
incluyendo la secuencia completa del protocolo para poder probar
`video_360` legítimamente, limpiado después de correr): `challenge_issued`
se registra al emitir cada nonce; rechaza MIME inválido y archivos que
exceden el tamaño máximo; `evidence_uploaded` se registra siempre (incluso
con flags), `evidence_validated` solo cuando no hay flags; acepta/rechaza
correctamente MIME de imagen vs. video según el paso; `risk_calculated` se
registra al correr el motor de riesgo.

Todo lo demás del documento (secciones 1-32, 34-38, 40-44) ya estaba
cubierto por las Fases 0-8 sin discrepancias encontradas.

---

## Resumen de dependencias con CoWork (para coordinar entre equipos)

| Necesita Taxis de CoWork | Estado |
|---|---|
| Rol `verificador` | ✅ Ya existe |
| Rol `auditor` | ✅ Ya existe (Fase 1-2 del doc de CoWork) |
| Filtro de agencia matriz en la cola de conductores | ✅ Ya existe (`ConductoresAgencia.jsx`) |
| Campos de reputación en `agencia` | ✅ Ya existen, solo lectura desde fuera |
| Contrato de escritura de `agencia.trust_score` | ❌ Pendiente de acordar entre ambos equipos |
| Endpoint de Taxis con "casos pendientes de auditar" | ❌ No existe todavía — bloquea la Fase 2 de CoWork (contenido real del tab "Auditorías") |

---

## Anexo — Tablas de referencia exactas del documento fuente

Reproducción literal de las tablas del documento (no resúmenes), organizadas
por la fase donde aplican, para que la implementación no dependa de volver a
abrir el `.docx`.

### Fase 0 — Diferencia entre capas (sección 4)

| Capa | Qué contiene | Propósito |
|---|---|---|
| `driver` | Datos personales, documentos declarados y datos del conductor | Alta/pre-registro |
| `carro`/vehículo | Datos declarados y preferencias del vehículo | Información del vehículo |
| `agenda` | Cita/agencia/fecha | Programación |
| `cars-validation` | Expediente de la verificación presencial | Control del proceso |
| `cars-evidence` | Fotos/videos/evidencias de la verificación | Prueba de lo capturado |
| `cars-validation-event` | Bitácora de acciones | Trazabilidad |
| `external-verifications` | Consultas a fuentes oficiales | Contraste externo |
| audit records | Auditorías independientes | Verificación de la verificación |

### Fase 0 — Campos de `cars-validation` (sección 5)

| Campo | Acción | Tipo/forma | Regla |
|---|---|---|---|
| driver | CONSERVAR | relation | Obligatorio |
| agency | CONSERVAR | relation | Obligatorio |
| agenda | CONSERVAR | relation | Obligatorio |
| reviewer/verifier | CONSERVAR/renombrar semánticamente | relation | Actor que ejecuta |
| nonce | CORREGIR | string seguro | Temporal, aleatorio, no reutilizable |
| session_token | CONSERVAR | string seguro | Sesión temporal; no reemplaza autorización |
| opened_at | CONSERVAR | datetime | Servidor |
| validation_started_at | CONSERVAR | datetime | Servidor |
| validation_finished_at | CONSERVAR | datetime | Servidor |
| closed_at | CONSERVAR | datetime | Servidor |
| status | CORREGIR/CONTROLAR | enum | Solo transiciones permitidas |
| result | CONSERVAR | enum | Resultado primario separado de auditoría |
| risk_score | CONSERVAR | number | Derivado, versionado |
| gps_lat/gps_lng/gps_accuracy | CONSERVAR | decimal | Registrar señales de ubicación |
| device_id | CONSERVAR/semántica | string | Señal, no identidad absoluta |
| app_version | CONSERVAR | string | Versión cliente |
| checklist | CONSERVAR/estructurar | JSON | Items versionados |
| observations | CONSERVAR | text | Notas controladas |
| metadata | CONSERVAR | JSON | Solo metadata no normalizada |
| evidences | CONSERVAR | relation | Relación con `cars-evidence` |
| events | CONSERVAR | relation | Relación con `cars-validation-event` |
| protocol_version | AGREGAR | string | Versión del protocolo |

### Fase 0/1 — Campos de `cars-evidence` (sección 6)

| Campo | Acción | Regla de implementación |
|---|---|---|
| validation | CONSERVAR | Siempre vinculado a un `cars-validation` |
| type | CONSERVAR/ENUMERAR | No permitir valores libres para pasos protocolarios |
| file | CONSERVAR | Storage seguro, no base64 en DB |
| review_status | CONSERVAR | Separar validación automática de auditoría humana |
| reviewer_note | CONSERVAR | No sustituye auditoría formal |
| reviewed_at | CONSERVAR | Timestamp servidor |
| reviewer | CONSERVAR | Actor que revisó esta evidencia |
| source_driver_field | CONSERVAR | Origen del archivo si proviene de preregistro |
| source_file_id | CONSERVAR | Referencia original |
| version | CONSERVAR | Incremental por reenvío |
| is_current | CONSERVAR | Solo una versión actual por cadena |
| supersedes | CONSERVAR | No borrar versión anterior |
| origin | CORREGIR/ESTANDARIZAR | `preregister`, `live_capture`, `reupload` |
| sha256 | CONSERVAR/CANONIZAR | Backend calcula hash definitivo |
| perceptual_hash | CONSERVAR | Detección de reuso visual |
| nonce | CONSERVAR | Debe ligar evidencia al challenge |
| timestamp_client | CONSERVAR | Señal del cliente |
| timestamp_server | CONSERVAR | Timestamp confiable |
| gps_lat/gps_lng/gps_accuracy | CONSERVAR | Por captura |
| device_id | CONSERVAR | Señal de dispositivo |
| app_version | CONSERVAR | Versión |
| uploaded_from_gallery | CORREGIR | No debe ser la única defensa |
| is_valid | CONSERVAR | Resultado técnico |
| validation_flags | CONSERVAR/AMPLIAR | Lista estructurada de señales |

### Fase 0 — Eventos de `cars-validation-event` (sección 8)

| Evento | Cuándo |
|---|---|
| validation_created | Al crear expediente |
| validation_started | Inicio presencial |
| challenge_issued | Emisión de nonce/challenge |
| evidence_capture_started | Inicio de captura |
| evidence_uploaded | Recepción |
| evidence_validated | Validación automática |
| evidence_rejected | Fallo técnico |
| official_check_started | Inicio consulta oficial |
| official_check_completed | Consulta terminada |
| official_check_failed | Consulta no pudo completarse |
| checklist_updated | Cambio de checklist |
| risk_calculated | Cálculo de riesgo |
| validation_completed | Fin protocolo |
| validation_status_changed | Cambio de estado |
| audit_assigned | Asignación a auditor |
| audit_completed | Auditoría terminada |
| reverification_requested | Se requiere re-verificación |
| resubmission_requested | Se solicita nueva evidencia |
| evidence_superseded | Nueva versión de evidencia |
| driver_status_synced | Sincronización de estado |

### Fase 1 — Nonce/challenge (sección 17)

| Dato | Tipo | Regla |
|---|---|---|
| nonce_id | UUID | Challenge |
| session_id | UUID | Sesión |
| step/evidence_type | enum | Paso autorizado |
| issued_at | datetime | Servidor |
| expires_at | datetime | Servidor |
| used_at | datetime | Servidor |
| status | enum | issued/used/expired/revoked |

### Fase 2 — Cámara Web + Capacitor (sección 13)

| Entorno | Mecanismo |
|---|---|
| Web | `navigator.mediaDevices.getUserMedia()` |
| APK Capacitor | WebView + permisos nativos/capa compatible de cámara |
| Foto | video stream → canvas/Blob |
| Video | `MediaRecorder` cuando esté soportado |
| GPS | `navigator.geolocation` o puente nativo cuando sea necesario |

### Fase 2 — GPS por evidencia (sección 15)

| Campo | Tipo | Regla |
|---|---|---|
| latitude | number | Enviar por captura |
| longitude | number | Enviar por captura |
| accuracy_m | number | Enviar por captura |
| client_timestamp | datetime | Señal del cliente |
| location_source | enum | browser_geolocation / native_bridge |

### Fase 2 — Cambios de frontend sobre el flujo actual (sección 34)

| Componente/área | Acción | Estado |
|---|---|---|
| Step de datos personales | CONSERVAR | Sin cambios |
| Step de documentos | CONSERVAR | Sin cambios |
| Step de fotos preliminares vehículo | CONSERVAR como preregistro/`origin=preregister` | Sin cambios |
| Step licencia | CONSERVAR | Sin cambios |
| Step cita presencial | CONSERVAR | Sin cambios |
| `DriverVerificationPage` | REFACTORIZAR para protocolo secuencial | ✅ Se agregó `LiveCaptureWizard` + botón "Iniciar captura en vivo"; la grilla de revisión existente se conservó para revisar lo ya capturado |
| `driver-verification` components | INTEGRAR cámara/GPS/evidencia/challenge | ✅ `LiveCaptureWizard.jsx` nuevo, usa `captureService.js` + `evidenceCapture.js` |
| Servicios de validación | CENTRALIZAR llamadas API y errores | ✅ `evidenceCapture.js` centraliza challenge + upload + registro de evidencia, mismo patrón `fetch`/`STRAPI_URL` que `setters.js`/`gettters.js` |
| UI reviewer | SEPARAR verificador de auditor | ⏳ Pendiente — no forma parte de la Fase 2 (es un tema de roles/permisos, ver Fase 6/7) |
| Estado final | LEER del backend, no decidir solo frontend | Sin cambios en esta fase — ya lo hacía `getValidationReviewBundle` |

### Fase 3 — Nuevos valores de `cars-evidence.type` (sección 7)

| Tipo | Formato | Uso |
|---|---|---|
| driver_selfie_live | image | Selfie en vivo |
| identity_document_front | image | Documento |
| identity_document_back | image | Documento |
| license_front | image | Licencia |
| license_back | image | Licencia |
| vehicle_front | image | Frontal |
| vehicle_rear | image | Trasera |
| vehicle_left | image | Lateral izquierdo |
| vehicle_right | image | Lateral derecho |
| vehicle_plates | image | Placas |
| vehicle_vin | image | VIN/NIV |
| vehicle_interior | image | Interior |
| vehicle_video | video | Recorrido guiado |
| official_query_capture | image/pdf | Constancia visual de consulta oficial |
| incident | image/video | Incidencia |

### Fase 3 — Checklist físico mínimo (sección 20)

| Campo | Tipo |
|---|---|
| driver_present | boolean |
| identity_document_present | boolean |
| identity_consistent | boolean |
| license_present | boolean |
| license_consistent | boolean |
| vehicle_present | boolean |
| plates_consistent | boolean |
| vin_consistent | boolean |
| brand_consistent | boolean |
| model_consistent | boolean |
| year_consistent | boolean |
| color_consistent | boolean |
| lights_ok | boolean |
| tires_ok | boolean |
| belts_ok | boolean |
| insurance_document_present | boolean |
| registration_present | boolean |
| video_complete | boolean |
| incidents | JSON array |

### Fase 4 — Campos de `external-verification` (sección 9)

| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| id | UUID | Sí | Identificador |
| validation | relation | Sí | `cars-validation` |
| entity_type | enum | Sí | driver / vehicle / license |
| entity_id | UUID | Sí | Entidad contrastada |
| source_name | string/enum | Sí | INE / REPUVE / proveedor estatal |
| source_type | enum | Sí | official_api / official_app / official_web |
| verification_method | enum | Sí | api / app / web |
| check_type | string/enum | Sí | credential / vehicle_theft / license |
| query_reference_hash | string | No | Hash del dato consultado |
| query_reference_masked | string | No | Referencia no sensible/mínima |
| requested_at | datetime | Sí | Inicio servidor |
| completed_at | datetime | Sí | Fin servidor |
| result | enum | Sí | verified / not_found / reported / mismatch / unavailable / error |
| result_data | JSON | No | Respuesta estructurada mínima |
| result_hash | char(64) | No | Hash de respuesta serializada |
| evidence | relation | No | Captura/PDF u otra constancia |
| performed_by | relation | Sí | Verificador |
| status | enum | Sí | valid / suspicious / failed |
| created_at | datetime | Sí | Auditoría |

### Fase 4 — Catálogo de licencias por entidad (sección 12)

| Entidad | Campo/configuración |
|---|---|
| license_provider | Proveedor oficial |
| official_url | Portal oficial |
| method | official_api / official_web / official_app |
| required_fields | Campos exigidos |
| verification_enabled | boolean |
| reference_type | folio/number/etc. |
| evidence_required | boolean |
| notes | Particularidades |

### Fase 4 — Fuentes externas consideradas (sección 41)

| Fuente | Uso | Mecanismo para diseño |
|---|---|---|
| INE — Servicio de Verificación de Datos de la Credencial para Votar (SVCV) | Identidad | Servicio institucional; requiere autorización/convenio |
| INE — Valida INE-QR | Comprobación de QR de credencial | Herramienta oficial |
| REPUVE — Consulta Ciudadana | Situación legal/reporte de robo | Portal oficial; API pública no asumida |
| Portales oficiales estatales de licencias | Vigencia/validez de licencia | Catálogo por entidad; API o web según disponibilidad |

### Fase 5 — Comparación de fuentes oficiales (sección 21)

| Comparación | Resultado |
|---|---|
| VIN | match / mismatch / unavailable |
| Placas | match / mismatch / unavailable |
| Marca | match / mismatch |
| Modelo | match / mismatch |
| Año | match / mismatch |
| Color | match / mismatch |
| Situación legal | clear / reported / recovered / unknown |
| Identidad | verified / mismatch / unavailable |
| Licencia | valid / expired / mismatch / unavailable |

### Fase 5 — Resultado y riesgo (sección 22, pesos ilustrativos)

| Señal | Peso inicial ilustrativo | Acción |
|---|---|---|
| nonce inválido | +50 | bloquear operación |
| hash inconsistente | +40 | sospechosa |
| evidencia duplicada | +40 | revisión |
| REPUVE con reporte | +60 | rechazo/revisión crítica |
| VIN mismatch | +50 | revisión crítica |
| GPS muy distante | +20 | revisión |
| checklist incompleto | +15 | no cerrar aprobado |
| fuente oficial no disponible | +5 | no equivale a fraude; bajar fuerza de verificación |
| secuencia anómala | +10 | revisión |

> Los pesos son parámetros iniciales de diseño — deben calibrarse con datos
> reales y versionarse (no son valores definitivos).

### Fase 5 — Estados de `cars-validation` (sección 23)

```
created → active → completed → automatic_review → approved / rejected / manual_review → confirmed / reverification_required
```

### Fase 6 — Campos de `verification-audits` (sección 24)

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| validation | relation | Expediente auditado |
| auditor | relation | Auditor independiente |
| auditor_agency | relation | Agencia/nodo |
| audit_type | enum | sample/deep/reverification_trigger |
| selection_reason | enum | random/risk/complaint/new_verifier/etc. |
| status | enum | pending/in_progress/completed/escalated |
| result | enum | conformity/inconsistency/insufficient/evidence_fraud |
| score | number | Resultado |
| notes | text | Justificación |
| started_at | datetime | Inicio |
| completed_at | datetime | Fin |
| protocol_version | string | Versión |
| created_at | datetime | Creación |

### Fase 6 — Items de auditoría (sección 25)

| Campo | Tipo | Uso |
|---|---|---|
| audit_id | UUID | Auditoría |
| check_key | string | Punto |
| result | enum | pass/fail/uncertain/not_applicable |
| evidence_ids | array UUID | Evidencia revisada |
| external_verification_ids | array UUID | Consultas oficiales revisadas |
| note | text | Justificación |
| created_at | datetime | Registro |

### Fase 6 — Muestreo de auditoría (sección 27)

| Perfil | Muestra inicial |
|---|---|
| Verificador nuevo | 20% |
| Verificador estable | 5% |
| Anomalías | 30%+ |
| Investigación | hasta 100% |
| Caso crítico | 100% o doble auditoría |

> Los porcentajes deben ser configuración, no código fijo (sección 27).

### Fase 6 — Doble auditoría (sección 28)

```
Caso normal:    VALIDACIÓN → AUDITOR A
Caso alto riesgo: VALIDACIÓN → AUDITOR A + AUDITOR B
Si A ≠ B:       ESCALAMIENTO → AUDITOR C
```

### Fase 7 — Reputación del verificador y agencia (sección 30)

| Métrica | Descripción |
|---|---|
| total_verifications | Total ejecutadas |
| total_audited | Auditadas |
| conforming | Conformes |
| inconsistencies | Inconsistencias |
| critical_findings | Hallazgos críticos |
| reverifications | Re-verificaciones |
| trust_score | Score derivado |
| algorithm_version | Versión de cálculo |

> Ya implementado del lado de CoWork como campos de `agencia` (ver
> `docs/COWORK-VERIFICACION-CONDUCTORES-FASES.md`, Fase 3), con el nombre
> `trust_algorithm_version`. Taxis debe escribir estos valores, no
> recrearlos en una tabla propia.

### Fase 8 — API mínima esperada (sección 32)

| Método | Endpoint | Función |
|---|---|---|
| POST | `/cars-validations` | Crear expediente |
| POST | `/cars-validations/:id/challenges` | Emitir challenge |
| POST | `/cars-validations/:id/evidences` | Subir evidencia |
| POST | `/cars-validations/:id/checklist` | Guardar checklist |
| POST | `/cars-validations/:id/external-verifications` | Registrar consulta oficial |
| POST | `/cars-validations/:id/complete` | Cerrar protocolo |
| POST | `/verification-audits/:id/result` | Resultado auditoría |
| POST | `/cars-validations/:id/reverification` | Crear re-verificación |
