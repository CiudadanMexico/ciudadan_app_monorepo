# CIUDADAN — Informe de sesión: MVP de repartidores — Fase E (QA)

- **Fecha:** 22 de octubre de 2026
- **Rama:** `feature/backend-repartidores-mvp` (local; sin push — regla 3: no desplegar a producción)
- **Commits de esta sesión:**
  - `3b17a7a` — test(repartidores): Fase E — QA de criterios de aceptación no cubiertos (4 archivos, +898)
  - `3675bf7` — fix(repartidores): Fase E — diálogos del revisor a pantalla completa en móvil (1 archivo, +9/−2)
- **Estado del árbol al cierre:** limpio (`git status` sin cambios sin confirmar).
- **Especificación:** `D:\CiudadanMX\CIUDADAN_MVP_REGISTRO_REPARTIDORES_DANY.md` (fuera del repo), leída íntegra antes de actuar.

---

## 1. Fase y objetivo

**Fase E (QA, spec §11.E):** pruebas de seguridad, accesibilidad móvil, regresión taxi, roles múltiples, Auth0, funcionamiento PWA y expiración documental — ejecutando **todo lo que este entorno puede ejecutar de forma reproducible** (Windows local, mock de Strapi propio, sqlite) y documentando con exactitud qué exige entorno real (Auth0 vivo, MySQL del VPS, dispositivo físico) para no simular evidencia que no existe (regla 8/12 del prompt maestro).

Criterios de aceptación abordados: §10.14, §10.15, §10.20, §12E.8, §12E.13, §12E.14, §11.E (expiración documental) y la cobertura Auth0 de las dos policies del módulo.

## 2. Auditoría previa (regla 2 del prompt maestro) — estado real encontrado

Antes de crear archivos se verificó contra el código (no contra la documentación):

1. **Línea base backend:** 155 pruebas, 147 pasan, **8 fallos preexistentes** (`prelanzamiento.test.js` 1, `wiki-root-provider.test.js` 1, `wikiseed-sync.test.js` 6 — separadores de ruta Windows). Idénticos a los documentados en el informe A-B §6.
2. **Línea base frontend:** `npx craco build` compila (1.52 MB main). Jest: solo 11 archivos de prueba existentes, ninguno del módulo Repartidor.
3. **Regresión taxi (verificación estructural):** `git diff 7b4a83b..HEAD --name-only` (solo commits del MVP) **no toca ningún archivo taxi**: cero cambios en `components/Taxis/`, `components/Taxiz/`, `components/Taxis/driver-verification/`, `Cowork/ConductoresAgencia.jsx`, `api::driver.*` ni `cars-*`. Los únicos archivos compartidos del MVP son los 4 ya reportados en C/D (`RolesContext`, `Routes`, `Ganar`, `Coowork`). Nota: el diff contra `main` incluye historia heredada de `feature/frontend-daniel-sepulveda` (taxi/driver-launch) que NO es trabajo del MVP; el diff correcto del MVP arranca en `7b4a83b`.
4. **Cobertura de criterios (mapa prueba↔criterio):** tras las suites A-D quedaban **sin prueba directa**: los gates de aprobación `clabe`/`capacitacion`/`vehiculo`/`matriz_documental` en el acto de aprobar (solo `agencia_activa` y `senales_altas` tenían prueba), la expiración documental **entre etapas**, la semántica de frontera de vigencias, el aislamiento de tablas (§10.14), la inmutabilidad de historia tras correcciones (§12E.13), la revocación como **transición** (§10.20) y **ambas policies Auth0** (`is-delivery-reviewer`/`is-delivery-federal` — cero pruebas).
5. **Discrepancias/hallazgos detectados (documentados, no corregidos por estar fuera de alcance o ser decisiones de producto):**
   - **Vigencias se evalúan a medianoche UTC** (`requirements.js`: `new Date(fecha+'T00:00:00Z') < hoy`): un documento fechado "hoy (UTC)" ya cuenta como vencido en cuanto corre el reloj. **Conservador, falla hacia lo seguro** (nunca aprueba vencido); si producto quiere "válido hasta el final del día local", es un cambio de comportamiento con firma de producto.
   - **No hay re-evaluación automática de vigencias post-aprobación** (sin cron): la suspensión es un acto de revisor (spec §10.10). Las APIs operativas futuras (fuera de alcance del MVP) deben exigir rol **y** estado válido (spec §5 IMPORTANTE).
   - **PWA preexistente:** `manifest.json` presente pero **sin service worker registrado** (no hay `serviceWorker`/`workbox` en `src/`), y **`index.html`/manifest referencian `logo192.png`/`logo512.png` que no existen** en `public/` (están como `_logo192.png`) → 404 de icono. Hallazgo de plataforma, previo al MVP, no corregido.
   - **Wizard móvil:** el `Stepper` de 7 pasos con `alternativeLabel` queda denso en xs; se dejó intacto (ajuste visual sin verificación en dispositivo = riesgo; queda para QA en dispositivo real).
   - **`types/generated/*.d.ts`** no se regeneraron en esta sesión (no se arrancó Strapi; sin cambios de schema, no aplica).

