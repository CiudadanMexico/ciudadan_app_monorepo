// useAuth0Token.jsx
// Hook compartido para obtener el access token de Auth0 (audience api.ciudadan.org)
// en las páginas de CoWork.
//
// Bug que resuelve (observado en vivo): AgregarSocio / Agencia / AgregarTarea
// pedían el token con `getAccessTokenSilently` y, si fallaba, devolvían `null`
// EN SILENCIO y seguían llamando a la API sin cabecera `Authorization`. La
// policy `is-admin-or-socio` responde entonces 403 con el mensaje genérico
// "Forbidden" y, en el caso de `agregarSocio`, el servicio rechazaba antes con
// "Falta el token de autenticación". Aquí el error se conserva en `tokenError`
// para que la UI lo muestre con un botón de re-login, en vez de mandar
// requests que van a fallar.

import { useCallback, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const AUDIENCE = process.env.REACT_APP_AUTH0_AUDIENCE ?? 'https://api.ciudadan.org';
// Mismo scope que usa Auth0Provider y RolesContext (incluye offline_access
// para que exista refresh token y la autenticación silenciosa no necesite iframe).
const SCOPE = process.env.REACT_APP_AUTH0_SCOPES ?? 'openid profile email offline_access';

export default function useAuth0Token() {
  const {
    isAuthenticated,
    isLoading,
    getAccessTokenSilently,
    loginWithRedirect,
  } = useAuth0();
  const [tokenError, setTokenError] = useState(null);

  /**
   * @returns {Promise<string|null>} el token, o `null` si no se pudo obtener.
   *   NUNCA lanza: el motivo queda expuesto en `tokenError`.
   */
  const getToken = useCallback(async () => {
    if (!isAuthenticated) {
      setTokenError('No has iniciado sesión.');
      return null;
    }
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: AUDIENCE, scope: SCOPE },
      });
      setTokenError(null);
      return token;
    } catch (e) {
      const codigo = e?.error || e?.error_code || 'error-de-sesion';
      console.warn('No se pudo obtener token Auth0:', codigo, e?.message || '');
      setTokenError(
        `Tu sesión no es válida (${codigo}). Vuelve a iniciar sesión para continuar.`
      );
      return null;
    }
  }, [getAccessTokenSilently, isAuthenticated]);

  /** Re-lanza el login de Auth0 conservando la ruta actual como destino. */
  const reintentarSesion = useCallback(() => {
    const returnTo = typeof window !== 'undefined' ? window.location.pathname : '/';
    loginWithRedirect({ appState: { returnTo } }).catch((e) => {
      console.warn('No se pudo iniciar sesión con Auth0:', e?.message || e);
    });
  }, [loginWithRedirect]);

  return { getToken, tokenError, setTokenError, isAuthenticated, isLoading, reintentarSesion };
}
