// src/components/RentaUniversal/RentaUniversalPeriodo.jsx
// Periodo actual (§7): rango + 7 días visuales + mensaje dinámico.
import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { estadoDia, etiquetaDiaSemana, etiquetaRangoPeriodo } from '../../utils/rentaUniversal';

const chipSx = {
  completado: { bgcolor: '#2e7d32', color: '#fff', border: '2px solid #2e7d32' },
  hoy: { bgcolor: 'rgba(138,92,245,0.15)', color: '#6A3FCB', border: '2px solid #8A5CF5' },
  pendiente: { bgcolor: 'transparent', color: 'text.secondary', border: '2px dashed', borderColor: 'divider' },
  no_completado: { bgcolor: 'action.hover', color: 'text.disabled', border: '2px solid transparent' },
};

export default function RentaUniversalPeriodo({ periodo, mesIndex, diasSet }) {
  if (!periodo) return null;
  const faltan = Math.max(0, periodo.requisito - periodo.completados);

  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 800 }}>
          Periodo actual
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          {etiquetaRangoPeriodo(periodo, mesIndex)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          {periodo.dias.map((dia) => {
            const estado = estadoDia(dia, diasSet);
            return (
              <Box key={dia.toISOString()} sx={{ textAlign: 'center', minWidth: 44 }}>
                <Box
                  sx={{
                    width: 44, height: 44, borderRadius: '50%',
                    display: 'grid', placeItems: 'center',
                    fontWeight: 800, fontSize: '1.1rem',
                    ...chipSx[estado],
                  }}
                  title={`${etiquetaDiaSemana(dia)} ${dia.getDate()}: ${estado}`}
                >
                  {estado === 'completado' ? '✓' : dia.getDate()}
                </Box>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                  {etiquetaDiaSemana(dia)}
                </Typography>
              </Box>
            );
          })}
        </Box>
        <Typography variant="body1" sx={{ mt: 2, fontWeight: 700 }}>
          {periodo.completados} de {periodo.requisito} días completados
        </Typography>
        {periodo.cumplido ? (
          <Box sx={{ mt: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <CheckCircleRoundedIcon color="success" sx={{ mt: 0.3 }} />
            <Box>
              <Typography sx={{ fontWeight: 800 }}>✓ Meta semanal cumplida</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                Ya aseguraste este periodo. Puedes seguir generando ganancias normalmente viendo
                anuncios, pero este periodo ya cuenta para tu Renta Universal.
              </Typography>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            Te {faltan === 1 ? 'falta 1 día' : `faltan ${faltan} días`} para completar tu meta de este periodo.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
