import { useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || "http://localhost:33032";

export function useAgencia() {
  const { getAccessTokenSilently } = useAuth0();
  const [socios, setSocios] = useState([]);
  const [sociosJson, setSociosJson] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience: "https://api.ciudadan.org" },
      });
    } catch (e) {
      console.warn("⚠️ No se pudo obtener token Auth0:", e.message);
      return null;
    }
  }, [getAccessTokenSilently]);

  async function fetchSocios(nombreAgencia = "") {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const url = `${STRAPI_URL}/api/agencias?filters[nombre][$eq]=${nombreAgencia}&populate=members.*`;

      const res = await fetch(url, { headers });
      const data = await res.json();

      if (!data?.data || data.data.length === 0) {
        setSocios([]);
        return [];
      }

      const agencia = data.data[0];
      const miembros = agencia.attributes?.miembros_json || [];
      const nombres = miembros.map(u => u.nombre || "Sin nombre");

      setSocios(nombres);
      return nombres;
    } catch (err) {
      console.error("[useAgencia] Error:", err);
      setError(err);
      setSocios([]);
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function fetchSociosJson(nombreAgencia = "") {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const url = `${STRAPI_URL}/api/agencias?filters[nombre][$eq]=${nombreAgencia}&populate=members.*`;

      const res = await fetch(url, { headers });
      const data = await res.json();

      if (!data?.data || data.data.length === 0) {
        setSociosJson([]);
        return [];
      }

      const agencia = data.data[0];
      const miembros = agencia.attributes?.miembros_json || [];

      setSociosJson(miembros);
      return miembros;
    } catch (err) {
      console.error("[useAgencia] Error en fetchSociosJson:", err);
      setError(err);
      setSociosJson([]);
      return [];
    } finally {
      setLoading(false);
    }
  }

  return {
    socios,
    sociosJson,
    loading,
    error,
    fetchSocios,
    fetchSociosJson,
  };
}
