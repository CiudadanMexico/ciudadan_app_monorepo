# CIUDADAN — Fase F0: Auditoría técnica frontend (Agente 2) — MVP de repartidores

- **Fecha:** 22 de octubre de 2026
- **Rama:** `feature/backend-repartidores-mvp` (árbol limpio en `d2a20bc`)
- **Método:** lectura directa del código real (sin modificar **ningún** archivo de código para producir este informe) + tres auditorías paralelas de solo lectura (flujo conductores/subidas, auth/roles/notificaciones/HTTP, Cowork/agencias/PWA/pruebas). El módulo as-built fue verificado **archivo por archivo de primera mano** contra el checklist F0–F7 del Agente 2.
- **Contexto crítico:** las Fases C y D del MVP **ya están implementadas en esta rama** (`e2e6d28`, `3814ff6`; QA parcial en `3b17a7a`, `3675bf7`, `d2a20bc`). Esta auditoría NO parte de cero: inventaría lo existente, verifica el checklist del Agente 2 contra el as-built y produce la **lista real de brechas** que define el trabajo de F1–F7.
- **Contrato de integración (F1):** ya cerrado y vigente en `docs/REPARTIDORES-MVP-CONTRATO-BACKEND.md` (29 endpoints, estados, errores, gates). El frontend as-built lo consume completo (verificado en §5).

---

## 0. Resumen ejecutivo

1. **El módulo existe y su arquitectura es la correcta** (rutas propias + tab de Cowork junto a conductores, sin dashboard paralelo): 12 componentes/servicios propios + 4 ediciones aditivas en archivos compartidos. El checklist F2–F6 está cubierto en su gran mayoría.
2. **🔴 Brecha bloqueante de F4:** el `FormularioCotejo` renderiza el select «Documento a cotejar» **sin opciones** (`RepartidoresAgencia.jsx:120-122`) — `documentos_requeridos` está disponible en el detalle (`:208`) pero nunca se pasa al formulario (`:316-319`). Sin este fix **ningún expediente puede completar la matriz documental desde la UI** (el flujo quedaría atascado en `pending_review`). Las pruebas de C/D fueron build + backend, no e2e, por lo que nunca se detectó.
3. **Tres incumplimientos puntuales del checklist del Agente 2:** botón «Aprobar» habilitado en `pending_review` (F4 exige deshabilitarlo con requisitos pendientes); sin confirmación expresa en acciones sensibles (aprobar/rechazar/suspender en el panel, enviar a revisión en el wizard — F3.7/F4); sin UI de **baja de lista de espera** aunque el servicio y el backend la soportan (F2.7).
4. **Discrepancia permisos:** un **root puro** (roles.extra=`['root']` sin socio/admin) no ve la pestaña «Verificar Repartidores» (`tienePermisoCRUD = isAdmin() || isSocio()`, `Coowork.jsx:268`) aunque el backend SÍ lo autoriza (policy `['socio','admin','root']`) — contradice el informe C-D y la spec §8.
5. **Hallazgos de plataforma (preexistentes, fuera de alcance):** `console.log` del token Auth0 en `RolesContext.jsx:37-39` (higiene F7), PWA sin service worker con iconos de manifest inexistentes, defaults inconsistentes de `REACT_APP_STRAPI_URL`.
6. **Lo que NO debe reutilizarse** (antipatrones taxi verificados en Fase A R17): escritura directa de expedientes desde el frontend sin policy (`driverDraftApi.js`), URLs públicas de `/uploads`. El módulo nació sin esos gaps (IDs + streaming autenticado).

---

## 1. Estructura de rutas y navegación (F0 §1)

- **Router plano sin PrivateRoute** (no existe en el repo): ~1342 líneas en `src/Routes/index.jsx`; la protección es intra-componente. Patrón documentado en `Routes/index.jsx:561-563` (comentario del módulo).
- **Rutas del módulo** (`Routes/index.jsx:564-571`): `/repartidor/registro` → `QuieroRepartir`, `/repartidor/estado` → `EstadoRepartidor`. Ambas se autoguardan con `loginWithRedirect({ appState: { returnTo } })` (`QuieroRepartir.jsx:69`, `EstadoRepartidor.jsx:63`) — patrón canónico del repo (`Coowork.jsx:302-308`, `docs/03-Frontend.md` §2.1).
- **Entrada de navegación:** tarjeta «🚴 Repartiendo» en `Ganar.jsx:127-136` junto a «Conduciendo» (:122-126), con descripción de producto completa (CDMX, sin membresía, sin visita presencial, bici sin placa, independiente del expediente taxi, disclaimer laboral/fiscal).
- **Cowork por URL** (no `setTab`): lista blanca `Coowork.jsx:93`, `rutaDeTab` :126-127, `tabDeRuta` :169-170, guard :340-342, tab :691-692, contenido :849-851 — los 6 puntos de integración verificados de primera mano (detalle en §7).
- **Alias de conductores intactos** (`Routes/index.jsx:573-575` comentario de rutas conductor).

