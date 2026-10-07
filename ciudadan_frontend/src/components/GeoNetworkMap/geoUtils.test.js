import {
  resolveNestedField,
  formatMoneyMXN,
  formatMetric,
  normalizeRegionId,
  mercatorProject,
  featureToSvgPath,
  createMapProjection,
  calculateIntensity,
} from './geoUtils';

describe('geoUtils — Tests unitarios', () => {
  describe('resolveNestedField', () => {
    it('resuelve campos anidados correctamente', () => {
      const obj = { drivers: { total: 30980, details: { taxi: 12000 } } };
      expect(resolveNestedField(obj, 'drivers.total')).toBe(30980);
      expect(resolveNestedField(obj, 'drivers.details.taxi')).toBe(12000);
    });

    it('devuelve null si el camino o el objeto no existen', () => {
      expect(resolveNestedField(null, 'drivers.total')).toBeNull();
      expect(resolveNestedField({ a: 1 }, 'b.c.d')).toBeNull();
      expect(resolveNestedField({ a: null }, 'a.b')).toBeNull();
    });
  });

  describe('formatMoneyMXN', () => {
    it('formatea cifras numéricas en formato de moneda MXN', () => {
      const res = formatMoneyMXN(16500);
      expect(res).toContain('16,500');
      expect(res).toContain('$');
    });

    it('devuelve null si el valor es null, undefined o NaN (ocultar campos elegantemente)', () => {
      expect(formatMoneyMXN(null)).toBeNull();
      expect(formatMoneyMXN(undefined)).toBeNull();
      expect(formatMoneyMXN('invalido')).toBeNull();
      expect(formatMoneyMXN(NaN)).toBeNull();
    });
  });

  describe('formatMetric', () => {
    it('formatea números con separador de miles', () => {
      expect(formatMetric(30980)).toBe('30,980');
    });

    it('soporta notación compacta (K/M) cuando se solicita', () => {
      const compact = formatMetric(30980, true);
      expect(compact).toMatch(/3[01]/); // ej: "31k" o "31 mil" según locale
    });

    it('devuelve null para valores ausentes', () => {
      expect(formatMetric(null)).toBeNull();
      expect(formatMetric(undefined)).toBeNull();
      expect(formatMetric('abc')).toBeNull();
    });
  });

  describe('normalizeRegionId', () => {
    it('limpia espacios y convierte a mayúsculas', () => {
      expect(normalizeRegionId('  mx-oax  ')).toBe('MX-OAX');
      expect(normalizeRegionId('mx-cmx')).toBe('MX-CMX');
      expect(normalizeRegionId('')).toBe('');
      expect(normalizeRegionId(null)).toBe('');
    });
  });

  describe('mercatorProject & createMapProjection', () => {
    it('proyecta coordenadas geográficas dentro del canvas', () => {
      const [x, y] = mercatorProject(-99.1332, 19.4326);
      expect(typeof x).toBe('number');
      expect(typeof y).toBe('number');
      expect(Number.isNaN(x)).toBe(false);
      expect(Number.isNaN(y)).toBe(false);
    });

    it('escala y centra polígonos dentro del viewBox', () => {
      const dummyFeatures = [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-100, 20],
                [-98, 20],
                [-98, 22],
                [-100, 22],
                [-100, 20],
              ],
            ],
          },
        },
      ];
      const { project } = createMapProjection(dummyFeatures, 1000, 620, 20);
      const [px, py] = project(-99, 21);
      expect(px).toBeGreaterThan(0);
      expect(px).toBeLessThan(1000);
      expect(py).toBeGreaterThan(0);
      expect(py).toBeLessThan(620);
    });
  });

  describe('featureToSvgPath', () => {
    it('convierte un Polygon en path SVG válido que inicia con M y termina con Z', () => {
      const feat = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      };
      const path = featureToSvgPath(feat, (x, y) => [x * 100, y * 100]);
      expect(path.startsWith('M 0.00 0.00')).toBe(true);
      expect(path.endsWith('Z')).toBe(true);
    });
  });

  describe('calculateIntensity', () => {
    it('calcula la opacidad dentro de los límites configurados', () => {
      expect(calculateIntensity(0, 0, 100, 0.2, 0.8)).toBeCloseTo(0.2, 2);
      expect(calculateIntensity(50, 0, 100, 0.2, 0.8)).toBeCloseTo(0.5, 2);
      expect(calculateIntensity(100, 0, 100, 0.2, 0.8)).toBeCloseTo(0.8, 2);
    });

    it('devuelve null si el valor es null/inválido', () => {
      expect(calculateIntensity(null)).toBeNull();
      expect(calculateIntensity('invalido')).toBeNull();
    });
  });
});
