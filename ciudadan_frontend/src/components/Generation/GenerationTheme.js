/**
 * Tema compartido del módulo Generación Fundadora 2026.
 * Paleta oficial Ciudadan (idéntica a la usada en Cowork/QuienesSomos):
 * negro + verde + amarillo + blanco, tarjetas translúcidas, glow moderado.
 */
export const GEN_COLORS = {
  verde: '#19d79c',
  verdeNeon: '#00ff99',
  verdeHover: '#15c98f',
  amarillo: '#f5c400',
  amarilloSuave: '#ffe066',
  negro: '#000000',
  fondo: '#0b1512',
  fondoTarjeta: 'rgba(255,255,255,0.04)',
  borde: 'rgba(25,215,156,0.35)',
  texto: '#ffffff',
  textoSecundario: 'rgba(255,255,255,0.72)',
  textoTenue: 'rgba(255,255,255,0.55)',
  overlayMobile: 'rgba(0,0,0,0.65)',
};

export const GEN_FONTS = {
  display: '"Space Grotesk", "Poppins", system-ui, sans-serif',
  mono: '"Share Tech Mono", monospace',
};

/** Contenedor base de página: fondo oscuro, tipografía blanca, aire. */
export const pageContainerSx = {
  bgcolor: GEN_COLORS.fondo,
  color: GEN_COLORS.texto,
  minHeight: '100vh',
  pb: { xs: 8, md: 12 },
};

/** Sección con ancho limitado y separación generosa. */
export const sectionSx = {
  maxWidth: 1120,
  mx: 'auto',
  px: { xs: 2, sm: 3, md: 4 },
  py: { xs: 6, md: 10 },
};

/** Tarjeta translúcida con borde tecnológico sutil. */
export const glassCardSx = {
  bgcolor: GEN_COLORS.fondoTarjeta,
  border: `1px solid ${GEN_COLORS.borde}`,
  borderRadius: 3,
  backdropFilter: 'blur(6px)',
};

/** Chip/badge pequeño con tipografía mono. */
export const eyebrowChipSx = {
  fontFamily: GEN_FONTS.mono,
  fontSize: { xs: '0.7rem', md: '0.78rem' },
  letterSpacing: '0.22em',
  color: GEN_COLORS.verde,
  textTransform: 'uppercase',
};

/** Botón CTA principal (verde sólido, contraste AA sobre texto oscuro). */
export const ctaPrimarySx = {
  bgcolor: GEN_COLORS.verde,
  color: '#072015',
  fontWeight: 700,
  px: { xs: 2.5, md: 4 },
  py: { xs: 1.2, md: 1.5 },
  borderRadius: 999,
  fontSize: { xs: '0.85rem', md: '0.95rem' },
  letterSpacing: '0.04em',
  boxShadow: '0 12px 30px rgba(25,215,156,0.26)',
  '&:hover': { bgcolor: GEN_COLORS.verdeHover, boxShadow: '0 12px 36px rgba(25,215,156,0.4)' },
};

/** Botón CTA secundario (borde, translúcido). */
export const ctaSecondarySx = {
  color: GEN_COLORS.texto,
  borderColor: GEN_COLORS.verde,
  border: `1px solid ${GEN_COLORS.verde}`,
  bgcolor: 'rgba(0,255,153,0.06)',
  px: { xs: 2.5, md: 4 },
  py: { xs: 1.2, md: 1.5 },
  borderRadius: 999,
  fontSize: { xs: '0.85rem', md: '0.95rem' },
  letterSpacing: '0.04em',
  '&:hover': { bgcolor: 'rgba(0,255,153,0.14)', borderColor: GEN_COLORS.verde },
};
