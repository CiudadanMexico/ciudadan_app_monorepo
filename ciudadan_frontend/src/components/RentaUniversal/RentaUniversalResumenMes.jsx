// src/components/RentaUniversal/RentaUniversalResumenMes.jsx
// Resumen mensual (§8): bloques generados dinámicamente con su requisito.
import React from 'react';
import { Box, Card, CardContent, Chip, Grid, Typography } from '@mui/material';
import { etiquetaRangoPeriodo } from '../../utils/rentaUniversal';

const chipPorEstado = (cumplido, esActual) => {
  if (cumplido) return <Chip label="Cumplido" color="success" size="small" sx={{ fontWeight: 700 }} />;
  if (esActual) return <Chip label="En progreso" color="info" size="small" sx={{ fontWeight: 700 }} />;
  return <Chip label="Pendiente" size="small" sx={{ fontWeight: 700 }} />;
};

export default function RentaUniversalResumenMes({ periodos, mesIndex }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
          Tu mes
        </Typography>
        <Grid container spacing={1.5} sx={{ mt: 1 }}>
          {periodos.map((p) => (
            <Grid item xs={12} sm={6} key={`${p.inicio}-${p.fin}`}>
              <Box
                sx={{
                  borderRadius: 3, p: 2,
                  border: '1px solid', borderColor: p.esActual ? '#8A5CF5' : 'divider',
                  bgcolor: p.cumplido ? 'rgba(46,125,50,0.06)' : 'background.default',
                }}
              >
                <Typography sx={{ fontWeight: 800 }}>
                  {etiquetaRangoPeriodo(p, mesIndex)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {p.cumplido ? '✓ ' : ''}{p.completados}/{p.requisito} requeridos
                </Typography>
                <Box sx={{ mt: 1 }}>{chipPorEstado(p.cumplido, p.esActual)}</Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
