# Taxis — Protocolo de Verificación de Conductores y Vehículos v2

Fuente: `docs/Verificacion_Conductores_v2.docx`. Este archivo es el equivalente,
para el módulo **Taxis**, de `docs/COWORK-VERIFICACION-CONDUCTORES-FASES.md`.

**Importante — esto es solo documentación, no código.** El módulo de Taxis no es
responsabilidad de este equipo; aquí se desglosa el documento en fases para que
quien lo lleve pueda planear el trabajo, igual que se hizo para CoWork. No se
tocó ningún archivo de `ciudadan_backend_26/src/api/cars-*`,
`ciudadan_backend_26/src/api/driver`, ni de `ciudadan_frontend/.../Taxis`.

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

## Fase 0 — Congelar el contrato actual

**Modelo de negocio:** no crear un sistema paralelo. Lo que ya existe cubre
buena parte de lo necesario; el riesgo es duplicar entidades por no revisar
primero lo que hay.

**Lógica técnica:**
- Tomar `cars-validation`, `cars-evidence` y `cars-validation-event` tal como
  están hoy como el contrato base — no renombrar ni romper campos existentes.
- Agregar un campo `protocol_version` (string) a `cars-validation`, para poder
  versionar el protocolo sin migrar datos históricos.
- Convertir `status` y `cars-evidence.type` en enums cerrados (no valores
  libres) — hoy admiten texto libre, lo que permite estados/tipos inválidos.

**Depende de:** nada. Es el punto de partida.

---

## Fase 1 — Seguridad del protocolo: nonce/challenge y hashes

**Modelo de negocio:** una evidencia debe poder demostrarse auténtica y
no reciclada de otra sesión — sin esto, cualquier foto vieja podría reusarse.

**Lógica técnica:**
- Emitir un **challenge/nonce de un solo uso por paso** (no uno reutilizable
  para toda la sesión): `nonce_id`, `session_id`, `step/evidence_type`,
  `issued_at`, `expires_at`, `used_at`, `status` (issued/used/expired/revoked).
- Cada evidencia se sube con `client_sha256` (calculado en el navegador/app) y
  el backend recalcula `server_sha256` sobre los bytes recibidos — **solo el
  del servidor es canónico**.
- Backend debe: validar `session_id`, validar el nonce (vigencia y que no se
  reutilice), comparar hashes, buscar duplicados por hash y por
  *perceptual hash* (para detectar reuso visual aunque el archivo cambie).
- Agregar `Idempotency-Key` por subida de evidencia, para que una caída de red
  no genere duplicados (el nonce sigue siendo de un solo uso, independiente).

**Depende de:** Fase 0.

---

## Fase 2 — Captura en vivo: cámara, GPS y video (Web + Capacitor)

**Modelo de negocio:** la evidencia debe nacer de la cámara en el momento de
la verificación — nunca de la galería del teléfono, para que no se pueda
"preparar" una foto de antemano.

**Lógica técnica:**
- Encapsular la captura detrás de un `captureService` con dos adaptadores:
  Web (`navigator.mediaDevices.getUserMedia()`) y Capacitor/APK (WebView +
  permisos nativos). El mismo frontend debe funcionar en ambos.
- Foto: stream de video → canvas/Blob. Video: `MediaRecorder` cuando esté
  soportado.
- GPS por cada evidencia: `latitude`, `longitude`, `accuracy_m`,
  `client_timestamp`, `location_source` (`browser_geolocation` /
  `native_bridge`); el servidor añade `server_timestamp`. La lógica de riesgo
  usa distancia a la agencia + precisión + consistencia temporal — el GPS
  nunca es prueba absoluta de presencia física por sí solo.
- No usar `<input type="file">` como mecanismo principal para evidencia
  obligatoria — la interfaz debe abrir la cámara directamente.
- El backend debe registrar que la captura se declaró como `live_capture`,
  pero **no confiar ciegamente** en esa declaración (de ahí la necesidad de
  hash + nonce + GPS como señales cruzadas).
