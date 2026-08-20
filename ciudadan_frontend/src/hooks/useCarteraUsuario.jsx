import { useAuth0 } from "@auth0/auth0-react";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
const CARTERA_URL = `${STRAPI_URL}/api/cartera`;

const authHeaders = (token) => (token ? { headers: { Authorization: `Bearer ${token}` } } : {});

export function useCarteraUsuario() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const getAccessToken = async () => {
    if (!isAuthenticated) return null;
    const token = await getAccessTokenSilently({ authorizationParams: { audience: 'https://api.ciudadan.org' }, }).catch(() => null);
    console.log("Token access auth0: ", token);
    return token;
  };
  const getCarteraUsuario = async (user_id) => {

    try {
      const token = await getAccessToken();
      const headers = authHeaders(token);
      const res = await fetch(`${CARTERA_URL}/filters[user_id][id][$eq]=${user_id}`, {
        headers,
      });
      const result = await res.json();
      return result?.data;
    } catch (error) {
      console.error("Error al consultar cartera del usuario");
      return null;
    }
  };

  return {
    getCarteraUsuario
  }
};