## 2. Autenticación Auth0 y gestión de la sesión (F0 §2)

- **Provider stack** (`index.js:159-193`): StrictMode > Router > ScrollToTop > **Auth0ProviderWithNavigate** (:163) > AuthProvider > Localization > **RolesProvider** > SnackbarProvider (fuera de NotificationsProvider, :167-176) > NotificationsProvider > Cart/FoodCart > App. Guard `auth0ConfigValida()` (:159).
- **Config:** `REACT_APP_AUTH0_{DOMAIN,CLIENT_ID,AUDIENCE,SCOPES}` (`index.js:28-31`); audience `https://api.ciudadan.org`; `cacheLocation="localstorage"` + `useRefreshTokens` (:136-143); `onRedirectCallback` navega `appState?.returnTo || '/'` (:128-130); redirectUri nativo `com.ciudadan.org://callback` (:122-126, Capacitor).
- **Token por componente** (patrón del módulo): `getAccessTokenSilently({ authorizationParams: { audience } })` y se pasa al servicio (`EstadoRepartidor.jsx:45`, `RepartidoresAgencia.jsx:556-563`, `QuieroRepartir.jsx:49-55`). El token lo aporta el componente, nunca un valor fijo (`repartidorService.js:8-10`).
- **Dual token legacy:** `strapi_jwt` en localStorage vía `AuthContext.jsx:21,69-73` (POST `/api/auth/auth0-login` :44-54 manda header Y body). **Nadie lo consume** (0 usos de `useAuthInfo().strapiJwt`); el módulo repartidor NO lo usa. Los Taxiz legacy usan `REACT_APP_STRAPI_TOKEN` (API token distinto).
- **Logout:** `utils/logoutAqui.js:17-31` — `returnTo` SOLO origen (regla `/v2/logout`), iframe oculto.

## 3. RolesContext, roles funcionales y permisos (F0 §3)

- **Carga:** `GET /api/users?filters[email][$eq]=…&populate[role|roles|direcciones|club|agencia|areas]=*` con Bearer Auth0 (`RolesContext.jsx:157-162`); membresías por `GET /api/membresias?...activa=true` (:199-221). Si el usuario no existe en Strapi: bootstrap idempotente (:284-344).
- **Forma de `userData`:** `{ id, ...attrs }` con `roles.extra` (:191-196), `agencia` poblada (:159), `verificado` (:507-510). ⚠️ **`membresia_vigente` no existe como campo frontend** (el backend sí lo usa en su policy): el estado equivalente es `membresia` + `isActivaMembresia()` (:401).
- **Helpers:** `hasExtra` :350-356; `isEditor/isAdmin/isRoot/isSocio/isVerificador/isAuditor` :359-390; **`isRepartidor` :396-399** (copia exacta del patrón `isAuditor`; comment :392-395 documentando que el rol SOLO lo concede el backend), export :554. Usos del módulo: `EstadoRepartidor.jsx:34,73,134`.
- **Caché:** `CACHE_TTL = 5 min` (:55), coalescing de promesas (:142-150), fallback sessionStorage SOLO offline (:245-253). `fetchRolesYMembresia(force)` :118-274. **No existe refresco por socket**: tras aprobación, `/repartidor/estado` refresca con force al ver `approved` (`EstadoRepartidor.jsx:50-51`) + botón manual (:69-79). Denegación server-side inmediata; el desfase es solo UI.
- ⚠️ **Hallazgo de higiene:** `console.log("Access token auth0: ", token)` en `RolesContext.getToken` (:37-39) — token en consola del navegador. Preexistente (el módulo no usa ese helper), limpiar antes de producción (F7).

