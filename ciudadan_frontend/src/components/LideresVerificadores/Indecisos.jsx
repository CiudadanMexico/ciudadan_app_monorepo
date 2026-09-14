// src/components/LideresVerificadores/Indecisos.jsx
// Sección para quienes todavía no están listos: menor compromiso, mismos CTAs
// de WhatsApp (sin hardcodear URL).
import React from 'react';
import { Box, Container, Stack, Typography, Button } from '@mui/material';
import { LV_COLORS } from './LideresVerificadoresTheme.js';

export default function Indecisos({ whatsappGroupUrl }) {
  return (
    <Box component="section" aria-label="¿Todavía no estás listo?" sx={{ py: { xs: 6, md: 9 } }}>
      <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 800, color: LV_COLORS.texto }}>
          ¿Todavía no estás listo para iniciar el reto?
        </Typography>
        <Typography sx={{ mt: 1.25, color: LV_COLORS.textoSuave, maxWidth: 660, mx: 'auto' }}>
          No tienes que empezar hoy. Entra al grupo de Líderes, conoce el
          modelo, resuelve tus dudas y habla con quienes están construyendo
          la red.
        </Typography>

        {whatsappGroupUrl ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5, justifyContent: 'center' }}>
            <Button
              component="a"
              href={whatsappGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              sx={{
                borderRadius: 999,
                px: 3,
                background: 'linear-gradient(135deg, rgba(23,230,160,0.9) 0%, rgba(14,158,110,0.95) 100%)',
                fontWeight: 800,
                '&:hover': { background: 'linear-gradient(135deg, #19EDAA 0%, #12B77F 100%)' },
              }}
            >
              Unirme al grupo de Líderes
            </Button>
            <Button
              component="a"
              href={whatsappGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              sx={{ borderRadius: 999, px: 3, fontWeight: 700, color: LV_COLORS.texto, border: `1px solid ${LV_COLORS.borde}` }}
            >
              Contactar
            </Button>
          </Stack>
        ) : null}
      </Container>
    </Box>
  );
}
