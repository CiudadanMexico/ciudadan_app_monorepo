// src/pages/Compras.jsx
import React, { useEffect, useState, useMemo } from "react";
import Pestanas from "../../components/Pestanas";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Button,
  Chip,
  Divider,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { motion } from "framer-motion";

import HistorialPagos from "../../components/MarketPlace/HistorialPagos.jsx";
import CalificarCompras from "../../components/MarketPlace/CalificarCompras.jsx";
import { useRoles } from "../../Contexts/RolesContext"; // ajusta la ruta si tu RolesContext está en otro folder

/**
 * Hook local: useUserPedidos
 * - Encapsula el fetch de pedidos filtrados por usuario.email
 * - Devuelve items, loadingItems, error y refetch (por si se necesita)
 *
 * Mantiene exactamente la misma URL y headers que tenías antes:
 * filters[usuario][email][$eq]=<email>&populate=deep,3&sort[0]=id:desc
 */
function useUserPedidos(user, isLoadingAuth) {
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user?.email) {
      setItems([]);
      setError(null);
      return;
    }

    let mounted = true;
    const fetchPedidos = async () => {
      setLoadingItems(true);
      setError(null);

      try {
        const base = (process.env.REACT_APP_STRAPI_URL || "").replace(/\/+$/, "");
        if (!base) throw new Error("REACT_APP_STRAPI_URL no definido");

        // populate=deep,3 para traer relaciones necesarias
        const url = `${base}/api/pedidos?filters[usuario][email][$eq]=${encodeURIComponent(
          user.email
        )}&populate=deep,3&sort[0]=id:desc`;

        const headers = { "Content-Type": "application/json" };
        if (process.env.REACT_APP_STRAPI_TOKEN) {
          headers.Authorization = `Bearer ${process.env.REACT_APP_STRAPI_TOKEN}`;
        }

        const res = await fetch(url, { headers });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Strapi error ${res.status}: ${txt}`);
        }

        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];
        if (mounted) setItems(data);
      } catch (err) {
        if (mounted) {
          setError(err.message || "Error al obtener pedidos");
          setItems([]);
        }
      } finally {
        if (mounted) setLoadingItems(false);
      }
    };

    fetchPedidos();

    return () => {
      mounted = false;
    };
  }, [user, isLoadingAuth]);

  const refetch = async () => {
    // simple refetch trigger by setting user again (or you could implement fetch logic here)
    if (!user?.email) return;
    setLoadingItems(true);
    setError(null);
    try {
      const base = (process.env.REACT_APP_STRAPI_URL || "").replace(/\/+$/, "");
      const url = `${base}/api/pedidos?filters[usuario][email][$eq]=${encodeURIComponent(
        user.email
      )}&populate=deep,3&sort[0]=id:desc`;
      const headers = { "Content-Type": "application/json" };
      if (process.env.REACT_APP_STRAPI_TOKEN) {
        headers.Authorization = `Bearer ${process.env.REACT_APP_STRAPI_TOKEN}`;
      }
      const res = await fetch(url, { headers });
      const json = await res.json();
      const data = Array.isArray(json.data) ? json.data : [];
      setItems(data);
    } catch (err) {
      setError(err.message || "Error al reintentar obtener pedidos");
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  return { items, loadingItems, error, refetch };
}

const Compras = () => {
  const location = useLocation();
  const { user, isLoading } = useAuth0();

  // Desde RolesContext sacamos userData (tiene id en Strapi)
  const { userData } = useRoles?.() || {}; // evita crash si no existe el provider
  const userId = userData?.id ?? null;

  const [tabIndex, setTabIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  // ---------- Reemplazamos tu useEffect de fetch por el hook useUserPedidos ----------
  const { items, loadingItems, error, refetch } = useUserPedidos(user, isLoading);
  // -------------------------------------------------------------------------------

  const basePrueba = "/market/compras";

  const tabs = [
    { label: "Pedidos en curso", path: "pedidos" },
    { label: "Recibidos", path: "recibidos" },
    { label: "Historial", path: "historial" },
  ];

  /* ---------- responsive listener ---------- */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ---------- sincroniza tab con la URL ---------- */
  useEffect(() => {
    const path = (location.pathname || "").toLowerCase();
    if (path.includes(`${basePrueba}/pedidos`)) setTabIndex(0);
    else if (path.includes(`${basePrueba}/recibidos`)) setTabIndex(1);
    else if (path.includes(`${basePrueba}/historial`)) setTabIndex(2);
    else setTabIndex(0);
  }, [location.pathname]);

  /* ---------- filtros derivados (memorizados) ---------- */
  const pedidosEnCurso = useMemo(
    () => items.filter((p) => p.attributes?.finalizado !== true),
    [items]
  );

  const recibidosPorCalificar = useMemo(
    () =>
      items.filter(
        (p) => p.attributes?.finalizado === true && p.attributes?.calificado !== true
      ),
    [items]
  );

  const historial = useMemo(
    () =>
      items.filter(
        (p) => p.attributes?.finalizado === true && p.attributes?.calificado === true
      ),
    [items]
  );

  if (isLoading) return <p>Cargando autenticación…</p>;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column-reverse" : "row",
        padding: 24,
        gap: 32,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 100%" }}>
        <Pestanas
          tabs={tabs}
          basePath={basePrueba}
          onTabChange={setTabIndex}
          collapseAt={640}
          backgroundColor="linear-gradient(90deg, #2b0a3d, #3a0f55, #2b0a3d)"
          textColor="#d9c9ff"
        />

        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          sx={{
            mt: 3,
            p: { xs: 2, md: 3 },
            borderRadius: 2,
            boxShadow: 3,
            background: "#fff",
            border: "1px solid #6d6e71",
          }}
        >
          <Divider sx={{ mb: 2 }} />

          {loadingItems ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : tabIndex === 0 ? (
            /* ================= PEDIDOS EN CURSO ================= */
            pedidosEnCurso.length === 0 ? (
              <Typography align="center">No tienes pedidos en curso.</Typography>
            ) : (
              <Grid container spacing={2}>
                {pedidosEnCurso.map((entry) => {
                  const id = entry.id;
                  const attrs = entry.attributes || {};

                  return (
                    <Grid item xs={12} key={id}>
                      <Card sx={{ p: 2 }}>
                        <CardContent>
                          <Typography variant="h6">{attrs.nombre || `Pedido #${id}`}</Typography>

                          <Chip
                            icon={<LocalShippingIcon />}
                            label={`Status: ${attrs.status || "pendiente"}`}
                            sx={{ mt: 1, bgcolor: "#fff200", fontWeight: 600 }}
                          />

                          <Typography sx={{ mt: 1 }}>
                            Total: {attrs.total ?? 0} {attrs.moneda || "MXN"}
                          </Typography>

                          <Button
                            sx={{ mt: 2 }}
                            size="small"
                            variant="outlined"
                            startIcon={<InfoIcon />}
                            onClick={() => console.log("Detalle pedido", id)}
                          >
                            Ver detalle
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )
          ) : tabIndex === 1 ? (
            /* ================= RECIBIDOS / CALIFICAR ================= */
            recibidosPorCalificar.length === 0 ? (
              <Typography align="center">No tienes compras pendientes de calificar 🎉</Typography>
            ) : (
              <Grid container spacing={2}>
                {recibidosPorCalificar.map((entry) => (
                  <Grid item xs={12} key={entry.id}>
                    <Card sx={{ p: 2 }}>
                      <CardContent>
                        <Typography variant="h6">
                          {entry.attributes?.nombre || `Pedido #${entry.id}`}
                        </Typography>

                        <Typography variant="body2" sx={{ mb: 2 }}>
                          Total: {entry.attributes?.total ?? 0} {entry.attributes?.moneda || "MXN"}
                        </Typography>

                        {/* PASAMOS userId desde RolesContext PARA QUE CalificarCompras LO USE */}
                        <CalificarCompras
                          pedido={entry}
                          userId={userId}
                          tipo={entry.attributes?.tipo || "tienda"}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )
          ) : (
            /* ================= HISTORIAL ================= */
            <HistorialPagos items={historial} user={user} />
          )}
        </Box>
      </div>
    </div>
  );
};

export default Compras;
