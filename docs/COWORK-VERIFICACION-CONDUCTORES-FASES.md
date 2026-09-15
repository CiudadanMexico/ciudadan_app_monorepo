# CoWork — Cambios requeridos por "Verificación de Conductores y Vehículos v2"

Fuente: `docs/Verificacion_Conductores_v2.docx`. Ese documento especifica un protocolo
completo para el módulo de **Taxis** (captura de evidencia, GPS, hash, consultas
oficiales INE/REPUVE/licencias, auditoría). El 90% de ese documento no toca CoWork.

Este archivo cubre **únicamente los 2 puntos que sí tocan CoWork**, ya confirmados
sección por sección contra el documento completo (ver análisis en el hilo de trabajo):

1. Rol nuevo `auditor`, independiente del rol `verificador`.
2. Reputación (`trust_score`) de agencia y de verificador.

Todo lo demás (protocolo de captura, `external-verification`, `cars-validation`,
etc.) es responsabilidad del módulo Taxis y no se lista aquí.

---

## Qué SÍ hará CoWork

- Reconocer `auditor` como un rol válido de usuario (`roles.extra`), con su
  propia policy de backend y su propio `isAuditor()` en el frontend.
- Dar a un usuario con rol `auditor` un punto de acceso propio dentro del panel
  de CoWork (tab/vista separada de la de `verificador`, admin o socio).
- Validar la identidad de quién está autenticado — incluyendo, si se decide así,
  que el `auditor` de un caso no sea la misma persona que el `verificador` de
  ese caso (la comparación de ids; el dato de "quién verificó" vive en Taxis).
- Almacenar en `agencia` los campos de reputación (`trust_score`,
  `total_verifications`, `conforming`, etc.) — es el dueño de esa entidad.
- Exponer esos campos en modo **solo lectura** vía la API pública existente de
  `agencia`.
- Bloquear que cualquier usuario (incluida la propia agencia) escriba su propio
  `trust_score` a través de un endpoint público de CoWork.
- Mostrar la reputación de la agencia en la UI existente (`Agencia.jsx` /
  `/herramientas/mi-agencia`).

## Qué NO hará CoWork

- **No** captura evidencia (fotos, video, GPS, hash) — eso es 100% frontend/
  backend de Taxis (`cars-evidence`, `captureService`).
- **No** implementa el protocolo de nonce/challenge, ni las entidades
  `cars-validation`, `cars-validation-event` o `external-verification`.
- **No** integra ni consulta INE, REPUVE ni portales estatales de licencias.
- **No** define ni ejecuta el checklist físico del verificador, ni el flujo
  paso a paso de la verificación presencial.
- **No** calcula el algoritmo de riesgo (`risk_score`) ni decide cuándo un caso
  pasa a revisión — esa lógica vive en Taxis.
- **No** calcula el algoritmo del `trust_score` en sí — CoWork solo **almacena**
  el resultado que Taxis calcula y envía; no decide las reglas de negocio de
  cuánto vale cada evento.
- **No** define el contenido de las pantallas de auditoría (lista de casos,
  formulario de resultado, items revisados) — CoWork solo da acceso al tab; el
  contenido real lo sirve Taxis, igual que ya pasa hoy con
  `ConductoresAgencia.jsx` → `DriverVerificationPage.jsx`.
- **No** implementa detección de colusión, muestreo de auditoría, doble
  auditoría/escalamiento ni re-verificación física — todo eso es lógica y
  entidades de Taxis, aunque use `agencia`/roles de CoWork como referencia.

---

## Modelo de negocio (el porqué)

**Rol auditor:**
- La confianza del sistema no debe depender de una sola persona. El verificador hace
  el trabajo en campo; el auditor lo revisa después, de forma independiente.
- Regla dura: **el verificador nunca puede auditar su propio trabajo.**
- La frecuencia de auditoría depende del perfil de riesgo (config de negocio, no
  código fijo): verificador nuevo ~20% de sus casos, estable ~5%, con anomalías
  30%+, caso crítico 100% o doble auditoría con escalamiento a un tercero si dos
  auditores no coinciden.