## 4. Flujo de alta de conductores/taxistas (F0 §4) — para reutilizar, no tocar

- **Verificación de conductores (Cowork):** tab «Verificar Conductores» = `ConductoresAgencia.jsx` (cola vía `GET /api/agendas/conductores-pendientes` con Bearer Auth0, `:78-84`) + `DriverVerificationPage.jsx` (ruta `/validations/:validationId/review`, `Routes/index.jsx:585-586`; revisión por documento vía `PATCH /api/cars-evidences/:id/review`, cierre vía `POST /api/cars-validations/:id/complete`; update optimista con rollback `:164-191`; expediente vehicular `documento_completo→en_revision→aprobado/suspenso` `:477-503`). **Intacta tras la integración** (regresión verificada: los 6 puntos del router comparten código y el tab sigue en la lista blanca :93/:124-125/:167-168/:335-336/:686-687/:838-840).
- ⚠️ **Bug latente preexistente (R16) — CONFIRMADO con la cadena completa:** `ConductoresAgencia.jsx:107-111` (`goToDetalle`) hackea `window.history.pushState`+`PopStateEvent` hacia `/herramientas/procesar-conductor/${id}` que **no existe** (única mención en todo `src`); la cadena real termina en el grid de Herramientas: `Routes/index.jsx:987-990` → `HerramientaRedirect` :288-294 → `HerramientaDedicada` :313-318 cuyo mapa `HERRAMIENTA_POR_SLUG` :299-312 no contiene `'procesar-conductor'` → Navigate al grid. Se dispara al click en el cuerpo de la tarjeta (`:157`); el botón «Verificar» (`:187-207`) sí funciona (navega a `/validations/:id/review`, `:127`). No heredar el patrón (`navigate` o Dialog in-page, como hace el módulo).
- **Alta de conductores (monolito rutado):** `Taxiz/PreRegistroConductor2.jsx` (1328 líneas; rutas `Routes/index.jsx:521-526`, `:761-762`) — fetch crudo inline (`:505-508`, `:768-773`) con **auth mixto**: GETs con `REACT_APP_STRAPI_TOKEN` (:363), PUT `/api/users` con Bearer Auth0 (:664-666), **pero `/api/upload` y `/api/agendas` van SIN Auth0** (:607-612, :768); sin validación de tamaño. A NO replicar.
- **Stack moderno de verificación taxi (Fase 8, reutilizable como patrón):** `Taxis/driver-verification/` — `ExternalVerificationDialog.jsx` registra consultas oficiales **declaradas** (nunca las ejecuta: mismo principio de honestidad §12B que el módulo repartidores), con token Auth0 inyectado por prop `getToken` (:134-163); `LiveCaptureWizard.jsx` (16 pasos, máquina `idle→streaming→recording→preview→uploading→done/error` `:56-64`, reanudación por pasos completados `:130-151`, idempotencyKey por intento `:214`, `LinearProgress` `:263-267`, aviso de red lenta `:31`); `RiskAssessmentPanel.jsx` (UI informativa; el backend bloquea, `:16-19`).
- **Máquina de estados conductor en UI:** canónica en `services/driverVerification/mappers.js:6-16` (`DRIVER_STATUS_META`: draft, pending_documents, pending_appointment, pending_review, documents_rejected, approved, rejected, suspended, blocked), derivación por documento `:99-107`; espejo en `VerificationHeader.jsx:11-34`.
- **Wizard moderno huérfano (confirmado 0 referencias en Routes):** `FormPreRegisterForSteps.jsx` + `hooks/FormPreRegisterForSteps/*` (react-hook-form, draft dual localStorage+backend con merge por `updatedAt` `:241-258`, subida por paso `:423-424`).
- **Antipatrón a NO replicar (Fase A R17):** `driverDraftApi.js:5-10` — ninguna llamada lleva Bearer (solo cookie); el frontend taxi crea/edita `driver` directamente. El módulo repartidores NO lo hereda: todo muta por endpoints con policy.
- **Expedientes independientes:** el módulo usa sus propias entidades `delivery-*`; `driver`, `cars-*`, `Taxis/`, `Taxiz/` intactos (verificado por diff `7b4a83b..HEAD`: cero archivos taxi).

## 5. Consumo de APIs, cliente HTTP y errores (F0 §6)

