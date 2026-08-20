import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Chip,
  Divider
} from '@mui/material';

import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

import { useMemo, useState } from 'react';
import PedidoDetalleModal from './PedidoDetalleModal';
import usePedidosRestaurante from '../../hooks/food/usePedidosRestaurante';

const ESTADOS_PEDIDO = {
  pendiente_pago: {
    label: 'Pendiente de pago',
    color: 'warning'
  },
  pendiente_verificacion: {
    label: 'Pendiente de verificación',
    color: 'info'
  },
  pendiente_envio: {
    label: 'Pendiente de envío',
    color: 'info'
  },
  enviado: {
    label: 'Enviado',
    color: 'primary'
  },
  en_camino: {
    label: 'En camino',
    color: 'primary'
  },
  recibido: {
    label: 'Recibido',
    color: 'success'
  },
  cancelado: {
    label: 'Cancelado',
    color: 'error'
  },
  devuelto: {
    label: 'Devuelto',
    color: 'default'
  }
};

const PedidosRestaurante = ({ restaurante }) => {
  const {
    pedidos,
    loading,
    updatingPedido,
    error,
    estadisticas,
    aceptar,
    marcarListo,
    marcarEntregado,
    cancelar,
    obtenerPedidos,
    pedidoSeleccionado,
    setPedidoSeleccionado,
    limpiarPedidoSeleccionado
  } = usePedidosRestaurante({
    restauranteId: restaurante?.id,
    // Aquí utiliza el token que ya manejas en tu aplicación.
    token: null,
    refreshInterval: 30000
  });
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const pedidosFiltrados = useMemo(() => {

    if (filtroStatus === 'todos') {
      return pedidos;
    }

    return pedidos.filter(
      pedido =>
        pedido.status === filtroStatus
    );

  }, [pedidos, filtroStatus]);

  return (
    <Box sx={{ width: '100%' }}>

      {/* HEADER */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              fontSize: {
                xs: '1.3rem',
                sm: '1.6rem'
              }
            }}
          >
            Pedidos
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Administra los pedidos recibidos en tu restaurante.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshOutlinedIcon />}
          onClick={() => obtenerPedidos({ estado: filtroStatus })}
          disabled={loading}
          sx={{
            alignSelf: {
              xs: 'stretch',
              sm: 'auto'
            }
          }}
        >
          Actualizar
        </Button>
      </Stack>

      {/* RESUMEN */}
      <Grid
        container
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Grid item xs={12} sm={4}>
          <ResumenPedido
            titulo="Pendientes"
            cantidad={estadisticas.pendientes}
            color="#ed6c02"
            icon={<AccessTimeOutlinedIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <ResumenPedido
            titulo="Por preparar"
            cantidad={estadisticas.porPreparar}
            color="#0288d1"
            icon={<RestaurantOutlinedIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <ResumenPedido
            titulo="En camino"
            cantidad={estadisticas.enCamino}
            color="#2e7d32"
            icon={<LocalShippingIcon />}
          />
        </Grid>
      </Grid>

      {/* FILTROS */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          mb: 3
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
          >
            <TextField
              select
              fullWidth
              label="Mostrar pedidos"
              value={filtroStatus}
              onChange={(event) =>
                setFiltroStatus(event.target.value)
              }
              size="small"
            >
              <MenuItem value="todos">
                Todos
              </MenuItem>

              <MenuItem value="pendiente_pago">
                Pendiente de pago
              </MenuItem>

              <MenuItem value="pendiente_verificacion">
                Pendiente de verificación
              </MenuItem>

              <MenuItem value="pendiente_envio">
                Pendiente de envío
              </MenuItem>

              <MenuItem value="enviado">
                Enviado
              </MenuItem>

              <MenuItem value="en_camino">
                En camino
              </MenuItem>

              <MenuItem value="recibido">
                Recibido
              </MenuItem>

              <MenuItem value="cancelado">
                Cancelado
              </MenuItem>

              <MenuItem value="devuelto">
                Devuelto
              </MenuItem>
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      {/* CONTENIDO */}
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 8
          }}
        >
          <CircularProgress />
        </Box>
      ) : pedidosFiltrados.length === 0 ? (

        <Alert severity="info">
          No hay pedidos para mostrar.
        </Alert>

      ) : (

        <Grid
          container
          spacing={2}
        >
          {pedidosFiltrados.map(pedido => (
            <Grid
              item
              xs={12}
              md={6}
              lg={4}
              key={`pedido-item-card-${pedido?.id}`}
            >
              <PedidoCard
                pedido={pedido}
                onView={() => setPedidoSeleccionado(pedido)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <PedidoDetalleModal
        pedido={pedidoSeleccionado}
        open={Boolean(pedidoSeleccionado)}
        onClose={() => setPedidoSeleccionado(null)}
        handleAceptar={aceptar}
        handleMarcarListo={marcarListo}
      />
    </Box>
  );
};

const PedidoCard = ({ pedido, onView }) => {
  const estado = ESTADOS_PEDIDO[pedido.status] ?? ESTADOS_PEDIDO.pendiente;
  const total = Number(pedido?.monto_total ?? 0).toFixed(2);
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: '1px solid',
        borderColor:
          pedido.estado === 'pendiente'
            ? '#ed6c02'
            : 'divider',
        borderRadius: 3,
        transition: '0.2s',
        '&:hover': {
          boxShadow:
            '0px 6px 20px rgba(0,0,0,0.08)',
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent>

        {/* CABECERA */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">Pedido</Typography>
            <Typography variant="h6" fontWeight={700}>#{pedido.id} </Typography>
          </Box>

          <Chip
            label={estado?.label}
            color={estado?.color}
            size="small"
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* CLIENTE */}
        <Typography variant="subtitle2" fontWeight={600}>Cliente</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{pedido.user?.data?.attributes?.email ?? 'Cliente'} </Typography>
        {/* PRODUCTOS */}
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Productos
        </Typography>

        <Stack spacing={0.75}>
          {
            (pedido?.items || [])
              .slice(0, 3)
              .map((producto, index) => (
                <Stack
                  key={index}
                  direction="row"
                  justifyContent="space-between"
                >
                  <Typography variant="body2" sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '75%'
                  }}
                  >
                    {producto?.cantidad} ×{' '}{producto?.nombre}
                  </Typography>

                  <Typography variant="body2" fontWeight={600}>
                    ${Number(producto?.subtotal ?? 0).toFixed(2)}
                  </Typography>
                </Stack>
              ))}

          {(pedido.productos || []).length > 3 && (
            <Typography variant="caption" color="primary">
              +{pedido.productos.length - 3}{' '} productos más
            </Typography>
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* INFORMACIÓN */}
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Hora
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {pedido.hora || '--:--'}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Total
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              ${total}
            </Typography>
          </Stack>
        </Stack>
        {/* ACCIONES */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 2 }}
        >
          <Button
            fullWidth
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={onView}
          >
            Ver detalle
          </Button>

        </Stack>

      </CardContent>
    </Card >
  );
};

const ResumenPedido = ({
  titulo,
  cantidad,
  color,
  icon
}) => {
  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              {titulo}
            </Typography>

            <Typography
              variant="h4"
              fontWeight={700}
              sx={{ mt: 0.5 }}
            >
              {cantidad}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${color}18`,
              color
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PedidosRestaurante;