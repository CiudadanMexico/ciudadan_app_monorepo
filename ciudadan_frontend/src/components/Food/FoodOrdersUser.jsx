import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography
} from "@mui/material";

import {
  CheckCircle,
  ChevronRight,
  DeliveryDining,
  Fastfood,
  HourglassEmpty,
  LocalShipping,
  Payment,
  Restaurant,
  Schedule,
  ShoppingBag,
  Cancel,
  Replay
} from "@mui/icons-material";

import { useEffect, useMemo, useState } from "react";
import FoodOrderDetailModal from "./FoodOrderDetailModal";
import { useRoles } from "../../Contexts/RolesContext";

/*
  |--------------------------------------------------------------------------
  | Configuración de estados
  |--------------------------------------------------------------------------
*/

const ORDER_STATUS = {
  pendiente_pago: {
    label: "Pendiente de pago",
    color: "warning",
    icon: Payment
  },

  pendiente_verificacion: {
    label: "Verificando pago",
    color: "warning",
    icon: HourglassEmpty
  },

  pendiente_envio: {
    label: "Preparando pedido",
    color: "info",
    icon: Fastfood
  },

  enviado: {
    label: "Enviado",
    color: "info",
    icon: LocalShipping
  },

  en_camino: {
    label: "En camino",
    color: "primary",
    icon: DeliveryDining
  },

  recibido: {
    label: "Recibido",
    color: "success",
    icon: CheckCircle
  },

  cancelado: {
    label: "Cancelado",
    color: "error",
    icon: Cancel
  },

  devuelto: {
    label: "Devuelto",
    color: "error",
    icon: Replay
  }
};

const STATUS_FILTERS = [
  {
    value: "todos",
    label: "Todos los pedidos"
  },
  {
    value: "pendiente_pago",
    label: "Pendiente de pago"
  },
  {
    value: "pendiente_verificacion",
    label: "Verificando pago"
  },
  {
    value: "pendiente_envio",
    label: "Preparando"
  },
  {
    value: "enviado",
    label: "Enviado"
  },
  {
    value: "en_camino",
    label: "En camino"
  },
  {
    value: "recibido",
    label: "Recibidos"
  },
  {
    value: "cancelado",
    label: "Cancelados"
  },
  {
    value: "devuelto",
    label: "Devueltos"
  }
];

/*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
*/

const formatCurrency = (amount, currency = "MXN") => {
  const value = Number(amount ?? 0);

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency
  }).format(value);
};

const formatDate = (date) => {
  if (!date) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
};

const getItemsCount = (items = []) => {
  return items.reduce((total, item) => {
    return total + Number(item?.cantidad ?? item?.quantity ?? 1);
  }, 0);
};

/*
|--------------------------------------------------------------------------
| Progress
|--------------------------------------------------------------------------
*/

const ORDER_PROGRESS = [
  "pendiente_envio",
  "enviado",
  "en_camino",
  "recibido"
];

const getProgressIndex = (status) => {
  const index = ORDER_PROGRESS.indexOf(status);

  return index === -1 ? 0 : index;
};

/*
|--------------------------------------------------------------------------
| OrderStatusChip
|--------------------------------------------------------------------------
*/

const OrderStatusChip = ({ status }) => {
  const config = ORDER_STATUS[status] || {
    label: status ?? "Desconocido",
    color: "default",
    icon: Schedule
  };

  const Icon = config.icon;

  return (
    <Chip
      icon={<Icon sx={{ fontSize: 18 }} />}
      label={config.label}
      color={config.color}
      size="small"
      sx={{
        fontWeight: 600,
        borderRadius: 2
      }}
    />
  );
};

/*
|--------------------------------------------------------------------------
| OrderProgress
|--------------------------------------------------------------------------
*/

