// SECCION 5 — Digitaliza tu negocio (Membresia de Negocios).
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import NeonBorderCard from './NeonBorderCard';
import { FM_CONTENEDOR_STAGGER, FM_ITEM_STAGGER, VENDER_PREMIUM } from './venderPremium.tokens';
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import digitalImg from '../../../assets/market_landing_3.png';
import digitalWebp from '../../../assets/market_landing_3.webp';
import VenderImagen from './VenderImagen';
import VenderIcono from './VenderIcono';
import { ventajasMembresia } from './venderLanding.membresia';
import { VENDER_RUTAS } from './venderLanding.rutas';

export default function VenderDigitaliza() {
  const reduceMotion = useReducedMotion();
  const contenedor = reduceMotion ? {} : FM_CONTENEDOR_STAGGER;
  const item = reduceMotion ? {} : FM_ITEM_STAGGER;
  return (
    <Box
      component="section"
      aria-labelledby="vender-digitaliza-titulo"
      sx={{ py: { xs: 5, md: 7 } }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6}>
            <motion.div initial={reduceMotion ? {} : { opacity: 0, y: 20 }} whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5, ease: 'easeOut' }}>
              <Typography id="vender-digitaliza-titulo" component="h2" variant="h4" fontWeight={800} gutterBottom>
                Mucho mas que un Marketplace: tu propio ecosistema comercial.
              </Typography>
            </motion.div>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.8 }}>
              La Membresia de Negocios es opcional. No es necesaria para vender gratuitamente,
              pero te ayuda a digitalizar y escalar tu operacion.
            </Typography>
            <Stack spacing={2} sx={{ mb: 3 }} component={motion.div} variants={contenedor} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }}>
              {ventajasMembresia.map((v) => (
                <Box key={v.titulo} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }} component={motion.div} variants={item}>
                  <VenderIcono nombre={v.icono} sx={{ color: VENDER_PREMIUM.purpuraIntenso }} />
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
            <motion.div initial={reduceMotion ? {} : { opacity: 0, y: 16 }} whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }} sx={{ mb: 3 }}>
              <NeonBorderCard velocidad={10} resplandor={8} radio={20} base={VENDER_PREMIUM.violetaElectrico} brillo={VENDER_PREMIUM.rosaNeon}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
                  <Typography variant="h3" fontWeight={800} sx={{ color: VENDER_PREMIUM.purpuraIntenso, lineHeight: 1 }}>
                    50%
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700}>
                    de descuento en la membresia base para Tiendas Oficiales.
                  </Typography>
                </Box>
              </NeonBorderCard>
            </motion.div>
            <Box>
              <Button
                component={RouterLink}
                to={VENDER_RUTAS.membresiasNegocios}
                variant="contained"
                size="large"
                sx={{ fontWeight: 800, borderRadius: 3, background: `linear-gradient(135deg, ${VENDER_PREMIUM.purpuraIntenso}, ${VENDER_PREMIUM.violetaElectrico})`, boxShadow: `0 8px 26px ${VENDER_PREMIUM.purpuraIntenso}55`, '&:hover': { transform: 'translateY(-2px)' } }}
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
