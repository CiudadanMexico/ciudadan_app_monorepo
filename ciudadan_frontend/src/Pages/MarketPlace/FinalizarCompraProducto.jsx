import { Box, Button, Chip, CircularProgress, Divider, Grid, Paper, Step, StepLabel, Stepper, Typography, Tooltip, useTheme, useMediaQuery, Stack } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import DireccionSelector from '../../components/MarketPlace/DireccionSelector';
import { AnimatePresence, motion } from 'framer-motion';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StarIcon from '@mui/icons-material/Star';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GaleriaImagenesProducto from '../../components/MarketPlace/GaleriaImagenesProducto';
import useProductos from '../../hooks/useProductos';
import productoImg from '../../assets/placeholders/producto.png';
import DetalleProducto from '../../components/MarketPlace/DetalleProducto';
import { useAuth0 } from "@auth0/auth0-react";
import { useCart } from "../../Contexts/CartContext";
import PagoPorTienda from '../../components/MarketPlace/PagoPorTienda';
import {
  CheckCircleRounded,
  UploadFileRounded,
  VerifiedRounded,
  LocalShippingRounded,
} from "@mui/icons-material";
import { useRoles } from '../../Contexts/RolesContext';

const STRAPI = process.env.REACT_APP_STRAPI_URL;
const steps = ["Producto", "Dirección", "Pago", "Confirmación"];

const extractStore = (rawStore) => {
  if (!rawStore) {
    return { id: null, name: "Tienda sin nombre" };
  }
  const maybeData = rawStore?.data || rawStore;
  const id = maybeData?.id || rawStore?.id || maybeData?.attributes?.id || null;
  const name =
    maybeData?.attributes?.name ||
    maybeData?.attributes?.nombre ||
    rawStore?.name ||
    rawStore?.attributes?.name ||
    "Tienda sin nombre";
  const banco = maybeData?.attributes?.banco ?? rawStore?.banco ?? rawStore?.attributes?.banco ?? "";
  const clabe_bancaria = maybeData?.attributes?.clabe_bancaria ?? rawStore?.clabe_bancaria ?? rawStore?.attributes?.clabe_bancaria ?? "";
  const nombre_bancario = maybeData?.attributes?.nombre_bancario ?? rawStore?.nombre_bancario ?? rawStore?.attributes?.nombre_bancario ?? "";
  return { id: id || null, name, banco, clabe_bancaria, nombre_bancario };
};

