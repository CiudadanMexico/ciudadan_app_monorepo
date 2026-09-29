import React from 'react';
import PropTypes from 'prop-types';
import { formatMoneyMXN, formatMetric, resolveNestedField } from './geoUtils';
import { getStatusLabel } from './geoTheme';

/**
 * MapLabels — Renderiza uno o varios labels por región según la configuración.
 * Soporta variantes: 'name', 'metric', 'money', 'status', 'badge'.
 * Aplica offsets declarados en metadata y callouts visuales para regiones pequeñas.
 * pointer-events: none para no bloquear clics del mapa.
 */
export default function MapLabels({
  regionsMeta,
  projectFn,
  dataByRegion,
  labelsConfig = [],
  selectedRegionId,
  hoveredRegionId,
  showLabels = true,
}) {
  if (!showLabels || !regionsMeta || regionsMeta.length === 0) return null;

  return (
    <g className="geo-map-labels" pointerEvents="none" style={{ userSelect: 'none' }}>
      {regionsMeta.map((meta) => {
        const regionId = meta.regionId || meta.code;
        const regionData = dataByRegion[regionId] || {};

        const anchorCoords = meta.centroid;
        if (!anchorCoords) return null;
        const [baseX, baseY] = projectFn(anchorCoords[0], anchorCoords[1]);

        const [offsetX, offsetY] = meta.labelOffset || [0, 0];
        const isCallout = Boolean(meta.labelCallout && (offsetX !== 0 || offsetY !== 0));

        const targetX = baseX + offsetX;
        const targetY = baseY + offsetY;

        const isSelected = selectedRegionId === regionId;
        const isHovered = hoveredRegionId === regionId;

        const regionDisplayName = meta.labelText || meta.shortName || meta.name;

        // Procesa líneas configuradas
        const lines = [];
        for (const labelConf of labelsConfig) {
          const field = labelConf.field;
          const variant = labelConf.variant || 'text';
          const hideWhenNull = labelConf.hideWhenNull !== false;

          let rawValue = null;
          if (field === 'name') {
            rawValue = regionDisplayName;
          } else if (field === 'status') {
            rawValue = regionData.status ? getStatusLabel(regionData.status) : null;
          } else {
            rawValue = resolveNestedField(regionData, field);
          }

          if ((rawValue === null || rawValue === undefined) && hideWhenNull) {
            continue;
          }

          let formattedText = '';
          switch (variant) {
            case 'name':
              formattedText = String(rawValue || '');
              break;
            case 'money':
              formattedText = formatMoneyMXN(rawValue) || '';
              break;
            case 'metric':
              formattedText = formatMetric(rawValue, labelConf.compact) || '';
              break;
            case 'status':
              formattedText = String(rawValue || '');
              break;
            default:
              formattedText = String(rawValue || '');
          }

          if (formattedText) {
            lines.push({ text: formattedText, variant });
          }
        }

        if (lines.length === 0) {
          lines.push({ text: regionDisplayName, variant: 'name' });
        }

        const lineHeight = 12;
        const totalHeight = lines.length * lineHeight;
        const startY = targetY - totalHeight / 2 + lineHeight / 2;

        return (
          <g
            key={`label-${regionId}`}
            id={`label-${regionId}`}
            className={`geo-label-group ${isSelected ? 'geo-label-selected' : ''}`}
            opacity={isSelected || isHovered ? 1.0 : 0.92}
          >
            {isCallout && (
              <g className="geo-callout-indicator">
                <line
                  x1={baseX}
                  y1={baseY}
                  x2={targetX}
                  y2={targetY}
                  stroke={isSelected ? '#2ee6c8' : 'rgba(255, 255, 255, 0.45)'}
                  strokeWidth={isSelected ? 1.2 : 0.8}
                  strokeDasharray="2,2"
                />
                <circle
                  cx={baseX}
                  cy={baseY}
                  r={2.0}
                  fill={isSelected ? '#2ee6c8' : 'rgba(255, 255, 255, 0.7)'}
                />
              </g>
            )}

            {lines.map((line, idx) => {
              const lineY = startY + idx * lineHeight;
              const isName = line.variant === 'name';

              return (
                <text
                  key={`${regionId}-line-${idx}`}
                  x={targetX}
                  y={lineY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isName ? (meta.isSmall ? 10.5 : 11.5) : 9.5}
                  fontWeight={isName ? 800 : 600}
                  fill={isSelected ? '#ffffff' : isName ? '#ffffff' : '#2ee6c8'}
                  stroke="#07120f"
                  strokeWidth={2.4}
                  paintOrder="stroke fill"
                  strokeLinejoin="round"
                  style={{
                    letterSpacing: isName ? '0.02em' : '0.01em',
                    textTransform: isName ? 'uppercase' : 'none',
                  }}
                >
                  {line.text}
                </text>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

MapLabels.propTypes = {
  regionsMeta: PropTypes.array.isRequired,
  projectFn: PropTypes.func.isRequired,
  dataByRegion: PropTypes.object.isRequired,
  labelsConfig: PropTypes.array,
  selectedRegionId: PropTypes.string,
  hoveredRegionId: PropTypes.string,
  showLabels: PropTypes.bool,
};
