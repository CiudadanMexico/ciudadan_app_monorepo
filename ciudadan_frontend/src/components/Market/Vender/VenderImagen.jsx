// Imagen responsive de la landing: WebP optimizado + fallback PNG original.
import React from 'react';
import { Box } from '@mui/material';

export default function VenderImagen({ webp, png, alt, eager = false, sx }) {
  return (
    <Box
      component="picture"
      sx={{ display: 'block', width: '100%', ...sx }}
    >
      <source srcSet={webp} type="image/webp" />
      <Box
        component="img"
        src={png}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        width={1024}
        height={1024}
        sx={{
          width: '100%',
          height: 'auto',
          borderRadius: 4,
          boxShadow: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      />
    </Box>
  );
}
