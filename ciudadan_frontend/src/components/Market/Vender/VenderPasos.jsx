// SECCION 6 — Como empezar (4 pasos) + stagger FM.
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FM_CONTENEDOR_STAGGER, FM_ITEM_STAGGER, VENDER_PREMIUM } from './venderPremium.tokens';
import { Box, Button, Card, CardContent, Container, Grid, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { pasosEmpezar } from './venderLanding.membresia';
import { VENDER_RUTAS } from './venderLanding.rutas';

export default function VenderPasos() {
  const reduceMotion = useReducedMotion();
  const contenedor = reduceMotion ? {} : FM_CONTENEDOR_STAGGER;
  const item = reduceMotion ? {} : FM_ITEM_STAGGER;
  return (
    <Box component="section" aria-labelledby="vender-pasos-titulo" sx={{ py: { xs: 5, md: 7 } }}>
      <Container maxWidth="lg">
        <Typography id="vender-pasos-titulo" component="h2" variant="h4" fontWeight={800} align="center" gutterBottom>
          Como empezar a vender
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Cuatro pasos sencillos, con validacion requerida por la plataforma.
        </Typography>
        <Grid container spacing={3} component={motion.div} variants={contenedor} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
          {pasosEmpezar.map((p) => (
            <Grid item xs={12} sm={6} md={3} key={p.numero} component={motion.div} variants={item}>
              <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider', transition: 'transform 0.2s ease, box-shadow 0.2s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 14px 34px ${VENDER_PREMIUM.purpuraIntenso}22` } }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h3" fontWeight={800} sx={{ color: VENDER_PREMIUM.purpuraIntenso }}>
                    {p.numero}
                  </Typography>
                  <Typography component="h3" variant="h6" fontWeight={700} gutterBottom>
                    {p.titulo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {p.texto}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Box textAlign="center" sx={{ mt: 4 }}>
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
        </Box>
      </Container>
    </Box>
  );
}
