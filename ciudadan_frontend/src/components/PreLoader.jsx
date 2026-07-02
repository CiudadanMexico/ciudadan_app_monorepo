import React from 'react'
import {
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
const PreLoader = ({text = ''}) => {
  return (
        <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
>
  {/* Loader */}
  <Box
    sx={{
      animation: 'pulseGlow 1.8s ease-in-out infinite',
      '@keyframes pulseGlow': {
        '0%': {
          filter: `
            drop-shadow(0 0 6px #39ff14)
            drop-shadow(0 0 12px #fff200)
          `,
          transform: 'scale(1)',
        },
        '50%': {
          filter: `
            drop-shadow(0 0 24px #39ff14)
            drop-shadow(0 0 36px #fff200)
          `,
          transform: 'scale(1.15)',
        },
        '100%': {
          filter: `
            drop-shadow(0 0 6px #39ff14)
            drop-shadow(0 0 12px #fff200)
          `,
          transform: 'scale(1)',
        },
      },
    }}
  >
    <CircularProgress
      size={72}
      thickness={4}
      sx={{
        color: '#39ff14', // verde neón
      }}
    />
  </Box>

  {/* Texto */}
  <Typography
    variant="h6"
    sx={{
      fontWeight: 800,
      letterSpacing: '2px',
      textTransform: 'uppercase',
      color: '#fff200', // amarillo CIUDADAN 💛
      textShadow: `
        0 0 6px #fff200,
        0 0 12px #39ff14,
        0 0 24px #a855f7
      `,
      animation: 'textFlicker 2.5s infinite',
      '@keyframes textFlicker': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.85 },
      },
    }}
  >
    {text || 'Cargando Ciudadan.org'}
  </Typography>
</Box>

  )
}

export default PreLoader