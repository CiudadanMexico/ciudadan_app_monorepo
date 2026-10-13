// SECCION 2 — Beneficios del Marketplace (iconos SVG + stagger FM).
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FM_CONTENEDOR_STAGGER, FM_ITEM_STAGGER, VENDER_PREMIUM } from './venderPremium.tokens';
import { Box, Card, CardContent, Container, Grid, Typography } from '@mui/material';
import VenderIcono from './VenderIcono';
import { beneficiosMarketplace } from './venderLanding.beneficios';

export default function VenderBeneficios() {
  const reduceMotion = useReducedMotion();
  const contenedor = reduceMotion ? {} : FM_CONTENEDOR_STAGGER;
  const item = reduceMotion ? {} : FM_ITEM_STAGGER;
  return (
    <Box component="section" aria-labelledby="vender-beneficios-titulo" sx={{ py: { xs: 5, md: 7 } }}>
      <Container maxWidth="lg">
        <Typography id="vender-beneficios-titulo" component="h2" variant="h4" fontWeight={800} align="center" gutterBottom>
          Tu negocio es tuyo. Tus ganancias tambien.
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4, maxWidth: 760, mx: 'auto' }}>
          Vende sin comisiones de Ciudadan, recibe pagos directos y opera en todo Mexico.
        </Typography>
        <Grid container spacing={3} component={motion.div} variants={contenedor} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          {beneficiosMarketplace.map((b) => (
            <Grid item xs={12} sm={6} md={4} key={b.titulo} component={motion.div} variants={item}>
              <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider', transition: 'transform 0.2s ease, box-shadow 0.2s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 14px 34px ${VENDER_PREMIUM.purpuraIntenso}22` } }}>
                <CardContent sx={{ p: 3 }}>
                  <VenderIcono nombre={b.icono} sx={{ color: VENDER_PREMIUM.purpuraIntenso, mb: 1 }} />
                  <Typography component="h3" variant="h6" fontWeight={700} gutterBottom>
                    {b.titulo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {b.texto}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
