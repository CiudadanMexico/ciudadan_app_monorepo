// src/components/PedidosPendientes/index.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Grid,
  Divider,
  Button,
  IconButton,
  Snackbar,
  Chip,
  Stack,
} from '@mui/material';
import productoImg from '../../assets/placeholders/producto.png';
import { useAuth0 } from '@auth0/auth0-react';
import { printGuia } from '../../utils/storeAdmin/printGuia.js';
import { useStoreAdminPedidos } from '../../hooks/storeAdmin/useStoreAdminPedidos';
import GenerarGuia from '../../components/MarketPlace/GenerarGuia.jsx';
import PrepararEnvio from '../../components/MarketPlace/PrepararEnvio.jsx';
import ChecarPagoTienda from '../../components/MarketPlace/ChecarPagoTienda.jsx';
import PrintIcon from '@mui/icons-material/Print';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SendIcon from '@mui/icons-material/Send';
import BlockIcon from '@mui/icons-material/Block';
import DoneIcon from '@mui/icons-material/Done';
import UndoIcon from '@mui/icons-material/Undo';
import PendingIcon from '@mui/icons-material/Pending';
import { useLogisticsBalance } from '../../hooks/useLogisticsBalance';
import { useNavigate, useNavigation } from 'react-router-dom';
import { esperarGuiaEnvio } from '../../services/skydropxService';

// Configuración de estados con iconos (puedes ajustar)
// Usado para mostrar un Chip similar a PedidosEntregados
const statusPedidoConfigUi = {
  pendiente_pago: { label: 'Pendiente de pago', color: 'warning', icon: <PendingIcon /> },
  pendiente_verificacion: { label: 'Pendiente de verificación', color: 'warning', icon: <PendingIcon /> },
  pendiente_envio: { label: 'Pendiente de envío', color: 'warning', icon: <SendIcon /> },
  enviado: { label: "Enviado", color: 'primary', icon: <LocalShippingIcon /> },
  encamino: { label: 'En camino', color: 'info', icon: <LocalShippingIcon /> },
  cancelado: { label: "Cancelado", color: "error", icon: <BlockIcon /> },
  recibido: { label: "Recibido", color: "success", icon: <DoneIcon /> },
  devuelto: { label: "Devuelto", color: "secondary", icon: <UndoIcon /> }
};

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

