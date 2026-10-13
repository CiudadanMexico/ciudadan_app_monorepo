// src/utils/authRedirect.js
// Centraliza el retorno de Auth0 para el LOGIN: vuelve a la página donde
// estabas (ruta + query + hash).
//
// El LOGOUT NO vive aquí: conserva su comportamiento original en cada
// componente (logout a window.location.origin), sin cambios.
//
// Regla de seguridad: solo se aceptan rutas internas (empiezan con '/' pero
// no con '//'). Todo lo demás cae a '/' para evitar open-redirect.

/** ¿Es una ruta interna segura para redirigir? */
export const esRutaInterna = (ruta) =>
  typeof ruta === 'string' && ruta.startsWith('/') && !ruta.startsWith('//');

/** Página actual completa (ruta + query + hash). Default de login. */
export const paginaActual = () =>
  window.location.pathname + window.location.search + window.location.hash;

/** Destino final tras login: el pedido si es interno, '/' si no. */
export const resolverDestinoLogin = (pedido) =>
  esRutaInterna(pedido) ? pedido : '/';

/**
 * Login con retorno: `irALogin(loginWithRedirect)` vuelve a la página actual;
 * `irALogin(loginWithRedirect, '/carrito/finalizar')` vuelve a esa ruta.
 */
export const irALogin = (loginWithRedirect, destino) => {
  const pedido = destino ?? paginaActual();
  return loginWithRedirect({ appState: { returnTo: resolverDestinoLogin(pedido) } });
};
