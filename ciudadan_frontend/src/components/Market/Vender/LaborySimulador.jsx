// SECCION 4 — Simulador Labory 5% (explicativo, no es pago real).
import React, { useMemo, useState } from 'react';
import { Alert, Box, Card, CardContent, Container, Grid, TextField, Typography } from '@mui/material';
import { LABORY_PORCENTAJE } from './venderLanding.rutas';

const formatoMXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export default function LaborySimulador() {
  const [total, setTotal] = useState(1000);
  const { directo, labory } = useMemo(() => {
    const base = Number.isFinite(Number(total)) && Number(total) > 0 ? Number(total) : 0;
    const parteLabory = base * LABORY_PORCENTAJE;
    return { directo: base - parteLabory, labory: parteLabory };
  }, [total]);

  return (
    <Box component="section" aria-labelledby="vender-labory-titulo" sx={{ py: { xs: 5, md: 7 } }}>
      <Container maxWidth="lg">
        <Typography id="vender-labory-titulo" component="h2" variant="h4" fontWeight={800} align="center" gutterBottom>
          Como funciona Labory en una Tienda Oficial
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 3, maxWidth: 780, mx: 'auto' }}>
          Simulacion explicativa con 5% en Labory. Modifica el importe y observa el reparto.
        </Typography>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <TextField
                  fullWidth
                  label="Total de la compra (MXN)"
                  type="number"
                  inputProps={{ min: 0, step: 10 }}
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  helperText="Ejemplo inicial: $1,000 MXN"
                />
                <Alert severity="info" sx={{ mt: 2 }}>
                  Esto es una simulacion explicativa, no un proceso de pago real.
                </Alert>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 3, bgcolor: 'success.main', color: '#fff' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700}>Reparto con 5% en Labory</Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
                  Transferencia directa: {formatoMXN.format(directo)}
                </Typography>
                <Typography variant="h6" sx={{ mt: 1 }}>
                  Pago en Labory: {formatoMXN.format(labory)} (equivalente contable)
                </Typography>
                <Typography variant="body2" sx={{ mt: 2, opacity: 0.92 }}>
                  Participacion Labory: 5%. Las recompensas adicionales dependen de las
                  condiciones del programa oficial. Sin multiplicador definido ni ganancias garantizadas.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
