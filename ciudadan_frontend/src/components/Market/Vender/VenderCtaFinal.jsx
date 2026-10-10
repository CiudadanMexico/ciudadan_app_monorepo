// SECCION 8 — CTA final (fondo CSS, sin fotografia).
import React from 'react';
import { Box, Button, Container, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { VENDER_RUTAS } from './venderLanding.rutas';

export default function VenderCtaFinal() {
  const theme = useTheme();
  const oscuro = theme.palette.mode === 'dark';
  return (
    <Box
      component="section"
      aria-labelledby="vender-cta-titulo"
      sx={{
        py: { xs: 6, md: 8 },
        color: '#fff',
        background: oscuro
          ? 'linear-gradient(135deg, #0b3d2e 0%, #14532d 55%, #22c55e 130%)'
          : 'linear-gradient(135deg, #0e5c3f 0%, #15803d 55%, #4ade80 130%)',
      }}
    >
      <Container maxWidth="md" sx={{ textAlign: 'center' }}>
        <Typography id="vender-cta-titulo" component="h2" variant="h4" fontWeight={800} gutterBottom>
          Tu negocio merece crecer sin pagar comisiones por vender.
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, opacity: 0.94, lineHeight: 1.8 }}>
          Abre tu tienda en Ciudadan, recibe tus pagos directamente y descubre nuevas
          oportunidades en la economia cooperativa.
        </Typography>
        <Button
          component={RouterLink}
          to={VENDER_RUTAS.registroVendedor}
          variant="contained"
          size="large"
          sx={{ fontWeight: 800, borderRadius: 3, px: 5, bgcolor: '#fff', color: '#14532d', '&:hover': { bgcolor: '#f0fdf4' } }}
        >
          Crear mi tienda gratis
        </Button>
      </Container>
    </Box>
  );
}
