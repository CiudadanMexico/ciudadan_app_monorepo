// src/components/LideresVerificadores/RetoLider.jsx
// Sección central: EL RETO LÍDER — timeline de 4 pasos con valores dinámicos.
// Contenido visible de entrada (sin animación de ocultado).
import React from 'react';
import { Box, Container, Stack, Typography } from '@mui/material';
import { LV_COLORS } from './LideresVerificadoresTheme.js';

export default function RetoLider({ testingDays, requiredReferrals }) {
  const pasos = [
    { titulo: 'Entra al programa', texto: 'Concluye tu registro como candidato a Líder.' },
    {
      titulo: 'El reloj comienza',
      texto: `Desde ese momento tendrás ${testingDays} días. El tiempo empieza al concluir tu registro, no al visitar esta página.`,
      destacado: true,
    },
    {
      titulo: 'Construye tu primera red',
      texto: `Incorpora ${requiredReferrals} conductores durante el periodo del reto.`,
    },
    { titulo: 'Desbloquea tu rol', texto: 'Al cumplir la meta, tu candidatura podrá convertirse en Líder de Conductores activo.' },
  ];

  return (
    <Box component="section" aria-label="El Reto Líder" sx={{ py: { xs: 6, md: 9 } }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h2" sx={{ fontWeight: 800, color: LV_COLORS.texto }}>
          El Reto Líder
        </Typography>
        <Typography sx={{ mt: 1, color: LV_COLORS.textoSuave, maxWidth: 680 }}>
          {requiredReferrals} conductores en {testingDays} días. Ese es tu
          primer encargo. Así se construye la red.
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} sx={{ mt: 3, alignItems: 'stretch' }}>
          {pasos.map((paso, i) => (
            <Box
              key={paso.titulo}
              sx={{
                p: 2.5,
                height: '100%',
                borderRadius: 3,
                border: paso.destacado ? '1px solid rgba(138,92,245,0.45)' : `1px solid ${LV_COLORS.borde}`,
                background: paso.destacado ? 'rgba(138,92,245,0.08)' : 'rgba(255,255,255,0.04)',
              }}
            >
              <Typography sx={{ fontWeight: 800, color: paso.destacado ? LV_COLORS.morado : LV_COLORS.texto, fontSize: '0.95rem' }}>
                Paso {i + 1}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: LV_COLORS.texto, fontSize: '1.15rem' }}>
                {paso.titulo}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: LV_COLORS.textoSuave, lineHeight: 1.5, fontSize: '0.95rem' }}>
                {paso.texto}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
