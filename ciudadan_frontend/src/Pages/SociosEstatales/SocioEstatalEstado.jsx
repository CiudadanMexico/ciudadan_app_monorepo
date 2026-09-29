import React, { useRef, useState } from 'react';
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
import SocioEstatalForm from '../../components/SociosEstatales/SocioEstatalForm';
import mxMeta from '../../data/geo/mx/states.meta.json';
import sociosData from '../../data/maps/socios-estatales.json';
import mapConfig from '../../data/maps/socios-estatales.map.json';
import { normalizeRegionId } from '../../components/GeoNetworkMap/geoUtils';
import { getStatusLabel, geoTokens } from '../../components/GeoNetworkMap/geoTheme';

/**
 * SocioEstatalEstado — Vista de detalle de un Socio Estatal (/socios-estatales/:estado).
 */


export default function SocioEstatalEstado() {
  const { estado } = useParams();
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState(null);
  // Los hooks deben declararse SIEMPRE antes de cualquier return temprano.
  const formRef = useRef(null);

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

  const scrollAlFormulario = () => {
    // Optional call: jsdom y algunos navegadores antiguos no implementan scrollIntoView.
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const handleCta = (slug) => {
    if (data.status === 'available') {
      scrollAlFormulario();
    } else {
      setSnackbar(
        data.status === 'processing'
          ? 'La postulación ya está en proceso de revisión. Te contactaremos con los siguientes pasos.'
          : 'Este estado ya tiene Socio Estatal confirmado. Pronto habilitaremos más formas de participar en tu estado.'
      );
    }
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

        {/* Sección de postulación (formulario real si el estado está disponible) */}
        {data.status === 'available' ? (
          <Box ref={formRef} sx={{ mt: 4, scrollMarginTop: 90 }}>
            <SocioEstatalForm
              estadoSolicitado={region.shortName || region.name}
              regionId={regionId}
              status={data.status}
              estadoNombre={region.name}
            />
          </Box>
        ) : (
          <Box
            sx={{
              mt: 4,
              p: { xs: 2.5, sm: 3 },
              borderRadius: 3,
              bgcolor: 'rgba(11, 29, 23, 0.75)',
              border: '1px solid rgba(245, 200, 66, 0.30)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#ffffff', mb: 1 }}>
              {data.status === 'processing' ? 'Postulación en revisión' : 'Estado asignado'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#a2c4b9', lineHeight: 1.6 }}>
              {data.status === 'processing'
                ? `La postulación para ${region.shortName || region.name} está en proceso de revisión por el equipo. Si postulaste recientemente, recibirás noticias por WhatsApp.`
                : `${region.shortName || region.name} ya cuenta con Socio Estatal confirmado. Pronto habilitaremos otras formas de participar en tu estado.`}
            </Typography>
          </Box>
        )}

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
