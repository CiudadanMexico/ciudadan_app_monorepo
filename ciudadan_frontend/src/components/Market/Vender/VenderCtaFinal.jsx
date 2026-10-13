// SECCION 8 — CTA final (fondo purpura CSS, sin fotografia) + entrada FM.
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Box, Button, Container, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { VENDER_RUTAS } from './venderLanding.rutas';
import { VENDER_PREMIUM } from './venderPremium.tokens';

export default function VenderCtaFinal() {
  const reduceMotion = useReducedMotion();
  return (
    <Box
      component="section"
      aria-labelledby="vender-cta-titulo"
      sx={{
        py: { xs: 6, md: 8 },
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        background: VENDER_PREMIUM.fondoOficial,
      }}
    >
      <Box aria-hidden="true" sx={{ position: 'absolute', width: 460, height: 460, borderRadius: '50%', top: -160, right: '-10%', background: `radial-gradient(circle, ${VENDER_PREMIUM.rosaNeon}33 0%, transparent 70%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />
      <Container maxWidth="md" sx={{ textAlign: 'center', position: 'relative' }}>
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 22 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
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
            sx={{
              fontWeight: 800, borderRadius: 3, px: 5, bgcolor: '#fff', color: VENDER_PREMIUM.moradoProfundo,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 12px 30px ${VENDER_PREMIUM.rosaNeon}55`, bgcolor: '#fff' },
            }}
          >
            Crear mi tienda gratis
          </Button>
        </motion.div>
      </Container>
    </Box>
  );
}
