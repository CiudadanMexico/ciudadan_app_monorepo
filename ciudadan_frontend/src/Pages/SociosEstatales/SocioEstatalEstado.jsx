import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Stack,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

import SociosEstatalesMap from '../../components/SociosEstatales/SociosEstatalesMap';
import mxMeta from '../../data/geo/mx/states.meta.json';
import sociosData from '../../data/maps/socios-estatales.json';
import mapConfig from '../../data/maps/socios-estatales.map.json';
import { normalizeRegionId } from '../../components/GeoNetworkMap/geoUtils';
import { getStatusLabel, geoTokens } from '../../components/GeoNetworkMap/geoTheme';

/**
 * SocioEstatalEstado — Vista de detalle de un Socio Estatal (/socios-estatales/:estado).
 */
function getCtaInfo(status) {
  if (status === 'assigned') {
    return {
      label: 'Otras formas de participar',
      variant: 'outlined',
      color: '#2ee6c8',
      message: 'Este estado ya tiene Socio Estatal confirmado. Pronto habilitaremos más formas de participar en tu estado.',
    };
  }
  if (status === 'processing') {
    return {
      label: 'Ver proceso',
      variant: 'contained',
      color: '#f5c842',
      message: 'La postulación ya está en proceso de revisión. Te contactaremos con los siguientes pasos.',
    };
  }
  return {
    label: 'Postularme como Socio Estatal',
    variant: 'contained',
    color: '#19d79c',
    message: '¡Gracias por tu interés! El formulario de postulación estará disponible próximamente. Mientras tanto puedes escribirnos para más información.',
  };
}

export default function SocioEstatalEstado() {
  const { estado } = useParams();
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState(null);

  const region = (mxMeta?.regions || []).find(
    (r) => (r.slug || '').toLowerCase() === String(estado || '').toLowerCase()
  );

  if (!region) {
    return (
      <Box
        sx={{
          minHeight: '70vh',
          bgcolor: '#07120f',
          color: '#ffffff',
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          p: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#ffffff', mb: 1 }}>
            Entidad no encontrada
          </Typography>
          <Typography variant="body1" sx={{ color: '#a2c4b9', mb: 3 }}>
            No existe un estado con la ruta <strong>/{estado}</strong>.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => navigate('/socios-estatales')}
            sx={{ bgcolor: '#19d79c', color: '#07120f', fontWeight: 800, borderRadius: 999, px: 3 }}
          >
            Volver al mapa de estados
          </Button>
        </Box>
      </Box>
    );
  }

  const regionId = normalizeRegionId(region.regionId);
  const data = sociosData.find((d) => normalizeRegionId(d.regionId) === regionId) || {};
  const statusToken = geoTokens[data.status] || geoTokens.available;
  const cta = getCtaInfo(data.status);

  const handleCta = () => {
    setSnackbar(cta.message);
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
        {/* Migas / regreso */}
        <Button
          component={Link}
          to="/socios-estatales"
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ color: '#2ee6c8', fontWeight: 700, textTransform: 'none', mb: 2, px: 0 }}
        >
          Todos los estados
        </Button>

        {/* Encabezado del estado */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="overline" sx={{ color: '#a2c4b9', fontWeight: 800, letterSpacing: '0.08em' }}>
              {region.code} · {region.abbreviation}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
              {region.labelText || region.shortName || region.name}
            </Typography>
            <Typography variant="body1" sx={{ color: '#a2c4b9', mt: 0.5 }}>
              Socio Estatal Ciudadan · {region.shortName || region.name}
            </Typography>
          </Box>

          <Chip
            label={getStatusLabel(data.status)}
            sx={{
              bgcolor: statusToken.fill,
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.78rem',
              border: `1px solid ${statusToken.stroke}`,
              boxShadow: `0 0 12px ${statusToken.glow}`,
            }}
          />
        </Stack>

        {/* Mapa completo con el estado enfocado */}
        <SociosEstatalesMap
          initialSelectedRegion={regionId}
          sociosData={sociosData}
          mapConfig={mapConfig}
          onCtaClick={handleCta}
        />

        {/* Snackbar informativo del CTA */}
        <Snackbar
          open={Boolean(snackbar)}
          autoHideDuration={6000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar(null)}
            severity="info"
            variant="filled"
            sx={{
              bgcolor: 'rgba(11, 29, 23, 0.96)',
              color: '#ffffff',
              border: '1px solid rgba(46, 230, 200, 0.4)',
              '& .MuiAlert-icon': { color: '#2ee6c8' },
            }}
          >
            {snackbar}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}
