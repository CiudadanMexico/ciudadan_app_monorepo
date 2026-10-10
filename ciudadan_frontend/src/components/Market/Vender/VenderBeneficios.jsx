// SECCION 2 — Beneficios del Marketplace (iconos SVG).
import React from 'react';
import { Box, Card, CardContent, Container, Grid, Typography } from '@mui/material';
import VenderIcono from './VenderIcono';
import { beneficiosMarketplace } from './venderLanding.beneficios';

export default function VenderBeneficios() {
  return (
    <Box component="section" aria-labelledby="vender-beneficios-titulo" sx={{ py: { xs: 5, md: 7 } }}>
      <Container maxWidth="lg">
        <Typography id="vender-beneficios-titulo" component="h2" variant="h4" fontWeight={800} align="center" gutterBottom>
          Tu negocio es tuyo. Tus ganancias tambien.
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4, maxWidth: 760, mx: 'auto' }}>
          Vende sin comisiones de Ciudadan, recibe pagos directos y opera en todo Mexico.
        </Typography>
        <Grid container spacing={3}>
          {beneficiosMarketplace.map((b) => (
            <Grid item xs={12} sm={6} md={4} key={b.titulo}>
              <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <VenderIcono nombre={b.icono} sx={{ color: 'success.main', mb: 1 }} />
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
