// src/components/RentaUniversal/RentaUniversalHoy.jsx
// Progreso del día (§6): minutos de la hora diaria + CTA a ver anuncios.
import React from 'react';
import { Box, Card, CardContent, LinearProgress, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PurpleButton from '../common/PurpleButton.jsx';
import { REGLAS_RENTA_UNIVERSAL } from '../../utils/rentaUniversal';

export default function RentaUniversalHoy({ minutosHoy, minutosFaltantes, diaCompletado, onVerAnuncios }) {
  const tope = REGLAS_RENTA_UNIVERSAL.MINUTOS_POR_DIA;
  const pct = Math.round((minutosHoy / tope) * 100);

  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
          Tu progreso de hoy
        </Typography>
        {diaCompletado ? (
          <Box sx={{ mt: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <CheckCircleRoundedIcon color="success" sx={{ mt: 0.3 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                ✓ Día completado
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                Ya completaste tu hora de hoy. Este día cuenta para tu meta de Renta Universal.
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {minutosHoy} min / {tope} min
            </Typography>
            <LinearProgress variant="determinate" value={pct} sx={{ mt: 1.5, height: 10, borderRadius: 999 }} />
            <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
              Te faltan <strong>{minutosFaltantes} minutos</strong> para completar el día.
            </Typography>
            <PurpleButton onClick={onVerAnuncios} fullWidth sx={{ mt: 2, py: 1.2 }}>
              Ver anuncios de hoy
            </PurpleButton>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
