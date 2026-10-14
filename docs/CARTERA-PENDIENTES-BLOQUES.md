# Cartera Ciudadan — Registro de pendientes por bloque

**Bloque 1 de 8 — base, contenido y navegación**
**Rama:** `feature/agente1-adrian-cartera-integral`
**Versión del contenido editorial:** 1.0.0 · **Fecha:** 2026-10-14

Complementa `docs/CARTERA-ESPECIFICACION.md`.

**Regla:** un pendiente es algo que **no** está implementado o **no** está
definido. No se rellena con suposiciones ni se presenta como acordado.

---

## 1. Pendientes necesarios para el BLOQUE 2

Estos son los **únicos** pendientes que bloquean el arranque del bloque 2.

| # | Pendiente | Impacto | Quién/dónde se resuelve |
|---|---|---|---|
| **P-01** | **Sincronizar la wiki viva:** correr `node wikiseed/sync-wikis.js` contra el destino configurado para publicar los 11 documentos `cartera*.md`. Hasta entonces la wiki viva no los tiene y la sección "Saber más" muestra el aviso de "no publicado". | Sin esto, "Saber más" enlaza a la sección pero no muestra el documento inline. **La ficha funciona igual**: el contenido editorial vive en `tokenContent.js`. | Operación, una sola vez. Requiere `STRAPI_URL` accesible o `WIKI_ROOT_PATH`, y que `site-setting.wikis_path` apunte a un destino real. |
| **P-02** | **Parámetros de los simuladores de Pesos MXN** (7 roles). No existen fórmulas, insumos ni unidades de estimación. | Sin ellos no hay simulador. La ficha ya anuncia los destinos como *próximamente* y **no** muestra botón. | Definición de negocio. Ver §3. |
| **P-03** | **Reglas de uso de las equivalencias Labory→MXN** en las fichas (cuál de las dos constantes aplica, o si deben distinguirse por contexto). | Hoy cada superficie conserva la constante que ya usaba. No se inventa cifra nueva, pero quedan dos referencias distintas. | Definición de negocio + decisión técnica. Ver §4 (P-04). |

---

## 2. Pendientes por bloque posterior

### Bloque 3 — CIT (antes de abordarlo, segun lo acordado)

| # | Pendiente |
|---|---|
| P-05 | **Parametrizacion contractual completa de CIT:** series, fuentes de respaldo, documentos aplicables, plazos y reglas de distribucion. **No se reconstruyen cifras faltantes por intuicion.** |
| P-06 | **Coleccion y campos definitivos del backend** para participacion economica. Los campos actuales (`ciudadanTokens`, `ciudadanRendimientos`) son marcadores de posicion. |
| P-07 | **Simulador de CIT** (automatico / personalizado / avanzado por periodos) y sus escenarios. |

### Labory — recompra

| # | Pendiente |
|---|---|
| P-08 | **Implementacion del fondo de recompra** con la formula acordada (ver especificacion §6). Hoy no se calcula ni se ejecuta. |
| P-09 | **Simulador de recompra** (3 modos; circulacion, ofertas, compras, reservas, capacidad de atencion por grupo). |
| P-10 | **Definicion de "socio activo" vs "miembro"** como grupos operativos distinguibles, ya que el reparto 50/50 depende de esa distincion. |

### Object

| # | Pendiente |
|---|---|
| P-11 | **Registro de objetos aportados**, capacidad de garantia y creditos de uso. |
| P-12 | **Ciclo de prestamo:** garantia comprometida, devolucion, liberacion integra y tratamiento de danos/controversias. |
| P-13 | **Consumo por desgaste real** y su conversion en creditos para el aportante. |
| P-14 | **Encauce fiscal concreto** por operacion documentada. No aplica exencion general. |

### Task / Proof

| # | Pendiente |
|---|---|
| P-15 | **Emision formal de ProofToken** como entidad propia. Hoy la ficha nombra las resoluciones y apunta al flujo real de CoWork; `todo`/`tarea` y sus estados **no** se modificaron. |

### Evaluation

| # | Pendiente |
|---|---|
| P-16 | **Ponderaciones y efectos economicos del factor de seis aristas.** Las aristas estan definidas; sus pesos **no**. No se inventan. |
| P-17 | **Instrumentos de valoracion propuestos por miembros/socios y aprobados por asamblea federal.** Sin instrumentos aprobados hoy. |

### Skill

| # | Pendiente |
|---|---|
| P-18 | **Test de habilidades** como aporte de evidencia y **validacion por agencia**. |
| P-19 | **Vias aprobadas por asamblea federal** para habilidades sin EvaluationToken. |

### ID

| # | Pendiente |
|---|---|
| P-20 | **Emision de credenciales digitales verificables.** |
| P-21 | **Auditorias y trazabilidad.** Forman parte del diseno; **no** estan implementadas y la ficha no afirma que lo esten. |

### Vote — **bloque 7**

| # | Pendiente |
|---|---|
| P-22 | **Emision, uso unico, cierre, privacidad y colecciones** de Vote. Todo el modulo es del bloque 7; este bloque **no** anticipa sus reglas. |

### Social

| # | Pendiente |
|---|---|
| P-23 | **Dinamicas de meritos comunitarios:** puntos, valoracion y relacion con postulaciones a cargos. **No** existen puntos, recompensas monetarias ni acceso automatico a cargos. |

---

## 3. Pregunta concreta pendiente de definicion de negocio

**P-02 — Simuladores de ingresos de Pesos MXN.**

Ciudadan no puede inventar la respuesta. Lo que **si** esta resuelto y entregado
en el bloque 1: la ficha existe, explica como se gana y se cobra, separa
cobrado/pendiente/equivalencia/simulacion, y **anuncia los 7 destinos como
proximamente sin mostrar boton operativo**.

Lo que hace falta definir para el bloque 2:

1. **Fuente de estimacion por rol.** Los simuladores calculan sobre datos reales
   de la plataforma, sobre promedios historicos, o sobre parametros que captura
   la persona?
2. **Unidad y periodicidad** del resultado (por evento, diario, mensual).
3. **Alcance de "Agencia completa"**: es la suma de los demas roles o un modelo
   propio con estructura de costos?

**Impacto de no definirlo:** no hay simulador. La ficha queda correctamente
informativa y los destinos siguen anunciados como pendientes. **No** se muestra
ninguna cifra ni escenario inventado.

---

## 4. Conflicto detectado en documentacion previa

**P-04 — Dos constantes de referencia Labory→MXN.**

| Valor | Donde se usa |
|---|---|
| `80` | `FACTOR_LABORY_MXN` (`src/Pages/Cartera/TokenPanel.jsx`) |
| `147.16` | `LAB_REFERENCIA.valorUnitario` (`src/config/labory.js`) → membresias |

**Tratamiento en este bloque:** se **conservan identificadas** en
`CONSTANTES_REFERENCIA_LABORY` y se documentan. **No** se unifican ni se
reemplazan por una cifra nueva, y **ninguna** se presenta como cotacion operada.
Requiere decision con datos reales (P-03).

**Sobre investigacion juridica previa:** no se encontro en el repo normativa
definitiva de Cartera que contravenga las instrucciones de este bloque. No se
copio ninguna investigacion juridica anterior como normativa vigente: las
secciones de "Reglas y transparencia" se redactaron por instrumento y sin
afirmar tasas ni exenciones universales.

---

## 5. Verificacion de los pendientes

```bash
# Ver que falta publicar en la wiki viva (sin escribir nada):
node wikiseed/sync-wikis.js --dry-run
```
