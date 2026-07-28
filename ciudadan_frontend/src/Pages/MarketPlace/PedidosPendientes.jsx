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
} from '@mui/material';
import productoImg from '../../assets/placeholders/producto.png';
import { useAuth0 } from '@auth0/auth0-react';
import { printGuia } from '../../utils/storeAdmin/printGuia.js';
import { useStoreAdminPedidos } from '../../hooks/storeAdmin/useStoreAdminPedidos';
import GenerarGuia from '../../components/MarketPlace/GenerarGuia.jsx';
import ChecarPagoTienda from '../../components/MarketPlace/ChecarPagoTienda.jsx';
import PrintIcon from '@mui/icons-material/Print';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SendIcon from '@mui/icons-material/Send';

// Configuración de estados con iconos (puedes ajustar)
// Usado para mostrar un Chip similar a PedidosEntregados
const statusPedidoConfigUi = {
  enviar:   { label: 'Por enviar', color: 'warning', icon: <SendIcon /> },
  encamino: { label: 'En camino', color: 'info',    icon: <LocalShippingIcon /> },
};

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:1337';

const PedidosPendientes = () => {
  
  // Auth & datos
  const { user, getAccessTokenSilently, isAuthenticated } = useAuth0();
  //const [cargando, setCargando] = useState(true);
  
  const buildHeaders = useCallback(async () => {
    const headers = { 'Content-Type': 'application/json' };
    try {
      if (conAutenticacion === true && isAuthenticated && typeof getAccessTokenSilently === 'function') {
        const token = await getAccessTokenSilently();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      // Si no se pudo obtener token, continuamos sin Authorization.
      // No usamos console.* para respetar tu petición.
    }
    return headers;
  }, [getAccessTokenSilently, isAuthenticated]);
  
  const {
  pedidos,
  store,
  cargando,
  apiLoading,
  snack,
  setSnack,
  patchPedido,
} = useStoreAdminPedidos(user, buildHeaders);

  
  
  
  // Lista de pedidos (estructura: [{ id, attributes: { ... } }, ...])
  //const [pedidos, setPedidos] = useState([]);
  // Loading principal
  
  // Store asociada al usuario
  //const [store, setStore] = useState(null);

  // Estados para modales y acciones
  const [selectedPagoPedido, setSelectedPagoPedido] = useState(null);
  const [openPagoModal, setOpenPagoModal] = useState(false);
  const [openGuiaModal, setOpenGuiaModal] = useState(false);
  const [guiaDraft, setGuiaDraft] = useState({ proveedor: '', guia: '' });
  //const [apiLoading, setApiLoading] = useState(false);
  //const [snack, setSnack] = useState({ open: false, message: '' });

  // Toggle para usar autenticación en headers (dejado para compatibilidad)
  const conAutenticacion = false;

  /**
   * buildHeaders:
   * Construye headers para las peticiones; intenta obtener token si corresponde.
   * Nota: la lógica original construye headers pero no los inyecta sistemáticamente
   * en todas las llamadas fetch; se mantiene ese comportamiento para que todo quede intacto.
   */
  

  /**
   * useEffect principal:
   * 1) Buscar la store asociada al user.email
   * 2) Si existe, buscar pedidos con status 'enviar' o 'encamino' y poblar state
   *
   * Se han eliminado los console.logs solicitados y se añadieron comentarios explicativos.
   */


  /**
   * patchPedido:
   * Helper para actualizar un pedido en Strapi usando PUT (mantengo PUT como en el original).
   * Actualiza el state local para remover el pedido (si cambió a enviado) y muestra snack.
   */

  // Abrir modal de pago
  const handleOpenPago = (pedido) => {
    setSelectedPagoPedido(pedido);
    setOpenPagoModal(true);
  };
  // Cerrar modal de pago
  const handleClosePago = () => {
    setOpenPagoModal(false);
    setSelectedPagoPedido(null);
  };

  // Confirmar pago -> set fecha_pagado y metadata.payment_confirmed
  const handleConfirmPago = async () => {
    if (!selectedPagoPedido) return;
    const now = new Date().toISOString();
    const payload = {
      fecha_pagado: now,
      metadata: {
        ...(selectedPagoPedido.attributes.metadata || {}),
        payment_confirmed: true,
        payment_confirmed_at: now,
      },
    };
    await patchPedido(selectedPagoPedido.id, payload);
    handleClosePago();
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
  };

  // Abrir modal de guía (se edita o se crea)
  const handleOpenGuia = (pedido) => {
    const guiaActual = pedido.attributes.guia || '';
    const proveedorActual = pedido.attributes.proveedor || '';
    setGuiaDraft({ proveedor: proveedorActual, guia: guiaActual });
    setSelectedPagoPedido(pedido);
    setOpenGuiaModal(true);
  };
  const handleCloseGuia = () => {
    setOpenGuiaModal(false);
    setSelectedPagoPedido(null);
    setGuiaDraft({ proveedor: '', guia: '' });
  };

  // Generar mock de guía si el usuario no provee una
  const generateMockGuia = () => {
    const ts = Date.now();
    return `G-${guiaDraft.proveedor?.slice(0,3).toUpperCase() || 'XX'}-${ts}`;
  };

  // Guardar guía (no cambia status por diseño)
  const handleGenerateAndSaveGuia = async () => {
    if (!selectedPagoPedido) return;
    const guiaToSave = guiaDraft.guia?.trim() || generateMockGuia();
    const payload = {
      guia: guiaToSave,
      proveedor: guiaDraft.proveedor || null,
      metadata: {
        ...(selectedPagoPedido.attributes.metadata || {}),
        guia_generated_at: new Date().toISOString(),
      },
    };
    await patchPedido(selectedPagoPedido.id, payload);
    handleCloseGuia();
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
        imagen_predeterminada,
      } = item || {};

      // Soporta varios formatos de imagen_predeterminada
      let imgUrl = productoImg;
      const imgPath =
        imagen_predeterminada?.data?.attributes?.url
        || imagen_predeterminada?.attributes?.url
        || imagen_predeterminada?.url
        || imagen_predeterminada; // por si es string o ruta

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
              <Grid item xs={6} sm={3} md={3}>
                <Typography variant="body2"><strong>Envío:</strong> ${envio ? Number(envio).toFixed(2) : '-'}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    });
  };

  // Separar pedidos por estado para la UI (mantenemos tu comparación exacta)
  const pedidosEnviar = pedidos.filter(({ attributes }) => attributes.status === 'enviar');
  const pedidosEnCamino = pedidos.filter(({ attributes }) => attributes.status === 'encamino');

  // Loading UI
  if (cargando) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Render principal
  return (
    <Box width="100%" p={0} m={0}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Pedidos pendientes
      </Typography>

      {!store && (
        <Typography color="text.secondary">No tienes una tienda asociada o no hay pedidos para mostrar.</Typography>
      )}

      {/* Pedidos con status 'enviar' (requieren checar pago) */}
      {pedidosEnviar.length === 0 ? (
        <Typography mt={2}>No hay pedidos por revisar (enviar).</Typography>
      ) : pedidosEnviar.map(({ id, attributes }) => {
        // ahora usamos normalizeItems para obtener items en cualquier forma
        const itemList = normalizeItems(attributes.item);
        const pago = attributes.pago?.data?.attributes || null;
        const guiaExiste = Boolean(attributes.guia);
        const cfg = statusPedidoConfigUi[attributes.status];
        return (
          <Box key={id} mb={4}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                {/* Chip con estado similar a PedidosEntregados */}
                {cfg && <Chip icon={cfg.icon} label={cfg.label} color={cfg.color} size="small" />}
                <Typography variant="h5" fontWeight="bold">Pedido #{id}</Typography>
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

            {/* Items renderizados con el estilo de PedidosEntregados */}
            {itemList.length === 0 ? (
              <Typography color="text.secondary">No hay artículos en este pedido.</Typography>
            ) : (
              renderItems(itemList)
            )}

            {/* Acciones del pedido */}
            <Box display="flex" gap={1} mt={2}>
              <Button variant="contained" onClick={() => handleOpenPago({ id, attributes })}>Checar pago</Button>

              {!guiaExiste ? (
                <Button variant="outlined" onClick={() => handleOpenGuia({ id, attributes })}>Generar guía</Button>
              ) : (
                <>
                  <Button variant="outlined" onClick={() => handlePrintGuia({ id, attributes })} startIcon={<PrintIcon />}>
                    Imprimir guía
                  </Button>
                  <Button variant="contained" onClick={() => handleMarcarEnviado({ id, attributes })}>Marcar como enviado</Button>
                </>
              )}
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

      {/* Modal: Generar guía (maqueta) */}
      <GenerarGuia
        openGuiaModal={openGuiaModal}
        handleCloseGuia={handleCloseGuia}
        handleGenerateAndSaveGuia={handleGenerateAndSaveGuia}
        guiaDraft={guiaDraft}
        setGuiaDraft={setGuiaDraft}
        apiLoading={apiLoading}
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
