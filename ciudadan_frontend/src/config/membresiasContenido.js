// src/config/membresiasContenido.js
//
// Contenido editorial de la experiencia comercial de membresías y servidores.
// Precios y beneficios reales viven en Strapi (membresias-tipos) y se leen en
// runtime; este archivo aporta el copy, el mapeo por order y las etiquetas de
// CTA. La equivalencia de Labory viene de labory.js (fuente única).

import { RENTA_COMPARTIDO_LAB, equivalenciaMxn } from './labory';
import { SERVIDOR } from './servidores';

export const PRECIO_MEMBRESIA = 300; // MXN mensuales (Personal y Negocios)

// Mapeo order de Strapi -> experiencia. Si un order cambia en Strapi, basta
// con ajustarlo aquí; los precios/beneficios NUNCA se duplican en el frontend.
export const PLANES_ORDER = {
  personal: 1,
  conductor: 2,
  negocios: 3,
  servidor: 10,
};

// Copy editorial por plan (resumen y CTA). Los beneficios reales se leen de
// Strapi; estos resúmenes NO prometen prestaciones no respaldadas.
export const PLANES_COPY = {
  personal: {
    id: 'personal',
    nombre: 'Personal',
    icono: 'person',
    destacado: true,
    resumen:
      'Ten una agencia de referencia y acompañamiento para participar en el ecosistema Ciudadan.',
    cta: 'Elegir Personal',
    ancla: '#personal',
  },
  conductor: {
    id: 'conductor',
    nombre: 'Conductor',
    icono: 'drive_eta',
    destacado: false,
    resumen:
      'Perfil de conductor, tú cobras directamente tus viajes y usas la aplicación de conductor.',
    cta: 'Elegir Conductor',
    ancla: '#conductor',
  },
  negocios: {
    id: 'negocios',
    nombre: 'Negocios',
    icono: 'storefront',
    destacado: false,
    resumen:
      'Todo lo de Personal, más presencia de tu negocio en el marketplace y la comunidad.',
    cta: 'Elegir Negocios',
    ancla: '#negocios',
  },
  servidor: {
    id: 'servidor',
    nombre: 'Servidor',
    icono: 'dns',
    resumen: 'Infestructura propia de cómputo con dos modalidades de operación.',
    ancla: '#servidores',
  },
};

// --- Hero ---
export const HERO = {
  kicker: 'Ecosistema Ciudadan',
  titulo: 'Elige cómo participar',
  subtitulo:
    'Únete a la red con una membresía a tu medida o construye tu propia infraestructura con un servidor Ciudadan.',
  ctaPrimario: 'Ver membresías',
  ctaSecundario: 'Explorar servidores',
};

// --- Hero de la página de detalles ---
export const HERO_DETALLES = {
  kicker: 'Membresías y servidores',
  titulo: 'Todo lo que necesitas saber',
  subtitulo:
    'Beneficios, modalidades de servidor, comparativa, formas de pago y preguntas frecuentes en un solo lugar.',
};

// --- Servidores: modalidades (términos, no suscripciones) ---
export const MODALIDADES_SERVIDOR = {
  compartido: {
    id: 'compartido',
    subtypeKey: 'compartido',
    nombre: 'Servidor compartido',
    imagen: null, // slot listo: ciudadan_servidor_compartido.png
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
    imagen: null, // slot listo: ciudadan_servidor_privado.png
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

// --- Comparación (encabezados explícitos) ---
export const COMPARACION_SERVIDOR = {
  encabezados: ['Aspecto', 'Compartido', 'Privado'],
  filas: [
    { criterio: 'Quién aloja el equipo', compartido: 'Tú, en tu espacio', privado: 'Tú decides: tu espacio o Ciudadan' },
    { criterio: 'Luz e internet', compartido: 'Los pones tú', privado: 'Los pones tú si lo alojas; si lo hospeda Ciudadan, luz según consumo y cuota de internet' },
    { criterio: 'Capacidad de cómputo', compartido: 'Compartida con la red', privado: 'Privada' },
    { criterio: 'Administración', compartido: 'Incluida', privado: 'Se cobra por separado' },
    { criterio: 'Retribución en Labory', compartido: `${RENTA_COMPARTIDO_LAB} Labory mensuales`, privado: 'No aplica' },
    { criterio: '¿Cuándo el equipo es tuyo?', compartido: 'Después del primer año', privado: 'Desde la compra' },
    { criterio: 'Periodo inicial', compartido: 'Un año', privado: 'Compra directa (sin periodo)' },
  ],
};

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
    'Las membresías se renuevan automáticamente cada mes; puedes cancelar la renovación cuando quieras. La compra del servidor es un pago único y no se convierte en suscripción.',
  ayudaCta:
    'Todo se paga a través de Mercado Pago: tarjeta, efectivo en tiendas, transferencia SPEI o saldo en tu cuenta.',
};

// --- Preguntas frecuentes ---
export const FAQ = [
  {
    p: '¿Cuál es la diferencia entre una membresía y comprar el servidor?',
    r: 'La membresía (Personal, Conductor o Negocios) es una suscripción mensual para participar en la red. El servidor es una compra única de hardware para quien quiere infraestructura propia.',
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
    r: 'Como renta mensual por tu participación en la modalidad compartida: los 50 Labory los recibes tú, no son un pago que tú hagas.',
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
    r: 'Se renueva automáticamente cada mes y puedes cancelarla cuando quieras. Verás el importe, la periodicidad y la próxima renovación antes de confirmar. La compra del servidor no es una suscripción renovable.',
  },
];

// --- Servicios de PubliA ---
export const PUBLIA = {
  nombre: 'Servicios de PubliA',
  intro:
    'PubliA ofrece servicios complementarios para potenciar tu presencia y operación dentro del ecosistema Ciudadan.',
  servicios: [
    'Servicio de alojamiento de nodos',
    'Servicios de telecomunicaciones y acceso a la red',
    'Servicios de empresas y publiempresarial',
    'Servicios de soporte y operación',
  ],
  notaCatalogo:
    'Los servicios y precios concretos de PubliA se consultan directamente con el equipo.',
  cta: 'Conocer servicios de PubliA',
};
