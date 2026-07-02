import { useState } from "react";

const STRAPI_URL = `${process.env.REACT_APP_STRAPI_URL}`;

export function useAgencia() {
  const [socios, setSocios] = useState([]);
  const [sociosJson, setSociosJson] = useState([]); // ✅ nuevo estado para el JSON completo
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchSocios(nombreAgencia = "") {
    setLoading(true);
    setError(null);

    try {
      const url = `${STRAPI_URL}/api/agencias?filters[nombre][$eq]=${nombreAgencia}&populate=members.*`;
      console.log("🌞🌞🌞 [useAgencia] fetch URL:", url);

      const res = await fetch(url);
      const data = await res.json();
      console.log("🌞🌞🌞 [useAgencia] respuesta JSON:", data);

      if (!data?.data || data.data.length === 0) {
        setSocios([]);
        console.log("🌞🌞🌞 [useAgencia] No hay agencias encontradas");
        return [];
      }

      const agencia = data.data[0];
      console.log("🌞🌞🌞 [useAgencia] agencia.attributes:", agencia.attributes);

      // Normalizamos usando miembros_json
      const miembros = agencia.attributes?.miembros_json || [];

      console.log("🌞🌞🌞 [useAgencia] miembros_json crudos:", miembros);

      // Extraemos nombres
      const nombres = miembros.map(u => u.nombre || "Sin nombre");

      setSocios(nombres);
      console.log("🌞🌞🌞 [useAgencia] Socios cargados desde miembros_json:", nombres);

    } catch (err) {
      console.error("🌞🌞🌞 [useAgencia] Error:", err);
      setError(err);
      setSocios([]);
      return [];
    } finally {
      setLoading(false);
    }
  }

  // ✅ Nueva función: devuelve y guarda el JSON completo de miembros (nombre, mail, etc.)
  async function fetchSociosJson(nombreAgencia = "") {
    setLoading(true);
    setError(null);

    try {
      const url = `${STRAPI_URL}/api/agencias?filters[nombre][$eq]=${nombreAgencia}&populate=members.*`;
      console.log("🌞🌞🌞 [useAgencia] fetchSociosJson URL:", url);

      const res = await fetch(url);
      const data = await res.json();

      if (!data?.data || data.data.length === 0) {
        setSociosJson([]);
        console.log("🌞🌞🌞 [useAgencia] No hay agencias encontradas (JSON)");
        return [];
      }

      const agencia = data.data[0];
      const miembros = agencia.attributes?.miembros_json || [];

      setSociosJson(miembros);
      console.log("🌞🌞🌞 [useAgencia] miembros_json completos:", miembros);

      return miembros; // ✅ devuelve el array completo
    } catch (err) {
      console.error("🌞🌞🌞 [useAgencia] Error en fetchSociosJson:", err);
      setError(err);
      setSociosJson([]);
      return [];
    } finally {
      setLoading(false);
    }
  }

  return {
    socios,
    sociosJson,       // ✅ nuevo estado
    loading,
    error,
    fetchSocios,
    fetchSociosJson,  // ✅ nueva función
  };
}
