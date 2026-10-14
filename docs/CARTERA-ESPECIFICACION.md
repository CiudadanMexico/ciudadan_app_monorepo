# Cartera Ciudadan — Especificación maestra

**Bloque 1 de 8 — base, contenido y navegación**
**Rama:** `feature/agente1-adrian-cartera-integral`
**Versión del contenido editorial:** 1.0.0 · **Fecha de revisión:** 2026-10-14
**Estado del bloque:** entregado (sin simuladores, sin movimientos de dinero, sin
emisión de instrumentos, sin recompra, sin préstamos de objetos ni votaciones).

---

## 1. Para qué sirve este documento

Es la especificación maestra de la Cartera. Aquí queda:

- lo que **funciona hoy**,
- el **diseño acordado que todavía no está implementado**, y
- los **parámetros pendientes** de definición.

Se complementa con `docs/CARTERA-PENDIENTES-BLOQUES.md` (pendientes por bloque).

**Regla central: NO INVENTAR.** Este documento no contiene cifras, fórmulas,
derechos, saldos, rendimientos, autorizaciones, contratos, enlaces ni estados
operativos que no existan. Cuando algo no está definido, se declara como
pendiente en lugar de rellenarse.

---

## 2. Diagnóstico de la base (verificado antes de editar)

La Cartera **ya existía** en `main` (commit `27ff854`,
*"feat(wallet): tunning de Cartera, fichas y desplegables de tokens, TodoToken y
placeholders"*). No partíamos de cero: el trabajo de este bloque fue **corregir,
ampliar y documentar** lo existente.

### 2.1 Lo que ya funcionaba (y se conserva)

| Archivo | Función |
|---|---|
| `src/Pages/Cartera/Billetera.jsx` | Shell de la Cartera + deep-link `/cartera/:moneda` |
| `src/Pages/Cartera/tokenConfig.js` | Configuración central de fichas |
| `src/Pages/Cartera/tokenContent.js` | Textos largos de cada ficha |
| `src/Pages/Cartera/TokenAction.jsx` | CTA de la ficha |
| `src/Pages/Cartera/TokenDetails.jsx` | Bloque desplegable de la explicación |
| `src/Pages/Cartera/TokenPanel.jsx` | Paneles de datos reales |
| `src/Pages/Cartera/TokenEvaluation.jsx` | Evaluaciones reales del usuario |
| `src/Pages/Cartera/TokenSkills.jsx` | Habilidades reales del usuario |
| `src/Pages/Cartera/CrearCarteraPage.jsx` | Creación de wallet |
| `src/Pages/Cartera/ITokens.jsx` | Catálogo de I-Tokens |
| `src/components/Cartera/TokenPlaceholderPage.jsx` | Placeholder de secciones |
| `src/Pages/Identidad.jsx`, `Objetos.jsx`, `Votaciones.jsx` | Marcadores de posición |

### 2.2 Hallazgos que este bloque corrige

1. **`/cartera/cit` era un enlace roto.** `src/components/Ganar/Ganar.jsx:145`
   enlazaba a `/cartera/cit`, pero `findTokenByParam` no resolvía ese slug: la
   app redirigía **en silencio** a `/cartera`. Ahora `cit` es alias de la ficha.
2. **No existía ficha de PROOF.** Sólo había TaskToken y TodoToken. Las
   resoluciones no tenían nombre propio.
3. **La equivalencia Labory→MXN encabezaba el panel de Pesos** y se leía como un
   saldo en pesos. Ahora está rotulada como referencia informativa y separada de
   cobrado / pendiente / simulación.
4. **Esquema editorial incompleto:** 5 secciones, sin "Mi actividad", "Acciones",
   "Reglas y transparencia", "Saber más" ni versión/fecha.
5. **PUBLIA tenía CTA "Ver anuncios remunerados"** en lugar de la acordada
   "Comprar Labory".

---

## 3. Arquitectura real de la wiki (verificada)

**La wiki NO es Strapi.** Verificado en el código:

- **Contenido:** archivos `.md` en disco.
- **Servidor:** `ciudadan_backend_26/socket-service/routes/WikiRouter.ts`,
  montado en `{REACT_APP_SOCKET_URL}/wiki/{seccion}/{ruta}`.
- **Secciones válidas:** `main`, `help`, `faq` (validadas por
  `validateSection`).
- **Raíz física**, con esta precedencia (`config/WikiRootProvider.ts`):
  1. `site-setting.wikis_path` leído de Strapi (`GET /api/wiki/public-config`),
  2. `WIKI_ROOT_PATH` (.env),
  3. default de plataforma.
- **Frontend:** `src/services/wikiService.js` (`getDocument`, `getSectionTree`,
  `search`) y rutas `/wiki`, `/wiki/main`, `/wiki/help`, `/wiki/faq`,
  `/wiki/:slug`.
- **Fuente versionada:** `wikiseed/{main,help,faq}/*.md`, publicada al destino
  vivo con `node wikiseed/sync-wikis.js` (no borra nada del destino).

El único punto donde Strapi toca la wiki es
`src/api/site-setting/controllers/wiki.js`, que **solo expone la ruta del path**
(`public-config`), no el contenido.

### 3.1 Integración elegida (mínima, sin duplicar contenido)

- **Capa de consumo reutilizable:** `src/hooks/useWikiDocumento.jsx`, sobre el
  `wikiService` que ya existe. **Sin dependencias nuevas.**
- **Componente:** `src/components/Cartera/TokenSaberMas.jsx`, con **carga
  perezosa** (solo pide el documento al abrir "Saber más").
- **Contrato:** cada ficha declara sus documentos por **clave** en
  `tokenContent.js` (`wiki: ['carteraLabory', …]`), resueltos contra
  `WIKI_REFERENCIAS`. No hay rutas escritas a mano en cada ficha.
- **Fuente versionada:** 11 documentos en `wikiseed/help/cartera*.md`.

**No se migró ni sustituyó la wiki.** No se expone contenido en borrador.

### 3.2 Estado honesto de la conexión

> **Las dos superficies NO están sincronizadas automáticamente.**
> Este repo contiene la **fuente** (`wikiseed/` + `tokenContent.js`) y el
> **contrato** de integración. La wiki **viva** sólo tiene un documento después
> de sincronizarlo contra el destino configurado.

**Lo que falta exactamente para publicar en la wiki viva** (una sola vez, o
cuando cambie el contenido):

```bash
node wikiseed/sync-wikis.js          # copia lo que falte o cambie
node wikiseed/sync-wikis.js --dry-run  # para revisar sin escribir
```

Requisitos: `STRAPI_URL` accesible **o** `WIKI_ROOT_PATH` definido, y que
`site-setting.wikis_path` (o el fallback) apunte a un destino real.

Mientras no se sincronice, la ficha muestra el enlace a la sección y el mensaje
*"Este documento todavía no está publicado en la wiki"* en lugar de inventar
contenido.

---

## 4. Correspondencia: ficha → ruta → acción → fuente → estado

| Ficha | Ruta | Acción (destino real) | Fuente de datos | Estado |
|---|---|---|---|---|
| Resumen | `/cartera` | — (sin CTA) | `GET /api/cartera` (real) + `GET /api/transaccion` | **Operativo** en lo que muestra |
| Pesos MXN | `/cartera/pesos-mxn` | — (7 simuladores **pendientes**) | `cartera.laborysSaldo` (equivalencia informativa) + `IngresosInfo` | **Informativo** |
| Labory | `/cartera/labory` | Comprar Labory → `/market` | `cartera` + historial de `transaccion` | **Operativo**; recompra **pendiente** |
| CIT | `/cartera/cit` | Catálogo → `/cartera/itokens` | Campos `ciudadanTokens`/`ciudadanRendimientos` = **marcadores de posición** | **En desarrollo** |
| Publia | `/cartera/publia` | **Comprar Labory** → `/market` | Módulo `/gana/ver-anuncios` | **Informativo** |
| Object | `/cartera/object-token` | Ver objetos → `/objetos` (placeholder) | **Sin fuente** (no implementado) | **En desarrollo** |
| TaskToken | `/cartera/task-token` | Tareas → `/coowork?tab=generales` | CoWork (real) | **Operativo** a nivel de módulo |
| ProofToken | `/cartera/proof-token` | Tareas → `/coowork?tab=generales` | CoWork (real); emisión formal **pendiente** | **Operativo** a nivel de módulo |
| TodoToken | `/cartera/todo-token` | Mis publicadas → `/coowork/mi-agencia/tareas` | CoWork `mis-publicadas` (real) | **Operativo** |
| Evaluation | `/cartera/evaluation-token` | — (consulta en la ficha) | Tareas calificadas (real) | **Operativo**; 6 aristas **sin ponderar** |
| Skill | `/cartera/skill-token` | — (consulta en la ficha) | Habilidades del usuario (real) | **Parcialmente operativo** |
| ID | `/cartera/id-token` | Ver mi identidad → `/identidad` (placeholder) | **Sin fuente** de credenciales | **En desarrollo** |
| Vote | `/cartera/vote-token` | Ver votaciones → `/votaciones` (placeholder) | **Sin fuente** | **En desarrollo** (bloque 7) |
| Social | `/cartera/social-token` | Ir a la comunidad → `/comunidad` | **Sin fuente** (dinámicas por definir) | **Informativo** |

**Compatibilidad hacia atrás:** los slugs anteriores siguen abriendo su ficha.
`/cartera/i-token`, `/cartera/itoken` y `/cartera/ciudadan-i-token` → CIT.
`/cartera/tarea`, `/cartera/resoluciones`, `/cartera/aportaciones` → ProofToken.
Un slug desconocido vuelve a `/cartera` sin romper la app.

---

## 5. Estructura editorial compartida

Toda ficha puede declarar estos campos. `TokenDetails.jsx` **solo renderiza los
que existan**, así que "Mi actividad" no aparece donde no hay fuente real y
ninguna ficha se rellena con texto genérico de otra.

| Campo | Sección mostrada |
|---|---|
| `proposito` | Resumen y propósito |
| `comoFunciona` | Cómo funciona |
| `comoSeObtiene` | ¿Cómo se obtiene o se participa? |
| `paraQueSirve` | ¿Para qué sirve? |
| `miActividad` | Mi actividad *(solo con fuente real)* |
| `acciones` | Acciones y destinos |
| `reglas` | Reglas y transparencia |
| `saberMas` | Saber más: wiki y documentos |
| `estado` | Estado de implementación |
| `version` / `fecha` | Pie: versión y fecha de revisión |

Secciones compuestas (se construyen solo si la ficha declara los sub-campos):
`aristas` (Evaluation), `simuladores` (Pesos), `recompra` (Labory) y
`simulador` (CIT).

### 5.1 Reglas y transparencia por instrumento

`reglas` es **específica de cada ficha** y cubre, según aplique: derechos,
obligaciones, fiscalidad cuando interviene una operación económica, privacidad y
vías de revisión. **No** se reutiliza una advertencia genérica, **no** se afirman
tasas ni exenciones universales, y **no** se publica como texto aprobado
contenido legal pendiente.

---

## 6. Regla económica del fondo de recompra (Labory)

Acordada y **documentada**. **No implementada**: el fondo no se está calculando
ni ejecutando, y no se muestra ningún saldo ni porcentaje aplicado.

```
Fondo de recompra =
    50% de ingresos por membresías de usuarios
  + 15% de ingresos por membresías de negocios
  + 100% de ingresos por venta publicitaria de Labory

Reparto:
    50% para compra a socios activos
    50% para compra a miembros
```

Aclaraciones que la ficha declara explícitamente:

- **Socios activos y miembros son grupos distintos.** Pagar una membresía no
  convierte a nadie en socio activo por ese solo hecho.
- El fondo **no se reasigna automáticamente** entre sus dos mitades.
- **No existe** un presupuesto de compra que sustituya esa fórmula.

**Simulador (pendiente):** modos **automático**, **personalizado** y **avanzado
por periodos**; mostrará circulación, ofertas de recompra, compras realizadas,
reservas y capacidad de atención de cada grupo.

---

## 7. Constantes de referencia Labory→MXN (inventario)

Hay **dos** constantes en desacuerdo. **No** se unifican ni se reemplazan por una
cifra nueva: se documentan para decidir con datos reales.

| Valor | Dónde se usa |
|---|---|
| `80` | `FACTOR_LABORY_MXN` en `src/Pages/Cartera/TokenPanel.jsx` (fichas de Cartera) |
| `147.16` | `LAB_REFERENCIA.valorUnitario` en `src/config/labory.js` → `MembresiasDetalles.jsx` (membresías) |

Inventario consolidado en `CONSTANTES_REFERENCIA_LABORY` (`TokenPanel.jsx`).

**Ninguna se presenta como cotización operada.** Ambas son referencia interna
informativa. Ver `docs/CARTERA-PENDIENTES-BLOQUES.md` (pendiente P-04).

---

## 8. Decisiones técnicas adoptadas y su motivo

| # | Decisión | Motivo |
|---|---|---|
| D-01 | CIT conserva el `id: 'itoken'` y añade el alias `cit` | Arregla el enlace roto de `Ganar.jsx` sin romper nada interno |
| D-02 | Se añade ficha PROOF apuntando al tablero real de CoWork | Nombra las resoluciones **sin** cambiar los identificadores internos `todo`/`tarea` ni sus estados |
| D-03 | Simuladores declarados en `simuladores: [{rol, estado:'pendiente'}]` y **sin botón** | Regla del bloque: no mostrar botón operativo para función inexistente |
| D-04 | `TokenDetails` renderiza por configuración, no por lista fija | Agregar una sección es agregar una entrada, no tocar el componente |
| D-05 | Capa de wiki sobre `wikiService` existente, con carga perezosa | Integración mínima; **sin dependencias nuevas**; la ficha no hace petición extra al cargar |
| D-06 | Referencias wiki por clave (`wiki: ['carteraLabory']`) | Evita rutas escritas a mano en cada ficha |
| D-07 | Las dos constantes Labory→MXN se conservan identificadas | No inventar una cifra que las sustituya |
| D-08 | Equivalencia MXN degradada a `Aviso` en el panel Resumen | Evitaba leerse como saldo disponible en pesos |
| D-09 | Documentos wiki nuevos en `wikiseed/help/` | Es la fuente versionada real; no se migra ni sustituye la wiki |
| D-10 | No se tocan estilos, navegación ni componentes reutilizables | El rediseño completo corresponde a bloques posteriores |

---

## 9. Fuera de alcance en este bloque (explícito)

No se implementó: **simuladores**, **movimientos de dinero**, **emisión de
instrumentos**, **recompra**, **préstamos de objetos** ni **votaciones**.

No se hicieron **merge a main**, **push** ni **despliegues**.