## 3. Resumen de lo realizado

1. **Auditoría Fase E** (§2) con mapa de cobertura criterio↔prueba y 5 hallazgos documentados.
2. **11 pruebas de criterios de aceptación** (`tests/delivery-qa-fase-e.test.js`) sobre los servicios reales con el mock del módulo:
   - Cada uno de los **5 gates de aprobación** bloquea individualmente aunque el expediente ya esté en `eligible_for_video_review` (incluye: cotejo contradictorio **posterior** rompe la matriz — el ÚLTIMO cotejo por documento decide; moto con seguro vencido **entre etapas**; zoom `no_validado`).
   - **Expiración documental:** `marcar-video-eligible` re-evalúa vigencias (moto recién vencida → 400 y el expediente permanece en `pending_review`); frontera UTC fijada por prueba (vence mañana = vigente; vence hoy 00:00Z = vencido).
   - **§10.14:** el flujo completo de alta (moto: iniciar → datos → vehículo → examen → enviar → cotejos → video → zoom → aprobar) escribe **solo** `delivery-*` + `users` (merge del rol); el log de escrituras del mock prueba que ninguna tabla operativa (order/trip/cotización/wallet/pago/stripe/food) recibe escrituras, y las notificaciones van por el canal existente con `type='delivery.status.changed'` y `link='/repartidor/estado'`.
   - **§12E.13:** tras correcciones + reenvío, los eventos previos siguen con el mismo id/`review_version`/`action`/`result`; `review_version` queda 1..N sin huecos ni duplicados; la corrección es un evento nuevo (`corrections_requested`); `correction_requests` se limpia y los cotejos verificados sobreviven (la matriz sigue completa).
   - **§10.20:** socio con permiso vigente revisa; con `membresia_vigente=false` y `verificado=false` la siguiente acción da 403 inmediato; sin rol en `roles.extra` da 403; el **admin conserva el bypass** de vigencia (matriz vigente `can-calificar-tarea`) y deja huella.
   - **§12E.14:** primitiva del bloqueo optimista probada directamente (update condicional `{id, status:'eligible_for_video_review'}` devuelve `null` cuando el estado ya cambió) — la base real del 409 de doble aprobación.
   - Corrección durante el desarrollo: mi primera aserción de notificaciones usaba `tipo` cuando el canal existente recibe `type` (`notificar.js:20` mapea `titulo→title`, `tipo→type`); **el test estaba mal, el código no** — se corrigió la aserción.
