// src/components/LideresVerificadores/LideresVerificadoresTheme.js
// Paleta y constantes compartidas de la landing de Líderes Verificadores.
// Fondo oscuro sofisticado + verdes Ciudadan + morados de marca + acentos
// neón únicamente en bordes/highlights/CTA (no pantallas fosforescentes).
export const LV_COLORS = Object.freeze({
  fondo: '#0B0B16',
  superficie: 'rgba(255,255,255,0.045)',
  superficieFuerte: 'rgba(255,255,255,0.08)',
  borde: 'rgba(255,255,255,0.14)',
  morado: '#8A5CF5',
  moradoOscuro: '#6A3FCB',
  verde: '#17E6A0',
  verdeOscuro: '#0E9E6E',
  texto: '#F4F4F8',
  textoSuave: 'rgba(244,244,248,0.72)',
  textoTenue: 'rgba(244,244,248,0.5)',
});

export const LV_CHIP_BASE = Object.freeze({
  borderRadius: 2.5,
  px: 2,
  py: 0.75,
  color: LV_COLORS.verde,
  bgcolor: 'rgba(23,230,160,0.12)',
  border: '1px solid rgba(23,230,160,0.35)',
});

// Formatea montos MXN: 5000 -> "$5,000"
export const fmtMXN = (n) => `$${n.toLocaleString('es-MX')}`;