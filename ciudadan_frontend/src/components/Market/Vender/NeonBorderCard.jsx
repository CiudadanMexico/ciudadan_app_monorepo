// NeonBorderCard — tarjeta reutilizable con brillo neon que recorre
// REALMENTE todo el perimetro (SVG rect animado con stroke-dashoffset).
// Funciona en tamanos responsivos via viewBox + preserveAspectRatio="none"
// con vector-effect="non-scaling-stroke". Respeta prefers-reduced-motion.
import React, { useId } from 'react';
import { Box, useTheme } from '@mui/material';
import { useReducedMotion } from 'framer-motion';
import { VENDER_PREMIUM } from './venderPremium.tokens';

export default function NeonBorderCard({
  children,
  base = VENDER_PREMIUM.purpuraIntenso,
  brillo = VENDER_PREMIUM.lilaLuminoso,
  grosor = 2,
  resplandor = 10,
  velocidad = 6,
  radio = 20,
  animacionContinua = true,
  sx,
  ...rest
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const animar = animacionContinua && !reduceMotion;
  const gradId = `neon-base-${uid}`;
  const haloId = `neon-halo-${uid}`;

  return (
    <Box
      sx={{ position: 'relative', borderRadius: `${radio}px`, ...sx }}
      {...rest}
    >
      {/* Halo exterior estatico difuminado (barato: sin animacion). */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: -resplandor / 2,
          borderRadius: `${radio + resplandor / 2}px`,
          background: `linear-gradient(135deg, ${base}33, ${brillo}22, ${VENDER_PREMIUM.rosaNeon}1f)`,
          filter: `blur(${resplandor}px)`,
          pointerEvents: 'none',
        }}
      />
      {/* Contenido */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: `${radio}px`,
          background: theme.palette.mode === 'dark' ? 'rgba(20,10,40,0.92)' : '#ffffff',
          border: `${grosor}px solid ${base}55`,
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>
      {/* Perimetro animado: rect SVG que cubre el borde con esquinas redondeadas. */}
      <Box
        component="svg"
        aria-hidden="true"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        sx={{
          position: 'absolute',
          inset: -grosor,
          width: `calc(100% + ${grosor * 2}px)`,
          height: `calc(100% + ${grosor * 2}px)`,
          borderRadius: `${radio + grosor}px`,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={brillo} stopOpacity="0.15" />
            <stop offset="50%" stopColor={brillo} stopOpacity="0.9" />
            <stop offset="100%" stopColor={brillo} stopOpacity="0.15" />
          </linearGradient>
          <filter id={haloId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Base tenue del perimetro */}
        <rect
          x="1"
          y="1"
          width="98"
          height="98"
          rx="9"
          ry="9"
          fill="none"
          stroke={base}
          strokeOpacity="0.45"
          strokeWidth="1.1"
          vectorEffect="non-scaling-stroke"
        />
        {/* Segmento luminoso viajero: dash corto que rota el offset */}
        <rect
          x="1"
          y="1"
          width="98"
          height="98"
          rx="9"
          ry="9"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#${haloId})`}
          strokeDasharray="22 278"
          pathLength="300"
          style={
            animar
              ? { animation: `neon-recorrido-${uid} ${velocidad}s linear infinite` }
              : undefined
          }
        />
        <style>{`@keyframes neon-recorrido-${uid} { from { stroke-dashoffset: 300; } to { stroke-dashoffset: 0; } }`}</style>
      </Box>
    </Box>
  );
}
