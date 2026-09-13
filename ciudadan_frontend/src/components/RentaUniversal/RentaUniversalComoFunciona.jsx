// src/components/RentaUniversal/RentaUniversalComoFunciona.jsx
// Explicación sencilla (§9): 4 pasos + recordatorio dual.
import React from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import { REGLAS_RENTA_UNIVERSAL } from '../../utils/rentaUniversal';

const PASOS = [
  {
    n: '1',
    titulo: 'Gana viendo anuncios',
    texto: 'Visualiza publicidad y recibe normalmente las recompensas correspondientes. Puedes consumir hasta una hora diaria.',
  },
  {
    n: '2',
    titulo: 'Mantén la constancia',
    texto: 'Completa tu hora al menos 6 días de cada periodo semanal.',
  },
  {
    n: '3',
    titulo: 'Cumple todo el mes',
    texto: 'Mantén la meta durante todos los periodos requeridos.',
  },
  {
    n: '4',
    titulo: 'Recibe 31 Laborys EXTRA',
    texto: 'Al corte mensual, si cumpliste todas las metas, recibes otros 31 Laborys, además de todo lo que ya generaste viendo publicidad.',
  },
];

export default function RentaUniversalComoFunciona() {
  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
          ¿Cómo obtengo mi Renta Universal?
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {PASOS.map((p) => (
            <Grid item xs={12} sm={6} key={p.n}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    display: 'grid', placeItems: 'center',
                    bgcolor: '#8A5CF5', color: '#fff', fontWeight: 800,
                  }}
                >
                  {p.n}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800 }}>{p.titulo}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                    {p.texto}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ mt: 2.5, borderRadius: 3, bgcolor: 'rgba(138,92,245,0.08)', p: 2 }}>
          <Typography sx={{ fontWeight: 700, textAlign: 'center' }}>
            No tienes que elegir entre tus ganancias publicitarias y la Renta Universal: recibes ambas.
            (+{REGLAS_RENTA_UNIVERSAL.BONO_MENSUAL_LABORYS} EXTRA por constancia, además de tus ganancias por anuncios.)
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
