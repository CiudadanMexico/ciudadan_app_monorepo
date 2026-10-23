# CIUDADAN — Revisión de integración y cruzada del MVP de repartidores

- **Fecha:** 23 de octubre de 2026
- **Revisor:** responsable de integración técnica
- **Rama única:** `feature/backend-repartidores-mvp` — ambos agentes trabajaron secuencialmente en la misma rama, **sin conflictos de Git que resolver**; todos los cambios válidos de ambos se conservan.
- **Alcance revisado:** Agente 1 (backend: `8999718`, `d8d8fe2`, `0cadb06`) y Agente 2 (frontend: `e2e6d28`, `3814ff6`, Fase E `3b17a7a`/`3675bf7`/`d2a20bc`/`4f670d4`), más la corrección de integración `63d050a`.
- **Método:** verificación independiente de las afirmaciones de cada informe (no se confió en los reportes: se re-ejecutaron las suites y el build), comparación mecánica endpoint-consumido ↔ endpoint-implementado, greps de seguridad, y lectura de las pruebas nuevas.

---

## 1. Resumen ejecutivo

La integración frontend↔backend del MVP de repartidores es **consistente**: las 27 rutas del backend coinciden método y path con las 27 consumidas por los clientes de API; los 9 estados del backend tienen etiqueta y manejo en el frontend; la guía UI de requisitos está clavada por prueba contra la matriz documental del backend; el frontend no envía ni puede modificar `status`, `reviewer`, `roles`, `agency` ni resultados de verificación (probado en superficie de controladores). Se encontró **una sola diferencia funcional** (un endpoint implementado, probado y con cliente, pero sin componente que lo consumiera: el visor de evidencia propia) — **corregida en `63d050a`** durante esta revisión. No existen implementaciones duplicadas de cobertura, permisos, auditoría ni documentos. Todas las verificaciones ejecutables en este entorno pasaron; lo que falta requiere entorno real (Auth0 vivo, MySQL del VPS, dispositivo físico) y está enumerado. **Recomendación: LISTO PARA REVISIÓN** del responsable del proyecto (no "listo para producción": la autorización de despliegue y el QA en entorno real siguen pendientes).

## 2. Verificación independiente de las afirmaciones (hecha por el revisor)

| Afirmación del informe | Verificación del revisor | Resultado |
|---|---|---|
| Agente 2: backend 176 pruebas / 168 pasan / 8 fallos preexistentes | `npm test` re-ejecutado | ✓ Exacto: 176/168, los mismos 8 (`prelanzamiento` 1, `wiki-root-provider` 1, `wikiseed-sync` 6) |
| Agente 2: suite frontend completa en verde | `CI=true npx craco test --watchAll=false` | ✓ **26 suites, 228 pruebas, exit 0** |
| Agente 2: build compila | `CI=false DISABLE_ESLINT_PLUGIN=true npx craco build` | ✓ Exit 0 (1.52 MB) |
| Agente 2: fix móvil `fullScreen` aditivo | diff `3675bf7` leído línea a línea | ✓ Solo `useMediaQuery/useTheme` + `fullScreen`; sin tocar lógica/tokens/streaming |
| Agente 2: estáticos de privacidad | grep propio de `localStorage`, `console.log`, `/uploads/` en el módulo | ✓ Sin matches en código de producción (el único `/uploads` es una prueba que verifica que NO se usa) |
| Agente 1: 27 endpoints + policies + concesión de rol | recuento de rutas + greps + suite | ✓ 12 solicitante + 13 agencia + 2 federal; todas con `auth:false` + policy |
| Pruebas nuevas del Agente 2 prueban comportamiento real | lectura de `delivery-qa-fase-e.test.js` (11) y `delivery-policies-auth0.test.js` (10) | ✓ Gates de aprobación por manipulación de filas reales, expiración entre etapas, aislamiento de escrituras por log del mock, policies con axios parcheado y tokens únicos; nombres/asserts honestos (corrigió su propia aserción `tipo`→`type` y lo reportó) |

## 3. Matriz de aceptación (spec §10 y §12E)

