// src/pages/Compras.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  CardMedia,
  DialogContentText,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { motion, number } from "framer-motion";

import HistorialPagos from "../../components/MarketPlace/HistorialPagos.jsx";
import CalificarCompras from "../../components/MarketPlace/CalificarCompras.jsx";
import { useRoles } from "../../Contexts/RolesContext"; // ajusta la ruta si tu RolesContext está en otro folder
import productoImg from '../../assets/placeholders/producto.png';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PagoPorTienda from "../../components/MarketPlace/PagoPorTienda.jsx";

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
  const [loadingItemById, setLoadingItemById] = useState(false); // L

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
        const url = `${base}/api/pedidos?filters[metadata][usuario_email][$eq]=${encodeURIComponent(
          user.email
        )}&populate=item&sort[0]=id:desc`;

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
      )}&populate=item&sort[0]=id:desc`;
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

  /**
   * Obtener información de pedido por ID
   * @param {number} pedidoId 
   */
  const fetchPedidoById = async (pedidoId) => {
    setLoadingItemById(true);
    try {
      const base = (process.env.REACT_APP_STRAPI_URL || "").replace(/\/+$/, "");
      if (!base) throw new Error("REACT_APP_STRAPI_URL no definido");
      //Obtener pedido por id, con filtro para incluir item con store, producto e imagenes de producto
      const url = `${base}/api/pedidos/${pedidoId}?populate[item][populate][store]=*&populate[item][populate][producto][populate]=imagenes`;
      const headers = { "Content-Type": "application/json" };
      if (process.env.REACT_APP_STRAPI_TOKEN) {
        headers.Authorization = `Bearer ${process.env.REACT_APP_STRAPI_TOKEN}`;
      }
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Strapi error ${res.status}: ${txt}`);
      }

      const responseData = await res.json();
      // Obtener data del pedido = {id:#, attributes: {}}
      const pedidoData = responseData?.data ?? {};
      // Obtener store del pedido mediante el primer producto del arreglo item, debido a que no se guarda con el pedido
      const storeData = pedidoData?.attributes?.item[0].store?.data
      // Normalizar los datos de store a un solo objeto {id:# attributes: {}} 
      const store = { id: storeData?.id, ...storeData?.attributes }
      // Agregar store normalizada a pedido para acceder a datos bancarios del store
      const pedidoAttributes = { ...pedidoData?.attributes, store }
      return { id: pedidoData?.id, attributes: pedidoAttributes };

    } catch (error) {
      console.error("Error al consultar pedido por ID:", error);
      throw new Error("Error al consultar pedido");
    } finally {
      setLoadingItemById(false);
    }
  };
  return { items, loadingItems, error, refetch, fetchPedidoById, loadingItemById };
}

