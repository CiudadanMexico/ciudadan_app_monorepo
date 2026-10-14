import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LogoutButton = () => {
  const { logout } = useAuth0();

  const handleLogout = () => {
    // Opcionalmente, puedes pasar un returnTo para redirigir después del logout
    logout({ returnTo: window.location.origin });
  };

  return (
    <button onClick={handleLogout}>
      Cerrar sesión
    </button>
  );
};

export default LogoutButton;
