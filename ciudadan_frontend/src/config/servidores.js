// src/config/servidores.js
//
// Datos comerciales y configuración de referencia del servidor Ciudadan.
// El servidor es una COMPRA de hardware (pago único), NO una suscripción
// renovable. No exponer costos internos, márgenes ni proveedores.

export const SERVIDOR = {
  moneda: 'MXN',
  order: 10, // order del plan membresias_tipos en Strapi (checkout)
  precioTotal: 55000, // MXN, precio comercial acordado
  specs: [
    'HP Z4 G4 Workstation (reacondicionada)',
    'Intel Xeon W-2145 · 8 núcleos / 16 hilos',
    '32 GB de RAM DDR4',
    'SSD de 512 GB',
    'NVIDIA GeForce RTX 3090 (usada) · 24 GB VRAM',
  ],
  // Plazos de referencia para meses sin intereses (MSI). La disponibilidad
  // real la determina Mercado Pago según el banco y medio de pago del
  // comprador; aquí solo se calcula la mensualidad de referencia.
  plazoObjetivo: 12,
  plazosDisponibles: [12, 24],
};

// Redondeo monetario consistente a 2 decimales.
const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Mensualidad de referencia para un plazo dado (división del precio total).
// NO agrega comisiones ni modifica el total acordado; es la mensualidad
// ilustrativa que Mercado Pago mostrará como MSI si el medio de pago y el
// banco lo permiten.
export function mensualidadServidor(plazo) {
  const meses = Number(plazo);
  if (!Number.isFinite(meses) || meses <= 0) {
    throw new Error(`Plazo inválido para mensualidad: ${plazo}`);
  }
  return redondear(SERVIDOR.precioTotal / meses);
}

// Todas las mensualidades de referencia disponibles.
export function mensualidadesServidor() {
  return SERVIDOR.plazosDisponibles.map((plazo) => ({
    plazo,
    mensualidad: mensualidadServidor(plazo),
    moneda: SERVIDOR.moneda,
  }));
}