- **`fetchJson`** (`utils/request.utils.js:11-35`): `credentials:'include'`, parse tolerante, mapeo 403 `Forbidden` → «Sesión expirada o sin permisos…» (:22-31) respetando el motivo específico de las policies (:26). Export `{ fetchJson, STRAPI_URL }`.
- **Servicios del módulo** (convención `services/<feature>/`, folder capital `Repartidor/`):
  - `repartidorService.js` — solicitante: coverage, waitlist (alta/baja), iniciar, `/me` GET/PATCH, vehicles, evidence (subida 2 pasos: `/api/upload` + registro por slot), training, submit. Streaming propio por `urlEvidenciaPropia` (:130) — **nunca** `/uploads` público (prueba Jest: `repartidorService.test.js`).
  - `revisionService.js` — revisor: cola (limit/start/status), detalle, cotejos, clasificación, correcciones, mark-video-eligible, zoom, aprobar/rechazar/suspender/revalidar/reabrir, evidencias por **blob efímero** (`abrirEvidencia` :119-130, `revokeObjectURL` al desmontar en `RepartidoresAgencia.jsx:77-80`). `federalService` (:134-148): casos + resolución.
  - **Contrato as-built consumido al 100%** (los 29 endpoints de `REPARTIDORES-MVP-CONTRATO-BACKEND.md` §4 están cableados).
- **`REACT_APP_STRAPI_URL`:** default `http://localhost:33032` (`request.utils.js:1`); ⚠️ defaults inconsistentes en el repo (1337 en `useProductsRestaurant`/`skydropxService`, `''` en otros) y `.env` local apunta a 1337 — gotcha de despliegue.
- **Patrones de subida (contraste con el módulo):** el más robusto del repo es `services/driverVerification/evidenceCapture.js` — `fetchWithTimeout` con AbortController (30 s/60 s, `:18-33`), Bearer Auth0, challenge+SHA-256 del cliente e `idempotencyKey` por intento (`:109-111`) — **ninguno usado hoy por el módulo** (sube con `fetch` sin timeout ni idempotencia; ver propuesta §12.5). La barrera cliente de tipo/tamaño ya existe como patrón reutilizable: `utils/preRegisterForSteps/fieldValidators.js:69-94` + `fileRules.js` (MIME `:85-87`, tamaño `:88-90`). `uploadFilesToStrapi` (`strapiHelpers.js:22-40`) queda descartado para flujos protegidos (sin Bearer/timeout/progreso).

## 6. Sistema de notificaciones (F0 §7)

- **`useNotifications()`** es el canal único (AGENTS.md): `toast.*` efímero local (notistack) / `send()` persistente. Socket ÚNICO con auth por token Auth0 en cada reconexión y `emit('register', {token, email})` — el backend valida y asigna room por email (`NotificationsContext.jsx:234-300`).
- **Notificaciones del módulo:** creadas **server-side** por el backend (tipo `delivery.status.changed`, link `/repartidor/estado`). El frontend no filtra por tipo (consume genérico vía `normalizeNotification.js:97`); el link navega a la vista de estado (`NotificationsMenu.jsx:158-184`).
- **Refresco de roles tras aprobación:** no hay listener por socket (decisión as-built documentada); `/repartidor/estado` refresca con `fetchRolesYMembresia(true)` al ver `approved` (`EstadoRepartidor.jsx:50-51`). Complementa, no sustituye, la denegación server-side.

## 7. Cowork real y su sección de verificaciones (F0 §8)

