'use strict';

/**
 * RBAC Subdomain Middleware
 *
 * Controla acceso basado en subdominio y rol de usuario.
 * Se ejecuta después de la autenticación (Auth0).
 */

module.exports = (config, { strapi }) => {
  // Mapeo de subdominio -> roles permitidos
  const SUBDOMAIN_ROLES = {
    taxis: ['driver', 'passenger', 'admin'],
    lideres: ['leader', 'admin'],
    socios: ['state_partner', 'admin'],
    api: ['driver', 'passenger', 'leader', 'state_partner', 'admin'],
    local: ['driver', 'passenger', 'leader', 'state_partner', 'admin'],
  };

  // Rutas públicas que no requieren autenticación
  const PUBLIC_PATHS = [
    '/api/state-partner/by-state',
    '/api/leader/verify',
    '/api/free-trips/qr',
    '/api/free-trips/status',
    '/api/free-trips/apply',
    '/api/auth0',
    '/api/connect',
    '/health',
  ];

  // Verificar si una ruta es pública
  const isPublicPath = (path) => {
    return PUBLIC_PATHS.some(publicPath =>
      path.startsWith(publicPath) || path === publicPath
    );
  };

  // Obtener rol del usuario desde Auth0
  const getUserRole = (user) => {
    // El rol viene en user.role o en user.custom_data?.role (Auth0)
    return user?.role ||
           user?.custom_data?.role ||
           user?.app_metadata?.role ||
           'passenger'; // default
  };

  return async (ctx, next) => {
    const subdomain = ctx.state.subdomain || 'taxis';
    const path = ctx.path;

    // Saltar rutas públicas
    if (isPublicPath(path)) {
      return await next();
    }

    // Obtener usuario autenticado (después del policy is-authenticated-auth0)
    const user = ctx.state.strapiUser || ctx.state.user;

    if (!user) {
      // Si no hay usuario pero la ruta requiere auth, dejar pasar al policy
      return await next();
    }

    const userRole = getUserRole(user);
    const allowedRoles = SUBDOMAIN_ROLES[subdomain] || SUBDOMAIN_ROLES.taxis;

    // Verificar si el rol del usuario está permitido en este subdominio
    if (!allowedRoles.includes(userRole)) {
      strapi.log.warn(`Acceso denegado: usuario ${user.id} con rol '${userRole}' intentó acceder a subdominio '${subdomain}'`);
      return ctx.forbidden(`Acceso denegado: tu rol '${userRole}' no tiene acceso a ${subdomain}.ciudadan.org`);
    }

    // Añadir rol al contexto para uso posterior
    ctx.state.userRole = userRole;

    await next();
  };
};