- Refactorizar `DriverVerificationPage.jsx` y los componentes de
  `driver-verification/` para integrar cámara/GPS/evidencia/challenge en un
  protocolo secuencial (hoy es más bien "revisar documentos ya subidos").

**Depende de:** Fase 1 (necesita el nonce y los hashes ya definidos).

---

## Fase 3 — Nuevos tipos de evidencia y checklist físico

**Modelo de negocio:** cubrir todo lo que un verificador debe registrar
presencialmente, de forma estandarizada (no texto libre).

**Lógica técnica:**
- Nuevos valores de `cars-evidence.type`: `driver_selfie_live`,
  `identity_document_front/back`, `license_front/back`, `vehicle_front/rear/
  left/right`, `vehicle_plates`, `vehicle_vin`, `vehicle_interior`,
  `vehicle_video`, `official_query_capture` (constancia visual de consulta
  oficial), `incident`.
- Checklist físico mínimo como JSON estructurado y versionado, con booleanos
  como: presencia del conductor, documento/identidad consistente, licencia
  presente/consistente, vehículo presente, placas/VIN/marca/modelo/año/color
  consistentes, luces/llantas/cinturones ok, seguro/tarjeta de circulación
  presentes, video completo, e `incidents` (array JSON).
- Definir la **secuencia obligatoria de pasos** del protocolo presencial (ver
  sección 19 y 41 del documento fuente) — no permitir saltarse pasos.

**Depende de:** Fase 2.

---

## Fase 4 — Consultas oficiales externas (`external-verification`)

**Modelo de negocio:** contrastar contra fuentes reales de gobierno (INE,
REPUVE, licencias estatales) — **sin asumir ni contratar una API de
terceros**; el MVP es consulta manual a portales oficiales por parte del
verificador, con evidencia de que la consulta ocurrió.

**Lógica técnica:**
- Nueva entidad `external-verification` (no meterla como JSON gigante dentro
  de `cars-validation`, ni confundirla con una foto): `validation` (relación),
  `entity_type` (driver/vehicle/license), `entity_id`, `source_name` (INE/
  REPUVE/proveedor estatal), `source_type` (official_api/official_app/
  official_web), `verification_method`, `check_type`,
  `query_reference_hash`/`query_reference_masked` (sin guardar datos sensibles
  en claro), `requested_at`/`completed_at`, `result` (verified/not_found/
  reported/mismatch/unavailable/error), `result_data`, `result_hash`,
  `evidence` (relación a la constancia visual/PDF), `performed_by`
  (verificador), `status` (valid/suspicious/failed).
- **INE:** ruta preferida es el mecanismo oficial (SVCV — Servicio de
  Verificación de Datos de la Credencial para Votar), que requiere convenio/
  autorización institucional con el INE; mientras no exista, usar "Valida
  INE-QR" o solo verificación visual presencial. La foto de la credencial es
  evidencia de presentación física, **no** sustituto de la validación oficial.
- **REPUVE:** MVP soporta `official_web` — el verificador consulta
  manualmente el portal oficial de *Consulta Ciudadana*
  (`repuve.gob.mx`) por VIN/placas/folio, y guarda constancia visual/PDF del
  resultado. No hacer scraping como requisito del MVP. Diseñar para que una
  futura integración institucional cambie el `verification_method` a
  `official_api` sin rediseñar la entidad.
- **Licencias:** catálogo configurable por entidad federativa (32 estados, sin
  API nacional única): `license_provider`, `official_url`, `method`
  (api/web/app), `required_fields`, `verification_enabled`, `reference_type`,
  `evidence_required`, `notes`.

**Depende de:** Fase 3 (necesita el checklist y la secuencia de pasos donde se
insertan estas consultas).

---

## Fase 5 — Motor de riesgo y resultado

