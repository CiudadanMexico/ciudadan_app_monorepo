// src/utils/logoutAqui.js
// Logout "en el lugar": cierra la sesión (local + Auth0) SIN sacar al usuario
// de la página en la que estaba.
//
// Cómo funciona:
// - `logout({ openUrl })` de auth0-spa-js SIEMPRE limpia la sesión local
//   (_clearLocalSession) y luego decide si navega a la URL de logout.
// - En vez de navegar toda la ventana (window.location.assign), cargamos la
//   misma URL de logout en un iframe oculto: Auth0 termina la sesión del IdP
//   y redirige (returnTo = origen, que sí está en Allowed Logout URLs).
// - El usuario nunca sale de su ruta actual; la UI pasa a estado "sin sesión".
//
// Regla Auth0 (verificada con curl el 2026-10-14): /v2/logout rechaza returnTo
// con path (400). Por eso el iframe usa SOLO el origen.

/** Cierra sesión sin salir de la página actual. */
export const logoutAqui = (logout) => {
  return logout({
    logoutParams: { returnTo: window.location.origin },
    openUrl: (url) => {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.setAttribute('tabindex', '-1');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      window.setTimeout(() => iframe.remove(), 5000);
      return Promise.resolve();
    },
  });
};
