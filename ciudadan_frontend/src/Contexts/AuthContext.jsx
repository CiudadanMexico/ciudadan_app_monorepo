import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const {
    user: auth0User,
    isAuthenticated,
    getAccessTokenSilently,
    loginWithRedirect,
    logout,
    isLoading,
  } = useAuth0();

  const [strapiUser, setStrapiUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncWithStrapi = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: 'https://api.ciudadan.org',
          },
        });
        setAccessToken(token);

        // Nuevo: Login en Strapi usando el endpoint personalizado
        const res = await fetch(
          `${process.env.REACT_APP_STRAPI_URL}/api/auth/auth0-login`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        if (!res.ok) throw new Error('Error autenticando con Strapi');

        // El backend devuelve el usuario ya autenticado (o recién creado)
        setStrapiUser(data.user);
      } catch (err) {
        console.error('Error sincronizando con Strapi:', err);
      } finally {
        setLoading(false);
      }
    };

    syncWithStrapi();
  }, [isAuthenticated, getAccessTokenSilently]);

  return (
    <AuthContext.Provider
      value={{
        auth0User,
        strapiUser,
        accessToken,
        isAuthenticated,
        loginWithRedirect,
        logout,
        isLoading: isLoading || loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthInfo = () => useContext(AuthContext);
