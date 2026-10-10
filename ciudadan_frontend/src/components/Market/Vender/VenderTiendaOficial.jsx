// SECCION 3 — Tienda Oficial Ciudadan.
import React, { useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Collapse, Container, Grid, Stack, Typography, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import tiendaImg from '../../../assets/market_landing_2.png';
import tiendaWebp from '../../../assets/market_landing_2.webp';
import VenderImagen from './VenderImagen';
import VenderIcono from './VenderIcono';
import { beneficiosTiendaOficial, usosLabory } from './venderLanding.beneficios';

export default function VenderTiendaOficial() {
  const theme = useTheme();
  const oscuro = theme.palette.mode === 'dark';
  const [abierto, setAbierto] = useState(false);
  return (
    <Box
      component="section"
      id="tienda-oficial"
      aria-labelledby="vender-oficial-titulo"
      sx={{
        py: { xs: 5, md: 7 },
        scrollMarginTop: '88px',
        background: oscuro ? 'rgba(46,125,50,0.10)' : '#eef6ee',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={6} order={{ xs: 2, md: 1 }}>
            <VenderImagen
              webp={tiendaWebp}
              png={tiendaImg}
              alt="Tienda Oficial Ciudadan aceptando Labory"
            />
          </Grid>
          <Grid item xs={12} md={6} order={{ xs: 1, md: 2 }}>
            <Chip label="Modalidad especial sujeta a validacion" color="success" sx={{ mb: 2, fontWeight: 700 }} />
            <Typography id="vender-oficial-titulo" component="h2" variant="h4" fontWeight={800} gutterBottom>
              Conviertete en Tienda Oficial Ciudadan
            </Typography>
            <Typography variant="h6" color="success.main" fontWeight={700} gutterBottom>
              Acepta Labory y multiplica tus oportunidades.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.8 }}>
              Acepta desde el 5% en Labory cuando el comprador usa esa modalidad. El porcentaje
              operativo inicial es fijo: 5%. El resto se paga directamente a ti en pesos.
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {beneficiosTiendaOficial.map((b) => (
                <Grid item xs={12} sm={6} key={b.titulo}>
                  <Card sx={{ height: '100%', borderRadius: 3 }}>
                    <CardContent>
                      <VenderIcono nombre={b.icono} sx={{ color: 'success.main' }} />
                      <Typography component="h3" variant="subtitle1" fontWeight={700}>
                        {b.titulo}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {b.texto}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Button
              variant="contained"
              color="success"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              aria-controls="vender-oficial-detalle"
              endIcon={<ExpandMoreIcon sx={{ transform: abierto ? 'rotate(180deg)' : 'none' }} />}
              sx={{ fontWeight: 700, borderRadius: 3 }}
            >
              Conocer los beneficios
            </Button>
            <Collapse in={abierto}>
              <Box id="vender-oficial-detalle" sx={{ mt: 2, p: 2, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Usos posibles de Labory dentro del ecosistema
                </Typography>
                <Stack spacing={1}>
                  {usosLabory.map((uso) => (
                    <Typography key={uso} variant="body2" color="text.secondary">
                      · {uso}, segun disponibilidad del programa.
                    </Typography>
                  ))}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Las bonificaciones adicionales estan sujetas a las condiciones y limites del
                  programa. El multiplicador todavia no esta definido y no se prometen
                  recompensas ilimitadas ni conversiones garantizadas a pesos.
                </Typography>
              </Box>
            </Collapse>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
