// src/utils/authRedirect.js
// Centraliza el retorno de Auth0: login vuelve a la página donde estabas y
// logout vuelve siempre a la raíz (página pública).
//
// Regla de seguridad: solo se aceptan rutas internas (empiezan con '/' pero
// no con '//'). Todo lo demás cae a '/' para evitar open-redirect.

/** ¿Es una ruta interna segura para redirigir? */
export const esRutaInterna = (ruta) =>
  typeof ruta === 'string' && ruta.startsWith('/') && !ruta.startsWith('//');

/** Página actual completa (ruta + query + hash). Default de login y logout. */
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

/**
 * Logout: siempre se vuelve a la página de inicio (raíz), que es pública y
 *  segura. No se usa la última página de la sesión, porque muchas veces es
 *  privada y, sin sesión activa, infla una página de error.
 *
 *  `destino` es opcional; si se pasa, debe ser una ruta interna.
 */
export const salir = (logout, destino) => {
  const ruta = destino ?? '/';
  const rutaFinal = esRutaInterna(ruta) ? ruta : '/';
  return logout({ logoutParams: { returnTo: `${window.location.origin}${rutaFinal}` } });
};