**Reputación de agencia/verificador (`trust_score`):**
- Cada verificador y cada agencia acumulan un historial verificable: cuántas
  verificaciones hicieron, cuántas fueron auditadas, cuántas resultaron conformes
  vs. con inconsistencias, cuántas terminaron en re-verificación.
- Ese historial sirve para decidir a quién auditar más seguido y para detectar
  colusión (agencias que se "aprueban" mutuamente de forma sospechosa).
- Regla dura: **nadie edita su propio `trust_score`** — se calcula solo, a partir
  de eventos reales que dispara Taxis, nunca a mano ni desde el frontend.

---

## Fase 1 — Rol `auditor`: fundamentos de backend

**Objetivo:** que el sistema de roles de CoWork reconozca `auditor` como un rol
válido, igual que ya reconoce `admin`/`socio`/`verificador`.

- [x] Agregar `auditor` como valor válido dentro de `roles.extra` (JSON en
      `up_users`). No requiere migración de schema — es un array libre.
- [x] Crear policy `ciudadan_backend_26/src/policies/is-auditor.js` (patrón
      idéntico a `is-verificador.js`: valida token Auth0, busca `roles.extra`,
      deja `ctx.state.strapiUser`; permite `admin` + `auditor`).
- [ ] Crear policy `is-not-self-verifier.js` (o incorporar la regla dentro de los
      endpoints de auditoría de Taxis): valida que `ctx.state.strapiUser.id` no
      sea el mismo que el `reviewer`/`verifier` del `cars-validation` que se está
      auditando. **Nota:** el dato que se compara vive en Taxis; la policy solo
      necesita conocer el id del usuario autenticado, que sí es de CoWork. **No
      implementada todavía** — depende de que exista el endpoint de auditoría en
      Taxis contra el cual validar.
- [x] Prueba directa contra la base de datos: usuario con `roles.extra:
      ["auditor"]` pasa el check de permiso; usuario sin ese rol lo falla.

**Depende de:** nada. Es la base de todo lo demás.

---

## Fase 2 — Rol `auditor`: acceso y UI en CoWork

**Objetivo:** que un usuario con rol `auditor` (y sin admin/socio) tenga su propio
punto de entrada en el panel de CoWork, separado del de verificador — el documento
exige explícitamente *"separar verificador de auditor"* en la interfaz.

- [x] Agregar `isAuditor()` a `ciudadan_frontend/src/Contexts/RolesContext.jsx`
      (mismo patrón que `isVerificador()`).
- [x] En `Coowork.jsx`: `soloAuditor = isAuditor() && !tienePermisoCRUD && !soloVerificador`,
      nuevo `StyledTab` (`value="auditorias"`, ícono `FactCheckIcon` — ícono
      provisional elegido por el desarrollador, pendiente de que el equipo
      confirme uno definitivo, igual que el de verificador).
- [ ] Definir si un usuario puede tener **ambos** roles (`verificador` + `auditor`)
      a la vez. El documento sugiere que no debería (son personas distintas para
      garantizar independencia), pero el sistema de roles actual no impone
      exclusión mutua entre valores de `roles.extra`. **Pendiente de decisión de
      negocio:** ¿se bloquea a nivel de UI/backend que un mismo usuario tenga los
      dos roles, o se confía en que el equipo no los asigne juntos? (Por ahora, si
      alguien tuviera ambos, `Coowork.jsx` prioriza la vista de verificador.)
- [x] Componente placeholder `components/Cowork/Auditorias.jsx` — honesto sobre
      que el listado real de casos depende de un endpoint de Taxis que todavía
      no existe. El contenido real de la pantalla (lista de casos, formulario de
      resultado) sigue pendiente de Taxis; CoWork ya deja listo el tab/gate de
      acceso, igual que hace hoy con `ConductoresAgencia.jsx` para verificador.

**Depende de:** Fase 1. También depende de que Taxis tenga listo al menos un
endpoint que devuelva "casos pendientes de auditar" para poder enlazar el tab a
algo real (coordinar con quien lleve Taxis).

