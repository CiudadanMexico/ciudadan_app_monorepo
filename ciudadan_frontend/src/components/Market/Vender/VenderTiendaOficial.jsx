// SECCION 3 — Tienda Oficial Ciudadan (protagonista premium).
// Fondo purpura profundo + NeonBorderCard + cifras 5%/50% destacadas + stagger FM.
import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Box, Button, Chip, Collapse, Container, Grid, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import tiendaImg from '../../../assets/market_landing_2.png';
import tiendaWebp from '../../../assets/market_landing_2.webp';
import VenderImagen from './VenderImagen';
import VenderIcono from './VenderIcono';
import NeonBorderCard from './NeonBorderCard';
import { beneficiosTiendaOficial, usosLabory } from './venderLanding.beneficios';
import { FM_CONTENEDOR_STAGGER, FM_ITEM_STAGGER, VENDER_PREMIUM } from './venderPremium.tokens';
export default function VenderTiendaOficial() {
  const reduceMotion = useReducedMotion();
  const [abierto, setAbierto] = useState(false);
  const contenedor = reduceMotion ? {} : FM_CONTENEDOR_STAGGER;
  const item = reduceMotion ? {} : FM_ITEM_STAGGER;
  return (
    <Box
      component="section"
      id="tienda-oficial"
      aria-labelledby="vender-oficial-titulo"
      sx={{ py: { xs: 6, md: 9 }, scrollMarginTop: '88px', position: 'relative', overflow: 'hidden', color: '#fff', background: VENDER_PREMIUM.fondoOficial }}
    >
      <Box aria-hidden="true" sx={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', top: -180, left: '10%', background: `radial-gradient(circle, ${VENDER_PREMIUM.violetaElectrico}40 0%, transparent 70%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />
      <Box aria-hidden="true" sx={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', bottom: -160, right: '5%', background: `radial-gradient(circle, ${VENDER_PREMIUM.rosaNeon}30 0%, transparent 70%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />
      <Container maxWidth="lg" sx={{ position: 'relative' }}>
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 28 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <NeonBorderCard velocidad={7} radio={24}>
            <Box sx={{ p: { xs: 3, md: 5 } }}>
              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={5}>
                  <VenderImagen webp={tiendaWebp} png={tiendaImg} alt="Tienda Oficial Ciudadan aceptando Labory" />
                </Grid>
                <Grid item xs={12} md={7}>
                  <Chip
                    label="TIENDA OFICIAL · Modalidad especial sujeta a validacion"
                    sx={{ mb: 2, fontWeight: 800, letterSpacing: '0.06em', color: '#fff', background: `linear-gradient(135deg, ${VENDER_PREMIUM.purpuraIntenso}, ${VENDER_PREMIUM.violetaElectrico})`, boxShadow: `0 0 22px ${VENDER_PREMIUM.violetaElectrico}88` }}
                  />
                  <Typography id="vender-oficial-titulo" component="h2" variant="h4" fontWeight={800} gutterBottom sx={{ color: '#fff' }}>
                    TIENDA OFICIAL CIUDADAN
                  </Typography>
                  <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: VENDER_PREMIUM.lilaLuminoso }}>
                    Acepta Labory. Multiplica tus oportunidades.
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8, color: 'rgba(255,255,255,0.85)' }}>
                    Acepta desde el 5% en Labory cuando el comprador usa esa modalidad. El porcentaje
                    operativo inicial es fijo: 5%. El resto se paga directamente a ti en pesos.
                  </Typography>
                  <Grid container spacing={2} component={motion.div} variants={contenedor} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={3} component={motion.div} variants={item}>
                      <CifraDestacada cifra="5%" titulo="en Labory" texto="Por compra con esa modalidad." />
                    </Grid>
                    <Grid item xs={6} sm={3} component={motion.div} variants={item}>
                      <CifraDestacada cifra="50%" titulo="de descuento" texto="En la cuota base de Membresia de Negocios." />
                    </Grid>
                    <Grid item xs={6} sm={3} component={motion.div} variants={item}>
                      <CifraDestacada cifra="+" titulo="Recompensas" texto="Bonificaciones sujetas al programa." />
                    </Grid>
                    <Grid item xs={6} sm={3} component={motion.div} variants={item}>
                      <CifraDestacada cifra="OK" titulo="Verificado" texto="Distintivo de Tienda Oficial." />
                    </Grid>
                  </Grid>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {beneficiosTiendaOficial.map((b) => (
                      <Grid item xs={12} sm={6} key={b.titulo}>
                        <Box sx={{ height: '100%', borderRadius: 3, p: 2, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(6px)', transition: 'transform 0.2s ease, background 0.2s ease', '&:hover': { transform: 'translateY(-3px)', background: 'rgba(255,255,255,0.10)' } }}>
                          <VenderIcono nombre={b.icono} sx={{ color: VENDER_PREMIUM.lilaLuminoso }} />
                          <Typography component="h3" variant="subtitle1" fontWeight={700} sx={{ color: '#fff' }}>
                            {b.titulo}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                            {b.texto}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  <Button
                    variant="contained"
                    onClick={() => setAbierto((v) => !v)}
                    aria-expanded={abierto}
                    aria-controls="vender-oficial-detalle"
                    endIcon={<ExpandMoreIcon sx={{ transform: abierto ? 'rotate(180deg)' : 'none' }} />}
                    sx={{ fontWeight: 800, borderRadius: 3, background: `linear-gradient(135deg, ${VENDER_PREMIUM.violetaElectrico}, ${VENDER_PREMIUM.rosaNeon})`, boxShadow: `0 8px 26px ${VENDER_PREMIUM.rosaNeon}55`, '&:hover': { transform: 'translateY(-2px)' } }}
                  >
                    Conocer los beneficios
                  </Button>
                  <Collapse in={abierto}>
                    <Box id="vender-oficial-detalle" sx={{ mt: 2, p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.16)' }}>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#fff' }}>
                        Usos posibles de Labory dentro del ecosistema
                      </Typography>
                      <Stack spacing={1}>
                        {usosLabory.map((uso) => (
                          <Typography key={uso} variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            · {uso}, segun disponibilidad del programa.
                          </Typography>
                        ))}
                      </Stack>
                      <Typography variant="body2" sx={{ mt: 2, color: 'rgba(255,255,255,0.75)' }}>
                        Las bonificaciones adicionales estan sujetas a las condiciones y limites del
                        programa. El multiplicador todavia no esta definido y no se prometen
                        recompensas ilimitadas ni conversiones garantizadas a pesos.
                      </Typography>
                    </Box>
                  </Collapse>
                </Grid>
              </Grid>
            </Box>
          </NeonBorderCard>
        </motion.div>
      </Container>
    </Box>
  );
}

function CifraDestacada({ cifra, titulo, texto }) {
  return (
    <Box sx={{ textAlign: 'center', p: 1.5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.16)' }}>
      <Typography variant="h4" fontWeight={800} sx={{ color: VENDER_PREMIUM.lilaLuminoso, lineHeight: 1 }}>
        {cifra}
      </Typography>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#fff' }}>
        {titulo}
      </Typography>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
        {texto}
      </Typography>
    </Box>
  );
}