const PedidosPendientes = ({ store }) => {
  const { cargando, apiLoading, snack, setSnack, patchPedido, getPedidosPendientes, patchPago } = useStoreAdminPedidos();
  const navigate = useNavigate();
  const { getMyBalance } = useLogisticsBalance();

  // Estados para modales y acciones
  const [pedidos, setPedidos] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [selectedPagoPedido, setSelectedPagoPedido] = useState(null);
  const [openPagoModal, setOpenPagoModal] = useState(false);
  const [openGuiaModal, setOpenGuiaModal] = useState(false);
  const [openPrepararModal, setOpenPrepararModal] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const conAutenticacion = false;

  // Abrir modal de pago
  const handleOpenPago = (pedido) => {
    setSelectedPagoPedido(pedido);
    console.log("Selected pedido:", pedido);
    setOpenPagoModal(true);
  };

  // Cerrar modal de pago
  const handleClosePago = () => {
    setOpenPagoModal(false);
    setSelectedPagoPedido(null);
  };

  // Confirmar pago de pedido agregando información de contacto del remitenten
  const handleConfirmPago = async (pickupContact = {}) => {
    if (!selectedPagoPedido) return;

    const now = new Date().toISOString();
    const payload = {
      fecha_pagado: now,
      status: 'pendiente_envio',
      metadata: {
        ...(selectedPagoPedido.attributes.metadata || {}),
        payment_confirmed: true,
        payment_confirmed_at: now,
      },
      pickup_contact_information: { ...pickupContact }
    };
    await patchPedido(selectedPagoPedido.id, payload);
    if (selectedPagoPedido?.attributes?.pago_id?.data) {
      await patchPago(selectedPagoPedido?.attributes?.pago_id?.data?.id, { status: 'verificado', fecha_aprobado: now });
    }
    handleClosePago();
    handleGetPedidos(store?.id);
  };

  // Rechazar pago: marcar metadata.payment_rejected
  const handleRejectPago = async () => {
    if (!selectedPagoPedido) return;
    const now = new Date().toISOString();
    const payload = {
      metadata: {
        ...(selectedPagoPedido.attributes.metadata || {}),
        payment_rejected: true,
        payment_rejected_at: now,
      },
    };
    await patchPedido(selectedPagoPedido.id, payload);
    handleClosePago();
    handleGetPedidos(store?.id);
  };

  // Abrir modal de generación de envío
  const handleOpenGuia = (pedido) => {
    setSelectedPagoPedido(pedido);
    setOpenGuiaModal(true);
  };

  const handleCloseGuia = () => {
    setOpenGuiaModal(false);
    setSelectedPagoPedido(null);
  };

  // Abrir modal de preparación de envío (paquetes físicos reales)
  const handleOpenPreparar = (pedido) => {
    setSelectedPagoPedido(pedido);
    setOpenPrepararModal(true);
  };

  const handleClosePreparar = () => {
    setOpenPrepararModal(false);
    setSelectedPagoPedido(null);
  };

  // Callback cuando el vendedor terminó de preparar los paquetes
  const handleEnvioPreparado = () => {
    setSnack({ open: true, message: 'Envío preparado: paquetes registrados.' });
    handleGetPedidos(store?.id);
  };

  // Callback cuando el envío fue creado en Skydropx:
  // hace polling corto hasta obtener tracking y etiqueta.
  const handleShipmentCreated = async (resultado) => {
    const shipmentId = resultado?.shipment?.id;

    setSnack({ open: true, message: 'Envío creado en Skydropx. Generando guía...' });

    if (shipmentId) {
      const shipment = await esperarGuiaEnvio(shipmentId);

      if (shipment?.tracking_number) {
        setSnack({ open: true, message: `Guía generada: ${shipment.tracking_number}` });
      } else {
        setSnack({ open: true, message: 'El envío sigue en proceso. La guía aparecerá en breve.' });
      }
    }

    handleGetPedidos(store?.id);
  };

  const handlePrintGuia = (pedido) => {
    //función que abre el dialog de imprimir
    printGuia(pedido);
  };

  // Marcar como enviado -> cambia status a 'enviado' (sale de la vista)
  const handleMarcarEnviado = async (pedido) => {
    await patchPedido(pedido.id, { status: 'enviado', fecha_envio: new Date().toISOString() });
  };

  /**
   * normalizeItems:
   * Acepta cualquier forma que Strapi pueda devolver para `attributes.item`:
   * - array plano: [{ nombre, ... }]
   * - relación: { data: [{ id, attributes: {...} }] }
   * - objeto único: { data: { attributes: {...} } } o { attributes: {...} }
   * - string JSON (intenta parsear)
   */
  const normalizeItems = (raw) => {
    if (raw === null || raw === undefined) return [];

    // Ya es array (puede contener items planos o con .attributes)
    if (Array.isArray(raw)) {
      return raw.map(i => (i && i.attributes ? i.attributes : i));
    }

    // Relación: raw.data = [...]
    if (Array.isArray(raw?.data)) {
      return raw.data.map(d => (d && d.attributes ? d.attributes : d));
    }

    // Único con data.attributes
    if (raw?.data?.attributes) {
      return [raw.data.attributes];
    }

    // Único con attributes
    if (raw?.attributes) {
      return [raw.attributes];
    }

    // String JSON
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return normalizeItems(parsed);
      } catch {
        return [];
      }
    }

    // Objeto plano -> retornarlo como item único
    if (typeof raw === 'object') {
      return [raw];
    }

    return [];
  };

  /**
   * renderItems:
   * Presentación de los items de un pedido usando el mismo estilo visual que PedidosEntregados:
   * - Card por producto
   * - Grid con columnas: Artículo / Cant. / Precio / Total / Envío
   *
   * Soporta item plano o con .attributes y diferentes formas de imagen_predeterminada.
   */
  const renderItems = (itemList = []) => {
    // Aseguramos que itemList esté normalizado (si el caller nos pasó ya objetos planos, entonces no cambia)
    const normalized = normalizeItems(itemList);

    return normalized.map((item, idx) => {
      const {
        nombre,
        precio_unitario,
        cantidad,
        subtotal,
        envio,
        total,
        producto,
      } = item || {};

      // Soporta varios formatos de imagen_predeterminada
      let imgUrl = productoImg;
      const imgPath = producto?.data?.attributes?.imagen_predeterminada?.data[0]?.attributes?.url // por si es string o ruta

      if (imgPath) {
        imgUrl = imgPath.toString().startsWith('http') ? imgPath : `${STRAPI_URL}${imgPath}`;
      }

      const precioFormatted = (typeof precio_unitario === 'number')
        ? precio_unitario.toFixed(2)
        : precio_unitario ? Number(precio_unitario).toFixed(2) : '-';

      const totalFormatted = (typeof total === 'number')
        ? total.toFixed(2)
        : total ? Number(total).toFixed(2) : '-';

      return (
        <Card key={idx} sx={{ display: 'flex', borderRadius: 2, boxShadow: 2, mb: 2 }}>
          <CardMedia
            component="img"
            image={imgUrl}
            alt={nombre || 'Producto'}
            sx={{ width: 140, height: 140, objectFit: 'cover' }}
          />
          <CardContent sx={{ flex: 1 }}>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2"><strong>Artículo:</strong> {nombre || '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography variant="body2"><strong>Cant.:</strong> {cantidad ?? '-'}</Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography variant="body2"><strong>Precio:</strong> ${precioFormatted}</Typography>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Typography variant="body2"><strong>Total:</strong> ${totalFormatted}</Typography>
              </Grid>
              {/* <Grid item xs={6} sm={3} md={3}>
                <Typography variant="body2"><strong>Envío:</strong> ${envio ? Number(envio).toFixed(2) : '-'}</Typography>
              </Grid> */}
            </Grid>
          </CardContent>
        </Card>
      );
    });
  };

  const handleGetPedidos = async (store_id) => {
    const { data, meta } = await getPedidosPendientes(store_id);
    setPedidos(data);
    setPagination(meta?.pagination);
  };

  const handleRechargeCredits = () => {
    const storeSlug = store?.attributes?.slug ?? store?.slug ?? null;
    if (!storeSlug) return;
    navigate(`/market/store/${storeSlug}/saldo-logistico`);
  };

  const cargarBalance = useCallback(async () => {
    try {
      const balanceData = await getMyBalance();
      setBalanceData(balanceData);
    } catch (error) {
      console.error("Error al cargar saldo logístico:", error);
    }
  }, [getMyBalance]);

  useEffect(() => {
    cargarBalance();
  }, [cargarBalance]);

  useEffect(() => {
    if (store?.id)
      handleGetPedidos(store?.id);
  }, [store?.id]);

  // Separar pedidos por estado para la UI (mantenemos tu comparación exacta)
  const pedidosEnCamino = [];

  // Loading UI
  if (cargando) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!store) {
    return (
      <Box display="flex" justifyContent="center" m={3}>
        <Typography color="text.secondary">No tienes una tienda asociada o no hay pedidos para mostrar.</Typography>
      </Box>
    )
  }

  const saldoDisponible = balanceData?.balance?.availableBalance ?? 0;
  // Render principal
  return (
    <Box width="100%" p={0} m={0}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Pedidos pendientes
      </Typography>

      {/* Pedidos con status 'enviar' (requieren checar pago) */}
      {pedidos.length === 0 ? (
        <Typography mt={2}>No hay pedidos pendientes.</Typography>
      ) : pedidos.map(({ id, attributes }) => {
        // ahora usamos normalizeItems para obtener items en cualquier forma
        const itemList = normalizeItems(attributes.item);
        const pago = attributes.pago?.data?.attributes || null;
        const guiaExiste = Boolean(attributes.skydropx_tracking_number);
        const cfg = statusPedidoConfigUi[attributes.status];
        return (
          <Box key={id} mb={4}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h5" fontWeight="bold">Pedido #{id}</Typography>
                {/* Chip con estado similar a PedidosEntregados */}
                {cfg && <Chip icon={cfg.icon} label={cfg.label} color={cfg.color} size="small" />}
              </Box>

              <Box>
                <IconButton size="small" onClick={() => handlePrintGuia({ id, attributes })} disabled={!guiaExiste}>
                  <PrintIcon />
                </IconButton>
              </Box>
            </Box>

            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              Creado: {attributes.timestamp_creacion ? new Date(attributes.timestamp_creacion).toLocaleString() : '—'}
            </Typography>

            <Box display="flex" alignItems="center" gap={3}>
              <Typography variant="body2"><strong>Productos:</strong> ${attributes?.monto_subtotal ? Number(attributes?.monto_subtotal).toFixed(2) : '-'}</Typography>
              <Typography variant="body2"><strong>Envío:</strong> ${attributes?.monto_envio ? Number(attributes?.monto_envio).toFixed(2) : '-'}</Typography>
              <Typography variant="body2"><strong>Total:</strong> ${attributes?.monto_total ? Number(attributes?.monto_total).toFixed(2) : '-'}</Typography>
            </Box>

            {/* Vista de seguimiento del envío */}
            {(attributes.skydropx_shipment_id || attributes.skydropx_tracking_number) && (
              <Box
                sx={{
                  mt: 1,
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <LocalShippingIcon color="action" fontSize="small" />
                  <Typography variant="body2" fontWeight={600}>
                    {attributes.proveedor ?? attributes.skydropx_rate?.provider_display_name ?? 'Paquetería'}
                  </Typography>
                </Box>

                {attributes.skydropx_tracking_number && (
                  <Typography variant="body2">
                    <strong>Guía:</strong> {attributes.skydropx_tracking_number}
                  </Typography>
                )}

                {attributes.skydropx_status && (
                  <Chip
                    size="small"
                    color="info"
                    variant="outlined"
                    label={`Estado envío: ${attributes.skydropx_status}`}
                  />
                )}

                {attributes.skydropx_label_url && (
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<PrintIcon />}
                    onClick={() => window.open(attributes.skydropx_label_url, '_blank', 'noopener,noreferrer')}
                  >
                    Ver etiqueta
                  </Button>
                )}
              </Box>
            )}

            {/* Envío preparado: paquetes físicos registrados por el vendedor */}
            {attributes.shipment?.data && (
              <Box
                sx={{
                  mt: 1,
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" fontWeight={600} mb={0.5}>
                  Envío preparado ({attributes.shipment.data.attributes?.packages?.data?.length ?? 0} paquete(s))
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {(attributes.shipment.data.attributes?.packages?.data ?? []).map((pkg) => (
                    <Chip
                      key={pkg.id}
                      size="small"
                      variant="outlined"
                      label={`#${pkg.attributes?.package_number}: ${pkg.attributes?.length}×${pkg.attributes?.width}×${pkg.attributes?.height} cm, ${pkg.attributes?.weight} kg`}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Envío creado en Skydropx: master tracking + paquetes con tracking/label individual */}
            {attributes.shipment?.data?.attributes?.provider_shipment_id && (() => {
              const shipmentAttrs = attributes.shipment.data.attributes;
              const shipmentPackages = shipmentAttrs?.packages?.data ?? [];
              return (
                <Box
                  sx={{
                    mt: 1,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={1}>
                    <LocalShippingIcon color="action" fontSize="small" />
                    <Typography variant="body2" fontWeight={600}>
                      {shipmentAttrs?.carrier_name ?? attributes.proveedor ?? 'Paquetería'}
                    </Typography>
                    {shipmentAttrs?.master_tracking_number && (
                      <Typography variant="body2">
                        <strong>Master tracking:</strong> {shipmentAttrs.master_tracking_number}
                      </Typography>
                    )}
                    {shipmentAttrs?.status && (
                      <Chip size="small" color="info" variant="outlined" label={`Envío: ${shipmentAttrs.status}`} />
                    )}
                  </Box>

                  {shipmentPackages.map((pkg) => (
                    <Box
                      key={pkg.id}
                      sx={{
                        mt: 1,
                        p: 1,
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 1,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        Paquete {pkg.attributes?.package_number}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pkg.attributes?.length}×{pkg.attributes?.width}×{pkg.attributes?.height} cm · {pkg.attributes?.weight} kg
                      </Typography>
                      {pkg.attributes?.tracking_number && (
                        <Typography variant="body2">
                          <strong>Tracking:</strong> {pkg.attributes.tracking_number}
                        </Typography>
                      )}
                      {pkg.attributes?.status && (
                        <Chip size="small" variant="outlined" label={pkg.attributes.status} />
                      )}
                      {pkg.attributes?.label_url && (
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<PrintIcon />}
                          onClick={() => window.open(pkg.attributes.label_url, '_blank', 'noopener,noreferrer')}
                        >
                          Etiqueta
                        </Button>
                      )}
                      {pkg.attributes?.tracking_url && (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => window.open(pkg.attributes.tracking_url, '_blank', 'noopener,noreferrer')}
                        >
                          Seguimiento
                        </Button>
                      )}
                    </Box>
                  ))}
                </Box>
              );
            })()}

            {/* Items renderizados con el estilo de PedidosEntregados */}
            {itemList.length === 0 ? (
              <Typography color="text.secondary">No hay artículos en este pedido.</Typography>
            ) : (
              <>
                <Typography color="text.secondary">Productos:</Typography>
                {renderItems(itemList)}
              </>
            )}

            {/* Acciones del pedido */}
            <Box display="flex" gap={1} mt={2}>
              {attributes?.status === "pendiente_verificacion" && (
                <Button
                  variant="contained"
                  onClick={() => handleOpenPago({ id, attributes })}
                >
                  Verificar pago
                </Button>
              )}

              {attributes.status === "pendiente_envio" && !attributes.shipment?.data && !attributes.skydropx_shipment_id && (
                <Button
                  variant="contained"
                  color="secondary"
                  disabled={apiLoading}
                  startIcon={<LocalShippingIcon />}
                  onClick={() => handleOpenPreparar({ id, attributes })}
                >
                  Preparar envío
                </Button>
              )}
              {attributes.status === "pendiente_envio" && !attributes.shipment?.data?.attributes?.provider_shipment_id && saldoDisponible > (attributes?.monto_envio ?? 0) && (
                <Button
                  variant="contained"
                  disabled={apiLoading}
                  startIcon={<LocalShippingIcon />}
                  onClick={() => handleOpenGuia({ id, attributes })}
                >
                  Generar envío
                </Button>
              )}
              {
                attributes.status === "pendiente_envio" && saldoDisponible < (attributes?.monto_envio ?? 0) && (
                  <Box>
                    <Typography color='text.secondary'>Créditos insuficientes para envío</Typography>
                    <Button
                      variant="contained"
                      disabled={apiLoading}
                      startIcon={<LocalShippingIcon />}
                      onClick={handleRechargeCredits}
                    >
                      Recargar
                    </Button>
                  </Box>
                )
              }
              {attributes.skydropx_tracking_number && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<PrintIcon />}
                    disabled={!attributes.skydropx_label_url}
                    onClick={() => window.open(attributes.skydropx_label_url, '_blank', 'noopener,noreferrer')}
                  >
                    Imprimir guía
                  </Button>

                  <Box>
                    <Typography variant="caption" display="block">
                      Rastreo: {attributes.skydropx_tracking_number}
                    </Typography>
                    {attributes.skydropx_status && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Skydropx: ${attributes.skydropx_status}`}
                      />
                    )}
                  </Box>
                </>
              )}
              {/* {!guiaExiste ? (
                <Button variant="outlined" onClick={() => handleOpenGuia({ id, attributes })}>Generar guía</Button>
              ) : (
                <>
                  <Button variant="outlined" onClick={() => handlePrintGuia({ id, attributes })} startIcon={<PrintIcon />}>
                    Imprimir guía
                  </Button>
                  <Button variant="contained" onClick={() => handleMarcarEnviado({ id, attributes })}>Marcar como enviado</Button>
                </>
              )} */}
            </Box>

            {attributes.guia && (
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Guía: {attributes.guia}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />
          </Box>
        );
      })}

      {/* Pedidos 'encamino' */}
      {pedidosEnCamino.length > 0 && (
        <>
          <Typography variant="h4" fontWeight="bold" gutterBottom mt={4}>
            Pedidos en camino
          </Typography>

          {pedidosEnCamino.map(({ id, attributes }) => {
            const itemList = normalizeItems(attributes.item);
            const guiaExiste = Boolean(attributes.guia);
            const cfg = statusPedidoConfigUi[attributes.status];
            return (
              <Box key={id} mb={4}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {cfg && <Chip icon={cfg.icon} label={cfg.label} color={cfg.color} size="small" />}
                    <Typography variant="h5" fontWeight="bold">Pedido #{id}</Typography>
                  </Box>
                </Box>

                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                  Creado: {attributes.timestamp_creacion ? new Date(attributes.timestamp_creacion).toLocaleString() : '—'}
                </Typography>

                {itemList.length === 0 ? (
                  <Typography color="text.secondary">No hay artículos en este pedido.</Typography>
                ) : (
                  renderItems(itemList)
                )}

                <Box display="flex" gap={1} mt={2}>
                  {guiaExiste && (
                    <Button variant="outlined" onClick={() => handlePrintGuia({ id, attributes })} startIcon={<PrintIcon />}>
                      Imprimir guía
                    </Button>
                  )}
                  <Button variant="contained" onClick={() => handleMarcarEnviado({ id, attributes })}>Marcar como enviado</Button>
                </Box>

                {attributes.guia && (
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    Guía: {attributes.guia}
                  </Typography>
                )}

                <Divider sx={{ my: 2 }} />
              </Box>
            );
          })}
        </>
      )}

      {/* Modal: Checar pago */}
      <ChecarPagoTienda
        openPagoModal={openPagoModal}
        handleConfirmPago={handleConfirmPago}
        handleClosePago={handleClosePago}
        selectedPagoPedido={selectedPagoPedido}
        handleRejectPago={handleRejectPago}
        apiLoading={apiLoading}
      />

      {/* Modal: Generar envío en Skydropx */}
      <GenerarGuia
        openGuiaModal={openGuiaModal}
        handleCloseGuia={handleCloseGuia}
        selectedPagoPedido={selectedPagoPedido}
        onShipmentCreated={handleShipmentCreated}
      />

      {/* Modal: Preparar envío (paquetes físicos reales) */}
      <PrepararEnvio
        open={openPrepararModal}
        handleClose={handleClosePreparar}
        selectedPagoPedido={selectedPagoPedido}
        onEnvioPreparado={handleEnvioPreparado}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        message={snack.message}
      />
    </Box>
  );
};

export default PedidosPendientes;