export default function FinalizarCompraProducto() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    getProductoBySlug,
    precotizacionTotal,
    calcularPromedioRankingsPorProducto,
    obtenerResenas,
  } = useProductos();
  const { isAuthenticated, loginWithRedirect, user } = useAuth0();
  const { userData } = useRoles();
  const { precotizarPlataforma, precotizarMienvio, precotizarStripe } = useCart();


  const [activeStep, setActiveStep] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [creatingPedidos, setCreatingPedidos] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagenIndex, setImagenIndex] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [envioEstimado, setEnvioEstimado] = useState(null);
  const [rankingInfo, setRankingInfo] = useState({ count: 0, avg5: null });
  const [resenasData, setResenasData] = useState([]);

  const [pedidoCreado, setPedidoCreado] = useState(null); // un solo pedido (no array)
  const [carritoId, setCarritoId] = useState(null);

  const handleConfirmAddress = useCallback((dir) => {
    console.log("cart y emojis - dirección seleccionada:", dir);
    setSelectedAddress(dir);
  }, []);

  const handleGetAddressStore = async (storeId) => {
    if (!storeId) return null;
    try {
      const results = await fetch(`${STRAPI}/api/direcciones?filters[store_id][id][$eq]=${storeId}`);
      const { data } = await results.json();
      if (data && data.length > 0)
        return data[0]
      return null
    } catch (error) {
      console.error("Error al obtener la dirección de la tienda:", error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchProducto = async () => {
      setLoading(true);
      setError(null);
      setProducto(null);
      setEnvioEstimado(null);
      setRankingInfo({ count: 0, avg5: null });
      setResenasData([]);

      try {
        const data = await getProductoBySlug(slug);
        if (!mounted) return;

        if (!data) {
          setError('No se encontró el producto.');
          return;
        }

        setProducto(data);
        setImagenIndex(0);
        setCantidad(1);

        // enriquecimiento no bloqueante
        (async () => {
          try {
            if (typeof calcularPromedioRankingsPorProducto === 'function') {
              const res = await calcularPromedioRankingsPorProducto(data.id);
              if (!mounted) return;
              setRankingInfo({ count: res.count || 0, avg5: res.avg5 != null ? res.avg5 : null });
            } else {
              const attrs = data.attributes || {};
              const numero = attrs.numero_calificaciones || 0;
              const sumStars = attrs.calificacion || 0;
              const avg = numero ? (sumStars / numero) : null;
              if (!mounted) return;
              setRankingInfo({ count: numero, avg5: avg });
            }
          } catch (err) {
            console.error('[Producto] error calculando ranking:', err);
          }
        })();

        (async () => {
          try {
            if (typeof obtenerResenas === 'function') {
              const rez = await obtenerResenas(data.id);
              if (!mounted) return;
              setResenasData(rez || []);
            } else {
              const rel = data.attributes?.resenas || [];
              if (!mounted) return;
              setResenasData(Array.isArray(rel) ? rel : []);
            }
          } catch (err) {
            console.error('[Producto] error cargando reseñas:', err);
          }
        })();

        (async () => {
          try {
            const envioField = data.attributes?.envio;
            if (envioField && String(envioField).trim() !== '') {
              if (!mounted) return;
              setEnvioEstimado(String(envioField));
            } else {
              if (typeof precotizacionTotal === 'function') {
                const attrs = data.attributes || {};
                const precioNum = Number(attrs.precio) || 0;
                const candidato = {
                  id: data.id,
                  precio: precioNum,
                  largo: attrs.largo,
                  ancho: attrs.ancho,
                  alto: attrs.alto,
                  peso: attrs.peso,
                  cp: attrs.cp || attrs.cp_origen || null,
                };
                const cpDestino = attrs?.cp_destino || attrs?.cp || '11560';
                const total = await precotizacionTotal(candidato, cpDestino);
                if (!mounted) return;
                if (total != null && !isNaN(Number(total))) {
                  const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(total));
                  setEnvioEstimado(fmt);
                } else {
                  setEnvioEstimado('No disponible');
                }
              } else {
                setEnvioEstimado('No disponible');
              }
            }
          } catch (err) {
            console.error('[Producto] error cotizando envío:', err);
            if (mounted) setEnvioEstimado('Error al cotizar');
          }
        })();

      } catch (err) {
        console.error('[Producto] fetch error', err);
        setError('Error cargando el producto.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (slug) fetchProducto();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, getProductoBySlug, precotizacionTotal, calcularPromedioRankingsPorProducto, obtenerResenas]);

  const handleCantidadChange = (newCantidad) => {
    if (newCantidad < 1) return;
    const stockLocal = producto?.attributes?.stock;
    if (typeof stockLocal === 'number' && newCantidad > stockLocal) return;
    setCantidad(newCantidad);
  };

  // derivadas seguras (siempre antes de cualquier return)
  const attrs = producto?.attributes || {};
  const nombre = attrs.nombre || attrs.titulo || 'Sin título';
  const descripcion = attrs.descripcion || '';
  const imagenPredeterminada =
    attrs?.imagen_predeterminada?.data?.[0]?.attributes?.formats?.medium?.url ||
    attrs?.imagen_predeterminada?.data?.[0]?.attributes?.url ||
    null;

  const imagenesRel = Array.isArray(attrs?.imagenes?.data)
    ? attrs.imagenes.data.map(i => `${process.env.REACT_APP_STRAPI_URL}${i.attributes.url}`)
    : [];

  const todasLasImagenes = [
    ...(imagenPredeterminada ? [`${process.env.REACT_APP_STRAPI_URL}${imagenPredeterminada}`] : []),
    ...imagenesRel,
  ];
  if (todasLasImagenes.length === 0) todasLasImagenes.push(productoImg);

  const precioNum = Number(attrs.precio) || null;
  const precioFmt = precioNum != null ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(precioNum) : 'Precio no disponible';

  const stock = attrs.stock;
  const vendidos = attrs.vendidos || 0;
  const marca = attrs.marca || null;
  const localidad = attrs.localidad || null;
  const estado = attrs.estado || null;

  const avg5 = rankingInfo.avg5 != null ? rankingInfo.avg5 : (attrs.numero_calificaciones ? ((attrs.calificacion || 0) / (attrs.numero_calificaciones * 1)) : null);
  const numCalificaciones = rankingInfo.count || attrs.numero_calificaciones || 0;

  // cálculo simple sin hooks para evitar HMR/hook-order issues
  const estrellas = (() => {
    const valor = avg5 != null && !isNaN(Number(avg5)) ? Math.round(Number(avg5)) : 0;
    return Array.from({ length: 5 }).map((_, i) => i < valor);
  })();

  const envioMostrar = envioEstimado || (attrs.envio || null) || 'No disponible';

  const handleCrearPedido = async (callback = () => { }) => {
    if (!isAuthenticated) {
      await loginWithRedirect({ appState: { returnTo: `/producto/${slug}/finalizar` } });
      return;
    }

    if (!selectedAddress) {
      alert("Selecciona una dirección primero.");
      return;
    }

    if (!producto) {
      alert("Producto no disponible.");
      return;
    }

    setCreatingPedidos(true);

    try {
      const storeInfo = extractStore(attrs.store);
      const precio_unitario = precioNum || 0;
      const subtotal = precio_unitario * cantidad;

      const comisionPlataforma = precotizarPlataforma(subtotal);
      const envio = await precotizarMienvio(
        attrs.cp || attrs.cp_origen || "",
        attrs.cp_destino || selectedAddress?.cp || "11560",
        attrs.largo || 1,
        attrs.ancho || 1,
        attrs.alto || 1,
        attrs.peso || 1,
        cantidad
      );
      const comisionStripe = precotizarStripe(subtotal, envio, comisionPlataforma);
      const total = parseFloat(
        (subtotal + envio + comisionPlataforma + comisionStripe).toFixed(2)
      );
      const storeAddress = await handleGetAddressStore(storeInfo?.id);

      // Item mapeado igual que mapItemToComponent en FinalizarCompra.jsx
      const item = {
        producto: producto.id,
        nombre: nombre || "Sin nombre",
        precio_unitario,
        cantidad,
        subtotal,
        envio,
        subtotal_volumetrico: 0,
        esquema_impuestos: "sin_iva",
        cp: attrs.cp || null,
        total,
        comisionStripe,
        comisionPlataforma,
        store: storeInfo.id,
        calificado: false,
        status: "pendiente",
      };

      console.log("cart y emojis - item único mapeado:", item);

      // ----------------------------
      // 1) CREAR / ACTUALIZAR CARRITO (aunque sea 1 solo producto)
      // ----------------------------
      const carritoPayload = {
        data: {
          productos: [item],
          total: subtotal,
          total_envios: envio,
          estado: "activo",
          ultima_actualizacion: new Date().toISOString(),
          usuario_email: user?.email || "unknown",
        },
      };

      const carritoRes = await fetch(
        `${STRAPI}/api/carritos?filters[usuario_email][$eq]=${encodeURIComponent(
          user?.email || ""
        )}&filters[estado][$eq]=activo`
      );

      if (!carritoRes.ok) {
        throw new Error("Error buscando carrito");
      }

      const carritoJson = await carritoRes.json();
      let carritoCreatedId = null;

      if (carritoJson?.data?.length > 0) {
        carritoCreatedId = carritoJson.data[0].id;
        const upd = await fetch(`${STRAPI}/api/carritos/${carritoCreatedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(carritoPayload),
        });
        if (!upd.ok) throw new Error("Error actualizando carrito");
      } else {
        const newCarrito = await fetch(`${STRAPI}/api/carritos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(carritoPayload),
        });
        if (!newCarrito.ok) throw new Error("Error creando carrito");
        const newJson = await newCarrito.json();
        carritoCreatedId = newJson?.data?.id;
      }

      setCarritoId(carritoCreatedId);

      // ----------------------------
      // 2) CREAR PEDIDO (una sola tienda)
      // ----------------------------
      const payloadPedido = {
        data: {
          item: [item],
          tipo: "tienda",
          timestamp_creacion: new Date().toISOString(),
          monto_envio: envio,
          monto_total: total,
          status: "pendiente_pago",
          carrito_id: carritoCreatedId,
          direccion_destino: selectedAddress.id,
          metadata: { usuario_email: user?.email || "unknown" },
          usuario: userData?.id,
          store: storeInfo.id,
          store_email: attrs.store.email,
        },
      };
      if (storeAddress)
        payloadPedido.data['direccion_origen'] = storeAddress?.id;

      const res = await fetch(`${STRAPI}/api/pedidos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadPedido),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("cart y emojis - error creando pedido:", text);
        throw new Error("Error creando pedido");
      }

      const created = await res.json();
      const createdData = created?.data || null;
      const attributes = { ...(createdData?.attributes || {}), store: storeInfo };

      const normalized = {
        id: createdData?.id || null,
        attributes,
        pago: attributes?.pago || attributes?.pago_id || null,
        _raw: created,
      };

      console.log("cart y emojis - pedido único normalizado:", normalized);
      setPedidoCreado(normalized);

      if (normalized.id && callback) {
        callback();
      } else {
        alert("No se pudo crear el pedido. Revisa la consola.");
      }
    } catch (err) {
      console.error("cart y emojis - error en handleCrearPedidos (producto):", err);
      alert("Error creando el pedido. Revisa la consola.");
    } finally {
      setCreatingPedidos(false);
    }
  };

  const handleNextStep = () => setActiveStep(1);
  const handleNextStep2 = () => setActiveStep(2);
  const handleSaveLater = () => {
    setTimeout(() => navigate("/market"), 500);
  };

  const handlePagoSubido = useCallback((pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl = null) => {
    console.log("cart y emojis - handlePagoSubido (producto) llamado:", {
      pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl,
    });

    if (!pedidoId) {
      console.warn("cart y emojis - handlePagoSubido: pedidoId inválido, abortando");
      return;
    }

    const pedidoIdStr = String(pedidoId);

    setPedidoCreado((prev) => {
      if (!prev || String(prev.id) !== pedidoIdStr) {
        console.warn("cart y emojis - handlePagoSubido: pedidoId no coincide con pedidoCreado, se ignora");
        return prev;
      }

      const attributes = { ...(prev.attributes || {}) };

      if (pagoId) {
        attributes.pago_id = pagoId;
      }

      if (fileId) {
        attributes.comprobante = {
          data: { id: fileId, attributes: { url: fileUrl || null } },
        };
      }

      attributes.status = attributes.status || "enviar";

      const updated = {
        ...prev,
        attributes,
        pago: pagoId || prev.pago || attributes.pago,
      };

      console.log("cart y emojis - handlePagoSubido actualizando pedidoCreado:", {
        pedidoId: prev.id,
        updatedAttributes: attributes,
      }, "updated: ", updated);

      return updated;
    });
  }, []);

  const handleFinalizar = async () => {
    console.log("cart y emojis - handleFinalizar (producto) iniciado");

    if (!pedidoPagado) {
      alert("Falta el pago.");
      return;
    }

    if (!pedidoCreado?.id) {
      console.warn("cart y emojis - pedidoCreado sin id, no se puede finalizar");
      alert("No hay un pedido válido para finalizar.");
      return;
    }

    setFinalizing(true);

    try {
      console.log("cart y emojis - marcando pedido como pagado, id:", pedidoCreado.id);

      const upd = await fetch(`${STRAPI}/api/pedidos/${pedidoCreado.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            status: "pendiente_verificacion",
            fecha_pagado: new Date().toISOString(),
          },
        }),
      });

      if (!upd.ok) {
        console.error("cart y emojis - error actualizando pedido:", await upd.text());
      } else {
        console.log("cart y emojis - pedido actualizado correctamente id:", pedidoCreado.id);
      }

      if (carritoId) {
        console.log("cart y emojis - marcando carrito como pagado id:", carritoId);
        const updCar = await fetch(`${STRAPI}/api/carritos/${carritoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: { estado: "pagado" },
          }),
        });

        if (!updCar.ok) {
          console.error("cart y emojis - error actualizando carrito:", await updCar.text());
        } else {
          console.log("cart y emojis - carrito actualizado a pagado:", carritoId);
        }
      }

      setActiveStep(3);
    } catch (err) {
      console.error("cart y emojis - error en handleFinalizar (producto):", err);
      alert("Ocurrió un error al finalizar. Revisa la consola.");
    } finally {
      setFinalizing(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      try {
        const detail = e?.detail;
        if (!detail) return;
        console.log("cart y emojis - FinalizarCompraProducto evento cart:paymentUploaded recibido:", detail);
        const { pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl } = detail;
        handlePagoSubido(pedidoId, pagoId, fileId, pagoUpdateSuccess, fileUrl);
      } catch (err) {
        console.warn("cart y emojis - FinalizarCompraProducto handler error:", err);
      }
    };

    window.addEventListener("cart:paymentUploaded", handler);
    return () => window.removeEventListener("cart:paymentUploaded", handler);
  }, [handlePagoSubido]);



  const pedidoPagado = Boolean(
    pedidoCreado &&
    (
      Boolean(pedidoCreado?.pago) ||
      Boolean(pedidoCreado?.attributes?.pago) ||
      Boolean(pedidoCreado?.attributes?.pago_id) ||
      Boolean(pedidoCreado?.attributes?.pagoId)
    )
  );

  return (
    <Box sx={{ maxWidth: 980, margin: "0 auto", p: 2 }}>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Finalizar compra
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{isMobile ? '' : label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <AnimatePresence mode="wait">
        {activeStep === 0 && (
          <motion.div key="dir" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Paper sx={{ p: 2 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <GaleriaImagenesProducto
                      imagenes={todasLasImagenes}
                      nombre={nombre}
                      imagenIndex={imagenIndex}
                      setImagenIndex={setImagenIndex}
                    />
                  </motion.div>

                  <Box display="flex" gap={1} alignItems="center" mt={2}>
                    <LocalShippingIcon sx={{ color: '#6d6e71' }} />
                    <Typography variant="body2" color="text.secondary">Envío estimado:</Typography>
                    <Typography variant="subtitle2" fontWeight={700}>{envioMostrar}</Typography>
                  </Box>

                  {typeof stock === 'number' && (
                    <Box mt={1}>
                      <Chip label={stock === 0 ? 'Agotado' : `Disponibles: ${stock}`} color={stock === 0 ? 'error' : 'default'} />
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Box mb={1}>
                    <Typography variant="h5" fontWeight={900}>{precioFmt}</Typography>

                    <Box display="flex" gap={2} alignItems="center" mt={1}>
                      {marca && <Typography variant="body2" color="text.secondary">Marca: <strong>{marca}</strong></Typography>}
                    </Box>

                    <Box display="flex" alignItems="center" gap={1} mt={1}>
                      <Box display="flex" alignItems="center">
                        {estrellas.map((filled, i) => (
                          <StarIcon key={i} fontSize="small" sx={{ color: filled ? '#f7b500' : '#e6e6e6' }} />
                        ))}
                      </Box>
                      <Typography variant="body2" fontWeight={700}>
                        {avg5 != null ? Number(avg5).toFixed(1) : '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">({numCalificaciones})</Typography>
                    </Box>
                  </Box>

                  {/* DetalleProducto contiene ahora todas las acciones (agregar, favoritos, comprar) */}
                  <DetalleProducto
                    producto={producto}
                    precio={precioNum}
                    marca={marca}
                    stock={stock}
                    vendidos={vendidos}
                    localidad={localidad}
                    estado={estado}
                    cantidad={cantidad}
                    handleCantidadChange={handleCantidadChange}
                    enableActions={false}
                  />
                </Grid>
              </Grid>
            </Paper>
          </motion.div>
        )}
        {activeStep === 1 && (
          <motion.div key="dir" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Paper sx={{ p: 2 }}>
              <DireccionSelector onConfirm={handleConfirmAddress} />
            </Paper>
          </motion.div>
        )}

        {activeStep === 2 && (
          <motion.div key="pagos" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Paper sx={{ p: 2 }}>
              {/* Si no hay pedidos, mostramos mensaje */}
              {pedidoCreado == null ? (
                <Typography sx={{ mb: 2 }}>
                  Pedido no creado. Vuelve a intentar crear el pedido o consulta tus en tus compras.
                </Typography>
              ) : (
                <PagoPorTienda key={pedidoCreado.id} pedido={pedidoCreado} onPagoSubido={handlePagoSubido}  carritoId={carritoId} />
              )}
            </Paper>
          </motion.div>
        )}

        {activeStep === 3 && (
          <motion.div
            key="ok"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Paper
              sx={{
                p: { xs: 3, sm: 4 },
                borderRadius: 3,
              }}
            >
              <Stack spacing={3} alignItems="center">
                <CheckCircleRounded
                  color="success"
                  sx={{ fontSize: 70 }}
                />

                <Box textAlign="center">
                  <Typography variant="h5" fontWeight={700}>
                    ¡Comprobante enviado!
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    Tu comprobante de pago fue recibido correctamente.
                    Ahora comenzará el proceso de validación antes del envío
                    de tu pedido.
                  </Typography>
                </Box>

                <Stack
                  spacing={2}
                  sx={{
                    width: "100%",
                    mt: 1,
                  }}
                >
                  <Box display="flex" gap={2}>
                    <UploadFileRounded color="primary" />
                    <Box>
                      <Typography fontWeight={600}>
                        1. Comprobante recibido
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Tu comprobante ya fue registrado en el sistema.
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" gap={2}>
                    <VerifiedRounded color="warning" />
                    <Box>
                      <Typography fontWeight={600}>
                        2. Validación del vendedor
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        El vendedor fue notificado y verificará que el pago
                        haya sido recibido correctamente.
                      </Typography>
                    </Box>
                  </Box>

                  <Box display="flex" gap={2}>
                    <LocalShippingRounded color="success" />
                    <Box>
                      <Typography fontWeight={600}>
                        3. Preparación y envío
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Una vez confirmado el pago, tu pedido será preparado y
                        enviado. Podrás consultar su avance desde la sección
                        <strong> Mis compras</strong>.
                      </Typography>
                    </Box>
                  </Box>
                </Stack>

                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  onClick={() => navigate("/compras/pedidos")}
                >
                  Ir a Mis compras
                </Button>
              </Stack>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      <Box mt={1} display="flex" justifyContent={activeStep > 0 && activeStep < 2 ? "space-between" : "flex-end"}>
        {
          user ? (
            <>
              {
                activeStep > 0 && activeStep < 2 && (
                  <Button disabled={activeStep < 1} onClick={() => setActiveStep((s) => s - 1)}>
                    Volver
                  </Button>
                )
              }

              {activeStep === 0 && (
                <Button
                  variant="contained"
                  onClick={handleNextStep}
                >
                  Siguiente
                </Button>
              )}
              {activeStep === 1 && (
                <>
                  <Box display='flex' gap={2} justifyContent='center'>
                    <Tooltip title="Continuar con el pago del pedido">
                      <Button
                        variant="contained"
                        disabled={!selectedAddress || creatingPedidos}
                        onClick={() => handleCrearPedido(handleNextStep2)}
                      >
                        {creatingPedidos ? <CircularProgress size={18} /> : "Pagar"}
                      </Button>
                    </Tooltip>
                    <Tooltip title="Continuar con el pago del pedido más tarde">
                      <Button
                        color="secondary"
                        disabled={!selectedAddress || creatingPedidos}
                        onClick={() => handleCrearPedido(handleSaveLater)}
                      >
                        {creatingPedidos ? <CircularProgress size={18} /> : "Pagar más tarde"}
                      </Button>
                    </Tooltip>
                  </Box>
                </>
              )}
              {activeStep === 2 && (
                <Button
                  variant="contained"
                  onClick={handleFinalizar}
                  disabled={finalizing}
                >
                  {finalizing ? <CircularProgress size={18} /> : "Finalizar"}
                </Button>
              )}
            </>
          )
            : (
              <div className="carrito-login">
                <button onClick={() => loginWithRedirect()}>Iniciar sesión</button>
              </div>
            )
        }

      </Box>
    </Box>
  )
}
