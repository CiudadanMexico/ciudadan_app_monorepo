// SECCION 5 — Digitaliza tu negocio (Membresia de Negocios).
import React from 'react';
import { Box, Button, Chip, Container, Grid, Stack, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import digitalImg from '../../../assets/market_landing_3.png';
import digitalWebp from '../../../assets/market_landing_3.webp';
import VenderImagen from './VenderImagen';
import VenderIcono from './VenderIcono';
import { ventajasMembresia } from './venderLanding.membresia';
import { VENDER_RUTAS } from './venderLanding.rutas';

export default function VenderDigitaliza() {
  const theme = useTheme();
  const oscuro = theme.palette.mode === 'dark';
  return (
    <Box
      component="section"
      aria-labelledby="vender-digitaliza-titulo"
      sx={{ py: { xs: 5, md: 7 }, background: oscuro ? 'rgba(255,255,255,0.02)' : '#fafcfb' }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography id="vender-digitaliza-titulo" component="h2" variant="h4" fontWeight={800} gutterBottom>
              Mucho mas que un Marketplace: tu propio ecosistema comercial.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.8 }}>
              La Membresia de Negocios es opcional. No es necesaria para vender gratuitamente,
              pero te ayuda a digitalizar y escalar tu operacion.
            </Typography>
            <Stack spacing={2} sx={{ mb: 3 }}>
              {ventajasMembresia.map((v) => (
                <Box key={v.titulo} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <VenderIcono nombre={v.icono} sx={{ color: 'success.main' }} />
                  <Box>
                    <Typography component="h3" variant="subtitle1" fontWeight={700}>
                      {v.titulo}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {v.texto}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
            <Chip
              label="50% de descuento en la membresia base para Tiendas Oficiales"
              color="success"
              sx={{ mb: 2, fontWeight: 700 }}
            />
            <Box>
              <Button
                component={RouterLink}
                to={VENDER_RUTAS.membresiasNegocios}
                variant="contained"
                color="success"
                size="large"
                sx={{ fontWeight: 800, borderRadius: 3 }}
              >
                Explorar membresias de negocios
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <VenderImagen
              webp={digitalWebp}
              png={digitalImg}
              alt="Negocio digitalizado con Ciudadan y WooCommerce"
              sx={{ maxWidth: 520, mx: 'auto', opacity: 0.98, '& img': { boxShadow: 2 } }}
            />
            <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 1 }}>
              Diagrama ilustrativo. La integracion esta incluida en el programa de membresias, segun disponibilidad.
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
