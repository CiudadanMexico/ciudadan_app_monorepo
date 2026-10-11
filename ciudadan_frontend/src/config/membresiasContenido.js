// src/config/membresiasContenido.js
//
// Contenido y datos de la experiencia comercial de membresías y servidores.
// Centraliza el copy para que sea revisable en un solo lugar. Los precios y
// la equivalencia de Labory se leen de labory.js / servidores.js (no se
// duplican aquí). No incluye prestaciones no respaldadas por datos.

import { RENTA_COMPARTIDO_LAB, equivalenciaMxn } from './labory';
import { SERVIDOR } from './servidores';

export const PRECIO_MEMBRESIA = 300; // MXN mensuales (Personal y Negocios)

// --- Membresías ---
export const MEMBRESIAS = {
  personal: {
    id: 'personal',
    order: 1,
    nombre: 'Personal',
    precio: PRECIO_MEMBRESIA,
    periodicidad: 'mensual',
    color: '#7C3AED',
    resumen:
      'Ten una agencia de referencia y acompañamiento para participar en el ecosistema Ciudadan.',
    beneficios: [
      'Afiliación a una agencia de Ciudadan',
      'Atención personalizada de tu agencia',
      'Vende Labory al pool de tu agencia, según las condiciones operativas disponibles',
    ],
    cta: 'Elegir Personal',
  },
  negocios: {
    id: 'negocios',
    order: 3,
    nombre: 'Negocios',
    precio: PRECIO_MEMBRESIA,
    periodicidad: 'mensual',
    color: '#2563EB',
    resumen:
      'Todo lo de Personal, más presencia de tu negocio en el marketplace y la comunidad.',
    beneficios: [
      'Todo lo de Personal',
      'Tienda en marketplace',
      'Publicaciones de negocio',
    ],
    cta: 'Elegir Negocios',
  },
};

// --- Servidores: modalidades (términos, no suscripciones) ---
export const MODALIDADES_SERVIDOR = {
  compartido: {
    id: 'compartido',
    subtypeKey: 'compartido',
    nombre: 'Servidor compartido',
    imagen: null, // slot listo: ciudadan_servidor_compartido.png (pendiente de recibir)
    puntos: [
      'Tú alojas el equipo en tu espacio y aportas electricidad e internet.',
      'Compartes capacidad de cómputo con la red.',
      'La administración está incluida a cambio de esa capacidad compartida; no se cobra administración adicional en esta modalidad.',
      `Recibes una renta fija de ${RENTA_COMPARTIDO_LAB} Labory mensuales por la participación acordada.`,
      'El equipo pasa a ser tuyo después del primer año.',
      'El periodo inicial es de un año; la salida con el equipo corresponde al final de ese periodo.',
      'Después del primer año, continuar compartiendo capacidad es opcional.',
    ],
    cta: 'Quiero mi servidor compartido',
  },
  privado: {
    id: 'privado',
    subtypeKey: 'privado',
    nombre: 'Servidor privado',
    imagen: null, // slot listo: ciudadan_servidor_privado.png (pendiente de recibir)
    puntos: [
      'El equipo es tuyo desde el inicio.',
      'Su capacidad de cómputo es privada y no se comparte con la red.',
      'La administración se cobra por separado.',
      'Puedes alojarlo por tu cuenta.',
      'Si Ciudadan lo hospeda, pagas electricidad según consumo, una cuota fija de internet y la administración.',
      'Puedes terminar el servicio de hospedaje/administración y recuperar tu equipo conforme al procedimiento aplicable.',
      'Retirar el equipo no implica cancelar automáticamente los pagos pendientes de la compra.',
    ],
    cta: 'Quiero mi servidor privado',
  },
};

