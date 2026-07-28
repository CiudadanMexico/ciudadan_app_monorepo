import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useLocation } from 'react-router-dom';

const LoginButton = () => {
  const { loginWithRedirect } = useAuth0();
  const location = useLocation();

  const handleLogin = () => {
    // Guarda la URL completa (ruta, query y hash) en una cookie, codificada para evitar problemas con caracteres especiales
    const currentUrl =
      window.location.pathname + window.location.search + window.location.hash;
    document.cookie = `returnTo=${encodeURIComponent(currentUrl)}; path=/; max-age=3600`;
    console.log('************ Guardando cookie en componente login:', currentUrl);
    
    // Redirige a Auth0 para/ iniciar sesión
    loginWithRedirect({
      appState: {
        returnTo: location.pathname + location.search,
      },
    });
  };

  return (
    <button onClick={handleLogin}>
      Iniciar sesión
    </button>
  );
};

export default LoginButton;
