// src/utils/horarios.js
import React from 'react';
import { Typography } from '@mui/material';
import { DIAS_SEMANA } from './diccionarios';

/**
 * renderHorarios
 * - acepta el objeto `horarios` tal como lo tienes en los clubs
 * - normaliza con DIAS_SEMANA cuando no hay datos
 * - devuelve un array de <Typography/> (JSX) para renderizar directamente
 *
 * Nota: es un "render helper" — no usa hooks ni estado, por eso puede vivir en utils.
 */
export function renderHorarios(horarios) {
  const horariosNormalizados =
    horarios && Object.keys(horarios).length > 0
      ? horarios
      : DIAS_SEMANA.reduce((acc, dia) => {
          acc[dia] = {
            abierto: false,
            apertura: '-',
            cierre: '-',
          };
          return acc;
        }, {});

  return Object.entries(horariosNormalizados).map(([dia, horas]) => {
    const abierto = horas?.abierto === true;
    const apertura = abierto ? horas?.apertura || '-' : '-';
    const cierre = abierto ? horas?.cierre || '-' : '-';

    return (
      <Typography key={dia} variant="body2" sx={{ ml: 1 }}>
        <strong>{dia}:</strong> {abierto ? 'Abierto' : 'Cerrado'} ({apertura} - {cierre})
      </Typography>
    );
  });
}
