import React from 'react';
import {
  Box,
  Container,
  Typography,
  Stack,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

import SociosEstatalesMap from '../../components/SociosEstatales/SociosEstatalesMap';

/**
 * GeoNetworkMapDemo — Página interna de QA (/dev/geo-network-map).
 *
 * Versión limpia del mapa con datos oficiales, sin modos simulados.
 * La ruta existe únicamente en desarrollo.
 */
export default function GeoNetworkMapDemo() {
  const navigate = useNavigate();

  const handleCta = (slug) => {
    // En la demo interna también lleva a la vista real del estado.
    navigate(`/socios-estatales/${slug}`);
  };

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
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ mb: 3, p: 2, borderRadius: 3, bgcolor: 'rgba(11, 29, 23, 0.75)',
                border: '1px solid rgba(46, 230, 200, 0.22)', backdropFilter: 'blur(10px)' }}
        >
          <Chip
            label="QA interno · Desarrollo"
            size="small"
            sx={{ bgcolor: 'rgba(239, 233, 47, 0.15)', color: '#efe92f',
                  border: '1px solid rgba(239, 233, 47, 0.4)', fontWeight: 800, fontSize: '0.7rem' }}
          />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffffff' }}>
              GeoNetworkMap · Socios Estatales de México
            </Typography>
            <Typography variant="caption" sx={{ color: '#a2c4b9' }}>
              Motor territorial vectorial genérico (SVG + proyección Mercator + 32 entidades federativas INEGI).
            </Typography>
          </Box>
        </Stack>

        <SociosEstatalesMap
          initialSelectedRegion="MX-CMX"
          onCtaClick={handleCta}
        />
      </Container>
    </Box>
  );
}
