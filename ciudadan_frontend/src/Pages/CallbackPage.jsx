import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

// Función para obtener la URL de retorno desde la cookie
const getReturnUrl = () => {
  const match = document.cookie.match(new RegExp('(^| )returnTo=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '/'; // Devuelve la URL guardada o '/' por defecto
};

const CallbackPage = () => {
  const { handleRedirectCallback } = useAuth0();

  useEffect(() => {
    // Procesa la redirección después del login
    handleRedirectCallback()
      .then(() => {
        // Obtenemos la URL de retorno desde la cookie
        const returnTo = getReturnUrl();
        console.log("Redirigiendo a:", returnTo); // Log para depuración
        
        // Limpiamos la cookie de retorno
        document.cookie = "returnTo=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
        // Redirige a la URL almacenada
        window.location.replace(returnTo);
      })
      .catch(error => {
        console.error('Error en el callback de Auth0:', error);
      });
  }, [handleRedirectCallback]);

  return <div>Loading...</div>;
};

export default CallbackPage;
