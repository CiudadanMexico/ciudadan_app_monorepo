import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import SociosEstatalesMap from '../../components/SociosEstatales/SociosEstatalesMap';

/**
 * SociosEstatalesPage — Página principal de "Socios Estatales".
 * Muestra el mapa territorial de México con el estado de cada entidad
 * y la ficha de la entidad seleccionada.
 */
export default function SociosEstatalesPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#07120f',
        color: '#ffffff',
        py: { xs: 3, md: 5 },
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="overline"
            sx={{
              color: '#2ee6c8',
              fontWeight: 800,
              letterSpacing: '0.08em',
            }}
          >
            Ecosistema Ciudadan
          </Typography>
          <Typography
            variant="h3"
            sx={{ fontWeight: 900, color: '#ffffff', lineHeight: 1.1, mb: 1 }}
          >
            Socios Estatales
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: '#a2c4b9', maxWidth: 760, fontSize: '1.02rem' }}
          >
            Los Socios Estatales lideran el crecimiento de Ciudadan en cada
            entidad federativa: reciben el <strong>5% de las membresías</strong> de
            los conductores afiliados en su estado, con financiamiento de hasta{' '}
            <strong>12 meses sin intereses</strong>. Toca un estado en el mapa o
            búscalo en el listado para ver sus condiciones.
          </Typography>
        </Box>

        <SociosEstatalesMap initialSelectedRegion="MX-CMX" />
      </Container>
    </Box>
  );
}