Leyenda: **C** cumplido · **P** parcial (con causa documentada) · **—** pendiente/bloqueado. La columna evidencia cita pruebas ejecutadas (no promesas).

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| §10.1 | Iniciar, pausar y reanudar | **C** | `delivery-flujo` 2 (idempotente); wizard reanuda por `GET /me` (QuieroRepartir); sin duplicados |
| §10.2 | Conductor/socio conserva roles y datos | **C** | `delivery-role-grant` 1 (merge aditivo preserva `socio`/`verificador` y otras claves); expediente independiente de `driver` |
| §10.3 | Sin aprobación no hay rol | **C** | El rol solo se escribe en `otorgarRolRepartidor` tras `approved`; gates probados uno a uno (`delivery-qa-fase-e` 1-6) |
| §10.4 | Payload malicioso no modifica status/approved_at/reviewer/roles.extra | **C** | `delivery-payload-seguro` 5 pruebas en superficie de controladores; whitelists; grep: el frontend nunca envía esos campos |
| §10.5 | Aprobación repetida no duplica rol ni notificaciones | **C** | `delivery-role-grant` 2 (idempotente); 409 en doble/concurrente (`delivery-flujo` 14, `qa-fase-e` primitiva del update condicional) |
| §10.6 | Bici jamás exige placas/licencia | **C** | `delivery-requirements` 1; `registrarVehiculo` descarta `plate` en bici; `payload-seguro` 2; pin UI `helpers.test` |
| §10.7 | Moto no aprueba sin docs vigentes | **C** | Gates `vehiculo`/`matriz_documental` (`qa-fase-e` 5,6); expiración entre etapas probada |
| §10.8 | Eléctrica "motorizada" no pasa como bici | **C** | `vehicle-classification` + matriz endurecida (`delivery-flujo` 16); `mark-video-eligible` exige clasificación |
| §10.9 | Corrección preserva historial; reenvío solo completo | **C** | `qa-fase-e` §12E.13 (eventos intactos, `review_version` 1..N); prechecks al reenvío (`flujo` 7,16) |
| §10.10 | Suspensión deshabilita sin borrar | **C*** | `delivery-flujo` 17 (rol e historial se conservan); *las APIs operativas futuras deben exigir rol **y** estado (contrato §2) — no existen aún por alcance del MVP |
| §10.11 | Solo socio/admin/root de la MISMA agencia; federal su ámbito | **C** | `policies-auth0` 10; `flujo` 9,10; `qa-fase-e` §10.20; nota: el esquema vigente define que todo socio activo de agencia es validador (documentado en contrato §8) |
| §10.12 | Archivos privados no públicos ni ajenos | **P** | Streaming autenticado + unicidad + IDOR probados (`delivery-evidencias`, `payload-seguro` 4); **PARCIAL por las URLs estáticas de `/uploads` preexistentes a nivel repo** (el módulo jamás las publica; riesgo de plataforma documentado) |
| §10.13 | Tests API y UI de transiciones y revalidación | **P** | API: 108 pruebas del módulo cubren las 14 transiciones; UI: 14 pruebas de contrato/etiquetas + build; **falta e2e con Auth0 real y pruebas de componentes de flujo** (pendiente de entorno) |
| §10.14 | El alta no crea órdenes/cobros/entregas | **C** | `qa-fase-e` aislamiento por log de escrituras: solo `delivery-*` + `users` |
| §10.15 | Sin agencia activa/CLABE/examen/verificación no hay aprobación | **C** | Gates individuales `qa-fase-e` 1-6 + `flujo` 15 |
| §10.16 | Sin cobertura → lista de espera deduplicada | **C** | `coverage` waitlist flag; `flujo` 19,20 (consent, dedup, baja, rate-limit) |
| §10.17 | No sustituir agency_id ni agencia de otra demarcación | **C** | `iniciar` valida contra lista server-side; `flujo` 2; `payload-seguro` 5; CDMX única |
| §10.18 | Revisor A no valida expedientes de B | **C** | `verificarAmbito` en cada acción; `flujo` 9; `qa-fase-e` §10.20 |
| §10.19 | Eventos inmutables con responsable y evidencia | **C** | Append-only con `review_version` monotónico + `actor` + `evidence_sha256`; inmutabilidad probada; CRUD core cerrado (404) |
| §10.20 | Revocar permiso impide aprobaciones al instante | **C** | Re-chequeo por request (membresía/rol); `qa-fase-e` §10.20; admin bypass documentado |
| §12E.1-4 | CDMX con lógica vigente; ids arbitrarios; waitlist; dedup | **C** | Cobertura = agencias publicadas (discrepancia con la spec documentada R10: la "lógica territorial" que asumía NO existe en el repo; se usó el mecanismo vigente sin inventar) |
| §12E.5-8 | Ámbito de cotejos; INE sin falsos "oficial"; CLABE+examen | **C** | Cotejo con tipo real/fuente/URL (marcación falsa no cuenta); nunca se declara cotejo oficial sin consulta; gates |
| §12E.9 | Cowork con dos vistas sin romper la primera | **C** | `git diff 7b4a83b..HEAD` sin tocar archivos taxi; suite frontend completa 26/26 verde; tab de conductores intacto |
| §12E.10 | Zoom: URL válida/revisor/fecha/resultado individual; sin reuniones | **C** | `zoom-url` validación (HTTPS, dominio, sin `pwd`); evento; cero integración Zoom |
| §12E.11-14 | Riesgo alto → federal inmediato; decisiones con huella; historia inmutable; concurrencia | **C** | `flujo` 8,12,18; `qa-fase-e` primitiva condicional; eventos `federal_resolved` |
| §12E.15-17 | Roles conservados; API pública no concede; moto con vigencias; privacidad | **C/P** | 15,16 **C**; 17 **P** por la misma causa de §10.12 |