- **Sistema de tabs URL-driven** (URL manda sobre `?tab=` legacy, con redirect canónico `:316-325`): los **7 puntos** de integración de `repartidores` (verificados de primera mano): imports `:53-54` (DirectionsBikeIcon + componente), lista blanca `:93`, `rutaDeTab` `:126-127`, `tabDeRuta` `:169-170`, guard de rescate `:340-344` (verificador puro → conductores; resto → tareas-generales), `StyledTab` `:689-693` (icono DirectionsBike), render `:849-858` → `<RepartidoresAgencia />`; fuera de Coowork.jsx, el comentario de vistas válidas de la ruta genérica `/coowork/:vista` en `Routes/index.jsx:806-811` ya documenta `verificar-repartidores`.
- ⚠️ **Doble fuente de verdad (hallazgo F0):** el helper **con pruebas** `src/utils/cooworkRutas.js` NO conoce `'repartidores'` — `Coowork.jsx` duplica `rutaDeTab`/`tabDeRuta` inline (`:110-185`) y el módulo solo se añadió a la copia inline. Además divergen en los subtabs de socio (helper: 3→avance/4→pagos `:18-19,54-57` vs inline: 3→pagos sin caso 4 `:120-123`, con el sub-tab «Historial de Pagos» **inalcanzable por URL** — bug pre-MVP). Consecuencia: `cooworkRutas.test.js` pasa en verde sin reflejar la app real. Riesgo de deriva para cualquier pestaña futura.
- **Visibilidad (guardas opuestos, verificados):** `tienePermisoCRUD = isAdmin() || isSocio()` (`:268`) — socio/admin ven repartidores; el **verificador puro NO** (spec §8) y es expulsado a conductores; recíprocamente, **conductores es exclusivo del verificador puro** (un admin que abre `/coowork/verificar-conductores` por URL es redirigido, `:335-338`) — dos pestañas visualmente hermanas con roles opuestos. ⚠️ **el root puro tampoco ve repartidores** (brecha §0.4).
- **Sin dashboard paralelo** (spec §12F): es un tab junto a «Verificar Conductores»; la bandeja federal vive DENTRO del mismo tab para agencias `tipo==='federal'` (`:616-617`, `RepartidoresAgencia.jsx:544`). **No existía ninguna vista federal en Cowork pre-MVP** (verificado: el único rastro es `useAutocompletarAsignacion.jsx:27` para candidatos de toda la red); la Bandeja Federal del módulo es la primera vista federal del frontend.
- **Cola:** filtros por estado por Chips (9 valores, `:576-586`), tarjetas con resumen, diálogo de expediente `fullScreen` en móvil (`:626-639`, fix Fase E). Contraste con conductores: sin filtros, fetch inline sin `fetchJson` (`ConductoresAgencia.jsx:82-84`), refresco on-focus (:101-105).
- **Regresión conductores:** intacta — `'conductores'` sigue en lista blanca `:93`, `rutaDeTab` `:124-125`, `tabDeRuta` `:167-168`, guard `:335-338`, tab `:686-688`, contenido `:838-847`.

## 8. Agencias, membresías y federal (F0 §9)

- **Agencia:** el expediente guarda SU relación (`profile.agency`), nunca `user.agencia` del solicitante (Fase A R11). El revisor ve solo SU agencia (policy backend); root ve todas.
- **Federal:** `userData?.agencia?.tipo === 'federal'` controla la bandeja (`RepartidoresAgencia.jsx:544,616`) — cosmético; la seguridad real es `is-delivery-federal` (backend). Resolución de señales con decisión (`devolver_agencia|habilitar_aprobacion|mantener_bloqueo`) + hallazgo ≥10, en cascada por señal (`:486-516`) — limitación documentada.
- **Membresías:** la vigencia operativa del revisor la valida el backend (`membresia_vigente||verificado`, patrón `media-service.js:88-90`); el frontend no la usa para nada del módulo (correcto: no confiar filtros locales).

## 9. Wizard «Quiero repartir» — verificación paso a paso contra F3

| Paso F3 | As-built (verificado de primera mano) | Veredicto |
|---|---|---|
| 1. Estado | `QuieroRepartir.jsx:80-87` redirige resueltos a /estado, reanuda por `GET /me`; `EstadoRepartidor.jsx:97-112` caso «sin expediente» | ✓ |
| 2. Identidad | `StepIdentidad.jsx`: email de sesión prellenado :55, CURP enmascarada :93, contacto de emergencia opcional :96-111, reutilización INE explicada :114-118, sin verificaciones no confirmadas | ✓ |
| 3. Vehículo | `StepVehiculo.jsx`: 3 tipos con tarjetas :68-85, condicionales por tipo :106-161 (bici SIN placa/licencia; eléctrica potencia/velocidad + advertencia de clasificación :123; moto año/placa/licencia/vigencias), NIV opcional :100 | ✓ |
| 4. Evidencias | `StepEvidencias.jsx`: slots por identidad+vehículo, `accept` por tipo (:52), hint de límites (:42), «Reemplazar» (:51), solo estado adjuntado (sin URLs, sin "verificado") | ✓ con gaps §10.6-7 |
| 5. CLABE | `StepPago.jsx`: 18 dígitos numérico :60, enmascarada tras guardar :47-52, términos versionados `repartidores-mvp-v1` :88, sin fondos/sin membresía :41-45,80-84 | ✓ (link legal genérico §10.8) |
| 6. Capacitación | `StepCapacitacion.jsx`: 10 preguntas SIN respuestas correctas en cliente, calificación server-side :34, reintentos :78-82, ya aprobado → directo :52-69 | ✓ |
| 7. Resumen | `StepResumen.jsx`: faltantes del servidor :57-77, envío → estado real (:30-55, incluye `pending_federal_audit` con mensajería propia) | ✓ con gap §10.3 |
| 8. Seguimiento | `EstadoRepartidor.jsx`: 9 estados con mensaje (:14-24), faltantes, correcciones estructuradas :163-174, refresco de roles :50-51,69-79 | ✓ |

