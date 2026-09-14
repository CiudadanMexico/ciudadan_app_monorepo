// src/components/RentaUniversal/RentaUniversalMes.jsx
// Tarjeta principal de progreso del mes (§4).
import React from 'react';
import { Box, Card, CardContent, LinearProgress, Typography } from '@mui/material';
import { MORADO } from '../common/PurpleButton.jsx';
import { REGLAS_RENTA_UNIVERSAL } from '../../utils/rentaUniversal';

export default function RentaUniversalMes({ mesNombre, completados, total, corte }) {
  const pct = total > 0 ? Math.round((completados / total) * 100) : 0;
  const corteFmt = corte
    ? corte.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
    : '';

  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.12em' }}>
          Tu progreso de {mesNombre}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
          {completados} / {total} periodos cumplidos
        </Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{ mt: 2, height: 12, borderRadius: 999, bgcolor: 'action.hover' }}
        />
        <Box
          sx={{
            mt: 3,
            borderRadius: 3,
            bgcolor: 'rgba(138,92,245,0.08)',
            border: '1px dashed rgba(138,92,245,0.5)',
            p: 2.5,
            textAlign: 'center',
          }}
        >
          <Typography variant="overline" sx={{ color: MORADO, fontWeight: 800, letterSpacing: '0.12em' }}>
            Renta Universal del mes
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, color: MORADO, lineHeight: 1.1 }}>
            +{REGLAS_RENTA_UNIVERSAL.BONO_MENSUAL_LABORYS} Laborys EXTRA
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5 }}>
            Además de tus ganancias normales por publicidad.
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          Próximo corte: <strong>{corteFmt}</strong>
        </Typography>
      </CardContent>
    </Card>
  );
}
