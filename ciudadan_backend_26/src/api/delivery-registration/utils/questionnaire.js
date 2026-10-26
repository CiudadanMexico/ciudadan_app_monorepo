'use strict';

/**
 * Cuestionario autonomo de capacitacion de repartidores (spec §3.12, §6.9):
 * cinco modulos (vialidad, higiene, app, reglas, incidentes), examen de 10
 * preguntas, aprobado con >= 8 aciertos, reintentos permitidos.
 *
 * Las respuestas correctas JAMAS viajan al frontend: el endpoint expone
 * `preguntasPublicas()` y la calificacion es server-side. Cada intento se
 * persiste en delivery-training-attempt con la version presentada.
 */

const { EXAMEN_MINIMO_APROBATORIO, CUESTIONARIO_VERSION } = require('./constants');

/** Banco de preguntas versionado. 2 preguntas por modulo, 5 modulos = 10. */
const PREGUNTAS = [
  {
    id: 'vialidad-1',
    modulo: 'vialidad',
    pregunta: 'Al circular en bicicleta o motocicleta por la via publica, ¿en que sentido debes hacerlo?',
    opciones: [
      'En sentido contrario al flujo vehicular (contramano)',
      'En el mismo sentido del flujo vehicular',
      'Unicamente por la banqueta',
      'En cualquier lado mientras vayas despacio',
    ],
    correcta: 1,
  },
  {
    id: 'vialidad-2',
    modulo: 'vialidad',
    pregunta: 'Al llegar a un cruce peatonal con personas cruzando, ¿que haces?',
    opciones: [
      'Acelero para pasar antes de que terminen de cruzar',
      'Me detengo y cedo el paso',
      'Toco el claxon y sigo mi camino',
      'Los esquivo sin reducir la velocidad',
    ],
    correcta: 1,
  },
  {
    id: 'higiene-1',
    modulo: 'higiene',
    pregunta: '¿Cuando debes limpiar y desinfectar tu mochila termica o equipo de reparto?',
    opciones: [
      'Solo cuando huele mal',
      'Al final de cada jornada y siempre que cambies el tipo de alimento que transportas',
      'Nunca: se desinfecta sola',
      'Una vez al mes',
    ],
    correcta: 1,
  },
  {
    id: 'higiene-2',
    modulo: 'higiene',
    pregunta: 'Un alimento llega con el empaque roto o abierto, ¿que haces?',
    opciones: [
      'Lo entrego igual y aviso al usuario al entregarse',
      'No lo entrego y lo reporto de inmediato al restaurante',
      'Le quito el empaque danado y lo tapo con otro',
      'Lo reparo con cinta adhesiva',
    ],
    correcta: 1,
  },
  {
    id: 'app-1',
    modulo: 'app',
    pregunta: 'Al subir tus documentos de identidad y vehiculo en la app, ¿que debes cuidar?',
    opciones: [
      'Que sean legibles, vigentes y con todos los datos visibles',
      'Que pesen poco, aunque se vean borrosos',
      'Subir cualquier archivo parecido al documento',
      'Usar documentos de otra persona que se parezca a mi',
    ],
    correcta: 0,
  },
  {
    id: 'app-2',
    modulo: 'app',
    pregunta: 'Si no vas a poder completar una entrega que ya aceptaste, ¿que haces primero?',
    opciones: [
      'Abandonar el pedido y apagar el telefono',
      'Marcar el problema en la app y seguir el protocolo de incidentes',
      'Pedirle a otro repartidor que la termine sin avisar',
      'Esperar a que alguien mas lo note',
    ],
    correcta: 1,
  },
  {
    id: 'reglas-1',
    modulo: 'reglas',
    pregunta: '¿Puedes prestar tu cuenta de repartidor a otra persona?',
    opciones: [
      'Si, si es un familiar de confianza',
      'No: la cuenta es personal e intransferible',
      'Si, cobrandole una comision',
      'Solo los fines de semana',
    ],
    correcta: 1,
  },
  {
    id: 'reglas-2',
    modulo: 'reglas',
    pregunta: '¿La aprobacion de tu expediente como repartidor implica por si sola una relacion laboral con Ciudadan?',
    opciones: [
      'Si, automaticamente al aprobarse',
      'No: la aprobacion documental no implica conformidad laboral ni fiscal',
      'Si, porque complete la capacitacion',
      'Solo si opero en CDMX',
    ],
    correcta: 1,
  },
  {
    id: 'incidentes-1',
    modulo: 'incidentes',
    pregunta: 'Si tienes un accidente durante la ruta, ¿cual es tu primera prioridad?',
    opciones: [
      'Proteger el pedido para que no se danie',
      'Tu seguridad y la de terceros, y avisar a emergencias si hay heridos',
      'Retirarte del lugar para no tener problemas',
      'Continuar la entrega y reportar despues',
    ],
    correcta: 1,
  },
  {
    id: 'incidentes-2',
    modulo: 'incidentes',
    pregunta: 'Si un usuario te pide datos personales de otro cliente o del restaurante, ¿que haces?',
    opciones: [
      'Se los comparto si me paga extra',
      'Me niego y lo reporto como incidente en la app',
      'Se los comparto si aseguran conocerlo',
      'Pregunto en un grupo de repartidores si alguien los tiene',
    ],
    correcta: 1,
  },
];

/** Preguntas sin la respuesta correcta (lo unico que viaja al cliente). */
function preguntasPublicas() {
  return PREGUNTAS.map(({ id, modulo, pregunta, opciones }) => ({
    id,
    modulo,
    pregunta,
    total: opciones.length,
    opciones,
  }));
}

/**
 * Califica un examen.
 * @param {Object<string, number>} respuestas mapa { [pregunta.id]: indice_opcion }
 * @returns {{ ok, score, passed, total, respuestasInvalidas: string[] }}
 */
function calificarExamen(respuestas) {
  const entrada = respuestas && typeof respuestas === 'object' && !Array.isArray(respuestas)
    ? respuestas
    : {};
  const respuestasInvalidas = [];
  let score = 0;

  for (const pregunta of PREGUNTAS) {
    const indice = entrada[pregunta.id];
    if (
      Number.isInteger(indice) &&
      indice >= 0 &&
      indice < pregunta.opciones.length &&
      indice === pregunta.correcta
    ) {
      score += 1;
    } else if (indice !== undefined && indice !== null) {
      respuestasInvalidas.push(pregunta.id);
    }
    // Sin respuesta = incorrecta (cuenta en el total, no en el score).
  }

  return {
    ok: true,
    version: CUESTIONARIO_VERSION,
    score,
    total: PREGUNTAS.length,
    passed: score >= EXAMEN_MINIMO_APROBATORIO,
    respuestasInvalidas,
  };
}

module.exports = {
  CUESTIONARIO_VERSION,
  EXAMEN_MINIMO_APROBATORIO,
  PREGUNTAS,
  preguntasPublicas,
  calificarExamen,
};
