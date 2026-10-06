import React, { useMemo, useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import SvgPatternsDefs from './SvgPatternsDefs';
import RegionLayer from './RegionLayer';
import MapLabels from './MapLabels';
import MapTooltip from './MapTooltip';
import MapLegend from './MapLegend';
import { createMapProjection, normalizeRegionId } from './geoUtils';
import { geoTokens } from './geoTheme';

/**
 * GeoNetworkMap — Motor geográfico genérico territorial para Ciudadan.
 *
 * Separación estricta de responsabilidades:
 * 1. Geometría (GeoJSON estándar)
 * 2. Datos territoriales (indexados por regionId)
 * 3. Configuración visual (fillBy, patternBy, labels, legend, tooltip)
 */
export default function GeoNetworkMap({
  geometry,
  geoMeta,
  data = [],
  config = {},
  selectedRegionId = null,
  onRegionSelect = null,
  showLabels = true,
  showLegend = true,
  showTooltip = true,
  width = 1000,
  height = 620,
  padding = 24,
  ariaLabel = 'Mapa territorial interactivo',
}) {
  const containerRef = useRef(null);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const safeConfig = config || {};

  // 1. Features GeoJSON
  const features = useMemo(() => {
    if (!geometry) return [];
    if (geometry.type === 'FeatureCollection') return geometry.features || [];
    if (Array.isArray(geometry)) return geometry;
    if (geometry.type === 'Feature') return [geometry];
    return [];
  }, [geometry]);

  // 2. Metadata indexada por regionId
  const metaByRegion = useMemo(() => {
    const map = {};
    const regionsList = geoMeta?.regions || (Array.isArray(geoMeta) ? geoMeta : []);
    regionsList.forEach((r) => {
      const id = normalizeRegionId(r.regionId || r.code || r.id);
      if (id) map[id] = r;
    });
    return map;
  }, [geoMeta]);

  // 3. Datos de negocio indexados por regionId
  const dataByRegion = useMemo(() => {
    const map = {};
    if (Array.isArray(data)) {
      data.forEach((item) => {
        const id = normalizeRegionId(item.regionId || item.code || item.id);
        if (id) map[id] = item;
      });
    } else if (typeof data === 'object' && data !== null) {
      Object.entries(data).forEach(([key, val]) => {
        const id = normalizeRegionId(key);
        map[id] = typeof val === 'object' ? { ...val, regionId: id } : { value: val, regionId: id };
      });
    }
    return map;
  }, [data]);

  // 4. Proyección cartográfica calculada una sola vez
  const projection = useMemo(() => {
    return createMapProjection(features, width, height, padding);
  }, [features, width, height, padding]);

  // Handlers de selección y hover
  const handleRegionClick = useCallback(
    (regionId, regionData, regionMeta) => {
      if (onRegionSelect) {
        onRegionSelect(regionId, regionData, regionMeta);
      }
    },
    [onRegionSelect]
  );

  const handleRegionHover = useCallback((regionId, regionData, regionMeta, event) => {
    if (!regionId) {
      setHoveredRegion(null);
      return;
    }
    setHoveredRegion({ regionId, data: regionData, meta: regionMeta });

    if (event && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
  }, []);

  const handleRegionFocus = useCallback(
    (regionId, regionData, regionMeta) => {
      setHoveredRegion({ regionId, data: regionData, meta: regionMeta });
      const centroid = regionMeta?.centroid;
      if (centroid && containerRef.current) {
        const [px, py] = projection.project(centroid[0], centroid[1]);
        const rect = containerRef.current.getBoundingClientRect();
        const scaleX = rect.width / width;
        const scaleY = rect.height / height;
        setTooltipPos({ x: px * scaleX, y: py * scaleY });
      }
    },
    [projection, width, height]
  );

  const handleRegionBlur = useCallback(() => {
    setHoveredRegion(null);
  }, []);

  const containerBounds = containerRef.current
    ? { width: containerRef.current.clientWidth, height: containerRef.current.clientHeight }
    : null;

  return (
    <Box
      ref={containerRef}
      className="geo-network-map-root"
      sx={{
        position: 'relative',
        width: '100%',
        bgcolor: geoTokens.background.canvas,
        borderRadius: 4,
        overflow: 'hidden',
        border: `1px solid ${geoTokens.background.border}`,
        boxShadow: '0 18px 48px rgba(0, 0, 0, 0.45)',
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="region"
        aria-label={ariaLabel}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          maxHeight: '82vh',
        }}
      >
        <SvgPatternsDefs />

        <RegionLayer
          features={features}
          projectFn={projection.project}
          dataByRegion={dataByRegion}
          metaByRegion={metaByRegion}
          config={safeConfig}
          selectedRegionId={normalizeRegionId(selectedRegionId)}
          hoveredRegionId={hoveredRegion?.regionId || null}
          onRegionClick={handleRegionClick}
          onRegionHover={handleRegionHover}
          onRegionFocus={handleRegionFocus}
          onRegionBlur={handleRegionBlur}
        />

        <MapLabels
          regionsMeta={geoMeta?.regions || []}
          projectFn={projection.project}
          dataByRegion={dataByRegion}
          labelsConfig={safeConfig.labels || []}
          selectedRegionId={normalizeRegionId(selectedRegionId)}
          hoveredRegionId={hoveredRegion?.regionId || null}
          showLabels={showLabels}
        />
      </svg>

      {showTooltip && (
        <MapTooltip
          activeRegion={hoveredRegion}
          position={tooltipPos}
          tooltipConfig={safeConfig.tooltip}
          containerBounds={containerBounds}
        />
      )}

      {showLegend && safeConfig.legend && (
        <Box
          sx={{
            position: 'absolute',
            left: 16,
            bottom: 16,
            zIndex: 10,
            maxWidth: 'calc(100% - 32px)',
          }}
        >
          <MapLegend legendConfig={safeConfig.legend} />
        </Box>
      )}
    </Box>
  );
}

GeoNetworkMap.propTypes = {
  geometry: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired,
  geoMeta: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  data: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  config: PropTypes.object,
  selectedRegionId: PropTypes.string,
  onRegionSelect: PropTypes.func,
  showLabels: PropTypes.bool,
  showLegend: PropTypes.bool,
  showTooltip: PropTypes.bool,
  width: PropTypes.number,
  height: PropTypes.number,
  padding: PropTypes.number,
  ariaLabel: PropTypes.string,
};
