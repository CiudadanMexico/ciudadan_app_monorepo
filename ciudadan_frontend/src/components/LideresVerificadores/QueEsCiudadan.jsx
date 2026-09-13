// src/components/LideresVerificadores/QueEsCiudadan.jsx
// Sección: ¿Qué es Ciudadan? Una app de conductores construida al revés.
// Contenido SIEMPRE visible (sin animaciones que lo oculten).
import React from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { LV_COLORS } from './LideresVerificadoresTheme.js';

const DIFERENCIAS = [
  'Las plataformas tradicionales cobran un porcentaje de cada viaje.',
  'Ciudadan funciona con una membresía plana.',
  'El conductor se queda con el 100% de lo que genera en sus viajes.',
];

export default function QueEsCiudadan() {
  return (
    <Box
      component="section"
      aria-label="¿Qué es Ciudadan?"
      sx={{ py: { xs: 6, md: 9 } }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          component="h2"
          sx={{ fontWeight: 800, color: LV_COLORS.texto }}
        >
          Una app de conductores construida al revés
        </Typography>

        <Stack spacing={1.25} sx={{ mt: 2 }}>
          {DIFERENCIAS.map((linea, i) => (
            <Stack key={i} direction="row" spacing={1.25} alignItems="flex-start">
              <Box
                sx={{
                  mt: 0.5,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: LV_COLORS.verde,
                  boxShadow: '0 0 8px rgba(23,230,160,0.6)',
                }}
              />
              <Typography sx={{ color: LV_COLORS.textoSuave, flex: 1 }}>
                {linea}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Box
          sx={{
            mt: 3,
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            border: '1px solid rgba(23,230,160,0.28)',
            background: 'rgba(23,230,160,0.07)',
          }}
        >
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, color: LV_COLORS.texto }}
          >
            $500
          </Typography>
          <Typography sx={{ color: LV_COLORS.textoTenue }}>
            membresía mensual · sin comisión por viaje
          </Typography>
        </Box>

        <Typography
          variant="body2"
          sx={{ mt: 2, color: LV_COLORS.textoTenue, maxWidth: 620 }}
        >
          No se trata de reñir con ninguna otra app: se trata de que en
          tu red, cada viaje sea de quien lo hace.
        </Typography>
      </Container>
    </Box>
  );
}