## 10. Brechas reales del as-built contra el checklist del Agente 2 (priorizadas)

| # | Brecha | Evidencia | Fase del checklist | Severidad |
|---|---|---|---|---|
| 1 | **FormularioCotejo sin opciones**: select «Documento a cotejar» vacío; `documentos_requeridos` no se pasa al formulario → la UI no puede registrar NINGÚN cotejo; el flujo no llega a `eligible_for_video_review` desde la UI | `RepartidoresAgencia.jsx:106,120-122,316-319` | F4 | 🔴 bloqueante |
| 2 | «Aprobar» renderizado y habilitado en `pending_review` (backend responde 409; F4 exige no mostrarlo habilitado con requisitos pendientes) | `RepartidoresAgencia.jsx:370-374` | F4 | alta |
| 3 | Sin confirmación expresa en acciones sensibles: aprobar/rechazar/suspender/reabrir del panel y «Enviar a revisión» del wizard | `RepartidoresAgencia.jsx:372,378,385,395`; `StepResumen.jsx:85-94` | F3.7/F4 | alta |
| 4 | Root puro sin pestaña ni acceso UI (backend lo autoriza; discrepancia con informe C-D y spec §8) | `Coowork.jsx:268,341,691` vs policy `is-delivery-reviewer` | F5/F6 | media |
| 5 | Sin UI de baja de lista de espera (el servicio `darDeBajaWaitlist` y el backend la soportan; F2.7 la exige) y sin reflejo de suscripción previa al recargar (`cobertura.waitlist` ignorado) | `repartidorService.js:68-71`; `StepCobertura.jsx:126-165` | F2 | media |
| 6 | Sin pre-validación client-side de tamaño de archivo (solo `accept` de tipos + texto; un archivo sobredimensionado se sube entero y el backend lo rechaza) | `StepEvidencias.jsx:42,52` | F3.4 | media |
| 7 | Sin % de progreso de subida (spinner indeterminado) | `StepEvidencias.jsx:51` | F3.4 | baja |
| 8 | Sin contadores por estado ni paginación visible en la cola (backend ofrece `total`/`start`/`limit`; solo hay filtros por chip) | `RepartidoresAgencia.jsx:576-586,595-614` | F4 | baja |
| 9 | «Pedir correcciones» rápido usa `document_id:'expediente'` genérico (el flujo fino por documento existe en la API) | `RepartidoresAgencia.jsx:399-410` | F4 | baja |
| 10 | Link del aviso de privacidad/convenio genérico (`ciudadan.org`), sin URL específica del texto legal | `StepPago.jsx:88-92` | F3.5 | baja (legal) |
| 11 | Stepper de 7 pasos denso en xs (documentado en Fase E; ajuste visual sin dispositivo real) | `QuieroRepartir.jsx:136-142` | F7 | baja |
| 12 | **Plataforma:** console.log del token Auth0 (`RolesContext.jsx:37-39`); PWA sin service worker, manifest con iconos inexistentes y Capacitor sin `server.url` (el APK exige rebuild+sync); defaults `REACT_APP_STRAPI_URL` inconsistentes; bug R16 de `ConductoresAgencia.jsx:107-111` (cadena trazada: acaba en el grid de Herramientas) | ver §3, §4, §11 | F7/plataforma | media (preexistente) |
| 13 | **Doble fuente de verdad de rutas de tabs:** el helper probado `utils/cooworkRutas.js` NO conoce `'repartidores'` y diverge de la copia inline de `Coowork.jsx` (:110-185) también en los subtabs de socio (helper 3→avance/4→pagos vs inline 3→pagos sin 4, con «Historial de Pagos» inalcanzable) — `cooworkRutas.test.js` pasa en verde sin reflejar la app real | `cooworkRutas.js:18-19,54-57`; `Coowork.jsx:120-123` | F1–F7 (deriva) | media |

