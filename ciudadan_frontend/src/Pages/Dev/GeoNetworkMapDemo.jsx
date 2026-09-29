import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  Chip,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate } from 'react-router-dom';

import SociosEstatalesMap from '../../components/SociosEstatales/SociosEstatalesMap';
import defaultSociosData from '../../data/maps/socios-estatales.json';
import demoSociosData from '../../data/maps/socios-estatales.demo.json';
import defaultSociosConfig from '../../data/maps/socios-estatales.map.json';

/**
 * GeoNetworkMapDemo — Página interna de pruebas y QA (/dev/geo-network-map).
 *
 * Permite alternar entre:
 *  - Dataset productivo oficial: CDMX y Estado de México `assigned`, los otros 30 `available` con nulls.
 *  - Dataset de simulación (.demo.json): cifras ficticias sólo para validar formateo y tooltips ricos.
 *
 * No debe agregarse al menú público: es una herramienta de desarrollo/QA.
 */
export default function GeoNetworkMapDemo() {
  const navigate = useNavigate();
  const [useDemoData, setUseDemoData] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState('ciudad-de-mexico');
  const [lastCtaEvent, setLastCtaEvent] = useState(null);

  const activeData = useDemoData ? demoSociosData : defaultSociosData;

  const handleStateSelect = (regionId, rData, rMeta) => {
    if (rMeta && rMeta.slug) {
      setSelectedSlug(rMeta.slug);
    }
  };

  const handleCtaClick = (slug, status) => {
    setLastCtaEvent({ slug, status, timestamp: new Date().toLocaleTimeString() });
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
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 3,
            bgcolor: 'rgba(11, 29, 23, 0.75)',
            border: '1px solid rgba(46, 230, 200, 0.22)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
              <Button
                size="small"
                variant="text"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => navigate('/')}
                sx={{ color: '#2ee6c8', fontWeight: 700 }}
              >
                Volver
              </Button>
              <Chip
                label="Entorno Dev · QA"
                size="small"
                sx={{
                  bgcolor: 'rgba(239, 233, 47, 0.15)',
                  color: '#efe92f',
                  border: '1px solid rgba(239, 233, 47, 0.4)',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                }}
              />
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffffff' }}>
              GeoNetworkMap · Socios Estatales de México
            </Typography>
            <Typography variant="caption" sx={{ color: '#a2c4b9' }}>
              Motor territorial vectorial genérico (SVG + proyección Mercator + 32 entidades federativas INEGI).
            </Typography>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={useDemoData}
                onChange={(e) => setUseDemoData(e.target.checked)}
                color="secondary"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#2ee6c8' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#19d79c' },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#ffffff', fontSize: '0.85rem' }}>
                {useDemoData ? 'Dataset Demo (cifras simuladas)' : 'Dataset Productivo (oficial)'}
              </Typography>
            }
          />
        </Stack>

        {useDemoData ? (
          <Alert
            severity="info"
            sx={{
              mb: 3,
              bgcolor: 'rgba(46, 230, 200, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(46, 230, 200, 0.3)',
              '& .MuiAlert-icon': { color: '#2ee6c8' },
            }}
          >
            Modo <strong>Dataset Demo</strong>: cifras ficticias para validar formateo de moneda, métrica e
            intensidades. El dataset productivo no se modifica.
          </Alert>
        ) : (
          <Alert
            severity="success"
            sx={{
              mb: 3,
              bgcolor: 'rgba(25, 215, 156, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(25, 215, 156, 0.3)',
              '& .MuiAlert-icon': { color: '#19d79c' },
            }}
          >
            Modo <strong>Dataset Productivo</strong>: CDMX y Estado de México en <em>assigned</em>; los otros 30 en{' '}
            <em>available</em> con campos desconocidos en <code>null</code>.
          </Alert>
        )}

        <SociosEstatalesMap
          initialSelectedRegion="MX-CMX"
          sociosData={activeData}
          mapConfig={defaultSociosConfig}
          onStateSelect={handleStateSelect}
          onCtaClick={handleCtaClick}
        />

        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: 'rgba(11, 29, 23, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Typography variant="caption" sx={{ color: '#a2c4b9', display: 'block' }}>
            Preparación de ruta futura (aún sin página destino, por eso no se navega):
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#2ee6c8' }}>
            /socios-estatales/{selectedSlug}
            {lastCtaEvent ? ` · CTA: ${lastCtaEvent.status} a las ${lastCtaEvent.timestamp}` : ''}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
