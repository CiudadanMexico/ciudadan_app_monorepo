import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { formatMoneyMXN, formatMetric, resolveNestedField } from './geoUtils';
import { getStatusLabel, geoTokens } from './geoTheme';

/**
 * MapTooltip — Tooltip flotante genérico para GeoNetworkMap.
 *
 * Características:
 * - Oculta campos cuyo valor es null/undefined (nunca muestra NaN, $null ni 0 conductores falsos).
 * - Sigue la posición del cursor o se ancla sobre la región activa con focus accesible.
 * - Soporta formato dinámico por variante: name, status, money, metric, percent, text.
 * - Estética Ciudadan glass: fondo oscuro (#07120f), borde verde (#19d79c), sombra profunda.
 */
export default function MapTooltip({
  activeRegion,
  position,
  tooltipConfig,
  containerBounds,
}) {
  if (!activeRegion || !activeRegion.data || !position) return null;

  const { data, meta } = activeRegion;
  const fields = tooltipConfig?.fields || [
    { field: 'name', label: 'Región', variant: 'name' },
    { field: 'status', label: 'Estatus', variant: 'status' },
  ];

  const rows = [];
  for (const cfg of fields) {
    const field = cfg.field;
    const hideWhenNull = cfg.hideWhenNull !== false;

    let rawVal = null;
    if (field === 'name') {
      rawVal = meta?.name || data?.name || activeRegion.regionId;
    } else if (field === 'status') {
      rawVal = data?.status ? getStatusLabel(data.status) : null;
    } else {
      rawVal = resolveNestedField(data, field);
    }

    if ((rawVal === null || rawVal === undefined || rawVal === '') && hideWhenNull) {
      continue;
    }

    let displayVal = '';
    switch (cfg.variant) {
      case 'money':
        displayVal = formatMoneyMXN(rawVal);
        break;
      case 'metric':
        displayVal = formatMetric(rawVal, cfg.compact);
        break;
      case 'percent':
        displayVal = rawVal !== null && rawVal !== undefined ? `${rawVal}%` : null;
        break;
      case 'status':
        displayVal = String(rawVal);
        break;
      default:
        displayVal = String(rawVal ?? '');
    }

    if (!displayVal && hideWhenNull) continue;

    if (cfg.prefix && displayVal) displayVal = `${cfg.prefix}${displayVal}`;
    if (cfg.suffix && displayVal) displayVal = `${displayVal} ${cfg.suffix}`;

    rows.push({
      label: cfg.label || field,
      value: displayVal,
      isName: cfg.variant === 'name',
      isStatus: cfg.variant === 'status',
      rawStatus: data?.status,
    });
  }

  if (rows.length === 0) return null;

  // Cálculo de coordenadas para que no se desborde del contenedor
  const offsetX = 14;
  const offsetY = 14;
  let posX = position.x + offsetX;
  let posY = position.y + offsetY;

  const tooltipWidth = 220;
  const tooltipHeight = 40 + rows.length * 20;

  if (containerBounds) {
    if (posX + tooltipWidth > containerBounds.width) {
      posX = position.x - tooltipWidth - 10;
    }
    if (posY + tooltipHeight > containerBounds.height) {
      posY = position.y - tooltipHeight - 10;
    }
    posX = Math.max(8, posX);
    posY = Math.max(8, posY);
  }

  const nameRow = rows.find((r) => r.isName);
  const detailRows = rows.filter((r) => !r.isName);

  return (
    <Box
      sx={{
        position: 'absolute',
        left: posX,
        top: posY,
        pointerEvents: 'none',
        zIndex: 1400,
        minWidth: 180,
        maxWidth: 260,
        p: 1.5,
        borderRadius: 2.5,
        bgcolor: 'rgba(7, 18, 15, 0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(46, 230, 200, 0.35)',
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.65), 0 0 16px rgba(25, 215, 156, 0.22)',
        color: '#ffffff',
        transition: 'left 0.06s ease-out, top 0.06s ease-out',
      }}
    >
      {nameRow && (
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            fontSize: '0.92rem',
            color: '#ffffff',
            borderBottom: '1px solid rgba(46, 230, 200, 0.18)',
            pb: 0.6,
            mb: 0.8,
            letterSpacing: '-0.01em',
          }}
        >
          {nameRow.value}
        </Typography>
      )}

      {detailRows.map((r, i) => {
        const isStatus = r.isStatus;
        const statusToken = isStatus ? geoTokens[r.rawStatus] || geoTokens.available : null;

        return (
          <Box
            key={`tt-row-${i}`}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 0.25,
              fontSize: '0.78rem',
            }}
          >
            <Typography
              component="span"
              sx={{ color: 'rgba(255, 255, 255, 0.68)', fontSize: '0.76rem', mr: 1 }}
            >
              {r.label}:
            </Typography>
            <Typography
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: '0.78rem',
                color: isStatus && statusToken ? statusToken.stroke : '#2ee6c8',
              }}
            >
              {r.value}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

MapTooltip.propTypes = {
  activeRegion: PropTypes.shape({
    regionId: PropTypes.string,
    data: PropTypes.object,
    meta: PropTypes.object,
  }),
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  tooltipConfig: PropTypes.object,
  containerBounds: PropTypes.object,
};
