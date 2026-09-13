// src/components/RentaUniversal/RentaUniversalEstado.jsx
// Estados generales (§10): activo / periodo cumplido / calificado /
// pagado (demo mock con fecha) / no alcanzado.
import React from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { REGLAS_RENTA_UNIVERSAL } from '../../utils/rentaUniversal';

export default function RentaUniversalEstado({ estado, fechaPago }) {
  if (estado === 'calificado') {
    return (
      <Alert severity="success" sx={{ borderRadius: 3 }}>
        <Typography sx={{ fontWeight: 800 }}>✓ Renta Universal asegurada</Typography>
        <Typography variant="body2">
          Has cumplido las metas del mes. En el próximo corte recibirás{' '}
          {REGLAS_RENTA_UNIVERSAL.BONO_MENSUAL_LABORYS} Laborys adicionales.
        </Typography>
      </Alert>
    );
  }
  if (estado === 'pagado') {
    return (
      <Alert severity="success" sx={{ borderRadius: 3 }}>
        <Typography sx={{ fontWeight: 800 }}>
          ✓ {REGLAS_RENTA_UNIVERSAL.BONO_MENSUAL_LABORYS} Laborys recibidos
        </Typography>
        <Typography variant="body2">
          {fechaPago ? `Fecha del pago: ${fechaPago}.` : 'Bono acreditado.'} (Dato de muestra — la
          acreditación real la realiza el backend.)
        </Typography>
      </Alert>
    );
  }
  if (estado === 'no_alcanzado') {
    return (
      <Alert severity="warning" sx={{ borderRadius: 3 }}>
        <Typography sx={{ fontWeight: 800 }}>
          Este mes no alcanzaste la meta de Renta Universal.
        </Typography>
        <Typography variant="body2">
          Tus ganancias obtenidas normalmente por visualizar anuncios no se pierden. Simplemente no
          obtienes los {REGLAS_RENTA_UNIVERSAL.BONO_MENSUAL_LABORYS} Laborys EXTRA de constancia de este mes.
        </Typography>
      </Alert>
    );
  }
  if (estado === 'periodo_cumplido') {
    return (
      <Alert severity="info" sx={{ borderRadius: 3 }}>
        <Typography sx={{ fontWeight: 800 }}>Periodo cumplido — sigues en camino</Typography>
        <Typography variant="body2">
          Ya aseguraste el periodo actual. Mantén la constancia en los siguientes para calificar al
          bono mensual de +{REGLAS_RENTA_UNIVERSAL.BONO_MENSUAL_LABORYS} Laborys EXTRA.
        </Typography>
      </Alert>
    );
  }
  return (
    <Box sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 2 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        <strong>Programa activo:</strong> completa tu hora diaria al menos 6 días de cada periodo
        para calificar a los +{REGLAS_RENTA_UNIVERSAL.BONO_MENSUAL_LABORYS} Laborys EXTRA del corte mensual,
        además de tus ganancias normales por publicidad.
      </Typography>
    </Box>
  );
}
