// src/components/RentaUniversal/RentaUniversalGanancias.jsx
// Sección de ganancias duales (§5): distingue "ganancias por anuncios"
// (recompensas normales) del "bono Renta Universal" (+31 EXTRA).
import React from 'react';
import { Box, Card, CardContent, Chip, Grid, Typography } from '@mui/material';
import { REGLAS_RENTA_UNIVERSAL } from '../../utils/rentaUniversal';

const ETIQUETAS_BONO = {
  en_progreso: { label: 'En progreso', color: 'info' },
  periodo_cumplido: { label: 'Periodo cumplido', color: 'info' },
  calificado: { label: 'Calificado', color: 'success' },
  pagado: { label: 'Pagado', color: 'success' },
  no_alcanzado: { label: 'No alcanzado', color: 'default' },
};

export default function RentaUniversalGanancias({ gananciasAnuncios, estado, esMock }) {
  const bono = ETIQUETAS_BONO[estado] || ETIQUETAS_BONO.en_progreso;

  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
          Tus ganancias
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ borderRadius: 3, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', p: 2.5, height: '100%' }}>
              <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                Ganancias por anuncios
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                {gananciasAnuncios} Laborys
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, lineHeight: 1.6 }}>
                Estas son las recompensas que has generado normalmente al visualizar publicidad.
                {esMock ? ' (Dato de muestra — conectar API de recompensas.)' : ''}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ borderRadius: 3, bgcolor: 'rgba(138,92,245,0.08)', border: '1px solid rgba(138,92,245,0.4)', p: 2.5, height: '100%' }}>
              <Typography variant="overline" sx={{ fontWeight: 800, color: '#8A5CF5' }}>
                Bono Renta Universal
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                +{REGLAS_RENTA_UNIVERSAL.BONO_MENSUAL_LABORYS} Laborys
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Chip label={bono.label} color={bono.color} size="small" sx={{ fontWeight: 700 }} />
              </Box>
            </Box>
          </Grid>
        </Grid>
        <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>
          El bono de Renta Universal se suma a tus ganancias por anuncios. No las reemplaza.
        </Typography>
      </CardContent>
    </Card>
  );
}
