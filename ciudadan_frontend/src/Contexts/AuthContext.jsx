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
  const [strapiJwt, setStrapiJwt] = useState(() => localStorage.getItem('strapi_jwt') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncWithStrapi = async () => {
      if (!isAuthenticated) {
        setAccessToken(null);
        setStrapiUser(null);
        setStrapiJwt(null);
        localStorage.removeItem('strapi_jwt');
        setLoading(false);
        return;
      }

      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: 'https://api.ciudadan.org',
            scope: 'openid profile email offline_access',
          },
        });
        setAccessToken(token);

        const res = await fetch(
          `${process.env.REACT_APP_STRAPI_URL}/api/auth/auth0-login`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ access_token: token, email: auth0User?.email }),
          }
        );

        const text = await res.text();
        let data = null;

        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        if (!res.ok) {
          throw new Error(`Error autenticando con Strapi: ${res.status} ${text || ''}`);
        }

        const jwt = data?.jwt || data?.data?.jwt || null;
        if (jwt) {
          localStorage.setItem('strapi_jwt', jwt);
          setStrapiJwt(jwt);
        }

        setStrapiUser(data?.user || data?.data?.user || null);
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
        strapiJwt,
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
