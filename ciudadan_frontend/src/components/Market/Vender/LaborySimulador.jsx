// SECCION 4 — Simulador Labory (premium). Barra 95/5 + slider + numeros animados.
// El 5% es fijo. No hay controles de porcentaje ni multiplicadores.
import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Alert, Box, Button, Container, Slider, Stack, TextField, Typography } from '@mui/material';
import NeonBorderCard from './NeonBorderCard';
import NumeroAnimado from './NumeroAnimado';
import { LABORY_PORCENTAJE } from './venderLanding.rutas';
import { VENDER_PREMIUM } from './venderPremium.tokens';

const formatoMXN = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);
const RAPIDOS = [500, 1000, 2000, 5000];

export default function LaborySimulador() {
  const reduceMotion = useReducedMotion();
  const [total, setTotal] = useState(1000);
  const { directo, labory } = useMemo(() => {
    const base = Number.isFinite(Number(total)) && Number(total) > 0 ? Number(total) : 0;
    const parteLabory = base * LABORY_PORCENTAJE;
    return { directo: base - parteLabory, labory: parteLabory };
  }, [total]);
  const numSlider = Math.min(Math.max(Number(total) || 0, 0), 20000);
  return (
    <Box component="section" aria-labelledby="vender-labory-titulo" sx={{ py: { xs: 6, md: 8 }, background: VENDER_PREMIUM.fondoOficialClaro }}>
      <Container maxWidth="lg">
        <Typography id="vender-labory-titulo" component="h2" variant="h4" fontWeight={800} align="center" gutterBottom>
          ¿Como funciona pagar con Labory?
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4, maxWidth: 820, mx: 'auto' }}>
          El vendedor recibe el 95% directamente en pesos y el 5% en Labory cuando el comprador elige esta modalidad.
        </Typography>
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 22 }}
          whileInView={reduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <NeonBorderCard velocidad={9} resplandor={7} grosor={1.6}>
            <Box sx={{ p: { xs: 3, md: 4 } }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center" sx={{ mb: 3 }}>
                <TextField
                  label="Monto de la venta (MXN)"
                  type="number"
                  inputProps={{ min: 0, step: 10 }}
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  sx={{ minWidth: { xs: '100%', md: 240 } }}
                />
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {RAPIDOS.map((v) => (
                    <Button key={v} variant="outlined" onClick={() => setTotal(v)} sx={{ borderRadius: 3, borderColor: VENDER_PREMIUM.purpuraIntenso, color: VENDER_PREMIUM.purpuraIntenso }}>
                      {formatoMXN(v)}
                    </Button>
                  ))}
                </Stack>
              </Stack>
              <Slider
                value={numSlider}
                min={0}
                max={20000}
                step={50}
                onChange={(_, v) => setTotal(v)}
                aria-label="Monto de la venta"
                sx={{
                  color: VENDER_PREMIUM.purpuraIntenso,
                  '& .MuiSlider-thumb': { width: 24, height: 24, background: '#fff', border: `3px solid ${VENDER_PREMIUM.purpuraIntenso}`, boxShadow: `0 0 12px ${VENDER_PREMIUM.violetaElectrico}` },
                  '& .MuiSlider-track': { background: `linear-gradient(90deg, ${VENDER_PREMIUM.moradoProfundo}, ${VENDER_PREMIUM.violetaElectrico}, ${VENDER_PREMIUM.lilaLuminoso})` },
                  '& .MuiSlider-rail': { background: '#d9cdf5' },
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Arrastra o usa los botones rapidos. El reparto 95% / 5% se mantiene constante.
              </Typography>
              <Box sx={{ mt: 4 }}>
                <Stack direction="row" sx={{ width: '100%', height: { xs: 40, md: 56 }, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ width: '95%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${VENDER_PREMIUM.moradoProfundo}, ${VENDER_PREMIUM.purpuraIntenso})`, color: '#fff', fontWeight: 800 }}>
                    95% · Pesos MXN
                  </Box>
                  <Box sx={{ width: '5%', minWidth: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${VENDER_PREMIUM.violetaElectrico}, ${VENDER_PREMIUM.rosaNeon})`, color: '#fff', fontWeight: 800, boxShadow: `0 0 18px ${VENDER_PREMIUM.rosaNeon}` }}>
                    5%
                  </Box>
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 3 }}>
                  <Box sx={{ flex: 1, p: 2, borderRadius: 3, background: '#fff', border: `1px solid ${VENDER_PREMIUM.purpuraIntenso}33` }}>
                    <Typography variant="subtitle2" color="text.secondary">Transferencia directa al vendedor (MXN)</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color: VENDER_PREMIUM.moradoProfundo }}>
                      <NumeroAnimado valor={directo} formato={(v) => formatoMXN(v)} />
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 2, borderRadius: 3, background: `linear-gradient(135deg, ${VENDER_PREMIUM.purpuraIntenso}1a, ${VENDER_PREMIUM.rosaNeon}1a)`, border: `1px solid ${VENDER_PREMIUM.rosaNeon}44` }}>
                    <Typography variant="subtitle2" color="text.secondary">Labory recibido (equivalente contable MXN)</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color: VENDER_PREMIUM.rosaNeon }}>
                      <NumeroAnimado valor={labory} formato={(v) => formatoMXN(v)} />
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Venta: <strong><NumeroAnimado valor={Number(total) || 0} formato={(v) => formatoMXN(v)} /></strong>. Participacion Labory: 5% fijo.
                </Typography>
              </Box>
              <Alert severity="info" sx={{ mt: 3 }}>
                Esto es una simulacion explicativa, no un proceso de pago real. Las recompensas
                adicionales dependen de las condiciones del programa oficial. Sin multiplicador
                definido ni ganancias garantizadas.
              </Alert>
            </Box>
          </NeonBorderCard>
        </motion.div>
      </Container>
    </Box>
  );
}
