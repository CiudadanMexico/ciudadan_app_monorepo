/**
 * Mapa ruta <-> tab de Coowork (enrutamiento profundo, fase 1).
 * Cubre ida y vuelta + forma futura con categoría en herramientas.
 */
const { rutaDeTab, tabDeRuta } = require('./cooworkRutas');

describe('cooworkRutas: rutaDeTab', () => {
  test.each([
    ['generales', 0, '/coowork/tareas-generales'],
    ['especializadas', 0, '/coowork/especializadas'],
    ['socio', 0, '/coowork/tareas-socio'],
    ['socio', 1, '/coowork/herramientas'],
    ['socio', 2, '/coowork/bitacora'],
    ['socio', 3, '/coowork/avance'],
    ['socio', 4, '/coowork/pagos'],
    ['conductores', 0, '/coowork/verificar-conductores'],
    ['auditorias', 0, '/coowork/auditorias'],
    ['mistareas', 0, '/coowork/mis-tareas'],
  ])('tab=%s sub=%s -> %s', (tab, sub, ruta) => {
    expect(rutaDeTab(tab, sub)).toBe(ruta);
  });

  test('especializadas con areaSlug -> deep-link', () => {
    expect(rutaDeTab('especializadas', 0, 'multimedia')).toBe('/coowork/especializadas/multimedia');
  });

  test('tab desconocido -> /coowork', () => {
    expect(rutaDeTab('nada', 0)).toBe('/coowork');
  });
});

describe('cooworkRutas: tabDeRuta', () => {
  test.each([
    ['tareas-generales', 'generales', 0],
    ['especializadas', 'especializadas', 0],
    ['tareas-socio', 'socio', 0],
    ['herramientas', 'socio', 1],
    ['bitacora', 'socio', 2],
    ['avance', 'socio', 3],
    ['pagos', 'socio', 4],
    ['verificar-conductores', 'conductores', 0],
    ['auditorias', 'auditorias', 0],
    ['mis-tareas', 'mistareas', 0],
  ])('vista=%s -> tab=%s sub=%s', (vista, tab, sub) => {
    expect(tabDeRuta({ vista })).toMatchObject({ tab, subTab: sub });
  });

  test('especializadas con areaSlug conserva el slug', () => {
    expect(tabDeRuta({ vista: 'especializadas', areaSlugParam: 'multimedia' })).toMatchObject({
      tab: 'especializadas',
      areaSlug: 'multimedia',
    });
  });

  test('herramienta en raíz (hoy): resto=slug', () => {
    expect(tabDeRuta({ vista: 'herramientas', resto: 'calificar-tarea' })).toMatchObject({
      tab: 'socio',
      subTab: 1,
      herramienta: 'calificar-tarea',
      categoria: null,
    });
  });

  test('herramienta futura con categoría: resto=categoria/slug', () => {
    expect(tabDeRuta({ vista: 'herramientas', resto: 'administrativas/mi-agencia' })).toMatchObject({
      tab: 'socio',
      subTab: 1,
      herramienta: 'mi-agencia',
      categoria: 'administrativas',
    });
  });

  test('vista desconocida -> tab null (el componente cae al default por rol)', () => {
    expect(tabDeRuta({ vista: 'nada' })).toMatchObject({ tab: null });
  });
});
