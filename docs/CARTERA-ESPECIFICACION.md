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

## 10. Corrección del bloque 1 (post-entrega): contenido en Cartera, roles y wiki

**Contexto:** la entrega original puso el contenido sobre todo en dos superficies
separadas: las fichas de Cartera (texto en el acordeón) y la wiki (11 documentos
nuevos). La corrección exige que la información viva **integrada en las fichas**.

### 10.1 Causa de que la información terminara sólo en wiki

La causa fue de diseño de presentación, no de contenido: las secciones editoriales
(`tokenContent.js`) existían, pero `TokenDetails.jsx` las metía todas dentro de un
**único acordeón colapsado**, así que sin abrir nada la ficha mostraba apenas el
saldo/resumen y el mensaje de "inicia sesión". La corrección separa:

- **principal, siempre visible:** propósito, cómo funciona, cómo se obtiene,
  para qué sirve, mi actividad y acciones;
- **desplegable:** reglas y transparencia, estado de implementación y documentos
  (fondo de recompra, aristas, simuladores).

### 10.2 Componente de roles recuperado y procedencia

Se recuperó —no se construyó otro— el carrusel de roles de
`src/components/Home/Intro.jsx` (hero del Home): 4 roles, cada uno con su imagen
real (`programadores.png`, `becarios.png`, `profesionales.png`,
`universitarios.png`) y navegación con flechas. Búsqueda realizada antes de
reutilizar: `Pages/Cartera`, `components/Cartera`, historial completo de
`ImagenInteractiva.jsx`/`IngresosInfo.jsx`, `assets` y ramas remotas
(`abraham-home`, `abraham-gana`, `abraham-cartera`, `abraham-wallet`,
`abraham-lideresysociosconductores`, `el3-wallet-tunning`, `cartera-bankchain`).

**Adaptación, no restauración literal:** el `Intro.jsx` original es un hero de
pantalla completa con estilos neón; aquí se conservan las imágenes, los títulos
y las flechas, y se montan en el estilo morado de Cartera con MUI + `sx`.
Se descartó `ImagenInteractiva.jsx` (una sola imagen `roles.png` con 5 botones
que disparan `alert()` sin hacer nada). Cada rol declara su destino real ya
verificado (`/coowork?tab=generales`, `/gana/ver-anuncios`) y su simulador como
**pendiente sin botón**. El carrusel se integró en la ficha de Pesos MXN fuera
del gate de autenticación (no muestra datos privados: es la entrada visual a
las formas de participar).

### 10.3 Causa del fallo de visibilidad de los documentos nuevos de wiki

**Arquitectura real, verificada:** la wiki NO lista archivos del disco. El árbol
de navegación sale de la tabla `documents` de SQLite (`ciudadadan.db`) vía
`DocumentRepositoryImpl.findAllForTree()`. La causa exacta, en dos puntos:

1. `wikiseed/sync-wikis.js` sólo copiaba el `.md` al disco y **nunca indexaba
   la BD**, reportando éxito mientras el artículo quedaba invisible en el
   listado. **Tabla `documents`: 0 filas.**
2. El `dist/` compilado del socket-service estaba **obsoleto**: `tsconfig.json`
   no compilaba `config/WikiPaths.ts` ni `WikiRootProvider.ts`, y
   `WikiService.js` resolvía el disco con `path.resolve(process.cwd(), …)`,
   ignorando `wikis_path`. La lectura por URL directa devolvía el aviso
   "El archivo físico no se encontró".

**Corrección (causa, no sólo enlaces):**

- `wikiseed/sync-wikis.js` ahora indexa con el **mismo servicio que el watcher**
  (`WikiService.updateIndex`, idempotente por SHA-256): repetido no duplica,
  `--dry-run` no toca nada, y si el `dist` no existe se reporta sin ocultar el
  fallo (el servicio lo indexará al arrancar).
- `socket-service/tsconfig.json`: `rootDir: "."` para compilar `config/`;
  `dist/` regenerado con `tsc` (está en `.gitignore`: no se commitea).
- Tanto el listado como la lectura se probaron contra el router real.
  Sin permisos generales nuevos ni borradores expuestos.

**Pruebas realizadas sobre la wiki:** `sync --dry-run` (no escribe, no indexa);
sync real (12 documentos cartera + el resto, todos indexados); sync repetido
(0 copiados, 0 indexados, sin duplicados); `GET /wiki/help` → 200 con los 12
`cartera*` en el árbol; `GET /wiki/help/cartera-cit.md` → 200 con contenido
íntegro; sección inválida → 400; documento inexistente → 404.

### 10.4 Una fuente coherente, dos presentaciones

- **Cartera:** contenido integrado y visible en la ficha (datos de
  `tokenContent.js`), con la wiki como enlace complementario.
- **Wiki:** explicación ampliada en `wikiseed/help/cartera*.md`.
- Ambas usan la **misma fuente editorial**; no hay dos copias editadas a mano:
  si el índice de la wiki falla, la ficha conserva su contenido versionado y
  muestra el aviso en lugar de quedar vacía.

