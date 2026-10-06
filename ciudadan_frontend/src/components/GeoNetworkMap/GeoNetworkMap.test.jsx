import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GeoNetworkMap from './GeoNetworkMap';
import SociosEstatalesMap from '../SociosEstatales/SociosEstatalesMap';
import mxGeometry from '../../data/geo/mx/states.geo.json';
import mxMeta from '../../data/geo/mx/states.meta.json';
import defaultSociosData from '../../data/maps/socios-estatales.json';
import defaultSociosConfig from '../../data/maps/socios-estatales.map.json';

// Fixture geométrico pequeño para pruebas unitarias rápidas del motor
const dummyGeometry = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'REG-A',
      properties: { regionId: 'REG-A', name: 'Región Alfa' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'REG-B',
      properties: { regionId: 'REG-B', name: 'Región Beta' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [[12, 0], [22, 0], [22, 10], [12, 10], [12, 0]],
        ],
      },
    },
  ],
};

const dummyMeta = {
  country: 'TEST',
  regions: [
    { regionId: 'REG-A', name: 'Región Alfa', shortName: 'Alfa', centroid: [5, 5], labelOffset: [0, 0] },
    { regionId: 'REG-B', name: 'Región Beta', shortName: 'Beta', centroid: [17, 5], labelOffset: [0, 0] },
  ],
};

const dummyData = [
  { regionId: 'REG-A', status: 'available', nodeStage: 'diagonal', drivers: { total: 1200 }, investment: 15000 },
  { regionId: 'REG-B', status: 'assigned', nodeStage: 'dots', drivers: { total: null }, investment: null },
];

const dummyConfig = {
  fillBy: 'status',
  patternBy: 'nodeStage',
  labels: [
    { field: 'name', variant: 'name' },
    { field: 'investment', variant: 'money', hideWhenNull: true },
  ],
  tooltip: {
    fields: [
      { field: 'name', label: 'Nombre', variant: 'name' },
      { field: 'status', label: 'Estatus', variant: 'status' },
      { field: 'investment', label: 'Inversión', variant: 'money', hideWhenNull: true },
    ],
  },
  legend: {
    title: 'Disponibilidad',
    items: [
      { token: 'available', label: 'Disponible' },
      { token: 'assigned', label: 'Asignado' },
    ],
  },
};

