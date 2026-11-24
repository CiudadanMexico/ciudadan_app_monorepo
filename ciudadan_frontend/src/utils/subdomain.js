/**
 * Subdomain utilities for Ciudadan Taxi 6.0
 *
 * Maneja la detección y routing basado en subdominios:
 * - taxis.ciudadan.org -> taxis (conductores y pasajeros)
 * - lideres.ciudadan.org -> lideres (líderes verificadores)
 * - socios.ciudadan.org -> socios (socios estatales)
 * - api.ciudadan.org -> api (API general)
 * - descargar.ciudadan.org -> descargar (landing descarga app)
 * - localhost -> local (desarrollo)
 */

export const VALID_SUBDOMAINS = ['taxis', 'lideres', 'socios', 'api', 'descargar', 'local'];
export const DEFAULT_SUBDOMAIN = 'taxis';

/**
 * Bandera de staging para permitir ?subdomain= en túneles de prueba.
 * Solo debe ser true en entornos de staging/desarrollo controlados.
 * En producción NUNCA debe ser true.
 */
export const STAGING_SUBDOMAIN_OVERRIDE = process.env.REACT_APP_STAGING_SUBDOMAIN_OVERRIDE === 'true';

/**
 * Detecta el subdominio actual basado en window.location.hostname
 * En desarrollo local, puede usar query param ?subdomain= solo si STAGING_SUBDOMAIN_OVERRIDE=true.
 * En producción, solo usa el hostname real.
 */
export function getCurrentSubdomain() {
  if (typeof window === 'undefined') {
    return DEFAULT_SUBDOMAIN; // SSR fallback
  }

  const hostname = window.location.hostname;
  const searchParams = new URLSearchParams(window.location.search);

  // En desarrollo local, permitir override por query param SOLO en staging
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && STAGING_SUBDOMAIN_OVERRIDE) {
    const paramSubdomain = searchParams.get('subdomain');
    if (paramSubdomain && VALID_SUBDOMAINS.includes(paramSubdomain)) {
      return paramSubdomain;
    }
    // También leer de localStorage si se guardó previamente
    const savedSubdomain = localStorage.getItem('ciudadan_subdomain');
    if (savedSubdomain && VALID_SUBDOMAINS.includes(savedSubdomain)) {
      return savedSubdomain;
    }
    return 'local';
  }

  // Dominios de producción (ciudadan.org)
  if (hostname.includes('ciudadan.org')) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const potentialSubdomain = parts[0];
      if (VALID_SUBDOMAINS.includes(potentialSubdomain)) {
        return potentialSubdomain;
      }
    }
  }

  // Fallback
  return DEFAULT_SUBDOMAIN;
}

/**
 * Guarda el subdominio en localStorage para desarrollo local
 */
export function setSubdomain(subdomain) {
  if (VALID_SUBDOMAINS.includes(subdomain)) {
    localStorage.setItem('ciudadan_subdomain', subdomain);
    return true;
  }
  return false;
}

/**
 * Obtiene la configuración de rutas para un subdominio específico
 */
