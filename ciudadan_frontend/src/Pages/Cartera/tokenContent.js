// Textos largos de cada moneda/token de la Cartera Ciudadan.
//
// Estructura por token:
//   queEs          — explicación conceptual
//   comoSeObtiene  — sólo si HOY está definido; si no existe funcionalidad real,
//                    se dice explícitamente (nunca se afirma como implementado)
//   paraQueSirve   — función dentro del ecosistema Ciudadan
//   ecosistema     — relación con Cooperativismo 6.0, agencias, Coowork, Labory,
//                    reputación, habilidades, comunidad y gobernanza (según aplique)
//   estado         — qué existe hoy y qué sigue en desarrollo
//
// Regla del proyecto: NO inventar funcionalidad como si ya estuviera operando.
export const TOKEN_CONTENT = {
  resumen: {
    queEs:
      'El resumen de tu Cartera Ciudadan reúne, en una sola vista, los saldos y tokens que tienes activos dentro del ecosistema: pesos MXN, Labory (la moneda interna) y los tokens de actividad (TaskToken, TodoToken, Evaluation-Token).',
    paraQueSirve:
      'Sirve como punto de partida para saber qué tienes hoy y qué puedes hacer con cada cosa: revisar tu saldo, ver tu historial de movimientos y saltar a la sección correspondiente del ecosistema.',
    ecosistema:
      'Es la puerta de entrada al modelo de Cooperativismo 6.0 de Ciudadan, donde el trabajo, el aprendizaje, la reputación y la participación comunitaria se registran en distintas monedas y tokens que juntos describen tu aporte a la comunidad.',
    estado:
      'Los saldos que aparecen aquí (Laborys, direcciones de wallet e historial de transacciones) se leen de tu cartera real en el backend. Los tokens cuyo módulo todavía está en desarrollo lo indican de forma explícita en su propia ficha.',
  },
  pesos: {
    queEs:
      'Pesos MXN es la representación del dinero fiat (peso mexicano) dentro de tu Cartera. No es una criptomoneda ni un token: es la referencia para mostrar el valor equivalente de tus Laborys y tus pagos en efectivo.',
    comoSeObtiene:
      'Los montos en efectivo se registran cuando una tarea que resolviste tiene una recompensa en efectivo definida por quien la publicó (campo de recompensa en pesos del `todo`) y esa tarea se paga.',
    paraQueSirve:
      'Te permite leer en pesos lo que representan tus recompensas y tu saldo en Laborys, sin tener que convertir mentalmente.',
    ecosistema:
      'Dentro del modelo cooperativo, los pesos conviven con la moneda interna (Labory) y con los tokens de actividad. Ciudadan no convierte automáticamente tus Laborys a pesos: la referencia se muestra únicamente como equivalencia informativa.',
    estado:
      'La equivalencia mostrada hoy es 1 Labory = 80 MXN y es una constante de referencia del frontend, NO un tipo de cambio operado por la plataforma. Los datos de ingresos y movimientos provienen de tus registros reales.',
  },
  labory: {
    queEs:
      'Labory (LBY) es la moneda interna de Ciudadan. Se acredita dentro de tu cartera y refleja el trabajo que aportas a la comunidad resolviendo tareas del CoWork.',
    comoSeObtiene:
      'De forma automática: cuando una tarea que resolviste se califica, el backend acredita los Laborys correspondientes en tu cartera, en la misma transacción que registra la calificación. También se pueden adquirir en el marketplace (sección de compra de Labory).',
    paraQueSirve:
      'Sirve para acumular valor dentro del ecosistema por tu trabajo, consultar tu historial de movimientos y usarlo en el marketplace de Ciudadan.',
    ecosistema:
      'Labory es el eje económico del modelo cooperativo: conecta Coowork (donde se genera), las agencias (que publican tareas), tu reputación (tareas calificadas) y el marketplace (donde se consume). El saldo y los Laborys ganados se guardan en tu cartera.',
    estado:
      'Operativo: saldo, Laborys ganados e historial de movimientos se leen de tu cartera real y el pago automático al calificar está implementado en el backend. La venta de Laborys (convertirlos a pesos) todavía está en desarrollo y así se indica en la ficha.',
  },
  itoken: {
    queEs:
      'El Ciudadan I-Token es la ficha de participación que representa inversión en el ecosistema Ciudadan: agrupa los tokens de inversión y los rendimientos que se van generando.',
    comoSeObtiene:
      'Hoy la sección existe y muestra los campos de inversión y rendimientos de tu cartera, pero el flujo completo de inversión (aportar, calcular y liquidar rendimientos) todavía no está implementado en la plataforma.',
    paraQueSirve:
      'Su objetivo es que una persona pueda participar económicamente en el ecosistema y dar seguimiento al valor generado por su aporte, dentro del mismo lugar donde ve el resto de sus monedas y tokens.',
    ecosistema:
      'Se integra con el modelo de Cooperativismo 6.0: el capital aportado sostiene la operación de la comunidad (agencias, Coowork, marketplace) y los rendimientos se derivan de la actividad real del ecosistema, no de una promesa fija.',
    estado:
      'En desarrollo. Los campos de tokens y rendimientos que ves hoy en la ficha son marcadores de posición a la espera de la colección y los campos definitivos del backend; el catálogo de I-Tokens (/cartera/itokens) ya existe y se puede visitar.',
  },
  publia: {
    queEs:
      'Publia es el ecosistema de publicidad de Ciudadan: un espacio donde las marcas y la comunidad publican anuncios, y donde las personas reciben recompensas por su atención e interacción.',
    comoSeObtiene:
      'Se participa desde el módulo de anuncios remunerados de la sección Gana, donde se registran las vistas y las interacciones reales de cada anuncio. Las recompensas dependen de la configuración de cada campaña.',
    paraQueSirve:
      'Conecta a quien quiere difundir un mensaje con quien está dispuesto a verlo, dejando un registro verificable de esa interacción dentro del ecosistema.',
    ecosistema:
      'Se relaciona con el resto de Ciudadan como una fuente de valor para la comunidad: los anuncios se miden en el backend (sesiones de anuncio, vistas y decisiones), y la actividad derivada alimenta el modelo de aporte y recompensa de la cooperativa.',
    estado:
      'El módulo de anuncios remunerados ya existe y es funcional (/gana/ver-anuncios). Publia como token no tiene todavía saldo propio en el ledger: la ficha es informativa y su botón lleva al módulo real de anuncios.',
  },
  object: {
    queEs:
      'Object-Token representa objetos y activos registrados dentro del ecosistema: cosas con valor o significado para la comunidad que pueden quedar documentadas en Ciudadan.',
    comoSeObtiene:
      'La funcionalidad para registrar objetos y vincularlos a tu cuenta todavía no está implementada; cuando lo esté, se hará desde el módulo de objetos.',
    paraQueSirve:
      'Su objetivo es dar trazabilidad a activos reales (herramientas, equipos, productos, pertenencias de una agencia) y vincularlos con las personas y las tareas de la comunidad en las que participan.',
    ecosistema:
      'Se conecta con las agencias (que suelen administrar activos compartidos) y con el CoWork (las tareas pueden requerir o producir objetos). Es la parte del modelo cooperativo que representa la dimensión material del trabajo comunitario.',
    estado:
      'En desarrollo. La ficha explica el concepto y su botón lleva a la sección de objetos, que por ahora es un marcador de posición navegable: no hay registro de objetos todavía.',
  },
  task: {
    queEs:
      'TaskToken corresponde a las tareas generales de Ciudadan: trabajos abiertos que cualquier persona elegible de la comunidad puede resolver para obtener una recompensa.',
    comoSeObtiene:
      'Resolviendo tareas publicadas y disponibles: entras a la lista de tareas generales, tomas una, entregas tu resolución y, cuando se califica, recibes la recompensa (Laborys y, si la tarea lo define, efectivo) en tu cartera.',
    paraQueSirve:
      'Es la puerta de entrada al trabajo comunitario: te dice qué se necesita hacer hoy, qué recompensa tiene y te lleva directo al tablero de tareas generales del CoWork.',
    ecosistema:
      'Es la pieza de entrada del CoWork dentro del modelo cooperativo: conecta tareas abiertas, agencias que publican, evaluación del trabajo y pago en Laborys. Las tareas generales son también el primer paso para demostrar habilidades que después se reflejan en tus tokens de reputación y habilidad.',
    estado:
      'Operativo a nivel de módulo: el listado de tareas generales, la toma de tareas y el flujo de resolución ya existen en CoWork; esta ficha lleva al tablero real.',
  },
  todo: {
    queEs:
      'TodoToken representa las tareas que un socio publica dentro de su propia Agencia Ciudadan: el trabajo que la agencia ofrece a la comunidad y que administra quien lo creó.',
    comoSeObtiene:
      'Siendo socio de una Agencia Ciudadan y publicando tareas desde CoWork. Cada tarea publicada queda registrada a nombre de quien la creó dentro de su agencia.',
    paraQueSirve:
      'Te da el control de tus propias publicaciones: ver qué publicaste, en qué estado está cada tarea y dar seguimiento a su avance. Cada socio administra únicamente las tareas que él mismo publicó: las de otros socios de la agencia no aparecen en esta vista.',
    ecosistema:
      'Es el punto donde Cooperativismo 6.0 se vuelve operativo: la agencia publica, la comunidad resuelve, el trabajo se evalúa y se paga en Laborys. TodoToken conecta a la agencia con el CoWork (tareas), con la evaluación (Evaluation-Token) y con la cartera (Labory).',
    estado:
      'Operativo: la administración de tus tareas publicadas ya existe en /coowork/mi-agencia/tareas y se alimenta del backend con tu identidad verificada. Si todavía no eres socio de una agencia, la pantalla te lo indica en lugar de mostrar datos inventados.',
  },
  evaluation: {
    queEs:
      'Evaluation-Token representa las evaluaciones que recibes por el trabajo que realizas dentro de Ciudadan: la calificación de cada tarea que resolviste, junto con la valoración de quien la revisó.',
    comoSeObtiene:
      'Resolviendo tareas o trabajos dentro del CoWork. Cuando tu resolución se califica, la evaluación queda registrada en la tarea: calificación, comentario de quien calificó y fecha.',
    paraQueSirve:
      'Es tu historial de desempeño: te permite ver cómo se ha valorado tu trabajo, qué comentarios recibiste y cuál es tu promedio. En el ecosistema, estas evaluaciones son la base de tu reputación y de la confianza que otras personas y agencias depositan en ti.',
    ecosistema:
      'Se conecta con CoWork (donde se genera), con Labory (la calificación dispara el pago), con las agencias (que revisan el trabajo) y con Skill-Token: las tareas completadas y bien evaluadas son la evidencia de tus habilidades demostradas.',
    estado:
      'Operativo: la ficha muestra tus evaluaciones reales leídas de tus tareas calificadas, con promedio y total. Si todavía no has resuelto tareas calificadas, verás el estado vacío correspondiente en lugar de datos de ejemplo.',
  },
  vote: {
    queEs:
      'Vote-Token representa la participación y la gobernanza dentro de Ciudadan: el peso de tu voz en las decisiones que afectan a la comunidad.',
    comoSeObtiene:
      'La emisión y el uso de votos todavía no está implementado en la plataforma: se definirá junto con el módulo de gobernanza.',
    paraQueSirve:
      'Su objetivo es que la comunidad pueda decidir sobre temas colectivos (prioridades, proyectos, reglas de la cooperativa) de forma registrada y verificable, en lugar de decisiones tomadas sin trazabilidad.',
    ecosistema:
      'Es la dimensión de gobernanza del Cooperativismo 6.0: se apoyará en tu identidad (Id-Token), tu reputación y tus evaluaciones para que el peso de cada voto corresponda a tu participación real en la comunidad.',
    estado:
      'En desarrollo. La sección de votaciones ya es navegable como marcador de posición y lo indica con claridad; todavía no existen votaciones ni emisión de votos.',
  },
  id: {
    queEs:
      'El Id-Token representa tu identidad digital dentro de Ciudadan y de CIDID: la base sobre la que se vinculan tu participación, tu reputación, tus habilidades y tu actividad.',
    comoSeObtiene:
      'Se construye a partir de tu cuenta y de tu trayectoria dentro del ecosistema (tareas, evaluaciones, habilidades verificadas). La emisión formal de credenciales digitales todavía no está implementada.',
    paraQueSirve:
      'Su objetivo es que tu identidad y tus logros sean verificables dentro de Ciudadan, sin depender de capturas de pantalla ni de declaraciones sin respaldo. Es el punto de anclaje de los demás tokens.',
    ecosistema:
      'En el Cooperativismo 6.0 la identidad es lo que hace posible confiar entre personas que no se conocen: conecta con las agencias (a las que perteneces), con el CoWork (lo que has hecho), con Evaluation-Token (cómo se valoró tu trabajo) y con Skill-Token (qué sabes hacer y puedes demostrar).',
    estado:
      'En desarrollo. La sección de identidad ya es navegable como marcador de posición y distingue lo que existe hoy (tu cuenta y tus verificaciones dentro de CoWork) de lo que todavía es futuro (credenciales digitales verificables).',
  },
  skill: {
    queEs:
      'El Skill-Token corresponde al concepto de Human Skill Proof: representa habilidades y conocimientos demostrados y verificables dentro del ecosistema Ciudadan.',
    comoSeObtiene:
      'A través de tu actividad real: tareas completadas, evaluaciones recibidas y las verificaciones que ya existen en CoWork. Las habilidades que tengas asociadas a tu perfil aparecen listadas en esta ficha.',
    paraQueSirve:
      'Sirve como evidencia de lo que sabes hacer y no como una autodeclaración: la idea es que tu perfil permita a las agencias y a la comunidad identificar capacidades demostradas.',
    ecosistema:
      'Se relaciona con el aprendizaje y con el trabajo: las tareas pueden requerir habilidades concretas y, al completarlas, tu perfil productivo se fortalece. Conecta con CoWork, con Evaluation-Token (evidencia de desempeño), con las verificaciones de área y con las agencias.',
    estado:
      'Parcialmente operativo: la relación entre usuarios y habilidades existe en el modelo y esta ficha muestra tus habilidades reales cuando están asociadas a tu perfil. Las validaciones automáticas y las credenciales de habilidad se encuentran en desarrollo.',
  },
  social: {
    queEs:
      'El Social-Token se relaciona con tu actividad social y comunitaria dentro de Ciudadan: lo que aportas a la comunidad más allá del trabajo remunerado.',
    comoSeObtiene:
      'Participando en la comunidad: publicaciones, apoyo a otras personas, eventos y las demás formas de interacción comunitaria que ya existen en el ecosistema. La emisión de un saldo propio sigue en definición.',
    paraQueSirve:
      'Su objetivo es reconocer el aporte comunitario, que sostiene la vida de la cooperativa pero no siempre se mide como trabajo productivo.',
    ecosistema:
      'Es la dimensión comunitaria del Cooperativismo 6.0: se articula con la comunidad (donde ocurre la interacción), con las agencias y con tu reputación, para que la participación constante también cuente.',
    estado:
      'Informativo por ahora: el botón te lleva a la comunidad real de Ciudadan. No hay saldo de Social-Token ni emisión automática todavía; esa parte se encuentra en desarrollo.',
  },
  // __END__




};