const OrderProgress = ({ status }) => {
  const isSpecialStatus = ["cancelado", "devuelto"].includes(status);

  if (isSpecialStatus) {
    return (
      <Box sx={{ mt: 2 }}>
        <OrderStatusChip status={status} />
      </Box>
    );
  }

  const currentIndex = getProgressIndex(status);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        mt: 3,
        mb: 1
      }}
    >
      {
        ORDER_PROGRESS.map((step, index) => {
          const completed = index <= currentIndex;
          const config = ORDER_STATUS[step];
          const Icon = config.icon;

          return (
            <Box
              key={step}
              sx={{
                display: "flex",
                alignItems: "center",
                flex: index === ORDER_PROGRESS.length - 1 ? "0 0 auto" : 1
              }}
            >
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: completed
                    ? "primary.main"
                    : "action.hover",
                  color: completed
                    ? "primary.contrastText"
                    : "text.disabled",
                  flexShrink: 0
                }}
              >
                <Icon sx={{ fontSize: 17 }} />
              </Box>

              {index < ORDER_PROGRESS.length - 1 && (
                <Box
                  sx={{
                    height: 3,
                    flex: 1,
                    mx: 0.5,
                    borderRadius: 2,
                    backgroundColor:
                      index < currentIndex
                        ? "primary.main"
                        : "action.hover"
                  }}
                />
              )}
            </Box>
          );
        })
      }
    </Box>
  );
};

/*
|--------------------------------------------------------------------------
| OrderCard
|--------------------------------------------------------------------------
*/

const OrderCard = ({ order, onViewDetail }) => {
  const items = order?.attributes?.items || [];

  const restaurant = order?.attributes?.restaurant?.data?.attributes?.nombre ?? order?.restaurant?.name ?? "Restaurante";

  const currency = order?.attributes?.moneda ?? "MXN";

  const itemsCount = getItemsCount(items);

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: 2
        }
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        {/* Header */}
        <Stack
          direction={{
            xs: "column",
            sm: "row"
          }}
          justifyContent="space-between"
          alignItems={{
            xs: "flex-start",
            sm: "center"
          }}
          spacing={1.5}
        >
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              Pedido #{order?.id}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
            >
              <Restaurant
                sx={{
                  fontSize: 20,
                  color: "primary.main"
                }}
              />

              <Typography
                variant="h6"
                fontWeight={700}
              >
                {restaurant}
              </Typography>
            </Stack>
          </Box>

          <OrderStatusChip status={order?.attributes?.status} />
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Información */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr 1fr",
              sm: "repeat(3, 1fr)"
            },
            gap: 2
          }}
        >
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Fecha
            </Typography>

            <Typography variant="body2" fontWeight={600}>
              {formatDate(order?.attributes?.fecha_creacion)}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Productos
            </Typography>

            <Typography variant="body2" fontWeight={600}>
              {itemsCount}{" "}
              {itemsCount === 1 ? "producto" : "productos"}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Total
            </Typography>

            <Typography
              variant="body1"
              fontWeight={800}
              color="primary.main"
            >
              {formatCurrency(order?.attributes?.monto_total, currency)}
            </Typography>
          </Box>
        </Box>

        {/* Progress */}
        {[
          "pendiente_envio",
          "enviado",
          "en_camino",
          "recibido"
        ].includes(order?.status) && (
            <Box sx={{ mt: 1 }}>
              <OrderProgress status={order?.attributes?.status} />
            </Box>
          )}

        {/* Footer */}
        <Stack
          direction={{
            xs: "column",
            sm: "row"
          }}
          justifyContent="space-between"
          alignItems={{
            xs: "stretch",
            sm: "center"
          }}
          spacing={1.5}
          sx={{ mt: 2 }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
          >
            <ShoppingBag
              sx={{
                fontSize: 18,
                color: "text.secondary"
              }}
            />

            <Typography
              variant="body2"
              color="text.secondary"
            >
              {order?.guia
                ? `Guía: ${order.attributes?.guia}`
                : "Pedido de comida"}
            </Typography>
          </Stack>

          <Button
            variant="outlined"
            endIcon={<ChevronRight />}
            onClick={() => onViewDetail(order)}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700
            }}
          >
            Ver detalle
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

