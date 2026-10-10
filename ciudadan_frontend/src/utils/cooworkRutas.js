/**
 * Mapa ruta <-> tab de Coowork (enrutamiento profundo, fase 1).
 * Puro (sin React): se prueba con node directamente.
 */

const rutaDeTab = (tabValue, subTabValue = 0, areaSlugValue = null) => {
  if (areaSlugValue && tabValue === 'especializadas') {
    return `/coowork/especializadas/${areaSlugValue}`;
  }
  switch (tabValue) {
    case 'generales':
      return '/coowork/tareas-generales';
    case 'especializadas':
      return '/coowork/especializadas';
    case 'socio':
      if (subTabValue === 1) return '/coowork/herramientas';
      if (subTabValue === 2) return '/coowork/bitacora';
      if (subTabValue === 3) return '/coowork/pagos';
      return '/coowork/tareas-socio';
    case 'conductores':
      return '/coowork/verificar-conductores';
    case 'auditorias':
      return '/coowork/auditorias';
    case 'mistareas':
      return '/coowork/mis-tareas';
    default:
      return '/coowork';
  }
};

const tabDeRuta = ({ vista = null, resto = null, areaSlugParam = null, searchParams = null } = {}) => {
  if (vista === 'especializadas' && areaSlugParam) {
    return { tab: 'especializadas', subTab: 0, areaSlug: areaSlugParam };
  }
  if (vista === 'herramientas' && resto) {
    const partes = String(resto).split('/').filter(Boolean);
    if (partes.length >= 2) {
      return { tab: 'socio', subTab: 1, herramienta: partes[1], categoria: partes[0] };
    }
    return { tab: 'socio', subTab: 1, herramienta: partes[0], categoria: null };
  }
  switch (vista) {
    case 'tareas-generales':
      return { tab: 'generales', subTab: 0 };
    case 'especializadas':
      return { tab: 'especializadas', subTab: 0 };
    case 'tareas-socio':
      return { tab: 'socio', subTab: 0 };
    case 'herramientas':
      return { tab: 'socio', subTab: 1 };
    case 'bitacora':
      return { tab: 'socio', subTab: 2 };
    case 'pagos':
      return { tab: 'socio', subTab: 3 };
    case 'verificar-conductores':
      return { tab: 'conductores', subTab: 0 };
    case 'auditorias':
      return { tab: 'auditorias', subTab: 0 };
    case 'mis-tareas':
      return { tab: 'mistareas', subTab: 0 };
    default:
      break;
  }
  return { tab: null, subTab: 0 };
};

module.exports = { rutaDeTab, tabDeRuta };
