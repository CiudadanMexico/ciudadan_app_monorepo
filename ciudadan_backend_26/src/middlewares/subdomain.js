'use strict';

/**
 * Subdomain Middleware
 *
 * Extrae el subdominio de la request y lo añade al contexto.
 * Subdominios válidos:
 * - taxis.ciudadan.org -> 'taxis' (conductores y pasajeros)
 * - lideres.ciudadan.org -> 'lideres' (líderes verificadores)
 * - socios.ciudadan.org -> 'socios' (socios estatales)
 * - api.ciudadan.org -> 'api' (API general)
 * - localhost -> 'local' (desarrollo)
 */

module.exports = (config, { strapi }) => {
  // Configuración de subdominios válidos
  const VALID_SUBDOMAINS = ['taxis', 'lideres', 'socios', 'api', 'local'];
  const DEFAULT_SUBDOMAIN = 'taxis';

  return async (ctx, next) => {
    const host = ctx.request.header.host || '';
    const hostname = host.split(':')[0]; // Remover puerto si existe

    let subdomain = DEFAULT_SUBDOMAIN;

    // Detectar subdominio
    if (hostname.includes('ciudadan.org')) {
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        const potentialSubdomain = parts[0];
        if (VALID_SUBDOMAINS.includes(potentialSubdomain)) {
          subdomain = potentialSubdomain;
        }
      }
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // En desarrollo local, leer de header personalizado o query param
      subdomain = ctx.request.header['x-subdomain'] ||
                  ctx.query.subdomain ||
                  DEFAULT_SUBDOMAIN;
    }

    // Añadir subdomain al contexto de la request
    ctx.state.subdomain = subdomain;

    // Añadir headers de respuesta para debugging
    ctx.set('X-Subdomain', subdomain);

    // Log para debugging
    strapi.log.debug(`Request from subdomain: ${subdomain} (host: ${hostname})`);

    await next();
  };
};