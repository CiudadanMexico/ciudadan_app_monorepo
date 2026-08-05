import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Chip,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Divider,
  List,
  Paper,
  ListItem,
  ListItemText,
  Button,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import { useParams } from 'react-router-dom';

// URL Backend
const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

// -------------------- Helpers --------------------

const ESTADO_PRIORIDAD = { pendiente_verificacion: 0, verificado: 1 };

const ESTADO_LABEL = { pendiente_verificacion: 'Sin acreditar', verificado: 'Acreditado' };

const ESTADO_COLOR = { pendiente_verificacion: 'warning', verificado: 'success' };

const buildFileUrl = (url = '') => {
  if (!url) return null;
  return url.startsWith('http') ? url : `${STRAPI_URL}${url}`;
};

const esImagen = (mime = '', ext = '') => mime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);

const esPdf = (mime = '', ext = '') => mime === 'application/pdf' || ext === '.pdf';

const PagosTienda = ({ storeId }) => {
  const { slug } = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  //Filtros
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'pendiente_verificacion' | 'verificado' | 'todos'
  const [filtroPeriodo, setFiltroPeriodo] = useState('todo'); // 'semana' | 'mes' | 'todo'

  // Modal comprobante
  const [comprobanteModal, setComprobanteModal] = useState({ open: false, file: null });

  // Modal pedido
  const [pedidoModal, setPedidoModal] = useState({ open: false, pedidoId: null });
  const [pedidoDetalle, setPedidoDetalle] = useState(null);
  const [cargandoPedido, setCargandoPedido] = useState(false);
  const [pedidoCache, setPedidoCache] = useState({});

  const handleFetchPagos = async (store_id) => {
    setCargando(true);
    try {
      const url = `${STRAPI_URL}/api/pagos?populate=*&filters[store][id][$eq]=${store_id}&sort=fecha_pagado:desc`;
      const res = await fetch(url);
      const { data } = await res.json();
      setPagos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Error cargando pagos:', err);
      setPagos([]);
    } finally {
      setCargando(false);
    }
  };

  //; -------------------- Fetch de pagos --------------------
  useEffect(() => {
    if (!storeId) return;
    handleFetchPagos(storeId);
  }, [storeId]);

  // -------------------- Filtro + orden --------------------
  const pagosFiltrados = useMemo(() => {
    const ahora = new Date();
    const hace7 = new Date();
    hace7.setDate(ahora.getDate() - 7);
    const hace30 = new Date();
    hace30.setDate(ahora.getDate() - 30);

    const filtrados = pagos.filter((p) => {
      const a = p.attributes || {};

      // Filtro por estado
      if (filtroEstado !== 'todos' && a.status !== filtroEstado) return false;

      // Filtro por periodo (sobre fecha_pagado)
      if (filtroPeriodo !== 'todo') {
        if (!a.fecha_pagado) return false;
        const fechaPago = new Date(a.fecha_pagado);
        if (filtroPeriodo === 'semana' && fechaPago < hace7) return false;
        if (filtroPeriodo === 'mes' && fechaPago < hace30) return false;
      }

      return true;
    });

    // Orden: primero sin acreditar, luego acreditados; dentro de cada grupo, más reciente primero
    return [...filtrados].sort((a, b) => {
      const pa = ESTADO_PRIORIDAD[a?.attributes?.status] ?? 99;
      const pb = ESTADO_PRIORIDAD[b?.attributes?.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b?.attributes?.fecha_pagado || 0) - new Date(a?.attributes?.fecha_pagado || 0);
    });
  }, [pagos, filtroEstado, filtroPeriodo]);

  // -------------------- Modal comprobante --------------------
  const abrirComprobante = useCallback((comprobanteData) => {
    if (!comprobanteData) return;
    const attrs = comprobanteData.attributes || comprobanteData;
    setComprobanteModal({
      open: true,
      file: {
        url: buildFileUrl(attrs.url),
        mime: attrs.mime || '',
        ext: attrs.ext || '',
        name: attrs.name || 'comprobante',
      },
    });
  }, []);

  const cerrarComprobante = () => setComprobanteModal({ open: false, file: null });

  // -------------------- Modal pedido --------------------
  const abrirPedido = useCallback(
    async (pedidoId) => {
      if (!pedidoId) return;
      setPedidoModal({ open: true, pedidoId });

      // Si ya está en caché, la usamos directamente
      if (pedidoCache[pedidoId]) {
        setPedidoDetalle(pedidoCache[pedidoId]);
        return;
      }

      setCargandoPedido(true);
      setPedidoDetalle(null);
      try {
        const url = `${STRAPI_URL}/api/pedidos/${pedidoId}?populate=item`;
        const res = await fetch(url);
        const json = await res.json();
        const data = json?.data || null;
        setPedidoDetalle(data);
        setPedidoCache((prev) => ({ ...prev, [pedidoId]: data }));
      } catch (err) {
        console.error('❌ Error cargando detalle de pedido:', err);
        setPedidoDetalle(null);
      } finally {
        setCargandoPedido(false);
      }
    },
    [pedidoCache]
  );

  const cerrarPedido = () => {
    setPedidoModal({ open: false, pedidoId: null });
    setPedidoDetalle(null);
  };

  // -------------------- Render --------------------

  if (cargando) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box width="100%" p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Historial de pagos
      </Typography>

      <Box mb={3} display="flex" alignItems="center" gap={1} flexWrap="wrap">
        <FormControl sx={{ minWidth: 120 }} size="small">
          <InputLabel id="filtro-estado-label">Estado</InputLabel>
          <Select
            labelId="filtro-estado-label"
            value={filtroEstado}
            label="Estado"
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <MenuItem value="todos">Todos</MenuItem>
            <MenuItem value="pendiente_verificacion">Sin acreditar</MenuItem>
            <MenuItem value="verificado">Acreditados</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 130 }} size="small">
          <InputLabel id="filtro-periodo-label">Periodo</InputLabel>
          <Select
            labelId="filtro-periodo-label"
            value={filtroPeriodo}
            label="Periodo"
            onChange={(e) => setFiltroPeriodo(e.target.value)}
          >
            <MenuItem value="todo">Todo</MenuItem>
            <MenuItem value="semana">Última semana</MenuItem>
            <MenuItem value="mes">Último mes</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {
        pagosFiltrados.length === 0 ? (
          <Typography>No se encontraron pagos con los filtros seleccionados.</Typography>
        ) : isMobile ? (
          <Stack spacing={2}>
            {
              pagosFiltrados.map((p) => {
                const a = p.attributes || {};

                const fecha = a.fecha_pagado ? new Date(a.fecha_pagado).toLocaleDateString() : "-";

                const usuarioAttrs = a.usuario?.data?.attributes;
                const usuarioLabel = usuarioAttrs?.username ?? usuarioAttrs?.email ?? a?.usuario_email ?? "—";
                const comprobanteData = a.comprobante?.data;
                const comprobanteAttrs = comprobanteData?.attributes || {};

                const esImg = esImagen(comprobanteAttrs.mime, comprobanteAttrs.ext);
                const esDoc = esPdf(comprobanteAttrs.mime, comprobanteAttrs.ext);

                const pedidoId = a.pedido?.data?.id;

                return (
                  <Card key={p.id}>
                    <CardContent>

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="subtitle2">
                          {fecha}
                        </Typography>

                        <Chip
                          size="small"
                          label={ESTADO_LABEL[a.status] || a.status}
                          color={ESTADO_COLOR[a.status] || "default"}
                        />
                      </Stack>

                      <Typography mt={1}>
                        <strong>Usuario:</strong> {usuarioLabel}
                      </Typography>

                      <Typography>
                        <strong>Monto:</strong> $
                        {a.monto?.toFixed(2) ?? "-"}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={1}
                        mt={2}
                      >
                        {comprobanteData && (
                          <Button
                            size="small"
                            startIcon={
                              esImg ? (
                                <ImageIcon />
                              ) : esDoc ? (
                                <PictureAsPdfIcon />
                              ) : (
                                <InsertDriveFileIcon />
                              )
                            }
                            onClick={() => abrirComprobante(comprobanteData)}
                          >
                            Comprobante
                          </Button>
                        )}

                        {pedidoId && (
                          <Button
                            size="small"
                            startIcon={<ReceiptLongIcon />}
                            onClick={() => abrirPedido(pedidoId)}
                          >
                            Pedido
                          </Button>
                        )}
                      </Stack>

                    </CardContent>
                  </Card>
                );
              })}
          </Stack>
        ) : (
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Fecha pago</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell align="right">Monto ($)</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="center">Comprobante</TableCell>
                <TableCell align="center">Pedido</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagosFiltrados.map((p) => {
                const a = p.attributes || {};
                const fecha = a.fecha_pagado ? new Date(a.fecha_pagado).toLocaleDateString() : '-';

                const usuarioAttrs = a.usuario?.data?.attributes;
                const usuarioLabel =
                  usuarioAttrs?.username || usuarioAttrs?.email || a.usuario_email || '—';

                const comprobanteData = a.comprobante?.data;
                const comprobanteAttrs = comprobanteData?.attributes || {};
                const esImg = esImagen(comprobanteAttrs.mime, comprobanteAttrs.ext);
                const esDoc = esPdf(comprobanteAttrs.mime, comprobanteAttrs.ext);

                const pedidoId = a.pedido?.data?.id;

                return (
                  <TableRow key={p.id} hover>
                    <TableCell>{fecha}</TableCell>
                    <TableCell>{usuarioLabel}</TableCell>
                    <TableCell align="right">{a.monto != null ? a.monto.toFixed(2) : '-'}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={ESTADO_LABEL[a.status] || a.status || 'Desconocido'}
                        color={ESTADO_COLOR[a.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {comprobanteData ? (
                        <Tooltip title="Ver comprobante">
                          <IconButton size="small" onClick={() => abrirComprobante(comprobanteData)}>
                            {esImg ? (
                              <ImageIcon color="primary" />
                            ) : esDoc ? (
                              <PictureAsPdfIcon color="error" />
                            ) : (
                              <InsertDriveFileIcon color="action" />
                            )}
                          </IconButton>
                        </Tooltip>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {pedidoId ? (
                        <Tooltip title="Ver detalle del pedido">
                          <IconButton size="small" onClick={() => abrirPedido(pedidoId)}>
                            <ReceiptLongIcon color="action" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )
      }

      {/* ---------------- Modal Comprobante ---------------- */}
      <Dialog open={comprobanteModal.open} onClose={cerrarComprobante} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Comprobante
          <IconButton onClick={cerrarComprobante} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {comprobanteModal.file && (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              {esImagen(comprobanteModal.file.mime, comprobanteModal.file.ext) ? (
                <Box
                  component="img"
                  src={comprobanteModal.file.url}
                  alt={comprobanteModal.file.name}
                  sx={{ maxWidth: '100%', maxHeight: 480, borderRadius: 1 }}
                />
              ) : esPdf(comprobanteModal.file.mime, comprobanteModal.file.ext) ? (
                <Box
                  component="iframe"
                  src={comprobanteModal.file.url}
                  title={comprobanteModal.file.name}
                  sx={{ width: '100%', height: 480, border: 'none' }}
                />
              ) : (
                <Box textAlign="center" py={4}>
                  <InsertDriveFileIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
                  <Typography sx={{ mt: 1 }}>{comprobanteModal.file.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vista previa no disponible para este tipo de archivo.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {comprobanteModal.file && (
            <Button
              startIcon={<DownloadIcon />}
              href={comprobanteModal.file.url}
              target="_blank"
              rel="noreferrer"
            >
              Descargar / Abrir
            </Button>
          )}
          <Button onClick={cerrarComprobante}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- Modal Pedido ---------------- */}
      <Dialog open={pedidoModal.open} onClose={cerrarPedido} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Detalle del pedido
          <IconButton onClick={cerrarPedido} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {cargandoPedido && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={28} />
            </Box>
          )}

          {!cargandoPedido && !pedidoDetalle && (
            <Typography color="text.secondary">No se pudo cargar el pedido.</Typography>
          )}

          {!cargandoPedido && pedidoDetalle && (
            <Box>
              <Stack direction="row" justifyContent="space-between" flexWrap="wrap" mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Pedido #{pedidoDetalle.id}
                </Typography>
                <Chip
                  size="small"
                  label={ESTADO_LABEL[pedidoDetalle.attributes?.status] || pedidoDetalle.attributes?.status}
                  color={ESTADO_COLOR[pedidoDetalle.attributes?.status] || 'default'}
                />
              </Stack>

              <Stack direction="row" spacing={4} mb={2} flexWrap="wrap">
                <Typography variant="body2">
                  <strong>Monto total:</strong> ${(pedidoDetalle.attributes?.monto_total ?? 0).toFixed(2)}
                </Typography>
                <Typography variant="body2">
                  <strong>Envío:</strong> ${(pedidoDetalle.attributes?.monto_envio ?? 0).toFixed(2)}
                </Typography>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Productos
              </Typography>

              {Array.isArray(pedidoDetalle.attributes?.item) && pedidoDetalle.attributes.item.length > 0 ? (
                <List disablePadding>
                  {pedidoDetalle.attributes.item.map((it, idx) => (
                    <Paper key={it.id || idx} variant="outlined" sx={{ mb: 1, p: 1 }}>
                      <ListItem disableGutters>
                        <ListItemText
                          primary={it.nombre || 'Producto sin nombre'}
                          secondary={
                            <>
                              Cantidad: {it.cantidad ?? 1} · Precio unit.: $
                              {(it.precio_unitario ?? 0).toFixed(2)} · Subtotal: $
                              {(it.subtotal ?? 0).toFixed(2)}
                            </>
                          }
                        />
                      </ListItem>
                    </Paper>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Este pedido no tiene productos registrados.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarPedido}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PagosTienda;
