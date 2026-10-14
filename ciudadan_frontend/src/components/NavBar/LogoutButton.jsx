import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LogoutButton = () => {
  const { logout } = useAuth0();

  const handleLogout = () => {
    // Sin returnTo: Auth0 redirige a la primera Allowed Logout URL del dashboard
    logout();
  };

  return (
    <button onClick={handleLogout}>
      Cerrar sesión
    </button>
  );
};

export default LogoutButton;
