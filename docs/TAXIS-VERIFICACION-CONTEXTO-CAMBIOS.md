# Contexto de cambios — Módulo Taxis (Verificación de Conductores) y relación con CoWork

Resumen de `CIUDADAN_Verificacion_Conductores_Implementacion_Completo_v2.docx` y su relación con el módulo CoWork.

## 1. Qué se va a hacer en Taxis

Convertir las entidades existentes (`cars-validation`, `cars-evidence`, `cars-validation-event`) en un **protocolo completo de verificación presencial** de conductores y vehículos:

**Flujo:** `DRIVER → AGENDA → CARS-VALIDATION → CAPTURA → COMPROBACIONES OFICIALES → VALIDACIÓN AUTOMÁTICA → RESULTADO → AUDITORÍA → RE-VERIFICACIÓN`

### Cambios clave en backend (Strapi)

- **`cars-validation`** (conservar, no duplicar): expediente principal. Corregir `nonce` (temporal, un solo uso), controlar `status` con transiciones permitidas, agregar `protocol_version`. Estados: `created → active → completed → automatic_review → approved/rejected/manual_review → confirmed/reverification_required`.
- **`cars-evidence`** (ampliar): versionado con `supersedes`/`is_current` (nunca borrar evidencia), `origin` estandarizado (`preregister`/`live_capture`/`reupload`), `sha256` canónico calculado en backend, nuevos tipos enumerados (selfie, documentos, licencia, vehículo, video, `official_query_capture`, `incident`).
- **`cars-validation-event`**: convertir en bitácora cronológica real (~20 tipos de evento, inmutables).
- **NUEVA entidad `external-verification`**: registro estructurado de consultas a fuentes oficiales (INE, REPUVE, licencias estatales) con método, fuente, resultado, hash y constancia. No meter como JSON en `cars-validation`.
- **NUEVA entidad `verification-audits`**: auditoría independiente ("verificación de la verificación") con muestreo configurable (verificador nuevo 20%, estable 5%, anomalías 30%+), doble auditoría con escalamiento, y reputación (`trust_score`) de verificadores/agencias calculada, no editable.
- **Challenge/nonce de un solo uso** por paso de evidencia; idempotency-key en subidas; motor de `risk_score` con pesos versionados.

### Comprobaciones oficiales (MVP realista)

- **INE**: vía SVCV (requiere convenio institucional) o Valida INE-QR. La foto es constancia, no sustituto.
- **REPUVE**: consulta web oficial + constancia visual (`official_web`). No asumir API pública ni hacer scraping.
- **Licencias**: catálogo configurable por entidad federativa (no hay API nacional única).

### Cambios clave en frontend

- Refactorizar `DriverVerificationPage` a protocolo secuencial guiado (no app separada).
- `captureService` con adaptadores Web (`getUserMedia`/`MediaRecorder`) y Capacitor (permisos nativos). **No usar `input type=file`** para evidencias obligatorias.
- Por cada captura: GPS + `client_sha256` + nonce + timestamps; el backend recalcula y manda.
- Separar UI de verificador vs auditor; el estado final lo decide el backend.

### Reglas duras

- No autoauditoría; el verificador no edita/borra evidencia ni su `trust_score`.
- No cerrar aprobado sin comprobaciones obligatorias.
- Detección de colusión por señales (nunca acusación automática).

## 2. Relación con el módulo CoWork

Son módulos distintos pero comparten **patrones e infraestructura** que deben reutilizarse, no duplicarse:

| Concepto compartido | CoWork (existente) | Taxis (nuevo) |
|---|---|---|
| **Rol `verificador`** | Ya existe en `roles.extra` y policy `is-verificador` (revisa documentación, valida áreas en `up_users.area_details`) | Mismo rol extiende su alcance a verificación presencial de conductores |
| **Verificación documental** | Flujo de verificación de áreas/subáreas con evidencias | Mismo patrón, pero añade captura en vivo + nonce + GPS + hash |
| **Máquina de estados en lifecycles** | `tarea/lifecycles.js` con `VALID_TRANSITIONS` | `cars-validation` debe seguir el mismo patrón (transiciones controladas en backend, nunca desde frontend) |
| **Eventos/bitácora** | Propagación de estado tarea→todo | `cars-validation-event` como bitácora inmutable |
| **Policies Auth0** | `is-authenticated-auth0`, `is-admin-or-socio`, `is-verificador` (`ctx.state.strapiUser`) | Reutilizar las mismas policies para los nuevos endpoints `/cars-validations/*` |
| **Rutas custom numeradas** | `routes/0X-*.js` con `auth: false` + policies | Los 8 endpoints nuevos (crear, challenge, evidencias, checklist, external-verifications, complete, auditoría, reverificación) siguen la misma convención |
| **Frontend** | `services/<feature>/`, `request.utils.js`, hooks, MUI v6 | Centralizar llamadas del flujo de verificación en un service propio, mismas convenciones |

### Puntos de atención cruzada

- **No crear colecciones duplicadas**: antes de crear `external-verification` y `verification-audits`, confirmar que no haya equivalentes parciales en el schema actual.
- **Consistencia de roles**: la auditoría de verificadores de taxis puede alimentar la misma noción de confianza/reputación que CoWork usa para `verificador` de áreas — decidir si `trust_score` es por módulo o global.
- **Convenciones idénticas**: español-first, `entityService`/`db.query`, lifecycles para reglas de negocio, respuestas Strapi v4 `{ data }`.

## 3. Orden de implementación (resumen de 22 pasos)

1. Congelar contratos de las 3 entidades existentes + `protocol_version`.
2. Nonce de un solo uso → cámara Web/Capacitor → captura foto/video → GPS → hashes → checklist.
3. `external-verifications` → REPUVE (web) → adaptador INE → catálogo de licencias.
4. Comparaciones automáticas → `risk_score` → auditoría automática → auditoría humana → muestreo → doble auditoría → re-verificación → reputación → alertas de colusión.

**Criterio de terminado:** protocolo guiado completo, evidencias solo de cámara en vivo ligadas a sesión/nonce/GPS/hash, consultas oficiales registradas por separado, auditoría independiente, evidencia original indestructible, funcionando en navegador y APK.