**Nota de honestidad:** las brechas 1–3 no fueron detectadas en C/D porque las pruebas ejecutadas fueron build + suite backend, no e2e de UI (documentado como pendiente). Esta auditoría F0 es la primera verificación archivo-por-archivo de la superficie UI.

## 11. Estilos, accesibilidad, PWA y pruebas (F0 §10-11)

- **MUI v6 + sx** en todo el módulo: `Grid2 as Grid` + `size={{xs,sm,md}}` (`StepVehiculo.jsx:87-161`, `RepartidoresAgencia.jsx:119,325`), `Container maxWidth="sm"` para estados de error, `useMediaQuery(breakpoints.down('sm'))` + `fullScreen` en los 2 diálogos del revisor (`RepartidoresAgencia.jsx:68,542,87,626` — fix Fase E `3675bf7`). Sin MUI v4/react-bootstrap en código del módulo.
- **PWA (verificado — parcialmente roto, preexistente):** `manifest.json` enlazado (`index.html:27`) pero declara `logo192.png`/`logo512.png` que **no existen** en `public/` (solo `_logo192.png`) → el instalable falla en la mayoría de navegadores; `apple-touch-icon` apunta igualmente al inexistente (`index.html:22`). **No hay service worker** (`src/serviceWorker.js` eliminado; 0 registros). **Capacitor SIN `server.url`** (`capacitor.config.ts:4-6`, webDir `build`): el APK carga el bundle local embebido → cualquier cambio web exige rebuild + `npx cap sync` (no alcanza con reiniciar el servicio del frontend). Menores: `index.html lang="en"` pese a Spanish-first; theme-color `#000000` no refleja el branding real.
- **Accesibilidad (cuantificada):** **1 solo `aria-` en `Coowork.jsx` (:662); 0 en `RepartidoresAgencia.jsx`; 0 en todo `components/Repartidor/`** — tarjetas/chips clicables solo visuales, sin roles ni labels ARIA. Contraste no verificado formalmente (textos blancos 0.6–0.75 sobre fondos oscuros). Pendiente de QA en dispositivo real y con lector de pantalla.
- **Pruebas (inventario exacto por glob):** **24 suites pre-MVP** (`*.test.{js,jsx}`: App, geoUtils, labory, servidores, favoritosService, agregarTarea.helpers, cooworkRutas, cowork.helpers, geo, notifications.helpers, AgregarSocio, SocioEstatalEstado, SocioEstatalForm, SociosEstatalesMap, NotificationsContext, NotifToast, WikiApp, prelanzamiento, descargar, descargarForma, GeoNetworkMap, MembresiasDetalles, CrearBilleteraCentralWld, useCarteraUsuario) + **2 del módulo** (`services/Repartidor/repartidorService.test.js` 7 pruebas, `components/Repartidor/helpers.test.js` 7 — Fase E `3b17a7a`) = **26 suites**; suite completa en verde (exit 0) + build compila (1.52 MB). Backend: 176 pruebas / 168 pasan / 8 fallos preexistentes (verificado Fase E). **Gaps:** 0 pruebas de `Coowork.jsx`, `RepartidoresAgencia.jsx` y `ConductoresAgencia.jsx`; `cooworkRutas.test.js` no cubre `'repartidores'` (ver §7); `setupTests.js` = polyfills TextEncoder + stub global.fetch + jest-dom (sin mock de matchMedia/Auth0).
- **Convenciones:** Spanish-first, `@` alias → `src/`, carpeta `services/Repartidor/` capital vs `services/cowork/` minúscula, `Pages/Coowork/` y `Pages/CoWork/` coexisten, `components/Taxis/` vs `Taxiz/` **con archivos homónimos importados desde AMBOS** (`Routes/index.jsx:130-131` vs `:80,132,172-173`) — imports con casing EXACTO (CI Linux case-sensitive). **Dos esquemas de auth coexisten:** `REACT_APP_STRAPI_TOKEN` (API token, build-time, Taxiz legacy) ≠ token Auth0 (código nuevo); MUI v6 + v4 legacy + react-bootstrap conviven.