/*
|--------------------------------------------------------------------------
| FoodOrdersUser
|--------------------------------------------------------------------------
*/

const FoodOrdersUser = ({
  obtenerOrdenes,
}) => {
  const { userData } = useRoles();

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState("todos");

  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewDetail = (order) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedOrder(null);
  }

  const ITEMS_PER_PAGE = 5;

  /*
  |--------------------------------------------------------------------------
  | Obtener pedidos
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await obtenerOrdenes(userData?.id);
        /*
         * Dependiendo de tu API de Strapi: response.data o directamente: response
        */
        const data = response?.data ?? response ?? [];
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);

        setError("No fue posible obtener tus pedidos.");
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [obtenerOrdenes]);

  /*
  |--------------------------------------------------------------------------
  | Filtrado
  |--------------------------------------------------------------------------
  */

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (statusFilter !== "todos") {
      result = result.filter(
        order => order?.attributes?.status === statusFilter
      );
    }

    /*
     * Más recientes primero
     */
    result.sort((a, b) => {
      return (
        new Date(b?.attributes?.fecha_creacion || b?.attributes?.createdAt) -
        new Date(a?.attributes?.fecha_creacion || a?.attributes?.createdAt)
      );
    });

    return result;
  }, [orders, statusFilter]);

  /*
  |--------------------------------------------------------------------------
  | Paginación
  |--------------------------------------------------------------------------
  */

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  const paginatedOrders = useMemo(() => {
    const start =
      (page - 1) * ITEMS_PER_PAGE;

    return filteredOrders.slice(
      start,
      start + ITEMS_PER_PAGE
    );
  }, [filteredOrders, page]);

  /*
  |--------------------------------------------------------------------------
  | Cambio de filtro
  |--------------------------------------------------------------------------
  */

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Error
  |--------------------------------------------------------------------------
  */

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1100,
        mx: "auto",
        px: {
          xs: 1,
          sm: 2,
          md: 0
        }
      }}
    >
      {/* Header */}
      <Stack
        direction={{
          xs: "column",
          sm: "row"
        }}
        justifyContent="space-between"
        alignItems={{
          xs: "stretch",
          sm: "center"
        }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              fontSize: {
                xs: "1.7rem",
                sm: "2rem"
              }
            }}
          >
            Mis pedidos
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Consulta el historial y estado de tus
            pedidos de comida.
          </Typography>
        </Box>

        <Select
          value={statusFilter}
          onChange={handleStatusChange}
          size="small"
          sx={{
            minWidth: {
              xs: "100%",
              sm: 220
            },
            borderRadius: 2
          }}
        >
          {STATUS_FILTERS.map(filter => (
            <MenuItem
              key={filter.value}
              value={filter.value}
            >
              {filter.label}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      {/* Empty */}
      {filteredOrders.length === 0 ? (
        <Card
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3
          }}
        >
          <CardContent
            sx={{
              py: 7,
              textAlign: "center"
            }}
          >
            <ShoppingBag
              sx={{
                fontSize: 55,
                color: "text.disabled",
                mb: 1
              }}
            />

            <Typography
              variant="h6"
              fontWeight={700}
            >
              No tienes pedidos
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              {statusFilter === "todos"
                ? "Aún no has realizado ningún pedido."
                : "No tienes pedidos con este estado."}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Contador */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1.5 }}
          >
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1
              ? "pedido"
              : "pedidos"}
          </Typography>

          {/* Orders */}
          <Stack spacing={2}>
            {paginatedOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onViewDetail={handleViewDetail}
              />
            ))}
          </Stack>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 4
              }}
            >
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) =>
                  setPage(value)
                }
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}

      <FoodOrderDetailModal
        open={detailOpen}
        order={selectedOrder}
        onClose={handleCloseDetail}
      />
    </Box>
  );
};

export default FoodOrdersUser;
