import React from 'react';

/**
 * SvgPatternsDefs — Definiciones de patrones y filtros SVG para GeoNetworkMap.
 * Soporta: solid, diagonal, dots, crosshatch, horizontal, vertical, none.
 * Incluye filtros de resplandor para selección activa y glow.
 */
export default function SvgPatternsDefs() {
  return (
    <defs>
      {/* Filtro de resplandor para selección activa */}
      <filter id="geo-glow-selected" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feColorMatrix
          type="matrix"
          values="
            0 0 0 0 0.18
            0 0 0 0 0.90
            0 0 0 0 0.78
            0 0 0 0.9 0"
          result="glow"
        />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Sombra suave para tooltips y paneles flotantes */}
      <filter id="geo-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.6" />
      </filter>

      {/* Patrón DIAGONAL */}
      <pattern
        id="geo-pattern-diagonal"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
      </pattern>

      {/* Patrón DOTS */}
      <pattern
        id="geo-pattern-dots"
        patternUnits="userSpaceOnUse"
        width="10"
        height="10"
      >
        <circle cx="3" cy="3" r="1.4" fill="currentColor" opacity="0.55" />
        <circle cx="8" cy="8" r="1.4" fill="currentColor" opacity="0.55" />
      </pattern>

      {/* Patrón CROSSHATCH */}
      <pattern
        id="geo-pattern-crosshatch"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
      >
        <path d="M 0 0 L 8 8 M 8 0 L 0 8" stroke="currentColor" strokeWidth="1.0" opacity="0.4" />
      </pattern>

      {/* Patrón HORIZONTAL */}
      <pattern
        id="geo-pattern-horizontal"
        patternUnits="userSpaceOnUse"
        width="6"
        height="6"
      >
        <line x1="0" y1="0" x2="6" y2="0" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      </pattern>

      {/* Patrón VERTICAL */}
      <pattern
        id="geo-pattern-vertical"
        patternUnits="userSpaceOnUse"
        width="6"
        height="6"
      >
        <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      </pattern>
    </defs>
  );
}

/**
 * Resuelve el URL del patrón SVG para un nombre dado.
 */
export function getPatternFillUrl(patternName) {
  switch (patternName) {
    case 'diagonal':
      return 'url(#geo-pattern-diagonal)';
    case 'dots':
      return 'url(#geo-pattern-dots)';
    case 'crosshatch':
      return 'url(#geo-pattern-crosshatch)';
    case 'horizontal':
      return 'url(#geo-pattern-horizontal)';
    case 'vertical':
      return 'url(#geo-pattern-vertical)';
    case 'solid':
    case 'none':
    default:
      return null;
  }
}