// --- Comparación (filas adaptables a tarjetas en móvil) ---
export const COMPARACION_SERVIDOR = [
  { criterio: 'Quién aloja el equipo', compartido: 'Tú, en tu espacio', privado: 'Tú decides: tu espacio o con Ciudadan' },
  { criterio: 'Luz e internet', compartido: 'Tú (electricidad e internet)', privado: 'Tú si lo alojas; con hospedaje Ciudadan pagas luz por consumo + internet' },
  { criterio: 'Capacidad de cómputo', compartido: 'Compartida con la red', privado: 'Privada, no se comparte' },
  { criterio: 'Administración', compartido: 'Incluida (a cambio de la capacidad)', privado: 'Separada, se cobra aparte' },
  { criterio: 'Retribución en Labory', compartido: `${RENTA_COMPARTIDO_LAB} Labory al mes`, privado: 'No aplica' },
  { criterio: 'Cuándo el equipo es tuyo', compartido: 'Después del primer año', privado: 'Desde la compra' },
  { criterio: 'Periodo inicial', compartido: 'Un año', privado: 'Compra directa (sin periodo)' },
];

// --- Equivalencia de referencia de la renta (para la UI) ---
export const EQUIVALENCIA_RENTA = equivalenciaMxn(RENTA_COMPARTIDO_LAB);

// --- Pagos y renovación ---
export const PAGOS = {
  precioServidor: SERVIDOR.precioTotal,
  moneda: SERVIDOR.moneda,
  plazoObjetivo: SERVIDOR.plazoObjetivo,
  notaMsi:
    'Los meses sin intereses del servidor dependen de tu banco y medio de pago; Mercado Pago te muestra los disponibles al pagar. El plazo objetivo es a 12 meses.',
  notaRenovacion:
    'Las membresías Personal y Negocios se renuevan automáticamente cada mes. Puedes cancelar la renovación cuando quieras. La compra del servidor es un pago único y no se convierte en suscripción.',
};

// --- Preguntas frecuentes ---
export const FAQ = [
  {
    p: '¿Cuál es la diferencia entre una membresía y comprar el servidor?',
    r: 'La membresía (Personal o Negocios) es una suscripción mensual para participar en la red. El servidor es una compra única de hardware para quien quiere infraestructura propia.',
  },
  {
    p: '¿Cuál es la diferencia entre servidor compartido y privado?',
    r: 'En el compartido alojas el equipo, compartes cómputo y recibes 50 Labory al mes; pasa a ser tuyo tras el primer año. En el privado el equipo es tuyo desde el inicio y su cómputo no se comparte; la administración se cobra aparte.',
  },
  {
    p: '¿Quién paga la luz, el internet y la administración?',
    r: 'Compartido: tú la luz e internet; la administración está incluida. Privado: si lo alojas tú corres con todo; si lo hospeda Ciudadan, pagas luz según consumo, cuota de internet y administración.',
  },
  {
    p: '¿Cuándo pasa a ser mío el servidor?',
    r: 'En la modalidad compartida, después del primer año. En la privada, es tuyo desde la compra.',
  },
  {
    p: '¿Qué pasa después del primer año en la modalidad compartida?',
    r: 'Puedes salir con tu equipo. Después del primer año, continuar compartiendo capacidad es opcional.',
  },
  {
    p: '¿Cómo recibo los 50 Labory?',
    r: 'Como renta mensual por la participación acordada en la modalidad compartida.',
  },
  {
    p: '¿Qué significa la equivalencia en pesos de Labory?',
    r: 'Es una referencia interna del esquema de intercambio entre agencias y nodos (1 Labory ≈ $147.16 de referencia). No es efectivo garantizado, rendimiento asegurado ni descuento automático de tu mensualidad. El precio de venta de cada nodo puede variar según la demanda y sus condiciones.',
  },
  {
    p: '¿Qué formas de pago hay?',
    r: 'Mercado Pago. Las membresías se contratan con renovación automática. El servidor es una compra única con meses sin intereses según tu banco y medio de pago (12 meses como objetivo).',
  },
  {
    p: '¿Cómo funciona la renovación de las membresías?',
    r: 'Se renueva automáticamente cada mes y puedes cancelarla cuando quieras. La compra del servidor no es una suscripción renovable.',
  },
];

// --- Servicios de PubliA ---
// Nota: los servicios y precios concretos de PubliA se consultan de su base
// de datos (pendiente de credenciales). Se presentan como servicios con una
// vía real de contacto, sin inventar precios ni prestaciones.
export const PUBLIA = {
  nombre: 'Servicios de PubliA',
  intro:
    'PubliA ofrece servicios complementarios para potenciar tu presencia y operación dentro del ecosistema Ciudadan.',
  cta: 'Conocer servicios de PubliA',
};
