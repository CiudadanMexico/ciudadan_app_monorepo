import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { logoutAqui } from '../../utils/logoutAqui';

const LogoutButton = () => {
  const { logout } = useAuth0();

  const handleLogout = () => {
    // Cierra sesión sin salir de la página actual
    logoutAqui(logout);
  };

  return (
    <button onClick={handleLogout}>
      Cerrar sesión
    </button>
  );
};

export default LogoutButton;
