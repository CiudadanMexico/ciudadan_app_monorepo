// src/components/LideresVerificadores/QueGanaUnLider.jsx
// Sección: ¿Qué gana un Líder? Calculadora interactiva (Slider) con
// proyección basada en la membresía/participación actuales.
import React, { useState } from 'react';
import { Box, Container, Stack, Typography, Slider } from '@mui/material';
import { LV_COLORS, fmtMXN } from './LideresVerificadoresTheme.js';

const INGRESO_POR_CONDUCTOR = 50; // 10% de la membresía actual ($500)

export default function QueGanaUnLider() {
  const [conductores, setConductores] = useState(100);
  const ingreso = conductores * INGRESO_POR_CONDUCTOR;

  return (
    <Box component="section" aria-label="¿Qué gana un Líder?" sx={{ py: { xs: 6, md: 9 } }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h2" sx={{ fontWeight: 800, color: LV_COLORS.texto }}>
          Tu red crece. Tu participación también.
        </Typography>
        <Typography sx={{ mt: 1, color: LV_COLORS.textoSuave, maxWidth: 680, lineHeight: 1.55 }}>
          Por cada conductor activo que forme parte de tu red, actualmente
          el Líder recibe el 10% de su membresía mensual. Con la membresía
          actual eso equivale a:
        </Typography>

        <Stack
          sx={{ mt: 2.5, p: { xs: 2.5, md: 3.5 }, borderRadius: 3, border: '1px solid rgba(138,92,245,0.3)', background: 'rgba(138,92,245,0.06)' }}
          alignItems="flex-start"
          spacing={1.5}
        >
          <Typography sx={{ color: LV_COLORS.textoTenue }}>Conductores en tu red</Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: LV_COLORS.texto }}>
              {conductores}
            </Typography>
            <Typography sx={{ color: LV_COLORS.verde, fontWeight: 700, fontSize: '1.35rem' }}>
              {' '}→{' '}{fmtMXN(ingreso)} / mes
            </Typography>
          </Box>
          <Slider
            aria-label="Conductores en tu red"
            min={10}
            max={500}
            step={10}
            value={conductores}
            onChange={(_e, v) => setConductores(v)}
            sx={{ width: '100%', color: LV_COLORS.morado }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Typography variant="caption" sx={{ color: LV_COLORS.textoTenue }}>10</Typography>
            <Typography variant="caption" sx={{ color: LV_COLORS.textoTenue }}>500</Typography>
          </Box>
          <Typography variant="caption" sx={{ color: LV_COLORS.textoTenue, lineHeight: 1.45 }}>
            Estimación basada en la membresía y participación actuales. El
            ingreso depende de conductores con membresía activa.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