const Compras = () => {
  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
  const location = useLocation();
  const { user, isLoading } = useAuth0();

  // Desde RolesContext sacamos userData (tiene id en Strapi)
  const { userData } = useRoles?.() || {}; // evita crash si no existe el provider
  const userId = userData?.id ?? null;

  const [tabIndex, setTabIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [openDialog, setOpenDialog] = useState(false);
  const [pedidoSeleccionadoId, setPedidoSeleccionadoId] = useState(0);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [openDialogoPago, setOpenDialogoPago] = useState(false);

  // ---------- Reemplazamos tu useEffect de fetch por el hook useUserPedidos ----------
  const { items, loadingItems, error, refetch, fetchPedidoById, loadingItemById } = useUserPedidos(user, isLoading);
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

  /**
   * seleccionar pedido, consultar información y abrir modal de información
   * @param {number} pedidoId 
   */
  const handleSeleccionarPedido = async (pedidoId) => {
    setPedidoSeleccionadoId(pedidoId);
    try {
      const pedidoById = await fetchPedidoById(pedidoId);
      setPedidoSeleccionado(pedidoById);
      setOpenDialog(true);

      document.getElementById("html-root").style = 'overflow-y: hidden';

    } catch (error) {
      console.error("Error al seleccionar pedido:", error);
    }
  };

  const handleClose = (callback) => {
    setOpenDialog(false);
    document.getElementById("html-root").style = 'overflow-y: auto';
    callback && callback();
  };

  const handleCloseDialogoPago = (callback) => {
    setOpenDialogoPago(false);
    callback && callback();
  };

  // ------------------ handlePagoSubido (callback para hijos y listener global) ------------------
  // Actualiza pedidosCreados cuando un PagoPorTienda informa que subió comprobante/pago.
  const handlePagoSubido = useCallback((pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl = null) => {
    if (!pedidoId) {
      console.error("handlePagoSubido: pedidoId inválido, abortando");
      return;
    }

    // Coerce IDs to strings to avoid type mismatch issues
    const pedidoIdStr = String(pedidoId);
    handleCloseDialogoPago(() => {
      handleClose();
      refetch();
    });
    refetch();
  }, []);


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
                            onClick={() => handleSeleccionarPedido(id)}
                          >
                            Ver detalle
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
                <Dialog open={openDialog} scroll="paper" maxWidth="md">
                  {
                    pedidoSeleccionado && (
                      <>
                        <DialogTitle>Detalle del pedido #{pedidoSeleccionadoId}</DialogTitle>
                        <DialogContent>
                          <Box component={motion.div}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35 }}
                          >
                            {
                              pedidoSeleccionado?.attributes?.item.map((itemProducto, index) => {
                                const producto = itemProducto?.producto?.data;
                                const store = itemProducto?.store?.data;
                                const imagenPrincipalProducto = producto?.attributes?.imagenes?.data[0].attributes?.url ? `${STRAPI_URL}${producto?.attributes?.imagenes?.data[0].attributes?.url}` : productoImg;
                                const llenar = producto?.attributes?.calificacion != null && !isNaN(Number(producto?.attributes?.calificacion)) ? Math.round(Number(producto?.attributes?.calificacion)) : 0;
                                const estrellas = Array.from({ length: 5 }).map((_, i) => i < llenar);
                                return (
                                  <Card key={`pedido-${pedidoSeleccionadoId}-producto-${itemProducto?.id}-${index}`} sx={{ my: 2, }}>
                                    <CardMedia
                                      component="img"
                                      image={imagenPrincipalProducto}
                                      alt={producto?.attributes?.nombre || 'Producto'}
                                      sx={{ height: { xs: 180, sm: 120 }, objectFit: 'contain', }}

                                    />
                                    <DialogContentText lineHeight={2}>
                                      <Box my={1} px={1}>
                                        <Typography variant="subtitle1" component="div" fontWeight={700} noWrap sx={{ mb: 0.5 }}>
                                          {producto?.attributes?.nombre || 'Sin título'}
                                        </Typography>

                                        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                          <Typography variant="h6" fontWeight={800}>
                                            {itemProducto?.total}
                                          </Typography>

                                          <Box display="flex" alignItems="center" gap={1}>
                                            <Box display="flex" alignItems="center">
                                              {estrellas.map((filled, i) => (
                                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                  {filled ? <StarIcon fontSize="small" sx={{ color: '#f7b500' }} /> : <StarBorderIcon fontSize="small" sx={{ color: '#dcdcdc' }} />}
                                                </span>
                                              ))}
                                            </Box>
                                          </Box>
                                        </Box>

                                        {/* localidad / vendidos */}
                                        <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                          <Typography variant="caption" color="text.secondary">Vendidos: {producto?.attributes?.vendidos || 0}</Typography>
                                        </Box>

                                        {/* descripción corta */}
                                        {producto?.attributes?.descripcion && (
                                          <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {producto?.attributes?.descripcion}
                                          </Typography>
                                        )}
                                      </Box>
                                    </DialogContentText>
                                  </Card>
                                )
                              })
                            }
                          </Box>
                        </DialogContent>
                        <DialogActions>
                          {
                            !pedidoSeleccionado?.attributes?.pago_id?.data && (
                              <>
                                <Button color="info" onClick={() => setOpenDialogoPago(true)}>Estado Pago</Button>
                                <Dialog open={openDialogoPago}>
                                  <DialogTitle>Estado del pago</DialogTitle>
                                  <DialogContent>
                                    <PagoPorTienda key={`pago-tienda-pedido-${pedidoSeleccionadoId}`} pedido={pedidoSeleccionado} onPagoSubido={handlePagoSubido} />
                                  </DialogContent>
                                  <DialogActions>
                                    <Button color="error" onClick={() => handleCloseDialogoPago()}>Cerrar</Button>
                                  </DialogActions>
                                </Dialog>
                              </>
                            )
                          }
                          <Button color="error" onClick={() => handleClose()}>Cerrar</Button>
                          {/* <Button>Subscribe</Button> */}
                        </DialogActions>
                      </>
                    )
                  }
                </Dialog>
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
