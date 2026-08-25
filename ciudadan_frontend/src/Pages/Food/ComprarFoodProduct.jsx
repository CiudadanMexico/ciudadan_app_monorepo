import { Box, Button, Chip, CircularProgress, Divider, Grid, Paper, Step, StepLabel, Stepper, Typography, Tooltip, useTheme, useMediaQuery, Stack } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DireccionSelector from '../../components/MarketPlace/DireccionSelector';
import { AnimatePresence, motion } from 'framer-motion';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StarIcon from '@mui/icons-material/Star';
import GaleriaImagenesProducto from '../../components/MarketPlace/GaleriaImagenesProducto';
import productoImg from '../../assets/placeholders/producto.png';
import { useAuth0 } from "@auth0/auth0-react";
import PagoPorTienda from '../../components/MarketPlace/PagoPorTienda';
import useProductsRestaurant from '../../hooks/food/useProductsRestaurant';
import DetalleFoodProduct from '../../components/Food/DetalleFoodProduct';
import { useRoles } from '../../Contexts/RolesContext';
import PagoPedidoRestaurante from '../../components/Food/PagoPedidoRestaurante';
import { CheckCircleRounded, LocalShippingRounded, UploadFileRounded, VerifiedRounded } from '@mui/icons-material';

const STRAPI = process.env.REACT_APP_STRAPI_URL;
const steps = ["Producto", "Dirección", "Pago", "Confirmación"];

export default function ComprarFoodProduct() {
  const { slug } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { isAuthenticated, loginWithRedirect, user } = useAuth0();
  const { userData } = useRoles();
  const { getProductById, getProductBySlug, loading: loadingProduct } = useProductsRestaurant();

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

  const handleGetProduct = async ({ id, slug }) => {
    if (id) {
      const productRes = await getProductById(id);
      setProducto(productRes);
      return;
    }
    if (slug) {
      const productRes = await getProductBySlug(slug);
      setProducto(productRes);
    }
  };

  useEffect(() => {
    let mounted = true;
    handleGetProduct({ id: state?.product_id, slug })
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, state]);

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

  const precioNum = Number(attrs.precio_base) || null;
  const precioFmt = precioNum != null ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(precioNum) : 'Precio no disponible';

  const usa_stock = attrs.usa_stock;
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
      await loginWithRedirect({ appState: { returnTo: `/comida/comprar/${slug}` } });
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
      const restaurant = attrs?.food_restaurant?.data ?? {};
      const precio_unitario = precioNum ?? 0;
      const subtotal = precio_unitario * cantidad;

      // const comisionPlataforma = precotizarPlataforma(subtotal);
      // const envio = await precotizarMienvio(
      //   attrs.cp || attrs.cp_origen || "",
      //   attrs.cp_destino || selectedAddress?.cp || "11560",
      //   attrs.largo || 1,
      //   attrs.ancho || 1,
      //   attrs.alto || 1,
      //   attrs.peso || 1,
      //   cantidad
      // );
      // const comisionStripe = precotizarStripe(subtotal, envio, comisionPlataforma);
      const envio = 0;
      const comisionPlataforma = 0;
      const comisionStripe = 0;
      const total = parseFloat((subtotal + envio + comisionPlataforma + comisionStripe).toFixed(2));
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
        comisionPlataforma,
        restaurant,
        calificado: false,
        status: "pendiente",
      };

      console.log("cart y emojis - item único mapeado:", item);

      // ----------------------------
      // 2) CREAR PEDIDO (una sola tienda)
      // ----------------------------
      const payloadPedido = {
        data: {
          items: [item],
          fecha_creacion: new Date().toISOString(),
          user: userData?.id,
          monto_envio: envio,
          monto_total: total,
          status: "pendiente_pago",
          direccion_destino: selectedAddress.id,
          metadata: { usuario_email: user?.email || "unknown" },
          restaurant: restaurant?.id,
        },
      };

      const res = await fetch(`${STRAPI}/api/food-orders`, {
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
      const createdData = created?.data ?? null;
      const attributes = { ...(createdData?.attributes ?? {}), restaurant };

      const normalized = {
        id: createdData?.id ?? null,
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
    setTimeout(() => navigate("/food"), 500);
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
      });

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

      const upd = await fetch(`${STRAPI}/api/food-orders/${pedidoCreado.id}`, {
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
      {
        loadingProduct && (
          <Box display="flex" justifyContent="center" alignItems="center">
            <Typography>Cargando...</Typography>
            <CircularProgress />
          </Box>
        )
      }
      {activeStep === 0 && (
        <motion.div key="dir" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {
            producto && (
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

                    {usa_stock && typeof stock === 'number' && (
                      <Box mt={1}>
                        <Chip label={stock === 0 ? 'Agotado' : `Disponibles: ${stock}`} color={stock === 0 ? 'error' : 'default'} />
                      </Box>
                    )}
                  </Grid>

                  <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Box mb={1}>
                      <Typography variant="h5" fontWeight={900}>{nombre}</Typography>

                      <Box display="flex" gap={2} alignItems="center">
                        {marca && <Typography variant="body2" color="text.secondary">Marca: <strong>{marca}</strong></Typography>}
                      </Box>

                      <Box display="flex" alignItems="center" gap={1}>
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
                    <DetalleFoodProduct
                      producto={producto}
                      cantidad={cantidad}
                      handleCantidadChange={handleCantidadChange}
                      enableActions={false}
                    />
                  </Grid>
                </Grid>
              </Paper>
            )
          }
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
                No hay pedidos creados. Vuelve a intentar crear los pedidos.
              </Typography>
            ) : (
              <PagoPedidoRestaurante key={`pago-pedido-${pedidoCreado?.id}`} pedido={pedidoCreado} onPagoSubido={handlePagoSubido} />
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
                onClick={() => navigate("/compras/ordenes-comida")}
              >
                Ir a Mis compras
              </Button>
            </Stack>
          </Paper>
        </motion.div>
      )}

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
                    <Button
                      variant="contained"
                      disabled={!selectedAddress || creatingPedidos}
                      onClick={() => handleCrearPedido(handleNextStep2)}
                    >
                      Pagar
                    </Button>

                    <Button
                      color="secondary"
                      disabled={!selectedAddress || creatingPedidos}
                      onClick={() => handleCrearPedido(handleSaveLater)}
                    >
                      Guardar
                    </Button>
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