### 10.5 Runbook de la wiki: sembrar el seed y que se vea (local y producción)

**Arquitectura real (verificada):** la wiki son `.md` servidos por
`socket-service` (`WikiRouter` montado en `/wiki`) en el puerto
`SOCKET_PORT` (33035). El **listado** sale de la tabla `documents` de SQLite;
la **lectura** busca en BD con fallback a disco. Raíz resuelta con precedencia
`site-setting.wikis_path` (Strapi) → `WIKI_ROOT_PATH` (.env) → default
(`/var/www/apps/wikis` en Linux).

**Estructura de carpetas (la que realmente se visualiza):**

```text
{raíz wiki}/                    ← site-setting.wikis_path | WIKI_ROOT_PATH | default
├── main/*.md                   ← sección PRINCIPAL  → /wiki/main
├── help/*.md                   ← sección AYUDA      → /wiki/help      ← cartera-*.md
└── faq/*.md                    ← sección FAQ        → /wiki/faq
```

El origen en el repo es `wikiseed/{main,help,faq}/`. Sólo esas 3 secciones se
sincronizan; cada archivo `help/x.md` es visible en `/wiki/help` y legible en
`/wiki/x` (porque `WikiWrapper` busca el slug en las 3 secciones).

**Pasos (comandos exactos, verificados en local):**

```bash
# 0) compilar el socket-service (una vez, o si cambió algo en *.ts)
cd ciudadan_backend_26/socket-service && npm run build   # tsc → dist/

# 1) arrancar el servicio (añadir SIEMPRE las raíces explícitas)
SOCKET_PORT=33035 STRAPI_URL=http://localhost:33032 \
WIKI_ROOT_PATH=/var/www/apps/wikis npx tsx server.js

# 2) sembrar el seed (idempotente: copia + indexa; repetido no duplica)
node wikiseed/sync-wikis.js            # --dry-run para revisar sin escribir

# 3) verificar A) listado y B) lectura
#    A) GET /wiki/help → nodos incluye help/cartera-*.md
#    B) GET /wiki/help/cartera-labory.md → htmlContent real
```

**Causas reales de "no se ven los documentos" (todas verificadas aquí):**

| # | Causa | Síntoma | Corrección |
|---|---|---|---|
| 1 | `sync` copiaba a disco sin indexar la BD | listado vacío aunque los `.md` existen | `sync-wikis.js` indexa con `WikiService.updateIndex` (ya corregido) |
| 2 | `dist/` desactualizado (`tsconfig` sin `config/`) | lectura directa: "archivo físico no se encontró" | `rootDir: "."` en tsconfig + `npm run build` (ya corregido) |
| 3 | `socket-service` no corriendo | peticiones `ERR_FAILED` / 404 | arrancarlo en 33035 |
| 4 | `REACT_APP_SOCKET_URL` apunta a otra instancia | la instancia local pide la wiki a otra URL | .env local → `http://localhost:33035` (.env no versionado) |
| 5 | `wikis_path` no configurado | cae al default (`/var/www/apps/wikis`) | configurar `site-setting.wikis_path` en Strapi o `WIKI_ROOT_PATH` |

**Para la INSTANCIA DE PRODUCCIÓN (`socket-adrianperez2.ciudadan.org`):**

> ⚠️ El seed **nunca se sincronizó en producción**: localmente se sembraron
> la BD local (`ciudadadan.db`) y el disco local (`/var/www/apps/wikis`), que
> no son los de producción. Además el `dist/` de producción probablemente tiene
> el bug 2. La ejecución de esto en producción **queda pendiente** (no se
> despliega desde este bloque). Procedimiento exacto a ejecutar allá:

```bash
# en el host de producción
cd socket-service && npm run build          # regenera dist con WikiPaths
# reiniciar el servicio de socket de producción
node wikiseed/sync-wikis.js --dry-run        # revisar destino (ver "Destino: ...")
node wikiseed/sync-wikis.js                  # copiar + indexar en la BD PRODUCCIÓN
# verificar:
#   GET https://socket-<entorno>.ciudadan.org/wiki/help  → cartera* en el árbol
#   GET https://socket-<entorno>.ciudadan.org/wiki/help/cartera-labory.md → 200
```

**Verificación de "una fuente, dos presentaciones":** si el socket no responde,
la ficha conserva su contenido versionado y muestra el aviso (probado con el
socket apagado: contenido intacto + mensaje honesto), nunca queda vacía.

- **Cartera:** contenido integrado y visible en la ficha (datos de
  `tokenContent.js`), con la wiki como enlace complementario.
- **Wiki:** explicación ampliada en `wikiseed/help/cartera*.md`.
- Ambas usan la **misma fuente editorial**; no hay dos copias editadas a mano:
  si el índice de la wiki falla, la ficha conserva su contenido versionado y
  muestra el aviso en lugar de quedar vacía.

---

## 11. Fuera de alcance en este bloque (explícito)

No se implementó: **simuladores**, **movimientos de dinero**, **emisión de
instrumentos**, **recompra**, **préstamos de objetos** ni **votaciones**.

No se hicieron **merge a main**, **push** ni **despliegues**.