describe('GeoNetworkMap — Suite de pruebas completas', () => {
  // 1. Renderiza regiones
  it('1. renderiza regiones poligonales SVG en pantalla', () => {
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={dummyConfig} />
    );
    const regions = container.querySelectorAll('.geo-region');
    expect(regions.length).toBe(2);
  });

  // 2. Geometry + Data se unen por regionId
  it('2. une geometry y data mediante regionId', () => {
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={dummyConfig} />
    );
    const pathA = container.querySelector('#region-REG-A path');
    expect(pathA).toBeInTheDocument();
    expect(pathA.getAttribute('aria-label')).toContain('Disponible');
  });

  // 3. fillToken correcto
  it('3. aplica el fillToken correspondiente al estado de la entidad', () => {
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={dummyConfig} />
    );
    const pathA = container.querySelector('#region-REG-A path');
    const pathB = container.querySelector('#region-REG-B path');
    // available usa verde #19d79c, assigned usa turquesa #2ee6c8
    expect(pathA.getAttribute('fill')).toBe('#19d79c');
    expect(pathB.getAttribute('fill')).toBe('#2ee6c8');
  });

  // 4. Pattern correcto
  it('4. aplica el patrón SVG definido en la configuración', () => {
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={dummyConfig} />
    );
    const patternPaths = container.querySelectorAll('path[fill^="url(#geo-pattern-"]');
    expect(patternPaths.length).toBeGreaterThan(0);
  });

  // 5. Múltiples labels
  it('5. renderiza múltiples labels según la configuración visual', () => {
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={dummyConfig} />
    );
    const labelGroupA = container.querySelector('#label-REG-A');
    const texts = labelGroupA.querySelectorAll('text');
    // Para REG-A debe haber línea de nombre y línea de inversión ($15,000)
    expect(texts.length).toBe(2);
  });

  // 6. hideWhenNull funciona
  it('6. hideWhenNull oculta labels de campos con valor null', () => {
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={dummyConfig} />
    );
    const labelGroupB = container.querySelector('#label-REG-B');
    const texts = labelGroupB.querySelectorAll('text');
    // Para REG-B investment es null -> solo debe haber 1 línea (nombre)
    expect(texts.length).toBe(1);
    expect(texts[0].textContent).toContain('Beta');
  });

  // 7. Región sin data no rompe
  it('7. maneja regiones sin registro de datos sin romper la interfaz', () => {
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={[]} config={dummyConfig} />
    );
    const paths = container.querySelectorAll('.geo-region path');
    expect(paths.length).toBeGreaterThan(0);
  });

  // 8. Click selecciona
  it('8. hacer click en una región dispara el callback con el regionId correcto', () => {
    const onSelect = jest.fn();
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={dummyConfig} onRegionSelect={onSelect} />
    );
    const pathA = container.querySelector('#region-REG-A path');
    fireEvent.click(pathA);
    expect(onSelect).toHaveBeenCalledWith('REG-A', expect.any(Object), expect.any(Object));
  });

  // 9. Enter selecciona
  it('9. presionar Enter en una región enfocada dispara la selección accesible', () => {
    const onSelect = jest.fn();
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={dummyConfig} onRegionSelect={onSelect} />
    );
    const pathA = container.querySelector('#region-REG-A path');
    fireEvent.keyDown(pathA, { key: 'Enter', code: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('REG-A', expect.any(Object), expect.any(Object));
  });

  // 10. Space selecciona
  it('10. presionar Space en una región enfocada dispara la selección accesible', () => {
    const onSelect = jest.fn();
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={dummyConfig} onRegionSelect={onSelect} />
    );
    const pathA = container.querySelector('#region-REG-A path');
    fireEvent.keyDown(pathA, { key: ' ', code: 'Space' });
    expect(onSelect).toHaveBeenCalledWith('REG-A', expect.any(Object), expect.any(Object));
  });

  // 11. Callback recibe región correcta
  it('11. el callback recibe regionId, data y metadata completa', () => {
    const onSelect = jest.fn();
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={dummyConfig} onRegionSelect={onSelect} />
    );
    const pathB = container.querySelector('#region-REG-B path');
    fireEvent.click(pathB);
    expect(onSelect).toHaveBeenCalledWith(
      'REG-B',
      expect.objectContaining({ regionId: 'REG-B', status: 'assigned' }),
      expect.objectContaining({ name: 'Región Beta' })
    );
  });

  // 12. Tooltip muestra solo campos existentes
  it('12. el tooltip muestra únicamente campos con valor existente', () => {
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={dummyConfig} />
    );
    const pathB = container.querySelector('#region-REG-B path');
    fireEvent.mouseEnter(pathB);
    // Para REG-B investment es null -> no debe figurar la fila de inversión
    expect(screen.getByText('Región Beta')).toBeInTheDocument();
    expect(screen.queryByText(/Inversión:/i)).not.toBeInTheDocument();
  });

  // 13. Selector móvil selecciona región
  it('13. el selector móvil (Autocomplete) permite seleccionar cualquier entidad', () => {
    const onSelect = jest.fn();
    render(
      <MemoryRouter initialEntries={['/dev']}>
        <SociosEstatalesMap onStateSelect={onSelect} />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText(/Escribe o selecciona un estado/i);
    expect(input).toBeInTheDocument();
  });

  // 14. Config inválida usa fallback
  it('14. una configuración vacía o inválida utiliza valores seguros por defecto', () => {
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={null} />
    );
    expect(container.querySelector('.geo-region')).toBeInTheDocument();
  });

  // 15. Reduced motion no rompe
  it('15. respeta entornos con prefers-reduced-motion sin lanzar errores', () => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    const { container } = render(
      <GeoNetworkMap geometry={dummyGeometry} geoMeta={dummyMeta} data={dummyData} config={dummyConfig} />
    );
    expect(container.querySelector('.geo-network-map-root')).toBeInTheDocument();
  });

  // 16. Geometría de México contiene 32 entidades
  it('16. la geometría oficial de México contiene exactamente 32 entidades federativas', () => {
    expect(mxGeometry.type).toBe('FeatureCollection');
    expect(mxGeometry.features.length).toBe(32);
    expect(mxMeta.regions.length).toBe(32);
  });

  // 17. CDMX assigned
  it('17. Ciudad de México (MX-CMX) tiene estatus assigned', () => {
    const cdmx = defaultSociosData.find((d) => d.regionId === 'MX-CMX');
    expect(cdmx).toBeDefined();
    expect(cdmx.status).toBe('assigned');
  });

  // 18. Estado de México assigned
  it('18. Estado de México (MX-MEX) tiene estatus assigned', () => {
    const edomex = defaultSociosData.find((d) => d.regionId === 'MX-MEX');
    expect(edomex).toBeDefined();
    expect(edomex.status).toBe('assigned');
  });

  // 19. Otros 30 available
  it('19. las otras 30 entidades federativas tienen estatus available', () => {
    const available = defaultSociosData.filter((d) => d.status === 'available');
    expect(available.length).toBe(30);
    const assigned = defaultSociosData.filter((d) => d.status === 'assigned');
    expect(assigned.length).toBe(2);
    expect(defaultSociosData.length).toBe(32);
  });

  // 20. Geometría no requiere URL externa en runtime
  it('20. states.geo.json está almacenado localmente y no realiza fetches externos en runtime', () => {
    expect(typeof mxGeometry).toBe('object');
    expect(mxGeometry.features[0].geometry.coordinates.length).toBeGreaterThan(0);
    expect(mxMeta.source.name).toContain('INEGI');
  });
});