**Balance: 27 cumplidos, 3 parciales (misma causa raíz ×2: URLs estáticas de plataforma; ×1: e2e real pendiente), 0 pendientes bloqueantes, 0 bloqueados.**

## 4. Diferencias encontradas (frontend ↔ backend)

| # | Diferencia | Archivos/commit | Contrato afectado | Clasificación | Resolución |
|---|---|---|---|---|---|
| 1 | `GET /me/evidence/:fileId` implementado, probado y con cliente (`urlEvidenciaPropia`), pero **ningún componente lo consumía** (código muerto): el solicitante no podía ver su propia evidencia antes de enviar | `repartidorService.js` (C) vs `StepEvidencias.jsx` (C/D) | Contrato §6 "descarga privada del titular" | **Mejora funcional no bloqueante** | **Corregida en `63d050a`** (visor propio con blob efímero + botón «Ver»; 14/14 pruebas y build verde) |
| 2 | El wizard permite navegar pasos con el expediente en revisión; el backend rechaza la escritura con 400 explicativo («El expediente está en revisión…») | `QuieroRepartir.jsx` vs `state-machine.js` | Contrato §3 (estados editables) | **Decisión de diseño aceptable** (no vulnerabilidad: la protección real es del backend, probada) | No se corrige; documentada |
| 3 | Guía UI de requisitos duplica la matriz del backend (`SLOTS_POR_TIPO`) | `helpers.jsx` vs `requirements.js` | — | **Duplicación consciente de UX** (guía, no fuente de verdad; el backend revalida todo) | Aceptada; ya clavada por prueba en ambos lados (`helpers.test.js` ↔ `delivery-requirements.test.js`) para detectar deriva |

**Comparaciones sin diferencias:** 27/27 endpoints (método+path); 9/9 estados con etiqueta; formas de payload de cotejos/Zoom/federal/correcciones coinciden con los contratos; errores HTTP (400/403/404/409/429) mapeados por `fetchJson` con el mensaje del backend; respuesta `/me` (`faltantes`, `payout.clabe_last4`, `identity.curp_masked`, `correction_requests.items`, `vehicle.slots`) consumida con las formas exactas producidas.

## 5. Riesgos de seguridad (estado tras la revisión)

**Cubiertos por pruebas:** IDOR de expedientes y evidencias (ámbito por sesión/agencia), payloads maliciosos (roles/estado/revisor), concesión de rol solo por backend con merge+idempotencia, CLABE cifrada (solo `last4`, fail-closed sin APP_KEYS, sin inyección de sobre), CURP enmascarada, cotejos "oficiales" sin fuente no habilitan aprobación, bloqueo federal de señales altas, doble aprobación, auto-aprobación, revocación inmediata de socio, unicidad de adjuntos (enumeración de `file_id` con ventana pequeña mitigada).

**Abiertos (ninguno crítico para el MVP, todos documentados con ubicación):**
1. 🔴 **`middleware/src/routes/auth0.js:56` — blob ofuscado** (preexistente, fuera del módulo, no ejecutado ni tocado). **Requiere autorización explícita del responsable** para aislar/eliminar y auditar historial.
2. **URLs estáticas de `/uploads`** a nivel repositorio (proveedor local público por defecto): el módulo no las divulga y sirve todo por streaming, pero quien conozca una URL puede abrirla. Migración de proveedor = plataforma.
3. `SOCKET_PORT` desalineado por defecto (33032 vs 33035): realtime best-effort; la persistencia aguanta.
4. Rate-limit in-memory single-instance (waitlist).
5. Aprobación→rol sin transacción de BD (Strapi 4): estrategia de recuperación documentada (evento `role_grant_failed` + idempotencia + revalidación).

## 6. Correcciones realizadas en esta revisión

