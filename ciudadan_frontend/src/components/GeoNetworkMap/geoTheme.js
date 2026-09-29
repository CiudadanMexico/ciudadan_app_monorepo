/**
 * geoTheme.js — Tokens visuales y paleta temática de Ciudadan para GeoNetworkMap.
 *
 * Basado en la identidad visual de Ciudadan:
 *   - Fondo oscuro: #07120f / #0b1a16
 *   - Verde principal: #19d79c
 *   - Turquesa complementario: #2ee6c8
 *   - Acento secundario (amarillo/oro): #efe92f / #f5c842
 *   - Superficies glass/acrílicas oscuras con bordes sutiles.
 */

export const geoTokens = {
  // Estados de disponibilidad / negocio
  available: {
    fill: '#19d79c',
    fillOpacity: 0.28,
    stroke: '#19d79c',
    strokeWidth: 1.2,
    hoverFill: '#19d79c',
    hoverFillOpacity: 0.55,
    glow: 'rgba(25, 215, 156, 0.45)',
    text: '#ffffff',
    label: 'Disponible',
  },
  processing: {
    fill: '#f5c842',
    fillOpacity: 0.32,
    stroke: '#f5c842',
    strokeWidth: 1.2,
    hoverFill: '#f5c842',
    hoverFillOpacity: 0.60,
    glow: 'rgba(245, 200, 66, 0.45)',
    text: '#ffffff',
    label: 'En proceso',
  },
  assigned: {
    fill: '#2ee6c8',
    fillOpacity: 0.48,
    stroke: '#2ee6c8',
    strokeWidth: 1.6,
    hoverFill: '#2ee6c8',
    hoverFillOpacity: 0.72,
    glow: 'rgba(46, 230, 200, 0.55)',
    text: '#ffffff',
    label: 'Asignado',
  },
  disabled: {
    fill: '#20322d',
    fillOpacity: 0.25,
    stroke: '#35534a',
    strokeWidth: 0.8,
    hoverFill: '#29403a',
    hoverFillOpacity: 0.35,
    glow: 'none',
    text: '#8fa8a0',
    label: 'Inactivo',
  },

  // Selección activa
  selected: {
    stroke: '#ffffff',
    strokeWidth: 2.4,
    filter: 'url(#geo-glow-selected)',
  },

  // Hover genérico
  hover: {
    strokeWidth: 2.0,
    cursor: 'pointer',
  },

  // Fondos y lienzo
  background: {
    canvas: '#07120f',
    surface: '#0b1d17',
    card: 'rgba(11, 29, 23, 0.85)',
    border: 'rgba(46, 230, 200, 0.18)',
    borderActive: 'rgba(25, 215, 156, 0.55)',
  },

  // Tipografía y textos
  text: {
    primary: '#ffffff',
    secondary: '#a2c4b9',
    muted: '#638479',
    highlight: '#2ee6c8',
    contrastDark: '#07120f',
  },

  // Red / conexiones / nodos
  network: {
    node: '#2ee6c8',
    edge: 'rgba(46, 230, 200, 0.35)',
    edgeActive: '#19d79c',
  },
};

/**
 * Resuelve el color de relleno y estilo para un token dado.
 * Si el token no existe, usa `disabled` como fallback seguro.
 */
export function resolveFillToken(token, themeOverrides = {}) {
  const base = geoTokens[token] || geoTokens.available;
  const override = themeOverrides[token] || {};
  return { ...base, ...override };
}

/**
 * Traduce un valor de estado al nombre legible en español.
 */
export function getStatusLabel(status) {
  switch (status) {
    case 'available':
      return 'Disponible';
    case 'processing':
      return 'En proceso';
    case 'assigned':
      return 'Asignado';
    case 'disabled':
      return 'Inactivo';
    default:
      return status || 'Sin datos';
  }
}
