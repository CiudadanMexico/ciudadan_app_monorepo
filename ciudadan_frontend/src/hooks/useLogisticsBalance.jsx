import { useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL?.replace(/\/$/, "");
const BASE_URL = `${STRAPI_URL}/api/logistics-balance`;
const audience = process.env.REACT_APP_AUTH0_AUDIENCE ?? 'https://api.ciudadan.org';
const scope = process.env.REACT_APP_AUTH0_SCOPES ?? "openid profile email offline_access";


export function useLogisticsBalance() {
  const { getAccessTokenSilently } = useAuth0();
  // Helper para obtener el token Auth0 con audience correcta
  const getToken = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience,
          scope,
        },
      });
      console.log("-".repeat(20));
      console.log("Access token auth0: ", token);
      console.log("-".repeat(20));
      return token;
    } catch (e) {
      console.log("-".repeat(20));
      console.warn('⚠️ No se pudo obtener token Auth0:', e.message);
      console.log("-".repeat(20));
      return null;
    }
  }, [getAccessTokenSilently]);

  const authFetch = useCallback(
    async (path, options = {}) => {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.error?.message || `Error ${res.status} en logistics-balance`);
      }
      return res.json();
    },
    [getToken]
  );

  const getMyBalance = useCallback(() => authFetch("/me"), [authFetch]);

  const getDeposits = useCallback(() => authFetch("/deposits"), [authFetch]);

  const createDeposit = useCallback(
    (depositData) =>
      authFetch("/deposits", {
        method: "POST",
        body: JSON.stringify(depositData),
      }),
    [authFetch]
  );

  // Datos bancarios para la recarga (single type skydropx-recharge-account)
  const getRechargeAccount = useCallback(async () => {
    const res = await fetch(`${STRAPI_URL}/api/skydropx-recharge-account`);
    if (!res.ok) throw new Error(`Error ${res.status} al obtener la cuenta de recarga`);
    const json = await res.json();
    return json?.data?.attributes ?? json?.data ?? null;
  }, []);

  // Registra un pago en /api/pagos con el comprobante adjunto (imagen o PDF)
  const createPago = useCallback(
    async ({ monto, comprobante }) => {
      const formData = new FormData();
      formData.append(
        "data",
        JSON.stringify({
          tipo: "logistica",
          monto: Number(monto),
          status: "pendiente_verificacion",
          fecha_pagado: new Date().toISOString(),
        })
      );
      if (comprobante) formData.append("files.comprobante", comprobante);

      const res = await fetch(`${STRAPI_URL}/api/pagos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.error?.message || `Error ${res.status} al registrar el pago`);
      }
      const json = await res.json();
      return json?.data ?? json;
    },
    []
  );

  return { getMyBalance, getDeposits, createDeposit, getRechargeAccount, createPago };
}
