// src/pages/ProbarMembresia.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";

// IMPORTA el componente que recibirá las props
import MembershipCheckout from "./MembershipCheckout";

const COLLECTION_ENDPOINT = "membresias-tipos";

const ProbarMembresia = () => {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [plan, setPlan] = useState(null);
  const [plane, setPlane] = useState(null);
  const [planidx, setPlanidx] = useState(null);
  const [subtypeToShow, setSubtypeToShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOneTime, setIsOneTime] = useState(false);


  const strapiUrl = (process.env.REACT_APP_STRAPI_URL || "http://localhost:1337").replace(/\/$/, "");
  const apiToken = process.env.REACT_APP_STRAPI_TOKEN || null;

  const resolveOrderFromRequest = () => {
    const p1 = params?.order;
    if (p1) return { value: String(p1), from: "params" };

    const p2 = location?.state?.order;
    if (p2 !== undefined && p2 !== null) return { value: String(p2), from: "location.state" };

    try {
      const q = new URLSearchParams(location.search).get("order");
      if (q) return { value: String(q), from: "query" };
    } catch (e) {}

    try {
      const parts = (location.pathname || "").split("/").filter(Boolean);
      if (parts.length) {
        const last = parts[parts.length - 1];
        if (last !== "pagar") return { value: String(last), from: "pathname-last-segment" };
      }
    } catch (e) {}

    return { value: null, from: "none" };
  };

  useEffect(() => {
    let mounted = true;

    const fetchPlanes = async () => {
      setLoading(true);
      setError(null);

      const planIdFromParams =
        params?.planId ??
        params?.id ??
        params?.plan ??
        null;

      const resolved = planIdFromParams
        ? { value: null, from: "planId" }
        : resolveOrderFromRequest();

      if (!resolved.value && !planIdFromParams) {
        setError(
          "No se recibió parámetro 'order' o 'planId' en la ruta.\n\n" +
          `Debug: params=${JSON.stringify(params)}, location.search='${location.search}', location.pathname='${location.pathname}'`
        );
        setLoading(false);
        return;
      }

      const orderParam = resolved.value ? String(resolved.value) : null;

      try {
        const headers = apiToken ? { Authorization: `Bearer ${apiToken}` } : {};
        const fullUrl = `${strapiUrl}/api/${COLLECTION_ENDPOINT}?pagination[pageSize]=100&sort=order:asc&populate=*`;

        const res = await fetch(fullUrl, { headers });
        const text = await res.text().catch(() => "");
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error("Respuesta no JSON desde Strapi");
        }
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${JSON.stringify(json)}`);
        }

        const items = json?.data ?? [];

        const mapped = items.map((r) => {
          const attrs = r.attributes || {};
          let parsedJson = null;
          if (attrs.json) {
            try {
              parsedJson = typeof attrs.json === "string" ? JSON.parse(attrs.json) : attrs.json;
            } catch {}
          }

          const pick = (keys) => {
            for (const k of keys) {
              if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== "") return attrs[k];
              if (parsedJson && parsedJson[k] !== undefined && parsedJson[k] !== null && parsedJson[k] !== "") return parsedJson[k];
            }
            return undefined;
          };

          const nombre = pick(["nombre", "title", "name"]) || "";
          const precio = pick(["precio", "price", "amount"]) || "";
          const precioId = pick(["priceId"]) || "";

          let subtypes_data = [];
          if (parsedJson && Array.isArray(parsedJson.subtypes)) subtypes_data = parsedJson.subtypes;
          if (!subtypes_data.length && attrs.subtypes_data) {
            if (Array.isArray(attrs.subtypes_data)) subtypes_data = attrs.subtypes_data;
            else if (attrs.subtypes_data.data && Array.isArray(attrs.subtypes_data.data)) {
              subtypes_data = attrs.subtypes_data.data.map(s => s.attributes ?? s);
            } else if (typeof attrs.subtypes_data === "string") {
              try {
                const parsed = JSON.parse(attrs.subtypes_data);
                if (Array.isArray(parsed)) subtypes_data = parsed;
              } catch {}
            }
          }

          return {
            id: r.id,
            order: attrs.order ?? (parsedJson && (parsedJson.order ?? parsedJson.orden)) ?? 0,
            nombre,
            precio,
            subtypes: Array.isArray(subtypes_data) && subtypes_data.length > 0,
            subtypes_data,
            precioId,
          };
        });

        // ============================
        // 🔥 FLUJO /plan/:planId (NUEVO) con fallback
        // ============================
        if (planIdFromParams) {
          const numericId = Number(planIdFromParams);

          // primer intento: buscar en la lista ya cargada
          let foundById = mapped.find(p => Number(p.id) === numericId);

            console.log('primer intento');
            console.log('primer intento', foundById);

          // si no está en la lista (por paginación/estado/filtro), pedimos el recurso individualmente
          if (!foundById) {
            console.log('segundo intento');
            try {
              const singleUrl = `${strapiUrl}/api/${COLLECTION_ENDPOINT}/${numericId}?populate=*`;
              const singleRes = await fetch(singleUrl, { headers });
              const singleText = await singleRes.text().catch(() => "");
              let singleJson;
              try { singleJson = JSON.parse(singleText); } catch { singleJson = null; }

              if (singleRes.ok && singleJson && singleJson.data) {
                const item = singleJson.data;
                const attrs = item.attributes || {};
                let parsedJson = null;
                if (attrs.json) {
                  try { parsedJson = typeof attrs.json === "string" ? JSON.parse(attrs.json) : attrs.json; } catch {}
                }

                const pick = (keys) => {
                  for (const k of keys) {
                    if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== "") return attrs[k];
                    if (parsedJson && parsedJson[k] !== undefined && parsedJson[k] !== null && parsedJson[k] !== "") return parsedJson[k];
                  }
                  return undefined;
                };

                const nombre = pick(["nombre", "title", "name"]) || "";
                const precio = pick(["precio", "price", "amount"]) || "";
                const precioId = pick(["priceId"]) || "";

                let subtypes_data = [];
                if (parsedJson && Array.isArray(parsedJson.subtypes)) subtypes_data = parsedJson.subtypes;
                if (!subtypes_data.length && attrs.subtypes_data) {
                  if (Array.isArray(attrs.subtypes_data)) subtypes_data = attrs.subtypes_data;
                  else if (attrs.subtypes_data.data && Array.isArray(attrs.subtypes_data.data)) {
                    subtypes_data = attrs.subtypes_data.data.map(s => s.attributes ?? s);
                  } else if (typeof attrs.subtypes_data === "string") {
                    try { const parsed = JSON.parse(attrs.subtypes_data); if (Array.isArray(parsed)) subtypes_data = parsed; } catch {}
                  }
                }

                foundById = {
                  id: item.id,
                  order: attrs.order ?? (parsedJson && (parsedJson.order ?? parsedJson.orden)) ?? 0,
                  nombre,
                  precio,
                  subtypes: Array.isArray(subtypes_data) && subtypes_data.length > 0,
                  subtypes_data,
                  precioId,
                };
              }
            } catch (e) {
              // si el fetch individual falla, lo ignoramos y seguiremos con el error general abajo
              console.warn("[ProbarMembresia] fallback fetch por id falló:", e);
            }
          }

          if (!foundById) {
            setError(`El Plan seleccionado NO existe en el catálogo.`);
            setLoading(false);
            return;
          }

          setPlan(foundById);
          setPlanidx(foundById.precioId || foundById.precio || null);
          setIsOneTime(true);
          setSubtypeToShow(null);
          setLoading(false);
          return;
        }

        // ============================
        // 🔥 FLUJOS EXISTENTES /order
        // ============================
        setPlane(mapped);

        if (["10", "11", "12"].includes(orderParam)) {
          const baseOrder = 1;
          const subtypeIndex = parseInt(orderParam, 10) - 10;
          const found = mapped.find(p => Number(p.order) === Number(baseOrder));

          if (!found || !Array.isArray(found.subtypes_data)) {
            setError(`No se encontró la membresía con order ${baseOrder}`);
            setLoading(false);
            return;
          }

          const selectedSubtype = found.subtypes_data[subtypeIndex];
          if (!selectedSubtype) {
            setError(`No existe el subtype índice ${subtypeIndex}`);
            setLoading(false);
            return;
          }

          setPlan(found);
          setPlanidx(selectedSubtype.openpayid);
          setSubtypeToShow(selectedSubtype);
          setLoading(false);
          return;
        }

        const numericOrder = Number(orderParam);
        if (Number.isNaN(numericOrder)) {
          setError(`Parámetro 'order' inválido: ${orderParam}`);
          setLoading(false);
          return;
        }

        const foundPlan = mapped.find(p => Number(p.order) === numericOrder);

        if (!foundPlan) {
          setError(`No se encontró ninguna membresía con order ${numericOrder}`);
          setLoading(false);
          return;
        }

        setPlan(foundPlan);
        setPlanidx(foundPlan.precioId);
        setSubtypeToShow(null);
        setLoading(false);

      } catch (err) {
        if (mounted) {
          setError(err.message || String(err));
          setLoading(false);
        }
      }
    };

    fetchPlanes();
    return () => { mounted = false; };
  }, [params, location]);

  const goBack = () => navigate(-1);

  return (
    <Box sx={{ px: 2, py: 4 }}>
      <Button onClick={goBack} sx={{ mb: 2 }}>← Volver</Button>

      {loading ? (
        <Box display="flex" justifyContent="center" my={6}><CircularProgress /></Box>
      ) : error ? (
        <Alert severity="error" sx={{ whiteSpace: "pre-wrap" }}>{error}</Alert>
      ) : !plan ? (
        <Alert severity="warning">No se cargó ninguna información de membresía.</Alert>
      ) : (
        <MembershipCheckout
          plan={plan}
          subtype={subtypeToShow}
          order={String(resolveOrderFromRequest().value)}
          goBack={goBack}
          planidx={planidx}
          isOneTime={isOneTime}
          amount={isOneTime ? Number(plan.precio) : null}
        />
      )}
    </Box>
  );
};

export default ProbarMembresia;
