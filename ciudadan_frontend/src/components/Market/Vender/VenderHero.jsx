// SECCION 1 — HERO premium «Vende en Ciudadan».
// Entradas Framer Motion suaves + halo violeta ambiental + imagen intacta.
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { VENDER_PREMIUM } from './venderPremium.tokens';
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
  const reduceMotion = useReducedMotion();
  const entrada = (retardo = 0) => (reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, delay: retardo, ease: 'easeOut' } });
  return (
    <Box
      component="section"
      aria-labelledby="vender-hero-titulo"
      sx={{
        py: { xs: 5, md: 8 },
        position: 'relative',
        overflow: 'hidden',
        background: oscuro
          ? 'linear-gradient(180deg, #12082b 0%, #1c1040 60%, #241455 100%)'
          : 'linear-gradient(180deg, #f6f1ff 0%, #ffffff 70%)',
      }}
    >
      <Box aria-hidden="true" sx={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', top: -140, right: -120, background: `radial-gradient(circle, ${VENDER_PREMIUM.violetaElectrico}33 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <Box aria-hidden="true" sx={{ position: 'absolute', width: 360, height: 360, borderRadius: '50%', bottom: -160, left: -120, background: `radial-gradient(circle, ${VENDER_PREMIUM.rosaNeon}26 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <motion.div {...entrada(0)}>
              <Chip
                label="Marketplace Ciudadan · Mexico"
                variant="outlined"
                sx={{ mb: 2, fontWeight: 700, borderColor: VENDER_PREMIUM.purpuraIntenso, color: VENDER_PREMIUM.purpuraIntenso, background: `${VENDER_PREMIUM.lilaLuminoso}33` }}
              />
            </motion.div>
            <motion.div {...entrada(0.08)}>
              <Typography id="vender-hero-titulo" component="h1" variant="h3" fontWeight={800} gutterBottom>
                Vende en Ciudadan
              </Typography>
            </motion.div>
            <motion.div {...entrada(0.16)}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: VENDER_PREMIUM.purpuraIntenso }}>
                Tu tienda gratis. Tus ventas sin comisiones. Tu dinero directamente para ti.
              </Typography>
            </motion.div>
            <motion.div {...entrada(0.24)}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
                Publica tus productos, conecta con compradores de todo Mexico y recibe tus pagos
                directamente. Sin cuotas obligatorias ni comisiones de Ciudadan. Ademas, descubre
                los beneficios de convertirte en Tienda Oficial.
              </Typography>
            </motion.div>
            <motion.div {...entrada(0.32)}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                <Button
                  component={RouterLink}
                  to={VENDER_RUTAS.registroVendedor}
                  variant="contained"
                  size="large"
                  sx={{
                    fontWeight: 800, borderRadius: 3, px: 4,
                    background: `linear-gradient(135deg, ${VENDER_PREMIUM.purpuraIntenso} 0%, ${VENDER_PREMIUM.violetaElectrico} 100%)`,
                    boxShadow: `0 8px 28px ${VENDER_PREMIUM.purpuraIntenso}55`,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 12px 34px ${VENDER_PREMIUM.purpuraIntenso}66` },
                  }}
                >
                  Abrir mi tienda gratis
                </Button>
                <Button
                  href="#tienda-oficial"
                  variant="outlined"
                  size="large"
                  sx={{ fontWeight: 700, borderRadius: 3, borderColor: VENDER_PREMIUM.purpuraIntenso, color: VENDER_PREMIUM.purpuraIntenso }}
                >
                  Conoce Tienda Oficial
                </Button>
              </Stack>
            </motion.div>
            <motion.div {...entrada(0.4)}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {INDICADORES.map((texto) => (
                  <Chip
                    key={texto}
                    icon={<CheckCircleIcon />}
                    label={texto}
                    variant="outlined"
                    sx={{ mb: 1, fontWeight: 600, borderColor: VENDER_PREMIUM.lilaLuminoso }}
                  />
                ))}
              </Stack>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={6}>
            <motion.div
              initial={reduceMotion ? {} : { opacity: 0, scale: 0.97 }}
              animate={reduceMotion ? {} : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, delay: 0.2, ease: 'easeOut' }}
            >
              <VenderImagen
                webp={heroWebp}
                png={heroImg}
                alt="Comerciantes vendiendo en Ciudadan Marketplace"
                eager
                sx={{ '& img': { boxShadow: `0 20px 60px ${VENDER_PREMIUM.purpuraIntenso}33` } }}
              />
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
