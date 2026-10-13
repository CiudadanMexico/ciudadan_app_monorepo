import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { irALogin } from '../../utils/authRedirect';

const LoginButton = () => {
  const { loginWithRedirect } = useAuth0();

  return (
    <button onClick={() => irALogin(loginWithRedirect)}>
      Iniciar sesión
    </button>
  );
};

export default LoginButton;