## 12. Propuesta de integración que preserva las interfaces actuales

1. **F1 (contrato):** ya consumido al 100% del as-built (`REPARTIDORES-MVP-CONTRATO-BACKEND.md`); no hay endpoints pendientes de acordar. Cualquier cambio backend → actualizar contrato + pruebas del servicio.
2. **F4 (fix bloqueante primero):** pasar `documentos_requeridos` a `FormularioCotejo` y renderizar `<MenuItem>` por documento (con estado ✓/✗ ya calculado); deshabilitar «Aprobar» fuera de `eligible_for_video_review` (mostrar tooltip con pendientes); añadir confirmación expresa (Dialog MUI, patrón ya usado en `VisorEvidencia`/`resolverDialog` de Coowork) para aprobar/rechazar/suspender y para «Enviar a revisión».
3. **F2:** añadir botón «Darme de baja» cuando el usuario ya está suscrito (detectado vía `cobertura.waitlist` o endpoint propio si el contrato lo añade — hoy `GET /coverage` no devuelve estado de suscripción por usuario; alternativa sin cambio de contrato: exponer el estado en el wizard tras alta exitosa en la misma sesión + baja con `POST /waitlist/unsubscribe` ya cableado).
4. **F5/F6 (decisión):** o bien extender `tienePermisoCRUD` con `isRoot()` solo para el tab `repartidores` (3 puntos, cambio mínimo), o dejar la convención global intacta y documentar que root opera por API. Recomendado: incluir root SOLO en el guard/tab/contenido de `repartidores` para no alterar el resto del Cowork.
5. **F3 (pulos):** pre-validación client-side de tamaño antes de subir (`file.size` vs 15/150 MB — reutilizar el patrón `fieldValidators.js:69-94`+`fileRules.js`, mensaje temprano), timeout e `idempotencyKey` por intento (patrón `evidenceCapture.js:18-33,109-111`, el más robusto del repo), barra de progreso con `XMLHttpRequest.upload.onprogress` (fetch no soporta progreso), contadores por estado en la cola (un `GET /agency/queue?status=X` por chip con `total`, o un solo pase sin filtro), paginación «cargar más» con `start`.
6. **Deriva de rutas (brecha #13):** al tocar cualquier tab, actualizar O unificar `utils/cooworkRutas.js` con la copia inline de `Coowork.jsx` y añadir `'repartidores'` a su prueba — hoy el helper probado miente sobre la app real. No copiar el patrón de subtabs de socio (su caso 4 está roto pre-MVP).
7. **F7:** e2e en entorno real (Auth0 + MySQL VPS + dispositivo físico), limpiar el console.log del token (plataforma, con aprobación aparte), pantalla de accesibilidad (0 `aria-` en el módulo: labels en chips/cards clicables como mínimo), screenshots §13. Recordatorio móvil: el APK de Capacitor carga bundle local — cualquier cambio visible en Android exige rebuild + `npx cap sync`.
8. **Preservación de interfaces:** los 4 archivos compartidos (`RolesContext`, `Routes`, `Ganar`, `Coowork`) solo reciben ediciones aditivas coordinadas; el tab de conductores y sus rutas quedan intactos (regresión verificada en §7).

## 13. Qué se puede reutilizar y qué necesita componente nuevo (resumen)

- **Reutilizado ya (verificado):** Auth0 provider + returnTo, `fetchJson`, `useNotifications`, RolesContext (patrón helper), Cowork router (6 puntos), `/api/upload` override, patrón blob efímero (equivalente honesto al streaming del módulo media 5B), notificaciones server-side con link.
- **Creado nuevo (correcto, no había equivalente):** wizard 7 pasos + estado, servicios del módulo, tab de revisión con cotejos §12B + clasificación normativa + Zoom + decisiones + bandeja federal, `isRepartidor`, etiquetas/helpers del módulo.
- **A NO reutilizar (antipatrones taxi):** `driverDraftApi` (escritura libre), URLs `/uploads`, navegación a rutas inexistentes (R16), monolito `PreRegistroConductor2` como plantilla.

---

*Auditoría F0 del Agente 2. No se modificó ningún archivo de código. Inventario y brechas listos para las fases F1+; el fix de la brecha #1 (FormularioCotejo) es el primer cambio propuesto de F4.*