3. **10 pruebas de policies Auth0** (`tests/delivery-policies-auth0.test.js`): camino real `Bearer → /userinfo (axios parcheado) → usuario por email → roles.extra → ctx.state.strapiUser` de las **dos policies del módulo**, incluyendo fail-closed (sin header, token rechazado por Auth0, email sin cuenta, sin rol, `/userinfo` sin email jamás se trata como usuario) y federal (local rechazado, federal pasa, root bypass, federal sin rol rechazado). Tokens únicos por prueba para no pisar el caché de 30 s de `auth0-verify`.
4. **14 pruebas frontend** (2 suites): contrato del cliente de API (`repartidorService` — Bearer en cada llamada, subida en **dos pasos** con FormData **sin** `Content-Type` manual, error de subida propagado, respuesta sin id rechazada, calificación jamás viaja del cliente, evidencias **solo por streaming autenticado**, nunca `/uploads` público) y la **guía UI clavada a la matriz del backend** (`SLOTS_POR_TIPO` = bici 4 sin documentos de moto / eléctrica = bici + motor / moto 10; los 9 estados con etiqueta) para que la deriva UI↔backend rompa la compilación de pruebas.
5. **Corrección QA de accesibilidad móvil** (riesgo #1 del informe C/D): los dos diálogos del revisor (`RepartidoresAgencia.jsx`) ahora son `fullScreen` bajo `sm` (`useMediaQuery` + `useTheme`, patrón MUI v6). Cambio aditivo de layout; sin tocar lógica, tokens ni streaming de evidencias.
6. **Verificaciones estáticas de privacidad/seguridad** (§9): grep del módulo frontend sin `localStorage`, sin `console.log` de datos, CLABE solo como `•••• last4`, CURP solo enmascarada; el visor de evidencias sigue usando blob efímero con `revokeObjectURL` al desmontar.

## 4. Archivos creados, modificados y eliminados

**Creados (4):**
- `ciudadan_backend_26/tests/delivery-qa-fase-e.test.js` (11 pruebas)
- `ciudadan_backend_26/tests/delivery-policies-auth0.test.js` (10 pruebas)
- `ciudadan_frontend/src/services/Repartidor/repartidorService.test.js` (7 pruebas)
- `ciudadan_frontend/src/components/Repartidor/helpers.test.js` (7 pruebas)

**Modificados (1):**
- `ciudadan_frontend/src/components/Cowork/RepartidoresAgencia.jsx` (+`useMediaQuery`/`useTheme` import, 2 hooks `esMovil`, `fullScreen={esMovil}` en los 2 diálogos)

**Eliminados:** ninguno. **Archivos compartidos tocados:** ninguno (el modificado es archivo propio del MVP creado en Fase D).

## 5. Endpoints, entidades, componentes y contratos afectados

- **Endpoints:** ninguno nuevo ni modificado — la Fase E es QA; los 29 endpoints del contrato (`docs/REPARTIDORES-MVP-CONTRATO-BACKEND.md` §4) quedan con su superficie probada (policies + controladores + servicios).
- **Entidades:** sin cambios de schema; sin migraciones.
- **Componentes:** `RepartidoresAgencia.jsx` (comportamiento responsive de 2 diálogos).
- **Contratos cubiertos ahora por prueba:** gates de `approve` (§5 del contrato), semántica de vigencias (UTC 00:00, conservadora), canal de notificaciones (`type`/`link`), cliente de API frontend (URLs, headers, dos pasos de subida, streaming), matriz documental backend↔guía UI.

## 6. Decisiones tomadas y su justificación (basada en código)

1. **Probar los gates por manipulación directa de filas del mock** (no por payloads): el único camino real a un expediente `eligible_for_video_review` con CLABE/zoom/capacitación rotos es la deriva de datos entre etapas (vencimientos, cambios externos); el mock lo simula y ejercita `recolectarGates` real (`revision-service.js:638-683`), que es lo que protege el acto de aprobar.
2. **Fijar por prueba la semántica de frontera UTC en vez de "corregirla":** el comportamiento vigente es conservador (nunca aprueba vencido); cambiarlo a "fin del día local" es una decisión de producto con riesgo de compliance, no un bug de QA. La prueba documenta la semantica y la protege de regresiones silenciosas.
3. **§10.14 por auditoría del log de escrituras del mock** (`escrituras` en `strapi-mock-repartidores.js`): es la única forma ejecutable localmente de probar "el alta no crea órdenes/cobros/entregas" contra el código real — cada `db.query`/`entityService` de los servicios pasa por ahí; la aserción exige que el conjunto de UIDs escritos sea subconjunto de las 6 entidades del módulo + `users`.
4. **Policies Auth0 con axios parcheado + tokens únicos:** `auth0-verify.js` llama `axios.get` en tiempo de llamada (no destructurea) y cachea por token 30 s; parchear `axios.get` en el proceso de la prueba con tokens distintos ejercita el camino real (`getAuth0Email` → `/userinfo`) sin red ni Auth0 vivo. Es la prueba más cercana a Auth0 posible sin credenciales reales.
5. **fullScreen móvil solo en los diálogos del revisor:** el riesgo denso documentado en C/D apunta al diálogo de expediente y al visor de evidencias; el Stepper del wizard se dejó intacto porque ajustar su visual sin dispositivo real sería a ciegas (documentado en §2.5).
6. **La corrección de la aserción de notificaciones fue en el test:** `notificar.js:20` envía `type` al canal existente; mi primera versión del test usaba `tipo`. El informe lo consigna explícitamente para no reportar como bug del código lo que fue bug de la prueba.

## 7. Pruebas ejecutadas, comandos y resultados reales

Ejecutadas en `ciudadan_backend_26/` y `ciudadan_frontend/` (Windows local):

| Comando | Resultado |
|---|---|
| `npm test` (backend, LÍNEA BASE antes de cambios) | 155 pruebas, **147 pasan, 8 fallan** (los 8 preexistentes documentados) |
| `node --test tests/delivery-qa-fase-e.test.js tests/delivery-policies-auth0.test.js` (1ª corrida) | **20/21** — 1 fallo por aserción errónea del test (`tipo` vs `type` en notificaciones); corregida la aserción |
| `node --test tests/delivery-qa-fase-e.test.js tests/delivery-policies-auth0.test.js` (final) | **21/21 pasan** |
| `npm test` (backend, FINAL con las 21 nuevas) | **176 pruebas, 168 pasan, 8 fallan — exactamente los 8 preexistentes** (`prelanzamiento` 1, `wiki-root-provider` 1, `wikiseed-sync` 6). Cero regresiones |
| `CI=true npx craco test --watchAll=false --testPathPattern Repartidor` (frontend, nuevas) | **2 suites, 14/14 pasan** (33.9 s) |
| `CI=false DISABLE_ESLINT_PLUGIN=true npx craco build` (línea base y tras el fix móvil) | **Compila, exit 0** (1.52 MB main; sin cambios de tamaño relevantes) |
| `CI=true npx craco test --watchAll=false` (suite frontend COMPLETA con las nuevas) | **Exit 0 — todas las suites en verde**, incluidas las 2 nuevas del módulo (Jest aborta con exit ≠ 0 ante cualquier fallo) |

**Verificaciones estáticas ejecutadas:**
- `git diff 7b4a83b..HEAD --name-only` → el MVP no toca archivos taxi (ver §2.3).
- Grep de privacidad del módulo frontend: sin `localStorage`, sin logs de datos, CLABE/CURP solo enmascaradas (§3.6).
- Inspección PWA: `manifest.json` + `capacitor.config.ts` presentes; **sin service worker**; iconos 192/512 inexistentes (preexistente, §2.5).

**Pruebas propuestas, NO ejecutadas (requieren entorno no disponible en esta máquina):** e2e con tokens Auth0 reales + MySQL del VPS, navegación en dispositivo físico (Android/Capacitor) y screenshots de registro móvil/panel de aprobación (§13 de la spec), regresión visual del tab de conductores junto al nuevo en navegador real, expiración documental con reloj real en operación continua. No se afirma que hayan pasado.

## 8. Riesgos y limitaciones

1. **Las pruebas nuevas son de mock/harness:** ejercitan policies, controladores y servicios reales, pero no el arranque de Strapi ni el cableado real de rutas→policies con HTTP. Ese cableado quedó verificado en Fase B (arranque sqlite + 403/404 reales) y **no se tocó desde entonces** (`git diff 3814ff6..HEAD` sobre `src/policies` y `routes/` = solo la adición de Fase D, previa a HEAD~2).
2. **Expiración en operación continua:** sin cron, un expediente `approved` no se re-evalúa cuando su licencia/seguro vence después. Decisión de producto abierta (documentada en §2.5); mitigación vigente: suspensión/revalidación por revisor + gates re-evaluados en cada acto de aprobación.
3. **Frontera UTC de vigencias** (§2.5): conservadora; puede rechazar prematuramente un documento que vence "hoy" por algunas horas. Aceptable para compliance; pendiente decisión de producto si se quiere semántica de fin de día local.
4. **La bandeja federal resuelve señales una por una** y **rate-limit in-memory single-instance**: limitaciones documentadas en informes previos, sin cambios.
5. **Riesgos de plataforma preexistentes NO tocados:** 🔴 blob ofuscado en `middleware/src/routes/auth0.js:56`; URLs estáticas de `/uploads`; `SOCKET_PORT` desalineado; iconos PWA 404 (§2.5).
6. **QA móvil real pendiente:** el `fullScreen` es la corrección estándar MUI, pero sin dispositivo real no se puede afirmar usabilidad en pantalla chica.

## 9. Pendientes concretos

- **QA en entorno real (pendiente de la Fase E):** e2e Auth0+MySQL del VPS, dispositivo físico Android (Capacitor), screenshots de §13, regresión visual del tab de conductores, expiración documental con reloj real.
- **Producto:** semántica de frontera de vigencias (UTC vs fin de día local), re-evaluación post-aprobación (cron o check en APIs operativas), excepción Zoom (§12D) y obligatoriedad del contacto de emergencia (§4.1) — decisiones ya documentadas en A-B.
- **Plataforma (fuera de alcance):** aislar el blob de `middleware/src/routes/auth0.js:56`, proveedor de upload privado/firmado, `SOCKET_PORT`, iconos PWA (`logo192.png`/`logo512.png` faltantes en `public/`), reincorporar esqueletos `food-shipping-quote`/`food-tarifa` en cuarentena.

## 10. Conflictos o dependencias para el otro agente

- **Cero archivos compartidos modificados** en esta sesión; el único archivo de producción tocado (`RepartidoresAgencia.jsx`) es propio del MVP (Fase D). Revisar `git log -p 3675bf7` antes de editar ese archivo en paralelo.
- Las 4 suites nuevas son aditivas; el helper mock (`tests/helpers/strapi-mock-repartidores.js`) no se tocó.
- El frontend de adrian1 sirve build estático: para ver el `fullScreen` móvil hay que recompilar (`CI=false DISABLE_ESLINT_PLUGIN=true npx craco build`) y reiniciar `ciudadan-frontend.service` (runbook `docs/deploy-adrian1-local.md`).
- Sin push a `main`; sin despliegue.

## 11. Commits, rama y estado del árbol

- **Rama:** `feature/backend-repartidores-mvp` (local).
- **Commits de Fase E:** `3b17a7a` (pruebas, +898) y `3675bf7` (fullScreen móvil, +9/−2); este informe se consigna en el commit docs correspondiente.
- **Estado del árbol al redactar este informe:** limpio.
- **Historia completa del MVP:** `8999718` (A) → `d8d8fe2` (B) → `e2e6d28` (C) → `3814ff6` (D) → `8274d57` (informe C-D) → `0cadb06` (B1+B7) → `3b17a7a` (E pruebas) → `3675bf7` (E fix móvil) → este informe.

## 12. Instrucciones exactas para retomar el trabajo

1. `cd D:\CiudadanMX\ciudadan_app_monorepo && git checkout feature/backend-repartidores-mvp && git log --oneline -5` (esperado: el docs de Fase E, `3675bf7`, `3b17a7a`, `0cadb06`, `8274d57`).
2. Verificación rápida de no-regresión: `cd ciudadan_backend_26 && npm test` → **168/176** (los 8 fallos son preexistentes, ver §7); `cd ciudadan_frontend && CI=true npx craco test --watchAll=false` → exit 0, todas las suites en verde (incluidas las 2 nuevas del módulo); `CI=false DISABLE_ESLINT_PLUGIN=true npx craco build` → compila.
3. **QA en entorno real (siguiente paso de Fase E):** arrancar backend contra MySQL del VPS (o sqlite local `$env:DATABASE_CLIENT='sqlite'; npm run develop`), frontend con Auth0 real, y recorrer: `/gana` → «Repartiendo» → wizard completo → envío; como socio en `/coowork/verificar-repartidores`: cotejos con fuente, clasificar eléctrica, Zoom, aprobar; verificar rol en `/repartidor/estado` + `isRepartidor()`; probar en Android real (Capacitor) el wizard y el panel con los diálogos ahora `fullScreen`; capturar las evidencias visuales de §13.
4. Mantener las reglas: no conceder `repartidor` fuera de `revision-service.otorgarRolRepartidor`; no mezclar con operación de entregas; no publicar CURP/CLABE/evidencias; no declarar verificado lo que solo se miró; informar por fase con commits reales.

---

*Informe de la Fase E. Con esto, el alcance A-E del MVP queda implementado y probado hasta donde este entorno permite; lo restante está enumerado en §9 con su motivo. Fase A: 8999718 · B: d8d8fe2 · C: e2e6d28 · D: 3814ff6 · B1/B7: 0cadb06 · E: 3b17a7a + 3675bf7 + este informe.*
