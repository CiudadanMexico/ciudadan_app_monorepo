// Contenido editorial de cada ficha de la Cartera Ciudadan.
//
// BLOQUE 1 (cartera integral): base, contenido y navegación.
//
// Estructura editorial COMPARTIDA. Toda ficha puede declarar estos campos y
// `TokenDetails.jsx` sólo renderiza los que existan (los vacíos no se muestran,
// así ninguna ficha se rellena con texto genérico de otra):
//
//   proposito        — resumen y propósito de la ficha
//   comoFunciona     — cómo funciona el instrumento
//   comoSeObtiene    — cómo se obtiene o cómo se participa
//   paraQueSirve     — para qué sirve
//   miActividad      — MI actividad (sólo si hay fuente REAL; si no la hay el
//                      campo no se declara y la sección no aparece)
//   acciones         — acciones y destinos reales (texto; el CTA sale de
//                      `token.action` en tokenConfig.js)
//   simuladores      — destinos futuros declarados, NO operativos
//   reglas           — REGLAS Y TRANSPARENCIA, específica de cada instrumento:
//                      derechos, obligaciones, fiscalidad cuando interviene
//                      una operación económica, privacidad y vías de revisión
//   saberMas         — Saber más: wiki y documentos (ver WIKI_REFERENCIAS)
//   estado           — estado de implementación
//   recompra         — detalle propio de Labory (fórmula acordada del fondo)
//
// Cada ficha declara además `version` y `fecha` (versión y fecha de revisión
// del contenido) y `wiki` (referencias a documentos). No se calculan: las
// escribe quien revisa el texto.
//
// REGLA DEL PROYECTO — NO INVENTAR:
//   - No se afirman cifras, fórmulas, derechos, saldos, rendimientos,
//     autorizaciones, contratos ni estados operativos que no existan.
//   - Un campo existente no prueba que el flujo completo esté implementado.
//   - Un dato desconocido NO se muestra como cero.
//   - Lo que es diseño acordado pero no está implementado se dice como tal.
//   - Lo pendiente de definición se marca como pendiente, no se rellena.
//
// CONTENIDO VERSIONADO vs WIKI EN VIVO:
//   Este archivo es la fuente editorial versionada de las fichas. El texto
//   largo de la wiki vive en `wikiseed/help/*.md` y se publica al destino
//   físico configurado (`site-setting.wikis_path` → `WIKI_ROOT_PATH` → default)
//   con `node wikiseed/sync-wikis.js`. Las dos superficies NO están
//   sincronizadas automáticamente: ver docs/CARTERA-ESPECIFICACION.md.

/**
 * Referencias a documentos de la wiki por ficha.
 *
 * La wiki NO es Strapi: son .md servidos por `socket-service` en
 * `{REACT_APP_SOCKET_URL}/wiki/{section}/{ruta}`. Estos slugs son rutas
 * relativas dentro de la sección; el frontend los resuelve con
 * `src/services/wikiService.js` → `getDocument('wiki/help/<ruta>.md')`.
 *
 * `estadoConexion` documenta la situación REAL del documento:
 *   'versionado'  → el .md existe en `wikiseed/` de este repo (fuente real
 *                   versionada). Publicarlo en la wiki viva requiere correr
 *                   `node wikiseed/sync-wikis.js` contra el destino vivo.
 *                   NO está sincronizado en automático.
 */
export const WIKI_REFERENCIAS = {
  cartera: {
    seccion: 'help',
    ruta: 'cartera',
    titulo: 'Cartera y Wallets',
    estadoConexion: 'versionado',
  },
  carteraFichas: {
    seccion: 'help',
    ruta: 'cartera-fichas-tokens',
    titulo: 'Fichas de la Cartera: qué es cada token',
    estadoConexion: 'versionado',
  },
  carteraLabory: {
    seccion: 'help',
    ruta: 'cartera-labory',
    titulo: 'Labory: cómo se obtiene, circula y se recompra',
    estadoConexion: 'versionado',
  },
  carteraCit: {
    seccion: 'help',
    ruta: 'cartera-cit',
    titulo: 'CIT (Ciudadan Investment Token): participación económica',
    estadoConexion: 'versionado',
  },
  carteraPublia: {
    seccion: 'help',
    ruta: 'cartera-publia',
    titulo: 'Publia: publicidad de la plataforma',
    estadoConexion: 'versionado',
  },
  carteraObject: {
    seccion: 'help',
    ruta: 'cartera-object',
    titulo: 'Object: aportación y uso recíproco de objetos',
    estadoConexion: 'versionado',
  },
  carteraTaskProof: {
    seccion: 'help',
    ruta: 'cartera-task-proof',
    titulo: 'Task y Proof: encargos y resoluciones',
    estadoConexion: 'versionado',
  },
  carteraEvaluation: {
    seccion: 'help',
    ruta: 'cartera-evaluation',
    titulo: 'Evaluation: desempeño e instrumentos de valoración',
    estadoConexion: 'versionado',
  },
  carteraSkill: {
    seccion: 'help',
    ruta: 'cartera-skill',
    titulo: 'Skill: acreditación de capacidades',
    estadoConexion: 'versionado',
  },
  carteraId: {
    seccion: 'help',
    ruta: 'cartera-id',
    titulo: 'ID: identidad y verificaciones',
    estadoConexion: 'versionado',
  },
  carteraVote: {
    seccion: 'help',
    ruta: 'cartera-vote',
    titulo: 'Vote: habilitación de voto',
    estadoConexion: 'versionado',
  },
  carteraSocial: {
    seccion: 'help',
    ruta: 'cartera-social',
    titulo: 'Social: méritos comunitarios',
    estadoConexion: 'versionado',
  },
  cowork: { seccion: 'help', ruta: 'cowork', titulo: 'CoWork', estadoConexion: 'versionado' },
  gana: { seccion: 'help', ruta: 'gana', titulo: 'Gana', estadoConexion: 'versionado' },
  membresias: {
    seccion: 'help',
    ruta: 'membresias',
    titulo: 'Membresías',
    estadoConexion: 'versionado',
  },
  marketplace: {
    seccion: 'help',
    ruta: 'marketplace',
    titulo: 'Marketplace',
    estadoConexion: 'versionado',
  },
};

