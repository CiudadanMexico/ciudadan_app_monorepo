import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { resolveFillToken } from './geoTheme';

/**
 * MapLegend — Leyenda visual configurable para GeoNetworkMap.
 *
 * Muestra los estados / tokens con su indicador de color y texto descriptivo.
 * El contenido proviene de la configuración visual del mapa, no hardcodeado.
 */
export default function MapLegend({ legendConfig, direction = 'row' }) {
  if (!legendConfig || !legendConfig.items || legendConfig.items.length === 0) {
    return null;
  }

  const { title, items } = legendConfig;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        flexDirection: direction === 'column' ? 'column' : { xs: 'column', sm: 'row' },
        alignItems: direction === 'column' ? 'flex-start' : 'center',
        gap: { xs: 1, sm: 2 },
        px: 2,
        py: 1,
        borderRadius: 999,
        bgcolor: 'rgba(11, 29, 23, 0.75)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(46, 230, 200, 0.22)',
      }}
    >
      {title && (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            color: '#a2c4b9',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.68rem',
            mr: { xs: 0, sm: 0.5 },
          }}
        >
          {title}:
        </Typography>
      )}

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: { xs: 1.2, sm: 2 },
          alignItems: 'center',
        }}
      >
        {items.map((item) => {
          const tokenStyle = resolveFillToken(item.token);

          return (
            <Box
              key={item.token}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.8,
              }}
              title={item.description || item.label}
            >
              <Box
                sx={{
                  width: 14,
                  height: 14,
                  borderRadius: '3px',
                  bgcolor: tokenStyle.fill,
                  border: `1.5px solid ${tokenStyle.stroke}`,
                  boxShadow: `0 0 8px ${tokenStyle.glow || 'transparent'}`,
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#ffffff',
                }}
              >
                {item.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

MapLegend.propTypes = {
  legendConfig: PropTypes.shape({
    title: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        token: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        description: PropTypes.string,
      })
    ),
  }),
  direction: PropTypes.oneOf(['row', 'column']),
};
