import React from 'react';
import PropTypes from 'prop-types';
import { featureToSvgPath, calculateIntensity } from './geoUtils';
import { resolveFillToken } from './geoTheme';
import { getPatternFillUrl } from './SvgPatternsDefs';

/**
 * RegionLayer — Renderiza las regiones territoriales SVG (polígonos/multipolígonos).
 * Soporta colores por token, patrones SVG superpuestos, gradientes de intensidad,
 * accesibilidad por teclado (tabIndex, Enter, Space) y estados hover/selected.
 */
export default function RegionLayer({
  features,
  projectFn,
  dataByRegion,
  metaByRegion,
  config,
  selectedRegionId,
  hoveredRegionId,
  onRegionClick,
  onRegionHover,
  onRegionFocus,
  onRegionBlur,
}) {
  if (!features || features.length === 0) return null;

  const fillByField = config?.fillBy || 'status';
  const patternByField = config?.patternBy || 'nodeStage';
  const intensityByField = config?.intensityBy || null;

  return (
    <g className="geo-region-layer">
      {features.map((feature) => {
        const regionId = feature.properties?.regionId || feature.id;
        const regionData = dataByRegion[regionId] || {};
        const regionMeta = metaByRegion[regionId] || {};

        const pathData = featureToSvgPath(feature, projectFn);
        if (!pathData) return null;

        // 1. Token de color
        const tokenValue = regionData[fillByField] || 'available';
        const styleToken = resolveFillToken(tokenValue);

        // 2. Intensidad opcional
        let fillOpacity = styleToken.fillOpacity;
        if (intensityByField) {
          const rawInt = regionData[intensityByField];
          const dynamicOpacity = calculateIntensity(rawInt, 0, 10000, 0.2, 0.85);
          if (dynamicOpacity !== null) fillOpacity = dynamicOpacity;
        }

        // 3. Patrón opcional (ej: nodeStage -> diagonal, dots, crosshatch)
        const rawPattern = regionData[patternByField] || config?.pattern || 'solid';
        const patternUrl = getPatternFillUrl(rawPattern);

        const isSelected = selectedRegionId === regionId;
        const isHovered = hoveredRegionId === regionId;

        // Estilos de trazo y relleno
        const strokeColor = isSelected
          ? '#ffffff'
          : isHovered
          ? styleToken.hoverFill
          : styleToken.stroke;

        const strokeWidth = isSelected
          ? 2.4
          : isHovered
          ? 2.0
          : styleToken.strokeWidth || 1.2;

        const currentFill = isHovered ? styleToken.hoverFill : styleToken.fill;
        const currentOpacity = isHovered ? Math.min(1.0, fillOpacity + 0.25) : fillOpacity;

        const displayName = regionMeta.name || feature.properties?.name || regionId;
        const ariaLabel = `${displayName}, Estatus: ${styleToken.label || tokenValue}`;

        const handleKeyDown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onRegionClick) onRegionClick(regionId, regionData, regionMeta);
          }
        };

        return (
          <g
            key={regionId}
            id={`region-${regionId}`}
            className={`geo-region ${isSelected ? 'geo-region-selected' : ''} ${isHovered ? 'geo-region-hovered' : ''}`}
            style={{ outline: 'none' }}
          >
            {/* Polígono base con color de relleno */}
            <path
              d={pathData}
              fill={currentFill}
              fillOpacity={currentOpacity}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              filter={isSelected ? 'url(#geo-glow-selected)' : undefined}
              tabIndex={0}
              role="button"
              aria-label={ariaLabel}
              aria-pressed={isSelected}
              cursor="pointer"
              style={{
                transition: 'fill 0.18s ease, fill-opacity 0.18s ease, stroke 0.18s ease, stroke-width 0.18s ease',
              }}
              onClick={() => onRegionClick && onRegionClick(regionId, regionData, regionMeta)}
              onMouseEnter={(e) => onRegionHover && onRegionHover(regionId, regionData, regionMeta, e)}
              onMouseMove={(e) => onRegionHover && onRegionHover(regionId, regionData, regionMeta, e)}
              onMouseLeave={() => onRegionHover && onRegionHover(null, null, null)}
              onFocus={(e) => onRegionFocus && onRegionFocus(regionId, regionData, regionMeta, e)}
              onBlur={() => onRegionBlur && onRegionBlur()}
              onKeyDown={handleKeyDown}
            />

            {/* Capa de patrón SVG superpuesta si aplica */}
            {patternUrl && (
              <path
                d={pathData}
                fill={patternUrl}
                fillOpacity={0.65}
                color={styleToken.stroke}
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

RegionLayer.propTypes = {
  features: PropTypes.array.isRequired,
  projectFn: PropTypes.func.isRequired,
  dataByRegion: PropTypes.object.isRequired,
  metaByRegion: PropTypes.object.isRequired,
  config: PropTypes.object,
  selectedRegionId: PropTypes.string,
  hoveredRegionId: PropTypes.string,
  onRegionClick: PropTypes.func,
  onRegionHover: PropTypes.func,
  onRegionFocus: PropTypes.func,
  onRegionBlur: PropTypes.func,
};