/** Versión y fecha de revisión del contenido editorial de las fichas (bloque 1). */
export const CONTENIDO_VERSION = '1.0.0';
export const CONTENIDO_FECHA = '2026-10-14';

export const TOKEN_CONTENT = {
  resumen: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['cartera', 'carteraFichas'],
    proposito:
      'El Resumen es tu vista personal de la Cartera: reúne en un solo lugar los saldos, derechos, actividad y movimientos reales que tienes dentro de Ciudadan.',
    comoFunciona:
      'Cada cosa que tienes o que has hecho vive en su propia ficha, y el Resumen te dice dónde está. Cobrado, pendiente, equivalencias y simulaciones se muestran por separado: nunca se suman entre sí como si fueran lo mismo.',
    comoSeObtiene:
      'No se obtiene ni se adquiere: el Resumen se construye con lo que ya existe en tu cuenta (tu cartera, tu trabajo y tus tokens de actividad).',
    paraQueSirve:
      'Es el punto de partida para saber qué tienes hoy y qué puedes hacer con cada cosa: revisar tu saldo, ver tu historial de movimientos reales y pasar a la ficha correspondiente.',
    miActividad:
      'Los saldos y el historial que ves aquí se leen de tu cartera real en el backend (Laborys, Laborys ganados, dirección de wallet y movimientos). Las fichas cuyo módulo sigue en desarrollo lo indican ellas mismas; ninguna muestra cifras de ejemplo.',
    reglas:
      'Tus datos de Cartera son personales y sólo tú los ves. La Cartera muestra información; no autoriza por sí misma ninguna operación económica ni sustituye los términos del instrumento que en cada caso aplique. Las correcciones o aclaraciones sobre tus saldos y movimientos se atienden por las vías de revisión del módulo correspondiente (CoWork para lo derivado de tareas, y la atención de la plataforma para lo demás). Ciudadan no convierte automáticamente tus Laborys a pesos: la equivalencia que se muestra es únicamente informativa y no representa dinero disponible.',
    saberMas:
      'En la wiki: Cartera y Wallets (saldo, billeteras, pagos y comisiones) y la guía de las fichas de la Cartera.',
    estado:
      'Operativo en lo que muestra: saldos de Laborys, dirección de wallet e historial de movimientos provienen de tu cartera real y el pago automático al calificar una tarea está implementado en el backend. Las equivalencias en pesos son referencia, no saldo. Los módulos todavía en desarrollo se identifican como tales en su propia ficha.',
  },
  pesos: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['cartera', 'gana', 'membresias'],
    proposito:
      'Pesos MXN explica cómo se gana y cómo se cobra dinero en efectivo dentro de Ciudadan, y reúne los caminos reales para generar ingresos. No es una explicación del peso mexicano ni una moneda propia de la plataforma.',
    comoFunciona:
      'Dentro de Ciudadan el efectivo aparece cuando una tarea o un trabajo define una recompensa en pesos y esa recompensa se paga. Esta ficha separa tres cosas que no son lo mismo: lo cobrado, lo pendiente y la equivalencia informativa de tus Laborys. Los Laborys convertidos a MXN NO son pesos disponibles y no se suman como si lo fueran.',
    comoSeObtiene:
      'Por las vías que hoy existen en la plataforma: resolviendo trabajo del CoWork cuya recompensa es en efectivo, participando en las actividades remuneradas del módulo Gana y las rutas de ingresos que se describen en esta ficha. Lo que corresponde a cada vía, sus montos y su calendario de pago dependen de la actividad concreta y de su instrumento; esta ficha no fija cifras propias.',
    paraQueSirve:
      'Es el acceso a los simuladores de ingresos de Ciudadan. Cada simulador permite estimar escenarios por rol antes de participar; ninguno es una oferta, una cotización ni una promesa de resultados.',
    miActividad:
      'Lo que esta ficha muestra como tuyo es lo que ya existe en tus registros reales. Los simuladores no leen tu cartera para inventar ingresos: trabajan sobre los parámetros que tú captures y sus resultados quedan marcados como simulación.',
    acciones:
      'Los destinos de los simuladores están declarados en el apartado de próximamente de esta ficha. Sólo se habilita el que exista de verdad; mientras no exista, se anuncia como pendiente en lugar de mostrar un botón operativo.',
    simuladores: [
      { rol: 'Socio de agencia', estado: 'pendiente' },
      { rol: 'Colaborador', estado: 'pendiente' },
      { rol: 'Conductor', estado: 'pendiente' },
      { rol: 'Repartidor', estado: 'pendiente' },
      { rol: 'Líder / promotor', estado: 'pendiente' },
      { rol: 'Comercio / restaurante', estado: 'pendiente' },
      { rol: 'Agencia completa', estado: 'pendiente' },
    ],
    reglas:
      'Derechos: conocer el origen y el estado de cada monto que se te deba, y recibir lo cobrado por las vías de liquidación definidas para cada actividad. Obligaciones: la información que declares para participar debe ser verdadera y tuya. Fiscalidad: cuando una actividad genere un ingreso efectivo, el tratamiento fiscal depende de la operación concreta y de tu situación; Ciudadan no declara exenciones generales ni tasas universales, y te corresponde documentar y declarar lo que corresponda conforme a los comprobantes de cada pago. Privacidad: tus datos bancarios y fiscales no se muestran en esta ficha. Vías de revisión: los pagos y las liquidaciones se revisan por los canales de atención del módulo que los origina; una reclamación no altera por sí misma un saldo ya liquidado. Los simuladores son estimaciones: su resultado no crea derechos de cobro ni obliga a la plataforma.',
    saberMas:
      'En la wiki: Cartera y Wallets (sección Pagos y comisiones), Gana y Membresías.',
    estado:
      'La ficha es informativa y está operativa como explicación y como punto de acceso. Los destinos de ingresos que enlaza existen (Gana, CoWork, membresías). Los simuladores de ingresos están declarados como pendientes: sus fórmulas y parámetros todavía no están definidos y por eso no se muestran cifras ni escenarios.',
  },
  labory: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['carteraLabory', 'cartera', 'cowork', 'gana'],
    proposito:
      'Labory es la moneda interna de Ciudadan: registra el valor del trabajo y de la participación dentro del ecosistema.',
    comoFunciona:
      'Se acredita en tu cartera y refleja trabajo aportado a la comunidad. Circula dentro del ecosistema (por ejemplo en el marketplace) y tiene una referencia de valor que es informativa: esa referencia no es un precio efectivo de compra ni de venta, ni un tipo de cambio operado por la plataforma.',
    comoSeObtiene:
      'De forma automática cuando una tarea que resolviste se califica: el backend acredita los Laborys correspondientes en tu cartera en la misma operación que registra la calificación. También se adquieren en la sección de compra de Labory del marketplace.',
    paraQueSirve:
      'Acumular el valor de tu aporte, consultar tu historial de movimientos y usar Labory dentro del marketplace de Ciudadan.',
    miActividad:
      'Tu saldo de Laborys, tus Laborys ganados y tu historial de movimientos se leen de tu cartera real y de tus registros; el pago automático al calificar está implementado en el backend.',
    acciones:
      'Comprar Labory lleva al destino real de compra que ya existe en la plataforma. La recompra de Laborys y su simulador están declarados más abajo en esta ficha como pendientes; no son operativos en este momento.',
    reglas:
      'Derechos: conocer tu saldo, tus movimientos y su origen, y usar tus Laborys en los destinos habilitados. Obligaciones: los Laborys acreditados por una calificación corresponden a trabajo efectivamente entregado; una calificación corregida o anulada afecta lo acreditado por ella. Referencia de valor: la equivalencia en pesos que se muestra es informativa y NO es un precio de compra ni de venta. Existen en el código dos constantes de referencia distintas (una en la Cartera y otra en la configuración general de Labory); se conservan identificadas, no se sustituyen por una cifra nueva y ninguna debe leerse como cotización operada. Recompra: se rige por el fondo descrito en esta ficha, no por un presupuesto de compra arbitrario. Fiscalidad: el encuadre depende de cada operación concreta; Ciudadan no afirma exenciones generales. Privacidad: tu cartera y tus movimientos son privados. Vías de revisión: lo derivado de tareas se revisa por CoWork (corrección y apelación de la calificación) y el resto por la atención de la plataforma.',
    saberMas:
      'En la wiki: Cartera y Wallets (cómo ganas laborys), CoWork y Gana.',
    estado:
      'Operativo: saldo, Laborys ganados e historial de movimientos se leen de tu cartera real y el pago automático al calificar está implementado en el backend. La compra de Labory usa el destino real del marketplace. La recompra de Laborys (convertirlos a efectivo) y su simulador están en desarrollo y así se indica.',
    recompra: {
      titulo: 'Fondo de recompra de Labory (regla económica acordada)',
      // Fórmula acordada. NO es una implementación: el fondo no se está
      // calculando en la plataforma y estas líneas no son un saldo.
      formula: [
        '50% de los ingresos por membresías de usuarios.',
        '15% de los ingresos por membresías de negocios.',
        '100% de los ingresos por venta publicitaria de Labory.',
      ],
      reparto: [
        '50% para compra a socios activos.',
        '50% para compra a miembros.',
      ],
      aclaraciones: [
        'Socios activos y miembros son grupos distintos: pagar una membresía no convierte a alguien en socio activo por ese solo hecho.',
        'El fondo no se reasigna automáticamente entre sus dos mitades.',
        'No existe un presupuesto de compra que sustituya esta fórmula.',
      ],
      estado:
        'La fórmula está acordada y se documenta. El fondo no se está calculando ni ejecutando en la plataforma, y no se muestra ningún saldo ni porcentaje ya aplicado.',
      simulador: {
        modos: ['Automático', 'Personalizado', 'Avanzado por periodos'],
        muestra: [
          'Circulación de Labory.',
          'Ofertas de recompra.',
          'Compras realizadas.',
          'Reservas.',
          'Capacidad de atención de cada grupo.',
        ],
        estado:
          'Pendiente de implementación. Sus parámetros y resultados se definirán junto con el fondo; mientras tanto no se muestran escenarios.',
      },
    },
  },
  cit: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['carteraCit', 'cartera'],
    // Alias de contenido: la ficha se llamaba "Ciudadan I-Token". Se mantiene
    // el mismo objeto bajo `itoken` para no romper imports previos.
    proposito:
      'CIT (Ciudadan Investment Token) es la ficha de participación económica en el ecosistema Ciudadan: reúne las fuentes, series, documentos, plazos y distribuciones de cada emisión.',
    comoFunciona:
      'CIT representa una participación económica sujeta a las condiciones de la serie y del documento que la respalden. No es una criptomoneda de libre negociación ni un saldo disponible para retirar: lo que se adquiere es una posición definida por su propio instrumento, con sus plazos y su régimen de distribuciones.',
    comoSeObtiene:
      'Participando en una emisión concreta de CIT. Cada emisión declara su fuente de respaldo, su serie, el documento aplicable, sus plazos y cómo se distribuye. La parametrización contractual completa se definirá antes del bloque 3; hasta entonces no se reconstruyen cifras faltantes por intuición.',
    paraQueSirve:
      'Dar seguimiento en un solo lugar a tu participación económica en Ciudadan: en qué serie participas, qué documento la rige, en qué plazo estás y qué distribuciones se han declarado.',
    miActividad:
      'Los campos de tokens y rendimientos que aparecen hoy en la cartera son marcadores de posición a la espera de la colección y los campos definitivos del backend. No son un saldo real ni un rendimiento causado, y no se presentan como cifras operadas.',
    acciones:
      'El catálogo de I-Tokens existente se puede visitar. La contratación de una emisión, el cálculo de rendimientos y las distribuciones no están implementados: no se muestra ningún botón operativo para ellas.',
    reglas:
      'Derechos: conocer el documento, la serie, el plazo y las reglas de distribución de tu participación, y recibir las distribuciones que efectivamente se declaren conforme a ese documento. Obligaciones: aportar lo que la emisión establezca y cumplir sus condiciones. Ciudadan no declara rendimientos garantizados: no promete rendimientos ni plazos que su documento no establezca, y no anuncia ninguna autorización, registro o aprobación regulatoria que no exista. Fiscalidad: el tratamiento de una participación económica depende de la operación y del instrumento concreto; no se afirman tasas ni exenciones universales. Privacidad: los documentos y datos de tu participación no se exponen en esta ficha editorial. Vías de revisión: las aclaraciones sobre una emisión se atienden por los canales de la emisión correspondiente y por la atención de la plataforma.',
    saberMas: 'En la wiki: la ficha de CIT (participación económica, series y documentos).',
    estado:
      'En desarrollo. La ficha es navegable y explica el instrumento. Los campos de la cartera son marcadores de posición y el catálogo existente se puede consultar. No hay emisión, ni cálculo de rendimientos, ni distribuciones implementados, ni autorización que anunciar.',
    simulador: {
      modos: ['Automático', 'Personalizado', 'Avanzado por periodos'],
      estado:
        'Pendiente. La parametrización contractual completa de CIT se abordará antes del bloque 3; hasta entonces no se muestran escenarios ni cifras.',
    },
  },
  publia: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['carteraPublia', 'gana'],
    proposito:
      'Publia es la publicidad de la plataforma Ciudadan. No requiere una moneda independiente: se adquiere con Labory.',
    comoFunciona:
      'El ciclo es: comprar Labory → contratar publicidad → publicación y medición → flujo de recursos hacia la recompra. Cada etapa queda registrada, de modo que la inversión en publicidad se pueda medir contra la actividad real que genera.',
    comoSeObtiene:
      'Comprando Labory y usándolo para contratar publicidad. Como audiencia, se participa desde el módulo de anuncios remunerados de la sección Gana, donde se registran las vistas e interacciones reales de cada anuncio.',
    paraQueSirve:
      'Conectar a quien quiere difundir un mensaje con quien está dispuesto a verlo, dejando un registro verificable de esa interacción dentro del ecosistema y alimentando con ello el modelo de aporte y recompensa.',
    miActividad:
      'El módulo de anuncios remunerados existe y es funcional: desde él se consulta la actividad propia de anuncios. Publia no tiene saldo propio en este momento, así que esta ficha no muestra cifras de Publia.',
    acciones:
      'Comprar Labory lleva al destino real de compra de Labory que ya existe. Contratar una campaña de publicidad no es operativo todavía: no hay checkout propio y por eso no se muestra como botón.',
    reglas:
      'Derechos: conocer cómo se mide tu anuncio (vistas e interacciones registradas) y qué recursos genera. Obligaciones: el contenido contratado debe cumplir las políticas de la plataforma. Fiscalidad: la contratación de publicidad es una operación económica concreta y su comprobación y tratamiento fiscal dependen de ella; Ciudadan no afirma exenciones ni tasas generales. Privacidad: la medición de anuncios se hace sobre actividad e interacciones, sin exponer datos personales de la audiencia en esta ficha. Vías de revisión: las discrepancias de medición se atienden por los canales del módulo de anuncios. La venta publicitaria de Labory alimenta el fondo de recompra según la regla acordada y documentada en la ficha de Labory; ese fondo no se está ejecutando todavía.',
    saberMas: 'En la wiki: la ficha de Publia y la sección Gana.',
    estado:
      'El módulo de anuncios remunerados existe y es funcional. Publia no tiene saldo propio ni contratación de campaña implementada: la ficha es informativa y su acción principal es comprar Labory, que sí tiene destino real.',
  },
  object: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['carteraObject'],
    proposito:
      'Object es la red de aportación y uso recíproco de objetos de Ciudadan: aportas objetos a una agencia y obtienes capacidad para usar objetos de la red.',
    comoFunciona:
      'Hay cuatro cosas distintas que no deben confundirse: (1) la capacidad de garantía respaldada por objetos, (2) los créditos de uso, (3) las garantías comprometidas mientras dura un préstamo y (4) el consumo por desgaste real. Los créditos por desgaste corresponden a quien aportó, para usar otros objetos.',
    comoSeObtiene:
      'Aportando objetos a una agencia. El registro de aportes y el otorgamiento de capacidad de uso no están implementados todavía, así que hoy no hay nada que solicitar desde la plataforma.',
    paraQueSirve:
      'Que los objetos que una persona no está usando sean útiles a otras, y que quien aporta obtenga a cambio capacidad de uso dentro de la red.',
    acciones:
      'La sección de objetos existente se puede visitar como marcador de posición. No hay aportes, préstamos ni créditos operativos: no se muestran botones para ellos.',
    reglas:
      'Derechos: conservar la propiedad de lo que aportas y recuperar tu garantía íntegramente al cumplir las condiciones de devolución. Obligaciones: devolver en las condiciones acordadas y responder por daños. No hay retiro en efectivo de créditos Object: los créditos de uso sólo se usan dentro de la red. Garantías: la garantía se libera íntegramente al cumplir las condiciones de devolución; los daños o controversias siguen su procedimiento propio, que no se resuelve descontando saldos automáticamente. Revisión: la revisión inicial es local, con posibilidad de una revisión superior. Fiscalidad: el encuadre requiere documentar la operación concreta; Ciudadan no afirma una exención fiscal general. Privacidad: los datos y comprobantes de tus objetos no se exponen en esta ficha. Object no es una inversión ni un negocio de alquiler con utilidad, y la ficha no lo describe así.',
    saberMas: 'En la wiki: la ficha de Object (aportación y uso recíproco de objetos).',
    estado:
      'En desarrollo. La ficha explica el modelo y enlaza a la sección de objetos, que hoy es un marcador de posición navegable. No hay registro de objetos, ni créditos de uso, ni préstamos implementados.',
  },
  task: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['carteraTaskProof', 'cowork'],
    proposito:
      'TaskToken es el encargo publicado: el trabajo que una agencia o un colaborador habilitado pone a disposición de la comunidad.',
    comoFunciona:
      'Un encargo publicado (Task) declara qué hay que hacer y qué recompensa tiene. Quien lo resuelve entrega una aportación, y cada aportación es un ProofToken. Un mismo encargo puede tener varias resoluciones.',
    comoSeObtiene:
      'Publican los socios o colaboradores habilitados de agencias. Como resolvente, se participa entrando a la lista de tareas, tomando una y entregando tu resolución; cuando se califica, recibes la recompensa (Laborys y, si el encargo lo define, efectivo) en tu cartera.',
    paraQueSirve:
      'Es la puerta de entrada al trabajo comunitario: te dice qué se necesita hacer hoy, qué recompensa tiene y te lleva directo al tablero real de tareas del CoWork.',
    miActividad:
      'El listado de tareas, la toma de tareas y el flujo de resolución existen en CoWork y esta ficha enlaza a ese tablero real.',
    acciones:
      'Ver tareas disponibles lleva al tablero real de tareas generales del CoWork. Para publicar encargos, el acceso es el de TodoToken (mis tareas publicadas), que sí tiene destino real.',
    reglas:
      'Derechos: conocer el alcance y la recompensa del encargo antes de tomarlo, y recibir lo correspondiente cuando tu resolución se califique. Obligaciones: cumplir el alcance publicado y atender las correcciones que se te soliciten. TaskToken no es un activo negociable: publicar un encargo no emite ni transfiere ningún instrumento negociable. Fiscalidad: cuando el encargo defina recompensa en efectivo, el tratamiento fiscal depende de la operación concreta; Ciudadan no afirma exenciones generales. Privacidad: los datos de quienes publican y resuelven se manejan según su función y finalidad, y no se exponen en esta ficha. Vías de revisión: las correcciones y apelaciones de una calificación se atienden por CoWork.',
    saberMas: 'En la wiki: la ficha de Task y Proof, y la sección CoWork.',
    estado:
      'Operativo a nivel de módulo: el listado de tareas generales, la toma de tareas y el flujo de resolución ya existen en CoWork; esta ficha lleva al tablero real.',
  },

  proof: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['carteraTaskProof', 'cowork'],
    proposito:
      'ProofToken es la aportación o resolución de un encargo: el trabajo entregado contra un TaskToken publicado.',
    comoFunciona:
      'Cada resolución que entregas contra un encargo es un ProofToken. Un mismo encargo puede tener varias resoluciones, y cada una tiene su propio estado y su propia calificación. Las resoluciones son la evidencia del trabajo realizado y la base sobre la que se evalúa y se paga.',
    comoSeObtiene:
      'Entregando la resolución de un encargo publicado. Quien califica registra la evaluación de tu aportación y, en su caso, el pago correspondiente en tu cartera.',
    paraQueSirve:
      'Dejar constancia de lo que entregaste, con su estado y su calificación, de manera que tu trabajo sea verificable dentro del ecosistema en lugar de depender de capturas o declaraciones sin respaldo.',
    miActividad:
      'Tus resoluciones y sus estados existen en CoWork y se consultan desde el tablero de tareas, que es el destino real de esta ficha. Lo que aparece aquí es tu actividad real, no cifras de ejemplo.',
    acciones:
      'Ver tareas disponibles lleva al tablero real de tareas del CoWork, donde se entregan y consultan las resoluciones.',
    reglas:
      'Derechos: que tu aportación sea calificada y puedas conocer el resultado y sus comentarios, así como solicitar corrección o apelación. Obligaciones: entregar dentro del alcance y los plazos del encargo. ProofToken no es un activo negociable: una resolución no se transfiere ni se comercia. Fiscalidad: cuando la resolución genere una recompensa en efectivo, el tratamiento fiscal depende de la operación concreta; Ciudadan no afirma exenciones generales. Privacidad: el contenido de tus aportaciones es visible para quienes participan en ese encargo según su función, y no se publica en esta ficha. Vías de revisión: corrección y apelación por CoWork.',
    saberMas: 'En la wiki: la ficha de Task y Proof, y la sección CoWork.',
    estado:
      'Operativo a nivel de módulo: el flujo de resolución de tareas existe en CoWork y esta ficha lleva a ese destino real. ProofToken como ficha propia se incorpora en este bloque para nombrar correctamente las resoluciones; la emisión formal de tokens Proof es un pendiente de bloques posteriores.',
  },
  todo: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['carteraTaskProof', 'cowork'],
    proposito:
      'TodoToken es la publicación: el encargo que tú, como socio de una agencia, publicas para la comunidad y administras.',
    comoFunciona:
      'Publicas un encargo desde CoWork y queda registrado a tu nombre dentro de tu agencia. Cada socio administra únicamente lo que él mismo publicó: lo de otros socios de la agencia no aparece en tu vista.',
    comoSeObtiene:
      'Siendo socio de una Agencia Ciudadan y publicando tareas desde CoWork.',
    paraQueSirve:
      'Te da el control de tus propias publicaciones: ver qué publicaste, en qué estado está cada encargo y dar seguimiento a su avance, incluidas las resoluciones recibidas.',
    miActividad:
      'La administración de tus tareas publicadas ya existe y se alimenta del backend con tu identidad verificada. Si todavía no eres socio de una agencia, la pantalla te lo indica en lugar de mostrar datos inventados.',
    acciones:
      'Mis tareas publicadas lleva al destino real de administración de tus publicaciones en CoWork.',
    reglas:
      'Derechos: administrar lo que publicaste y conocer las resoluciones recibidas. Obligaciones: definir el alcance y la recompensa con claridad, y atender las correcciones y calificaciones de las resoluciones. TodoToken no es un activo negociable. Fiscalidad: si el encargo define recompensa en efectivo, el tratamiento fiscal de ese pago depende de la operación concreta; Ciudadan no afirma exenciones generales. Privacidad: la información de quienes resuelven se muestra según tu función como publicador y no se publica en esta ficha. Vías de revisión: correcciones y apelaciones por CoWork.',
    saberMas: 'En la wiki: la ficha de Task y Proof, y la sección CoWork.',
    estado:
      'Operativo: la administración de tus tareas publicadas ya existe en el destino real de CoWork y usa tu identidad verificada.',
  },
  evaluation: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['carteraEvaluation', 'cowork'],
    proposito:
      'Evaluation reúne los instrumentos de valoración, las evaluaciones realizadas y el historial de desempeño dentro de Ciudadan.',
    comoFunciona:
      'Hay dos cosas que no se mezclan. Por un lado, el desempeño cooperativo de socios de agencia, que se mide en seis aristas: cumplimiento, calidad, eficiencia, colaboración, iniciativa y confiabilidad. Por otro, las valoraciones de ventas, que pueden usar una dimensión de cinco estrellas. La reputación de compras y la de desempeño cooperativo se llevan por separado.',
    comoSeObtiene:
      'Resolviendo trabajo dentro del CoWork: cuando tu resolución se califica, la evaluación queda registrada con su calificación, el comentario de quien calificó y la fecha.',
    paraQueSirve:
      'Es tu historial de desempeño: ver cómo se ha valorado tu trabajo, qué comentarios recibiste y cuál es tu promedio. En el ecosistema es la base de la reputación y de la confianza que otras personas y agencias depositan en ti.',
    miActividad:
      'La ficha muestra tus evaluaciones reales leídas de tus tareas calificadas, con promedio y total. Si todavía no has resuelto tareas calificadas, verás el estado vacío correspondiente en lugar de datos de ejemplo.',
    acciones:
      'Tus evaluaciones se consultan en esta misma ficha. Los instrumentos de valoración y el factor de seis aristas se documentan aquí; su implementación y sus ponderaciones son un pendiente.',
    reglas:
      'Derechos: conocer cada evaluación que recibes, con su comentario, y solicitar corrección o apelación de una calificación. Obligaciones: calificar con veracidad cuando te corresponda. Instrumentos: pueden ser propuestos por miembros o socios y son aprobados por la asamblea federal conforme a los acuerdos confederales. Esa aprobación del instrumento no implica que cada reseña individual pase por asamblea. El factor de seis aristas aplica exclusivamente a socios de agencia y no tiene ponderaciones ni efectos económicos declarados: no se afirman pesos ni consecuencias que no estén definidos. Las valoraciones de cinco estrellas de ventas no se mezclan con el desempeño cooperativo. Fiscalidad: una evaluación no genera por sí misma un pago. Privacidad: los comentarios de una evaluación son visibles para quienes participan en ese trabajo y no se publican en esta ficha. Vías de revisión: corrección y apelación por CoWork.',
    saberMas: 'En la wiki: la ficha de Evaluation (desempeño e instrumentos) y CoWork.',
    estado:
      'Operativo en lo que muestra: tus evaluaciones reales, su promedio y su total se leen de tus tareas calificadas. El factor de seis aristas y los instrumentos aprobados por asamblea están documentados como diseño; no hay ponderaciones implementadas.',
    aristas: [
      'Cumplimiento',
      'Calidad',
      'Eficiencia',
      'Colaboración',
      'Iniciativa',
      'Confiabilidad',
    ],
  },
  vote: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['carteraVote'],
    proposito:
      'Vote es tu habilitación personal para una votación concreta, con su vigencia.',
    comoFunciona:
      'No es un saldo ni una moneda: es la habilitación de participar en una votación determinada mientras esté vigente. Se distingue lo pendiente de votar del historial de lo ya votado.',
    comoSeObtiene:
      'La emisión de habilitaciones de voto no está implementada: se desarrollará en el bloque 7 junto con la gobernanza.',
    paraQueSirve:
      'Que la comunidad pueda decidir sobre temas colectivos (prioridades, proyectos, reglas de la cooperativa) de forma registrada y verificable, en lugar de decisiones tomadas sin trazabilidad.',
    acciones:
      'La sección de votaciones existente se puede visitar como marcador de posición. No hay votaciones ni emisión de votos: no se muestra ningún botón operativo para votar.',
    reglas:
      'La emisión, el uso único, el cierre, la privacidad y las colecciones de Vote se desarrollarán en el bloque 7; no están definidos en este bloque y aquí no se anticipan sus reglas. Cuando existan, la habilitación será personal e intransferible para la votación a la que corresponda. Privacidad: el sentido de un voto es un dato sensible y su tratamiento se definirá junto con el módulo. Vías de revisión: se definirán con el módulo de gobernanza.',
    saberMas: 'En la wiki: la ficha de Vote (habilitación de voto).',
    estado:
      'En desarrollo, a cargo del bloque 7. La sección de votaciones es navegable como marcador de posición y lo indica con claridad: no existen votaciones ni emisión de votos.',
  },
  id: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['carteraId'],
    proposito:
      'ID reúne tu identidad y tus verificaciones independientes dentro de Ciudadan.',
    comoFunciona:
      'Cada verificación es independiente de las demás: cuenta vinculada, correo, teléfono, identidad documental validada por agencia y otros atributos pertinentes. Tener Google o teléfono vinculados NO equivale a tener identidad documental validada.',
    comoSeObtiene:
      'Con tu cuenta y completando cada verificación. Las verificaciones documentales las valida una agencia; la emisión formal de credenciales digitales no está implementada.',
    paraQueSirve:
      'Que tu identidad y tus logros sean verificables dentro de Ciudadan sin depender de capturas de pantalla ni de declaraciones sin respaldo, y que cada función tenga acceso sólo a lo que le corresponde.',
    acciones:
      'Ver mi identidad lleva a la sección real de identidad. La emisión formal de credenciales digitales no está implementada y no se muestra como acción.',
    reglas:
      'Privacidad: los datos públicos y los privados se tratan de forma distinta, con acceso limitado según la función, la finalidad y la autorización de quien consulta. Esta ficha editorial no expone documentos ni datos sensibles: no muestra números de documento, imágenes ni comprobantes. Derechos: conocer qué verificaciones tienes y en qué estado. Obligaciones: que los documentos que aportes sean tuyos y verdaderos. Auditorías y trazabilidad forman parte del diseño del sistema de identidad; no están implementadas y esta ficha no afirma que lo estén. Vías de revisión: una verificación rechazada se atiende por la agencia que la evaluó y por los canales de atención de la plataforma.',
    saberMas: 'En la wiki: la ficha de ID (identidad y verificaciones).',
    estado:
      'En desarrollo. La sección de identidad es navegable como marcador de posición y distingue lo que existe hoy (tu cuenta y tus verificaciones dentro de CoWork) de lo que sigue siendo futuro (credenciales digitales verificables).',
  },
  skill: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['carteraSkill', 'cowork'],
    proposito:
      'Skill es la acreditación de capacidades dentro de Ciudadan: representa habilidades y conocimientos demostrados y verificables.',
    comoFunciona:
      'El test aporta evidencia y la agencia correspondiente completa la validación. Una habilidad no queda acreditada sólo por declararla ni por el resultado del test por sí solo: la validación la cierra la agencia.',
    comoSeObtiene:
      'A través de tu actividad real: tareas completadas, evaluaciones recibidas y las verificaciones que ya existen en CoWork. Las habilidades que tengas asociadas a tu perfil aparecen listadas en esta ficha.',
    paraQueSirve:
      'Sirve como evidencia de lo que sabes hacer y no como una autodeclaración: permite a las agencias y a la comunidad identificar capacidades demostradas.',
    miActividad:
      'La relación entre usuarios y habilidades existe en el modelo y esta ficha muestra tus habilidades reales cuando están asociadas a tu perfil. Si no tienes ninguna asociada, verás el estado vacío correspondiente.',
    acciones:
      'Tus habilidades se consultan en esta misma ficha. El test de habilidades y las validaciones por agencia son un pendiente: no se muestra ningún botón operativo para ellos.',
    reglas:
      'Derechos: conocer qué habilidades tienes acreditadas y en qué estado, y solicitar revisión de una validación. Obligaciones: la evidencia que aportes debe ser tuya. Vías de aprobación: la asamblea federal puede aprobar vías para acreditar habilidades sin EvaluationToken; un administrador individual no puede hacerlo por su cuenta. Fiscalidad: una acreditación de habilidad no genera por sí misma un pago ni un rendimiento. Privacidad: el contenido de tus pruebas y validaciones no se expone en esta ficha. Vías de revisión: la agencia que validó y los canales de atención de la plataforma.',
    saberMas: 'En la wiki: la ficha de Skill (acreditación de capacidades) y CoWork.',
    estado:
      'Parcialmente operativo: la relación entre usuarios y habilidades existe en el modelo y la ficha muestra tus habilidades reales cuando están asociadas a tu perfil. El test, la validación por agencia y las credenciales de habilidad están en desarrollo.',
  },
  social: {
    version: CONTENIDO_VERSION,
    fecha: CONTENIDO_FECHA,
    wiki: ['carteraSocial'],
    proposito:
      'Social reúne los méritos comunitarios: tu aporte a la comunidad más allá del trabajo remunerado.',
    comoFunciona:
      'Los méritos comunitarios son útiles al postularse para cargos de agencias u otras funciones públicas del ecosistema. Las dinámicas concretas de reconocimiento todavía están por definir.',
    comoSeObtiene:
      'Participando en la comunidad: publicaciones, apoyo a otras personas, eventos y las demás formas de interacción comunitaria que ya existen en el ecosistema. No hay un saldo ni una emisión automática de méritos.',
    paraQueSirve:
      'Reconocer el aporte comunitario, que sostiene la vida de la cooperativa pero no siempre se mide como trabajo productivo.',
    acciones:
      'Ir a la comunidad lleva a la comunidad real de Ciudadan, que sí existe. No hay puntos, ni recompensas monetarias, ni postulación automática a cargos: esas dinámicas están por definir.',
    reglas:
      'Las dinámicas de Social están por definir y esta ficha no las anticipa: no existen puntos acumulados, ni recompensas monetarias, ni acceso automático a cargos. Los méritos comunitarios, cuando se definan, servirán como elementos de postulación y su valoración corresponderá a quienes evalúen las candidaturas conforme a los acuerdos aplicables; no otorgan por sí mismos un cargo. Fiscalidad: no hay ingreso ni rendimiento asociado a Social. Privacidad: tu actividad comunitaria se muestra según su naturaleza y no se publica en esta ficha. Vías de revisión: se definirán junto con las dinámicas.',
    saberMas: 'En la wiki: la ficha de Social (méritos comunitarios).',
    estado:
      'Informativo: la ficha explica el concepto y enlaza a la comunidad real de Ciudadan. No hay saldo ni emisión de méritos: las dinámicas están por definir y se invita a participar en su construcción.',
  },
  // __END__ — fin de las fichas.
};
