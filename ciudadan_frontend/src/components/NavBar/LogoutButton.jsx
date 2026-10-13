import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { salir } from '../../utils/authRedirect';

const LogoutButton = () => {
  const { logout } = useAuth0();

  return (
    <button onClick={() => salir(logout)}>
      Cerrar sesión
    </button>
  );
};

export default LogoutButton;