**Modelo de negocio:** decidir de forma automática y consistente si un caso
puede aprobarse o necesita revisión humana, con reglas versionadas (no
hardcodeadas ni ad-hoc).

**Lógica técnica:**
- Comparaciones automáticas estructuradas: VIN, placas, marca, modelo, año,
  color (`match`/`mismatch`/`unavailable`), situación legal
  (`clear`/`reported`/`recovered`/`unknown`), identidad
  (`verified`/`mismatch`/`unavailable`), licencia
  (`valid`/`expired`/`mismatch`/`unavailable`).
- Motor de `risk_score` con señales y pesos versionables (ejemplo ilustrativo
  del documento): nonce inválido +50 (bloquea), hash inconsistente +40,
  evidencia duplicada +40, REPUVE con reporte +60 (revisión crítica), VIN
  mismatch +50, GPS muy distante +20, checklist incompleto +15 (no cierra
  aprobado), fuente oficial no disponible +5 (no equivale a fraude), secuencia
  anómala +10. **Los pesos deben ser configuración, no código fijo, y
  calibrarse/versionarse con datos reales.**
- Máquina de estados de `cars-validation`: `created → active → completed →
  automatic_review → approved / rejected / manual_review → confirmed /
  reverification_required`. Cada transición genera un evento; no se edita
  `status` libremente desde el frontend; no se cierra como aprobado si faltan
  comprobaciones obligatorias; `result` (primario) se mantiene separado del
  resultado de auditoría.

**Depende de:** Fase 4 (necesita los resultados de `external-verification`
como una de sus señales de entrada).

---

## Fase 6 — Auditoría independiente

**Modelo de negocio:** que la confianza del sistema no dependa de una sola
persona — un auditor, distinto del verificador, revisa el trabajo después.

**Lógica técnica:**
- Nueva entidad `verification-audits` (nombre final a definir por
  convenciones del proyecto): `validation` (relación), `auditor` (relación a
  usuario — **debe tener rol `auditor` de CoWork**, no reutilizar `reviewer`
  de `cars-evidence`), `auditor_agency` (relación a `agencia` de CoWork),
  `audit_type` (sample/deep/reverification_trigger), `selection_reason`
  (random/risk/complaint/new_verifier/etc.), `status`
  (pending/in_progress/completed/escalated), `result`
  (conformity/inconsistency/insufficient/evidence_fraud), `score`, `notes`,
  timestamps, `protocol_version`.
- Items de auditoría: `audit_id`, `check_key`, `result`
  (pass/fail/uncertain/not_applicable), `evidence_ids`,
  `external_verification_ids`, `note`.
- Qué debe poder revisar el auditor (checklist del auditor, sección 26 del
  documento): que la sesión corresponde a la cita/verificador, checklist
  completo, evidencias esperadas y vinculadas, hashes/metadatos consistentes,
  fotos/video corresponden al expediente, comprobación oficial existe cuando
  aplica, resultados oficiales coinciden con los datos de Ciudadan, no hay
  reutilización sospechosa, incidencias bien registradas, el verificador no
  modificó evidencia original.
- Muestreo configurable por perfil (no código fijo): verificador nuevo ~20%,
  estable ~5%, con anomalías 30%+, investigación hasta 100%, caso crítico
  100% o doble auditoría.
- Doble auditoría: caso alto riesgo → Auditor A + Auditor B; si no coinciden,
  escala a Auditor C.
- **Regla dura, validada por backend, no solo por UI:** el `auditor` asignado
  a un caso **nunca** puede ser el mismo usuario que el `verificador` de ese
  expediente — impedir autoauditoría.
- **Punto de integración con CoWork:** al completar una auditoría, actualizar
  `agencia.trust_score` y demás métricas — contrato exacto (endpoint vs
  escritura directa a la BD compartida) pendiente de acordar con el equipo de
  CoWork (ver Fase 5/7 de `COWORK-VERIFICACION-CONDUCTORES-FASES.md`).