export function getSubdomainConfig(subdomain) {
  const configs = {
    taxis: {
      name: 'Taxis',
      title: 'Ciudadan Taxis',
      description: 'Plataforma de movilidad cooperativa',
      routes: [
        { path: '/', component: 'HomeRoute', public: true },
        { path: '/conductor/registro', component: 'PreRegistroConductor2', public: true },
        { path: '/conductor/preregistro', component: 'PreRegistroConductor2', public: true },
        { path: '/conductor/esperando', component: 'Conductor', auth: true, role: 'driver' },
        { path: '/conductor/requisitos', component: 'RequisitosConductor', public: true },
        { path: '/conductor/expediente', component: 'ExpedienteConductor', auth: true, role: 'driver' },
        { path: '/pasajero/registro', component: 'RegistroPasajero', public: true },
        { path: '/pasajero/viaje', component: 'Pasajero', auth: true, role: 'passenger' },
        { path: '/viajes/historial', component: 'HistorialViajes', auth: true },
        { path: '/viaje/:travelId', component: 'TripViewRoute', auth: true },
        { path: '/viaje-gratis', component: 'VerifyFreeTrip', public: true },
        { path: '/membresias', component: 'Membresias', public: true },
        { path: '/mi-membresia', component: 'MiMembresia', auth: true, role: 'driver' },
        { path: '/activatumembresia', component: 'ActivaTuMembresia', auth: true, role: 'driver' },
      ],
      navigation: [
        { label: 'Inicio', path: '/' },
        { label: 'Conductor', path: '/conductor/registro', role: 'driver' },
        { label: 'Pasajero', path: '/pasajero/viaje', role: 'passenger' },
        { label: 'Membresía', path: '/membresias', role: 'driver' },
      ],
    },
    lideres: {
      name: 'Líderes',
      title: 'Líderes Verificadores - Ciudadan',
      description: 'Programa de líderes verificadores con 10% comisión',
      routes: [
        { path: '/', component: 'LideresDashboard', auth: true, role: 'leader' },
        { path: '/registro', component: 'LideresRegistro', public: true },
        { path: '/dashboard', component: 'LideresDashboard', auth: true, role: 'leader' },
        { path: '/kit', component: 'LideresKit', auth: true, role: 'leader' },
        { path: '/qr', component: 'LideresDashboard', auth: true, role: 'leader' },
      ],
      navigation: [
        { label: 'Dashboard', path: '/dashboard', role: 'leader' },
        { label: 'Mi Kit', path: '/kit', role: 'leader' },
        { label: 'Mi QR', path: '/qr', role: 'leader' },
      ],
    },
    socios: {
      name: 'Socios Estatales',
      title: 'Socios Estatales - Ciudadan',
      description: 'Programa de socios estatales con 5% comisión por estado',
      routes: [
        { path: '/', component: 'SociosDashboard', auth: true, role: 'state_partner' },
        { path: '/socios/registro', component: 'SociosRegistro', public: true },
        { path: '/socios/dashboard', component: 'SociosDashboard', auth: true, role: 'state_partner' },
        { path: '/socios/pago-cuota', component: 'SociosPagoCuota', auth: true, role: 'state_partner' },
      ],
      navigation: [
        { label: 'Dashboard', path: '/socios/dashboard', role: 'state_partner' },
        { label: 'Pagar Cuota', path: '/socios/pago-cuota', role: 'state_partner' },
      ],
    },
    descargar: {
      name: 'Descargar',
      title: 'Descargar App Ciudadan',
      description: 'Descarga la app de conductores',
      routes: [
        { path: '/', component: 'DescargarConductores', public: true },
      ],
      navigation: [],
    },
    api: {
      name: 'API',
      title: 'API Ciudadan',
      description: 'Documentación y endpoints de la API',
      routes: [],
      navigation: [],
    },
    local: {
      name: 'Local',
      title: 'Ciudadan Local',
      description: 'Desarrollo local - todas las rutas disponibles',
      routes: [], // Se usa el routing completo existente
      navigation: [],
    },
  };

  return configs[subdomain] || configs[DEFAULT_SUBDOMAIN];
}

/**
 * Verifica si una ruta está permitida para el subdominio actual
 */
export function isRouteAllowedForSubdomain(path, subdomain) {
  const config = getSubdomainConfig(subdomain);
  if (config.routes.length === 0) return true; // local o api - todas las rutas

  return config.routes.some(route => {
    // Convertir path de ruta a regex simple
    const routePattern = route.path.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${routePattern}(/|$)`);
    return regex.test(path);
  });
}

/**
 * Obtiene la navegación para el subdominio actual filtrada por rol
 */
export function getNavigationForSubdomain(subdomain, userRole) {
  const config = getSubdomainConfig(subdomain);
  return config.navigation.filter(item => {
    if (!item.role) return true;
    return item.role === userRole || item.role === 'admin';
  });
}

export default {
  getCurrentSubdomain,
  setSubdomain,
  getSubdomainConfig,
  isRouteAllowedForSubdomain,
  getNavigationForSubdomain,
  VALID_SUBDOMAINS,
  DEFAULT_SUBDOMAIN,
};