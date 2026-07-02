// src/components/PedidosEntregados/index.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Grid,
  Divider,
  Chip,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material';
import productoImg from '../../assets/placeholders/producto.png';

// Configuración de estados con iconos
const statusConfig = {
  recibido:  { label: 'Entregado',  color: 'success', icon: <i className="material-icons">check_circle</i> },
  cancelado: { label: 'Cancelado',  color: 'error',   icon: <i className="material-icons">cancel</i> },
  devuelto:  { label: 'Devuelto',   color: 'warning', icon: <i className="material-icons">undo</i> },
};

/**
 * PedidosEntregados
 *
 * Props:
 *  - storeId (number|string) opcional: id de la tienda a filtrar. Si no se pasa, por seguridad no trae nada.
 *  - initialPageSize (number) opcional: pageSize por defecto (default 25).
 *
 * NOTA: este componente realiza el filtrado en la API (server-side) usando la forma
 * correcta de $in para Strapi v4: filters[status][$in][0]=..., filters[status][$in][1]=...
 */
const PedidosEntregados = ({ storeId = 227, initialPageSize = 25 }) => {
  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || '';

  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Normaliza cualquier formato de item que Strapi puede devolver
  const normalizeItems = (raw) => {
    if (raw === null || raw === undefined) return [];

    if (Array.isArray(raw)) {
      return raw.map(i => (i && i.attributes ? i.attributes : i));
    }

    if (Array.isArray(raw?.data)) {
      return raw.data.map(d => (d && d.attributes ? d.attributes : d));
    }

    if (raw?.data?.attributes) {
      return [raw.data.attributes];
    }

    if (raw?.attributes) {
      return [raw.attributes];
    }

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return normalizeItems(parsed);
      } catch {
        return [];
      }
    }

    if (typeof raw === 'object') {
      return [raw];
    }

    return [];
  };

  // Formatea dinero de forma segura
  const formatMoney = (v) => {
    if (v === null || v === undefined || v === '') return '-';
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isNaN(n)) return '-';
    return n.toFixed(2);
  };

  useEffect(() => {
    let mounted = true;

    const fetchPedidos = async () => {
      // Por seguridad: si no hay storeId definido, no traemos todos los pedidos sin filtro
      if (!storeId) {
        setPedidos([]);
        setCargando(false);
        return;
      }

      setCargando(true);

      try {
        // Armamos params con la forma correcta que Strapi espera para $in (array indexed)
        // y filtramos por store id.
        const params = new URLSearchParams();

        // filters[store][id][$eq]=<storeId>
        params.append('filters[store][id][$eq]', String(storeId));

        // filters[status][$in][0]=recibido ...
        params.append('filters[status][$in][0]', 'recibido');
        params.append('filters[status][$in][1]', 'cancelado');
        params.append('filters[status][$in][2]', 'devuelto');

        // populate para traer imagen de item
        params.append('populate', 'item.imagen_predeterminada');

        // pagination + sort
        params.append('pagination[page]', String(page));
        params.append('pagination[pageSize]', String(pageSize));
        params.append('sort', 'timestamp_creacion:desc');

        const url = `${STRAPI_URL}/api/pedidos?${params.toString()}`;

        const res = await fetch(url);
        const json = await res.json();

        // Strapi v4: { data: [...], meta: { pagination: { page, pageSize, pageCount, total } } }
        const data = Array.isArray(json?.data) ? json.data : [];
        const paginationMeta = json?.meta?.pagination || null;

        if (!mounted) return;

        setPedidos(data);
        if (paginationMeta) {
          setTotalPages(paginationMeta.pageCount || 1);
          setTotalItems(paginationMeta.total || data.length);
        } else {
          setTotalPages(1);
          setTotalItems(data.length);
        }
      } catch (err) {
        // No rompemos UI: dejamos lista vacía
        setPedidos([]);
        setTotalPages(1);
        setTotalItems(0);
      } finally {
        if (mounted) setCargando(false);
      }
    };

    fetchPedidos();

    return () => { mounted = false; };
  }, [STRAPI_URL, storeId, page, pageSize]);

  const handlePageChange = (e, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
    setPage(1);
  };

  if (cargando) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  // Como ya has pedido al server solo los estados que interesan, aquí simplemente mostramos lo que llegó.
  // Para mayor tolerancia convertimos status a minúsculas para elegir el chip.
  const normalizeStatus = (s) => (s ?? '').toString().trim().toLowerCase();

  const entregados = pedidos.filter(({ attributes }) => normalizeStatus(attributes?.status).includes('recib'));
  const cancelados = pedidos.filter(({ attributes }) => ['cancelado', 'devuelto'].includes(normalizeStatus(attributes?.status)));

  // Estilos morados para la paginación
  const paginationSx = {
    '& .MuiPaginationItem-root.Mui-selected': {
      backgroundColor: '#7c4dff',
      color: '#fff',
    },
    '& .MuiPaginationItem-root': {
      color: '#7c4dff',
    },
  };

  const renderSection = (list, title) => (
    <Box width="100%" mb={6}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>{title}</Typography>

      {list.length === 0 ? (
        <Typography>No hay pedidos.</Typography>
      ) : (
        list.map(({ id, attributes }) => {
          // Normalizamos items para aceptar cualquiera de las formas Strapi devuelve
          const itemList = normalizeItems(attributes?.item ?? []);

          const {
            timestamp_creacion,
            fecha_entrega,
            updatedAt,
            guia,
            status,
          } = attributes || {};

          const cfg = statusConfig[ normalizeStatus(status) ];

          return (
            <Box key={id} width="100%" mb={4}>
              <Box display="flex" alignItems="center" mb={1} gap={1}>
                {cfg && <Chip icon={cfg.icon} label={cfg.label} color={cfg.color} size="small" />}
                <Typography variant="h5" fontWeight="bold">Pedido #{id}</Typography>
              </Box>

              <Typography variant="subtitle2" color="text.secondary" mb={2}>
                Creado: {timestamp_creacion ? new Date(timestamp_creacion).toLocaleString() : '—'}
              </Typography>

              {/* Items: si hay imagen la mostramos, si no usamos placeholder, y siempre mostramos los items */}
              {itemList.length === 0 ? (
                <Typography color="text.secondary">No hay artículos en este pedido.</Typography>
              ) : (
                itemList.map((prod, idx) => {
                  const {
                    nombre,
                    precio_unitario,
                    cantidad,
                    subtotal,
                    envio,
                    total,
                    imagen_predeterminada,
                  } = prod || {};

                  // Soporta distintos formatos de imagen_predeterminada
                  const imgPath =
                    imagen_predeterminada?.data?.attributes?.url
                    || imagen_predeterminada?.attributes?.url
                    || imagen_predeterminada?.url
                    || imagen_predeterminada; // por si ya es string

                  const imgUrl = imgPath
                    ? (imgPath.toString().startsWith('http') ? imgPath : `${STRAPI_URL}${imgPath}`)
                    : productoImg;

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
                            <Typography variant="body2"><strong>Precio:</strong> ${formatMoney(precio_unitario)}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3} md={2}>
                            <Typography variant="body2"><strong>Total:</strong> ${formatMoney(total)}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  );
                })
              )}

              <Typography variant="caption" color="text.secondary" display="block">
                { normalizeStatus(status).includes('recib')
                  ? `Entregado: ${fecha_entrega ? new Date(fecha_entrega).toLocaleString() : '—'}`
                  : normalizeStatus(status) === 'cancelado'
                    ? `Cancelado: ${updatedAt ? new Date(updatedAt).toLocaleString() : '—'}`
                    : `Devuelto: ${updatedAt ? new Date(updatedAt).toLocaleString() : '—'}`
                }
              </Typography>

              {guia && (
                <Typography variant="caption" color="text.secondary" display="block">Guía: {guia}</Typography>
              )}

              <Divider sx={{ my: 2 }} />
            </Box>
          );
        })
      )}
    </Box>
  );

  return (
    <Box width="100%" p={0} m={0}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" mb={2} gap={2}>
        <Typography variant="h6">Pedidos — tienda #{storeId} — {totalItems} resultados</Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="page-size-label">Por página</InputLabel>
            <Select labelId="page-size-label" value={pageSize} label="Por página" onChange={handlePageSizeChange}>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>

          <Pagination count={totalPages} page={page} onChange={handlePageChange} shape="rounded" sx={paginationSx} />
        </Stack>
      </Stack>

      {renderSection(entregados, 'Pedidos entregados')}
      {renderSection(cancelados, 'Pedidos cancelados')}

      <Box display="flex" justifyContent="center" mt={2}>
        <Pagination count={totalPages} page={page} onChange={handlePageChange} shape="rounded" sx={paginationSx} />
      </Box>
    </Box>
  );
};

export default PedidosEntregados;