**Depende de:** Fase 5. Depende también de que CoWork tenga listo el rol
`auditor` (ya está) y de acordar el contrato de escritura de reputación.

---

## Fase 7 — Re-verificación física y reputación

**Modelo de negocio:** cerrar el ciclo cuando algo sale mal, sin borrar el
historial, y medir el desempeño de verificadores/agencias en el tiempo.

**Lógica técnica:**
- Re-verificación: crear un **nuevo** expediente vinculado al anterior (nunca
  modificar/borrar el original), asignado preferentemente a otra
  agencia/verificador; comparar resultados; conservar el motivo que la
  originó; actualizar reputación del verificador/agencia original.
- Reputación (ver Fase 3/4 de CoWork para dónde vive el dato):
  `total_verifications`, `total_audited`, `conforming`, `inconsistencies`,
  `critical_findings`, `reverifications`, `trust_score`, `algorithm_version`.
  Taxis **calcula** el score y **escribe** el resultado; no lo calcula CoWork.
  El verificador/agencia nunca edita su propio score.
- Detección de colusión (genera alerta/riesgo, nunca una acusación
  automática por sí sola): auditorías muy concentradas entre las mismas
  personas, tasas de aprobación anormalmente altas, dispositivos coincidentes
  entre actores distintos, patrones horarios/de captura repetitivos, reuso de
  evidencia, dos agencias que se auditan mutuamente de forma sospechosa.

**Depende de:** Fase 6.

---

## Fase 8 — Almacenamiento, permisos y pruebas obligatorias

**Modelo de negocio:** proteger la evidencia (nunca se destruye) y garantizar
que el protocolo no se pueda saltar antes de salir a producción.

**Lógica técnica:**
- Media/object storage con URLs no públicas permanentes; permisos separados
  para verificador vs. auditor; no permitir `delete` de evidencia histórica
  desde el frontend; conservar siempre `server_sha256`; definir retención y
  protección de datos antes de producción.
- API mínima esperada (contrato REST): `POST /cars-validations`,
  `POST /cars-validations/:id/challenges`,
  `POST /cars-validations/:id/evidences`,
  `POST /cars-validations/:id/checklist`,
  `POST /cars-validations/:id/external-verifications`,
  `POST /cars-validations/:id/complete`,
  `POST /verification-audits/:id/result`,
  `POST /cars-validations/:id/reverification`.
- Batería de pruebas obligatoria antes de producción (sección 39 del
  documento fuente): no saltar pasos; rechazar subir archivo arbitrario como
  evidencia "en vivo"; rechazar nonce expirado/reutilizado/de otra sesión;
  detectar hash inconsistente y duplicados; conservar historial de versiones;
  no permitir editar evidencia aprobada ni autoauditoría; no cerrar aprobado
  sin comprobaciones obligatorias; repetir pruebas en navegador móvil **y**
  en APK Capacitor (permisos de cámara/ubicación, orientación, denegación de
  permisos, red lenta, cierre/reapertura de sesión); probar GPS fuera de
  agencia, consulta oficial no disponible, resultado oficial inconsistente,
  REPUVE con reporte, doble auditoría, re-verificación; comprobar que el
  expediente puede reconstruirse completo a partir de sus eventos.

**Depende de:** todas las fases anteriores — es el cierre antes de producción.

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

| Componente/área | Acción |
|---|---|
| Step de datos personales | CONSERVAR |
| Step de documentos | CONSERVAR |
| Step de fotos preliminares vehículo | CONSERVAR como preregistro/`origin=preregister` |
| Step licencia | CONSERVAR |
| Step cita presencial | CONSERVAR |
| `DriverVerificationPage` | REFACTORIZAR para protocolo secuencial |
| `driver-verification` components | INTEGRAR cámara/GPS/evidencia/challenge |
| Servicios de validación | CENTRALIZAR llamadas API y errores |
| UI reviewer | SEPARAR verificador de auditor |
| Estado final | LEER del backend, no decidir solo frontend |

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
