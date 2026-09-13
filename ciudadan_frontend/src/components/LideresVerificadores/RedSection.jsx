// src/components/LideresVerificadores/RedSection.jsx
// Sección: RED — el Líder como nodo que construye una comunidad (estático).
import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { LV_COLORS } from './LideresVerificadoresTheme.js';

export default function RedSection() {
  const nodos = ['🚗', '🚗', '🚗', '🚗', '🚗', '🚗'];

  return (
    <Box component="section" aria-label="Tu red" sx={{ py: { xs: 6, md: 9 } }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h2" sx={{ fontWeight: 800, color: LV_COLORS.texto }}>
          No eres un vendedor. Eres un nodo.
        </Typography>
        <Typography sx={{ mt: 1, color: LV_COLORS.textoSuave, maxWidth: 680 }}>
          Cada conductor que incorporas crece una red que sigue creciendo
          sola: tú la construyes, Ciudadan la sostiene.
        </Typography>

        <Box
          sx={{
            mt: 3,
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: `1px solid ${LV_COLORS.borde}`,
            background: 'rgba(255,255,255,0.03)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              px: 2.25,
              py: 0.9,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #8A5CF5 0%, #6A3FCB 100%)',
              color: '#fff',
              fontWeight: 800,
              boxShadow: '0 0 18px rgba(138,92,245,0.45)',
            }}
          >
            LÍDER
          </Box>
          <Box sx={{ my: 1.5, width: 90, height: 2, bgcolor: 'rgba(138,92,245,0.5)', borderRadius: 1 }} />
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[0, 1, 2].map((k) => (
              <Box key={k} sx={{ p: 1.25, borderRadius: '50%', bgcolor: 'rgba(23,230,160,0.10)', border: '1px solid rgba(23,230,160,0.4)', fontSize: '1.6rem' }}>🚗</Box>
            ))}
          </Box>
          <Box sx={{ my: 1.5, width: 120, height: 1.5, bgcolor: 'rgba(23,230,160,0.35)', borderRadius: 1 }} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {nodos.map((icono, k) => (
              <Box key={k} sx={{ p: 1, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)', border: `1px solid ${LV_COLORS.borde}`, fontSize: '1.2rem' }}>{icono}</Box>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