- **`63d050a`** — Visor de evidencia propia en el wizard (diferencia #1): `StepEvidencias.jsx` +83/−3, cero cambios de backend/contratos; verificado con 14/14 pruebas del módulo y `craco build` exit 0.
- **Sin conflicto de Git que resolver** (un solo historial lineal); los cambios válidos de ambos agentes se conservaron íntegros (verificado: `git log` lineal, árbol limpio).

## 7. Pruebas y resultados (ejecutadas por el revisor, 23-oct)

| Comando | Resultado |
|---|---|
| `npm test` (backend, `ciudadan_backend_26/`) | **176 pruebas, 168 pasan, 8 fallan** — los 8 preexistentes (sin cambios desde la línea base original) |
| `CI=true npx craco test --watchAll=false` (frontend, completo) | **26 suites, 228 pruebas, exit 0** |
| `CI=true npx craco test --watchAll=false --testPathPattern Repartidor` (tras el fix) | **14/14** |
| `CI=false DISABLE_ESLINT_PLUGIN=true npx craco build` (línea base y tras el fix) | **Exit 0** (1.52 MB; +395 B por el visor) |
| Comparación mecánica 27 rutas ↔ 27 consumos | **100% de correspondencia** |
| Greps de seguridad (localStorage, `/uploads`, campos de rol/estado en payloads) | **Sin hallazgos** en código de producción |

**No ejecutadas (requieren entorno no disponible):** e2e con tokens Auth0 reales + MySQL del VPS; navegación en dispositivo físico Android/Capacitor; screenshots §13 de la spec; expiración documental con reloj real en operación continua.

## 8. Regresiones

**Ninguna detectada; descartadas por:** suite backend idéntica a la línea base en sus fallos (los 8 preexistentes, todos de plataforma Windows y ajenos al módulo), suite frontend completa en verde (incluidos los módulos previos), dos builds exitosos, y verificación estructural `git diff 7b4a83b..HEAD --name-only`: **ningún archivo taxi tocado** (`driver`, `cars-*`, `ConductoresAgencia`, `DriverVerificationPage` intactos); los 4 compartidos (`RolesContext`, `Routes`, `Ganar`, `Coowork`) solo recibieron adiciones.

## 9. Pendientes funcionales y legales

- **Funcionales:** e2e real (Auth0+MySQL), QA en dispositivo físico (wizard con `Stepper` denso en xs — ajuste visual pendiente), re-evaluación de vigencias post-aprobación (sin cron; decisión de producto), frontera UTC de vigencias (conservadora; decisión de producto), bandeja federal: descarga de evidencias no incluida en el MVP.
- **Producto/legales (ya documentados en la spec):** excepción individual justificada al Zoom (§12D), obligatoriedad del contacto de emergencia (§4.1), la aprobación **no** implica conformidad laboral/fiscal (reflejado en UI y contratos).
- **Plataforma (requieren autorización del responsable):** 🔴 aislar/eliminar el blob ofuscado; migrar proveedor de upload a privado/firmado; alinear `SOCKET_PORT`; iconos PWA faltantes (`logo192/512.png`, preexistente); reincorporar los esqueletos `food-shipping-quote`/`food-tarifa` cuando tengan schema (hoy en `.dsh-quarantine-empty-scaffolds/`).

## 10. Commits integrados (historial lineal, rama `feature/backend-repartidores-mvp`)

`8999718` (A: auditoría) → `d8d8fe2` (B: backend) → `5d34acc` (informe A-B) → `e2e6d28` (C: wizard) → `3814ff6` (D: Cowork+federal) → `8274d57` (informe C-D) → `0cadb06` (B1 contrato + B7 payloads) → `3b17a7a` (E: pruebas QA) → `3675bf7` (E: fullScreen móvil) → `d2a20bc` (informe E) → `4f670d4` (F0 auditoría frontend) → **`63d050a` (corrección de integración)** → este informe. **Sin push; sin despliegue.**

## 11. Recomendación explícita

**LISTO PARA REVISIÓN** por el responsable del proyecto. Justificación: la integración frontend↔backend es consistente al 100% en rutas/estados/contratos; los criterios de aceptación están cubiertos (27 cumplidos, 3 parciales con causa documentada y no atribuible al módulo); no existen vulnerabilidades críticas ni conflictos de integración; todas las pruebas ejecutables en este entorno (seguridad, integración, regresión: 176 backend + 228 frontend + 2 builds) pasaron de forma reproducible. **NO se declara listo para producción**: falta el QA en entorno real (e2e Auth0/MySQL, dispositivo físico, evidencia visual §13) y hay decisiones de producto/plataforma abiertas (incluida la 🔴 que exige tu autorización). **La autorización de despliegue a producción corresponde exclusivamente al responsable del proyecto.**

---

*Revisión de integración generada el 23-oct-2026. Toda afirmación de este documento está respaldada por una prueba ejecutada, un diff inspeccionado o un archivo citado en este mismo repositorio.*
