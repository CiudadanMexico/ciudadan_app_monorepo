// SECCION 6 — Como empezar (4 pasos).
import React from 'react';
import { Box, Button, Card, CardContent, Container, Grid, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { pasosEmpezar } from './venderLanding.membresia';
import { VENDER_RUTAS } from './venderLanding.rutas';

export default function VenderPasos() {
  return (
    <Box component="section" aria-labelledby="vender-pasos-titulo" sx={{ py: { xs: 5, md: 7 } }}>
      <Container maxWidth="lg">
        <Typography id="vender-pasos-titulo" component="h2" variant="h4" fontWeight={800} align="center" gutterBottom>
          Como empezar a vender
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
          Cuatro pasos sencillos, con validacion requerida por la plataforma.
        </Typography>
        <Grid container spacing={3}>
          {pasosEmpezar.map((p) => (
            <Grid item xs={12} sm={6} md={3} key={p.numero}>
              <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h3" fontWeight={800} color="success.main">
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
