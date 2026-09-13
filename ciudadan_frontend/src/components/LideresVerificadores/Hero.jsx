// src/components/LideresVerificadores/Hero.jsx
// Hero de la landing: eyebrow, titular, copy, indicadores del reto y CTAs.
// Estático y SIEMPRE visible (robustez ante entornos con reduce-motion).
import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import PurpleButton from '../common/PurpleButton.jsx';
import { LV_COLORS } from './LideresVerificadoresTheme.js';

const INDICATOR_BASE = {
  borderRadius: '12px',
  px: 1.75,
  py: 1,
  fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
  fontWeight: 700,
  letterSpacing: '0.02em',
};

export default function Hero({ testingDays, requiredReferrals, whatsappGroupUrl }) {
  const indicadores = [
    { valor: `${testingDays}`, etiqueta: 'días' },
    { valor: `${requiredReferrals}`, etiqueta: 'conductores' },
    { valor: '$50', etiqueta: '/ mes por conductor activo' },
  ];

  return (
    <Box component="section" aria-label="Programa de Líderes de Conductores" sx={{ position: 'relative', overflow: 'hidden', pt: { xs: 6, md: 10 }, pb: { xs: 6, md: 9 } }}>
      {/* fondo con grid tecnológico sutil + glow de marca */}
      <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '54px 54px', opacity: 0.35 }} />
      <Box aria-hidden sx={{ position: 'absolute', top: '-140px', right: '-80px', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(138,92,245,0.28) 0%, rgba(23,230,160,0.12) 45%, transparent 70%)', pointerEvents: 'none' }} />

      <Container maxWidth="lg">
        <Stack spacing={2.5} alignItems="flex-start">
          <Typography variant="subtitle2" sx={{ color: LV_COLORS.textoSuave, letterSpacing: '0.18em' }}>
            LÍDERES DE CONDUCTORES · CIUDADAN
          </Typography>
          <Typography variant="h2" component="h1" sx={{ fontWeight: 800, color: LV_COLORS.texto }}>
            La movilidad la hacemos nosotros.
          </Typography>
          <Typography variant="h5" component="p" sx={{ fontWeight: 700, color: LV_COLORS.verde }}>
            Ahora también podemos organizarla.
          </Typography>
          <Typography variant="body1" sx={{ color: LV_COLORS.textoSuave, maxWidth: 640, fontSize: { xs: '1rem', md: '1.1rem' }, lineHeight: 1.55 }}>
            Construye tu propia red de conductores dentro de Ciudadan y
            participa en una plataforma donde los conductores se quedan con
            el 100% de lo que generan en sus viajes.
          </Typography>
          <Typography variant="body1" sx={{ color: LV_COLORS.textoSuave, maxWidth: 640, fontSize: '1rem', lineHeight: 1.55 }}>
            Para convertirte en Líder tendrás una primera misión:{' '}
            <Box component="span" sx={{ color: LV_COLORS.verde, fontWeight: 700 }}>
              incorporar {requiredReferrals} conductores en {testingDays} días.
            </Box>
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap' }}>
          {indicadores.map((item) => (
            <Box key={item.etiqueta} sx={{ ...INDICATOR_BASE, color: LV_COLORS.verde, border: '1px solid rgba(23,230,160,0.35)', background: 'rgba(23,230,160,0.10)' }}>
              {item.valor}&nbsp;<Box component="span" sx={{ color: LV_COLORS.textoTenue }}>{item.etiqueta}</Box>
            </Box>
          ))}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
          <PurpleButton component={Link} to="/gana/lideresverificadores/registro" size="large" sx={{ px: 4, py: 1.6 }}>
            Aceptar el reto
          </PurpleButton>
          {whatsappGroupUrl ? (
            <Button component="a" href={whatsappGroupUrl} target="_blank" rel="noopener noreferrer" variant="outlined" size="large" sx={{ borderRadius: 999, color: LV_COLORS.texto, border: '1px solid rgba(244,244,248,0.35)', '&:hover': { borderColor: LV_COLORS.verde, color: LV_COLORS.verde } }}>
              Unirme al grupo de Líderes
            </Button>
          ) : null}
        </Stack>
      </Container>
    </Box>
  );
}
