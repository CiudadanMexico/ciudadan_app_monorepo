// src/pages/Compras.jsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  Pagination,
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
const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
const PEDIDOS_URL = `${STRAPI_URL}/api/pedidos`;

function useUserPedidos(user, isLoadingAuth) {
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState(null);
  const [loadingItemById, setLoadingItemById] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const getPedidosPendientes = async (user_email = '') => {
    setLoadingItems(true);
    setError(null);

    try {
      const userFilter = `filters[metadata][usuario_email][$eq]=${encodeURIComponent(user_email)}`;
      const filterState = 'filters[$or][0][finalizado][$null]=true&filters[$or][1][finalizado][$eq]=false';
      const populateStr = 'populate=item';
      const paginationStr = `pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
      const url = `${PEDIDOS_URL}?${userFilter}&${filterState}&${populateStr}&${paginationStr}&sort[0]=id:desc`;

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
      return json;
    } catch (err) {
      setError(err.message || "Error al obtener pedidos");
      return [];
    } finally {
      setLoadingItems(false);
    }
  };

  const getPedidosRecibidosSinCalificar = async (user_email = '') => {
    setLoadingItems(true);
    setError(null);

    try {
      const userFilter = `filters[metadata][usuario_email][$eq]=${encodeURIComponent(user_email)}`;
      const filterState = 'filters[finalizado][$eq]=true&filters[calificado]=false';
      const populateStr = 'populate=item';
      const url = `${PEDIDOS_URL}?${userFilter}&${filterState}&${populateStr}&sort[0]=id:desc`;

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
      return json;
    } catch (err) {
      setError(err.message || "Error al obtener pedidos");
      return [];
    } finally {
      setLoadingItems(false);
    }
  };


  const getHistorialPedidosCalificados = async (user_email = '') => {
    setLoadingItems(true);
    setError(null);

    try {
      const userFilter = `filters[metadata][usuario_email][$eq]=${encodeURIComponent(user_email)}`;
      const filterState = 'filters[finalizado][$eq]=true&filters[calificado]=true';
      const populateStr = 'populate=item';
      const url = `${PEDIDOS_URL}?${userFilter}&${filterState}&${populateStr}&sort[0]=id:desc`;

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
      return json;
    } catch (err) {
      setError(err.message || "Error al obtener pedidos");
      return [];
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
  return { loadingItems, error, page, pageSize, setPage, setPageSize, getPedidosPendientes, getPedidosRecibidosSinCalificar, getHistorialPedidosCalificados, fetchPedidoById, loadingItemById };
}

const Compras = () => {
  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
  const location = useLocation();
  const { user, isLoading } = useAuth0();
  const { loadingItems, error, fetchPedidoById, loadingItemById, getPedidosPendientes, getHistorialPedidosCalificados, getPedidosRecibidosSinCalificar, setPage, page, } = useUserPedidos(user, isLoading);

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
  const [pedidosEnCurso, setPedidosEnCurso] = useState([]);
  const [recibidosPorCalificar, setRecibidosPorCalificar] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [pagination, setPagination] = useState(null);

  // ---------- Reemplazamos tu useEffect de fetch por el hook useUserPedidos ----------
  // -------------------------------------------------------------------------------
  const basePrueba = "/compras";

  const tabs = [
    { label: "Pedidos en curso", path: "pedidos" },
    { label: "Recibidos", path: "recibidos" },
    { label: "Historial", path: "historial" },
    { label: "Ordenes de comida", path: "ordenes-comida" },
  ];

  const handleFetchPedidosPendientes = async (user_email) => {
    const { data, meta } = await getPedidosPendientes(user_email);
    setPedidosEnCurso(data ?? []);
    setPagination(meta?.pagination);
  };

  const handleFetchPedidosPorCalificar = async (user_email) => {
    const { data, meta } = await getPedidosRecibidosSinCalificar(user_email);
    setPedidosEnCurso(data ?? []);
    setPagination(meta.pagination);
  };

  const handleFetchPedidosHistorial = async (user_email) => {
    const { data, meta } = await getHistorialPedidosCalificados(user_email);
    setPedidosEnCurso(data ?? []);
    setPagination(meta.pagination);
  };

  const handleFetchPedidosByTab = (tab_index = 0, user_email) => {
    switch (tab_index) {
      case 1:
        handleFetchPedidosPorCalificar(user_email);
        break;
      case 2:
        handleFetchPedidosHistorial(user_email);
      default:
        handleFetchPedidosPendientes(user_email);
        break;
    }
  };

  const handleTabChange = (value) => {
    setPedidosEnCurso([]);
    setRecibidosPorCalificar([]);
    setHistorial([]);
    setPage(1);
    setPagination(null);
    setTabIndex(value);
  }

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setPedidosEnCurso([]);
      setRecibidosPorCalificar([]);
      setHistorial([]);
      return;
    }
    handleFetchPedidosByTab(tabIndex, user?.email);
  }, [user, isLoading, tabIndex, page])

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
      // refetch();
    });
    // refetch();
  }, []);

  /* ---------- responsive listener ---------- */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ---------- sincroniza tab con la URL ---------- */
  useEffect(() => {
    const path = (location.pathname || "").toLowerCase();
    if (path.includes(`${basePrueba}/pedidos`)) handleTabChange(0);
    else if (path.includes(`${basePrueba}/recibidos`)) handleTabChange(1);
    else if (path.includes(`${basePrueba}/historial`)) handleTabChange(2);
    else handleTabChange(0);
  }, [location.pathname]);

  if (isLoading) return <p>Cargando autenticación…</p>;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: 32,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 100%" }}>
        <Pestanas
          tabs={tabs}
          basePath={basePrueba}
          onTabChange={handleTabChange}
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
            mt: 1,
            mx: 1,
            p: { xs: 2, md: 3 },
            borderRadius: 2,
            boxShadow: 3,
            background: "#fff",
          }}
        >
          <Divider sx={{ mb: 2 }} />

          {(loadingItems || loadingItemById) ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error && (
            <Typography color="error">{error}</Typography>
          )}

          {
            (!loadingItems && !loadingItemById) && tabIndex === 0 && (
              /* ================= PEDIDOS EN CURSO ================= */
              pedidosEnCurso.length === 0 ? (
                <Typography align="center">No tienes pedidos en curso.</Typography>
              ) : (
                <Grid container spacing={2}>
                  {
                    pedidosEnCurso.map((entry, idx) => {
                      const id = entry.id;
                      const attrs = entry.attributes || {};

                      return (
                        <Grid
                          item
                          xs={12} key={`pedido-en-curso-item-${id}`}
                        >
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
                                disabled={loadingItemById}
                              >
                                Ver detalle
                              </Button>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })
                  }
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
            )
          }
          {
            (!loadingItems && !loadingItemById) && tabIndex === 1 && (
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
            )
          }
          {
            (!loadingItems && !loadingItemById) && tabIndex === 2 && (
              /* ================= HISTORIAL ================= */
              <HistorialPagos items={historial} user={user} />
            )
          }
          {
            pagination && pagination?.pageCount > 1 && (
              <Box
                my={2}
                display="flex"
                justifyContent="center"
                alignItems="center"
              >

                <Pagination
                  page={page}
                  count={pagination?.pageCount ?? 1}
                  color="primary"
                  onChange={(_, value) => {
                    setPage(value);
                  }}
                />

              </Box>
            )
          }
        </Box>
      </div>
    </div>
  );
};

export default Compras;
