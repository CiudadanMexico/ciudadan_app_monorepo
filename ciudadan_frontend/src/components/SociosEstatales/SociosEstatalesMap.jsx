import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Autocomplete,
  TextField,
  Divider,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

import GeoNetworkMap from '../GeoNetworkMap/GeoNetworkMap';
import { formatMoneyMXN, formatMetric, normalizeRegionId } from '../GeoNetworkMap/geoUtils';
import { getStatusLabel, geoTokens } from '../GeoNetworkMap/geoTheme';

import mxGeometry from '../../data/geo/mx/states.geo.json';
import mxMeta from '../../data/geo/mx/states.meta.json';
import defaultSociosData from '../../data/maps/socios-estatales.json';
import defaultSociosConfig from '../../data/maps/socios-estatales.map.json';

/**
 * SociosEstatalesMap — Wrapper de negocio para Socios Estatales de México.
 */
export default function SociosEstatalesMap({
  initialSelectedRegion = 'MX-CMX',
  onStateSelect = null,
  onCtaClick = null,
  sociosData = defaultSociosData,
  mapConfig = defaultSociosConfig,
}) {
  const [selectedId, setSelectedId] = useState(normalizeRegionId(initialSelectedRegion));
  const navigate = useNavigate();

  const dataMap = useMemo(() => {
    const map = {};
    (sociosData || []).forEach((item) => {
      map[normalizeRegionId(item.regionId)] = item;
    });
    return map;
  }, [sociosData]);

  const metaMap = useMemo(() => {
    const map = {};
    (mxMeta?.regions || []).forEach((r) => {
      map[normalizeRegionId(r.regionId)] = r;
    });
    return map;
  }, []);

  const activeMeta = metaMap[selectedId] || mxMeta?.regions?.[0] || {};
  const activeData = dataMap[selectedId] || {};
  const statusToken = geoTokens[activeData.status] || geoTokens.available;

  const handleSelect = useCallback(
    (regionId, rData, rMeta) => {
      const normalized = normalizeRegionId(regionId);
      setSelectedId(normalized);
      if (onStateSelect) {
        onStateSelect(normalized, rData || dataMap[normalized], rMeta || metaMap[normalized]);
      }
    },
    [dataMap, metaMap, onStateSelect]
  );

  const handleAutocompleteChange = (event, newValue) => {
    if (newValue && newValue.regionId) {
      handleSelect(newValue.regionId);
    }
  };

  const renderCta = () => {
    const status = activeData.status || 'available';
    let label = 'Ver estado';
    let variant = 'contained';
    let color = '#19d79c';
    let textColor = '#07120f';

    if (status === 'assigned') {
      label = 'Otras formas de participar';
      variant = 'outlined';
      color = '#2ee6c8';
      textColor = '#2ee6c8';
    } else if (status === 'processing') {
      label = 'Ver proceso';
      variant = 'contained';
      color = '#f5c842';
      textColor = '#07120f';
    }

    const handleClick = () => {
      const slug = activeMeta.slug;
      // Por defecto se navega a la vista del estado; si el consumidor del
      // componente entrega onCtaClick, se delega la decisión a él.
      if (onCtaClick) {
        onCtaClick(slug, status, activeData);
      } else {
        navigate(`/socios-estatales/${slug}`);
      }
    };

    return (
      <Button
        variant={variant}
        fullWidth
        size="large"
        endIcon={<ArrowForwardRoundedIcon />}
        onClick={handleClick}
        sx={{
          borderRadius: 2.5,
          fontWeight: 800,
          py: 1.4,
          fontSize: '0.92rem',
          bgcolor: variant === 'contained' ? color : 'transparent',
          color: textColor,
          borderColor: color,
          '&:hover': {
            bgcolor: variant === 'contained' ? '#15c98f' : 'rgba(46, 230, 200, 0.12)',
            borderColor: color,
          },
        }}
      >
        {label}
      </Button>
    );
  };

  return (
    <Box sx={{ width: '100%', py: { xs: 2, md: 4 } }}>
      {/* Selector móvil / buscador de estado */}
      <Box sx={{ mb: 2.5, maxWidth: { xs: '100%', md: 380 } }}>
        <Typography
          variant="caption"
          sx={{
            color: '#a2c4b9',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            display: 'block',
            mb: 0.8,
          }}
        >
          Buscar mi estado
        </Typography>
        <Autocomplete
          id="socio-state-selector"
          options={mxMeta?.regions || []}
          getOptionLabel={(option) => `${option.name} (${option.shortName})`}
          value={(mxMeta?.regions || []).find((r) => r.regionId === selectedId) || null}
          onChange={handleAutocompleteChange}
          isOptionEqualToValue={(opt, val) => opt.regionId === val?.regionId}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Escribe o selecciona un estado..."
              size="small"
              sx={{
                bgcolor: 'rgba(11, 29, 23, 0.85)',
                borderRadius: 2,
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: 'rgba(46, 230, 200, 0.25)' },
                  '&:hover fieldset': { borderColor: '#19d79c' },
                  '&.Mui-focused fieldset': { borderColor: '#2ee6c8' },
                },
                '& .MuiSvgIcon-root': { color: '#2ee6c8' },
              }}
            />
          )}
        />
      </Box>

      {/* Grid: Mapa + Ficha lateral */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' },
          gap: { xs: 2.5, lg: 3.5 },
          alignItems: 'start',
        }}
      >
        <Box sx={{ width: '100%' }}>
          <GeoNetworkMap
            geometry={mxGeometry}
            geoMeta={mxMeta}
            data={sociosData}
            config={mapConfig}
            selectedRegionId={selectedId}
            onRegionSelect={handleSelect}
            showLabels
            showLegend
            showTooltip
            width={1000}
            height={620}
            padding={24}
            ariaLabel="Mapa interactivo de Socios Estatales de México"
          />
        </Box>

        {/* Ficha lateral del estado seleccionado */}
        <Card
          sx={{
            bgcolor: 'rgba(11, 29, 23, 0.92)',
            backdropFilter: 'blur(16px)',
            borderRadius: 3.5,
            border: '1px solid rgba(46, 230, 200, 0.28)',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.55)',
            color: '#ffffff',
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
              <Box>
                <Typography variant="overline" sx={{ color: '#a2c4b9', fontWeight: 800, letterSpacing: '0.08em' }}>
                  {activeMeta.code} · {activeMeta.abbreviation}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffffff', lineHeight: 1.15 }}>
                  {activeMeta.name}
                </Typography>
              </Box>

              <Chip
                label={getStatusLabel(activeData.status)}
                size="small"
                sx={{
                  bgcolor: statusToken.fill,
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.74rem',
                  border: `1px solid ${statusToken.stroke}`,
                  boxShadow: `0 0 10px ${statusToken.glow}`,
                }}
              />
            </Stack>

            <Divider sx={{ borderColor: 'rgba(46, 230, 200, 0.15)', my: 2 }} />

            <Stack spacing={1.8} sx={{ mb: 3 }}>
              {activeData.drivers?.total !== null && activeData.drivers?.total !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <DirectionsCarRoundedIcon sx={{ color: '#2ee6c8', fontSize: '1.4rem' }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#a2c4b9', display: 'block' }}>
                      Conductores afiliados estimados
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff' }}>
                      {formatMetric(activeData.drivers.total)}
                    </Typography>
                  </Box>
                </Box>
              )}

              {activeData.investment !== null && activeData.investment !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <HowToRegRoundedIcon sx={{ color: '#2ee6c8', fontSize: '1.4rem' }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#a2c4b9', display: 'block' }}>
                      Aportación estimada
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff' }}>
                      {formatMoneyMXN(activeData.investment)}
                    </Typography>
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircleRoundedIcon sx={{ color: '#19d79c', fontSize: '1.4rem' }} />
                <Box>
                  <Typography variant="caption" sx={{ color: '#a2c4b9', display: 'block' }}>
                    Participación en membresías
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#19d79c' }}>
                    {activeData.participation || 5}% de las membresías de conductores
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <HourglassEmptyRoundedIcon sx={{ color: '#2ee6c8', fontSize: '1.4rem' }} />
                <Box>
                  <Typography variant="caption" sx={{ color: '#a2c4b9', display: 'block' }}>
                    Financiamiento cooperativo
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff' }}>
                    Hasta {activeData.months || 12} meses sin intereses
                  </Typography>
                </Box>
              </Box>
            </Stack>

            {renderCta()}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

SociosEstatalesMap.propTypes = {
  initialSelectedRegion: PropTypes.string,
  onStateSelect: PropTypes.func,
  onCtaClick: PropTypes.func,
  sociosData: PropTypes.array,
  mapConfig: PropTypes.object,
};
