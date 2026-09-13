// src/components/RentaUniversal/RentaUniversalHero.jsx
// Encabezado de la página (§3): título + concepto + distinción clave
// "ganancias por anuncios" vs "31 Laborys EXTRA".
import React from 'react';
import { Box, Card, CardContent, Chip, Typography } from '@mui/material';
import { MORADO, MORADO_OSCURO } from '../common/PurpleButton.jsx';
import { REGLAS_RENTA_UNIVERSAL } from '../../utils/rentaUniversal';

export default function RentaUniversalHero() {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        background: `linear-gradient(135deg, ${MORADO} 0%, ${MORADO_OSCURO} 100%)`,
        color: '#fff',
        boxShadow: '0 8px 28px rgba(138,92,245,0.35)',
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Chip
          label="Programa de constancia"
          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, mb: 2 }}
        />
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: { xs: '1.9rem', md: '2.6rem' } }}
        >
          Renta Universal
        </Typography>
        <Typography sx={{ mt: 1.5, fontWeight: 600, fontSize: { xs: '1.05rem', md: '1.2rem' } }}>
          Tu atención también produce valor.
        </Typography>
        <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
          En Ciudadan, además de las ganancias que recibes normalmente por ver publicidad,
          premiamos tu constancia. Completa tu hora de anuncios al menos 6 días de cada semana
          durante todo el mes y recibe{' '}
          <strong>+{REGLAS_RENTA_UNIVERSAL.BONO_MENSUAL_LABORYS} Laborys EXTRA</strong> al corte mensual.
        </Typography>
        <Box
          sx={{
            mt: 2.5,
            borderRadius: 3,
            bgcolor: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.35)',
            p: 2,
          }}
        >
          <Typography sx={{ fontWeight: 700, lineHeight: 1.5 }}>
            Lo que ganas diariamente viendo anuncios es tuyo. Los {REGLAS_RENTA_UNIVERSAL.BONO_MENSUAL_LABORYS} Laborys
            de Renta Universal son adicionales.
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
