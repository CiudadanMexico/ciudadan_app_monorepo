// SECCION 1 — HERO «Vende en Ciudadan».
import React from 'react';
import { Box, Button, Chip, Container, Grid, Stack, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import heroImg from '../../../assets/market_landing_1.png';
import heroWebp from '../../../assets/market_landing_1.webp';
import VenderImagen from './VenderImagen';
import { VENDER_RUTAS } from './venderLanding.rutas';

const INDICADORES = ['Tienda gratis', '0% de comision de Ciudadan', 'Pagos directos'];

export default function VenderHero() {
  const theme = useTheme();
  const oscuro = theme.palette.mode === 'dark';
  return (
    <Box
      component="section"
      aria-labelledby="vender-hero-titulo"
      sx={{
        py: { xs: 5, md: 8 },
        background: oscuro
          ? 'linear-gradient(180deg, rgba(9,20,32,1) 0%, rgba(13,34,44,1) 100%)'
          : 'linear-gradient(180deg, #f2f7f3 0%, #ffffff 100%)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <Chip
              label="Marketplace Ciudadan · Mexico"
              color="success"
              variant="outlined"
              sx={{ mb: 2, fontWeight: 700 }}
            />
            <Typography id="vender-hero-titulo" component="h1" variant="h3" fontWeight={800} gutterBottom>
              Vende en Ciudadan
            </Typography>
            <Typography variant="h6" fontWeight={700} color="success.main" gutterBottom>
              Tu tienda gratis. Tus ventas sin comisiones. Tu dinero directamente para ti.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
              Publica tus productos, conecta con compradores de todo Mexico y recibe tus pagos
              directamente. Sin cuotas obligatorias ni comisiones de Ciudadan. Ademas, descubre
              los beneficios de convertirte en Tienda Oficial.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
              <Button
                component={RouterLink}
                to={VENDER_RUTAS.registroVendedor}
                variant="contained"
                color="success"
                size="large"
                sx={{ fontWeight: 800, borderRadius: 3, px: 4 }}
              >
                Abrir mi tienda gratis
              </Button>
              <Button
                href="#tienda-oficial"
                variant="outlined"
                color="success"
                size="large"
                sx={{ fontWeight: 700, borderRadius: 3 }}
              >
                Conoce Tienda Oficial
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {INDICADORES.map((texto) => (
                <Chip
                  key={texto}
                  icon={<CheckCircleIcon />}
                  label={texto}
                  color="success"
                  variant="outlined"
                  sx={{ mb: 1, fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <VenderImagen
              webp={heroWebp}
              png={heroImg}
              alt="Comerciantes vendiendo en Ciudadan Marketplace"
              eager
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