---

## Fase 3 — Reputación de agencia: modelo de datos

**Objetivo:** que `agencia` pueda almacenar sus métricas de confianza.

- [x] Agregar campos al schema `ciudadan_backend_26/src/api/agencia/content-types/agencia/schema.json`:
      `total_verifications` (integer), `total_audited` (integer), `conforming`
      (integer), `inconsistencies` (integer), `critical_findings` (integer),
      `reverifications` (integer), `trust_score` (decimal), `trust_algorithm_version`
      (string).
- [x] Regenerado al arrancar Strapi. Verificado contra la base real: los
      registros existentes quedan con estos campos en `null` (no en `0`) hasta
      que algo los escriba explícitamente — por eso el endpoint de lectura
      (Fase 4) hace fallback a `0` en vez de asumir el default del schema.
- [ ] **Pendiente de decisión:** ¿estas métricas van también en `up_users` para
      el verificador individual (el documento pide reputación de "verificador
      Y agencia"), o solo se modela en `agencia` y la del verificador se calcula
      al vuelo desde eventos de Taxis sin persistirse en CoWork? El documento no
      lo aclara para el lado del usuario — solo dice que la entidad `agencia`
      debe tenerlas.

**Depende de:** nada (es un cambio de schema aislado), pero el *llenado* de estos
campos depende de que Taxis dispare las auditorías (Fase 5).

---

## Fase 4 — Reputación de agencia: exposición de solo lectura

**Objetivo:** que estos datos se puedan consultar, nunca modificar, desde fuera.

- [x] Confirmado en `routes/agencia.js`: solo `find`/`findOne` tienen `auth:false`;
      `create`/`update`/`delete` conservan el auth nativo de Strapi, inalcanzable
      con tokens Auth0 — no hay ruta de escritura pública, no hizo falta tocar
      nada para esto.
- [x] Los campos de reputación ya se exponen (solo lectura) dentro del objeto
      `agencia` que devuelve `GET /api/agencias/mi-agencia/socios`
      (`miembros-agencia.js`), bajo la clave `reputacion`.
- [ ] Si se requiere que **solo** un proceso interno de Taxis pueda escribir estos
      campos (nunca un usuario vía API pública), agregar una policy o lifecycle
      hook en `agencia` que rechace cualquier `PUT`/`PATCH` a esos campos que no
      venga del token de servicio interno que use Taxis. **Pendiente de decisión:**
      ¿Taxis va a llamar a un endpoint de CoWork para actualizar esto, o va a
      escribir directo a la tabla `agencias` vía su propio acceso a la misma base
      de datos Strapi? Esto define si hace falta un endpoint nuevo en CoWork o no.

**Depende de:** Fase 3. Bloquea la Fase 5 hasta que se resuelva el pendiente de
decisión (endpoint vs escritura directa).

---

## Fase 5 — Contrato de integración con Taxis

**Objetivo:** dejar claro y documentado cómo Taxis va a alimentar estos datos,
ya que la lógica de cuándo/cómo se actualiza el `trust_score` vive en Taxis, no
en CoWork.

- [ ] Documentar (junto con quien lleve Taxis) el evento o endpoint exacto que se
      dispara cuando una auditoría se completa (`audit_completed` según el
      documento) y qué campos de `agencia` debe actualizar.
- [ ] Decidir si el cálculo del `trust_score` (el algoritmo) vive en CoWork o en
      Taxis. Recomendación: que Taxis calcule el score y solo *escriba* el
      resultado final en `agencia.trust_score` — así CoWork no necesita conocer
      las reglas de negocio de auditoría de Taxis, solo almacenar el resultado.
- [ ] Versionar el algoritmo (`algorithm_version`) desde el día uno para poder
      recalcular históricos si las reglas de riesgo cambian (el documento pide
      esto explícitamente: *"los pesos son parámetros iniciales... deben
      calibrarse... y versionarse"*).

**Depende de:** Fase 3 y 4. Depende fuertemente de decisiones que debe tomar
quien lleve el módulo de Taxis, no es algo que CoWork resuelva solo.

---

## Fase 6 — UI: mostrar la reputación

**Objetivo:** que la reputación sea visible para quien deba verla.

- [x] `Agencia.jsx` (ruteada en `/herramientas/mi-agencia`) reescrita: antes
      tenía una agencia "cdmx" hardcodeada (prototipo viejo, `useAgencia.jsx`,
      ahora sin ningún importador). Se cambió a resolver la agencia real del
      usuario autenticado vía `getMiembrosAgencia` (mismo endpoint que ya usa
      `AgregarSocio.jsx`), y se agregó la tarjeta de reputación (verificaciones,
      auditadas, conformes, inconsistencias, hallazgos críticos,
      re-verificaciones, trust score) más la lista de miembros.
- [ ] **Pendiente de decisión:** ¿quién puede ver el `trust_score` de una agencia?
      ¿Solo admin/socio de esa misma agencia, o es público entre agencias (para
      que se pueda auditar visualmente el fenómeno de colusión que menciona el
      documento)? El documento no lo especifica para el lado de UI, solo para el
      cálculo.
- [ ] Si se decide mostrar reputación individual del verificador, definir dónde
      (¿en `Perfil.jsx`? ¿en una vista nueva de "mi desempeño"?) — no hay página
      de perfil de socio/verificador dedicada hoy más allá del `Perfil.jsx`
      genérico de usuario.

**Depende de:** Fase 3-5 (necesita datos reales que mostrar).

---

## Fase 7 — Pruebas y cierre

- [ ] Prueba de acceso **visual** (clicks reales en navegador): un usuario con
      solo `auditor` ve el tab de auditorías y no ve Herramientas/Agregar
      Socio/Verificar Conductores. **No se pudo hacer** — mismo bloqueo de
      siempre: el login de Auth0 sigue roto en este entorno local para probar
      con una cuenta que no sea la propia. Sí se verificó la lógica de acceso
      por código (`soloAuditor` en `Coowork.jsx`) y por datos reales (punto
      siguiente).
- [ ] Prueba de exclusión: un intento de auditar un caso donde el auditor
      asignado es el mismo verificador debe rechazarse. **Bloqueada** — depende
      de que exista el endpoint de auditoría en Taxis contra el cual probar.
- [x] Prueba de integridad: confirmado por código que ningún endpoint público
      de `agencia` permite `create`/`update`/`delete` (solo `find`/`findOne`
      son públicos en `routes/agencia.js`).
- [x] Prueba de extremo a extremo con datos reales: script temporal contra la
      base real — campos de reputación, fallback a `0`, shape de
      `miembros-agencia.js`, y lógica de permiso de `is-auditor` (auditor pasa,
      no-auditor no pasa). Limpiado después de correr.
- [x] Documentación actualizada: `docs/01-Arquitectura.md` (rol `auditor` +
      policy `is-auditor` en la tabla de policies) y
      `docs/02-BaseDeDatos-Strapi.md` (campos nuevos de `agencia`). No se tocó
      `docs/DATABASE-SCHEMA.md` porque ese archivo es auto-generado y solo
      documenta relaciones, no campos escalares como los de reputación — no es
      el lugar correcto para este cambio. Tampoco se tocó `docs/DOC_COOWORK.md`
      por ser tus apuntes personales, no documentación de arquitectura.

---

## Resumen de pendientes de decisión (no son tareas técnicas, son preguntas para el equipo)

1. ¿Un usuario puede tener `verificador` y `auditor` al mismo tiempo, o se
   bloquea explícitamente?
2. ¿La reputación individual del verificador se persiste en CoWork (`up_users`)
   o solo se calcula al vuelo desde eventos de Taxis?
3. ¿Taxis actualiza `agencia.trust_score` vía un endpoint de CoWork, o escribe
   directo a la base de datos compartida?
4. ¿Quién puede ver el `trust_score` de una agencia — solo la propia, o es
   visible entre agencias?
5. Ícono para el rol `auditor` en la UI (mismo pendiente que quedó abierto para
   el ícono de `verificador` — Ciudadan Mex iba a mandarlos).
