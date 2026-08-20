import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography
} from "@mui/material";

import {
  Close,
  LocationOn,
  Payment,
  Restaurant,
  ShoppingBag,
  Schedule
} from "@mui/icons-material";

import { useMemo } from "react";
import { STRAPI_URL } from "../../utils/strapiHelpers";

/*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
*/

const formatCurrency = (amount, currency = "MXN") => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency
  }).format(Number(amount || 0));
};

const formatDate = (date) => {
  if (!date) return "No disponible";

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
};

/*
  |--------------------------------------------------------------------------
  | Estados
  |--------------------------------------------------------------------------
*/

const ORDER_STATUS = {
  pendiente_pago: {
    label: "Pendiente de pago",
    color: "warning"
  },

  pendiente_verificacion: {
    label: "Verificando pago",
    color: "warning"
  },

  pendiente_envio: {
    label: "Preparando pedido",
    color: "info"
  },

  enviado: {
    label: "Enviado",
    color: "info"
  },

  en_camino: {
    label: "En camino",
    color: "primary"
  },

  recibido: {
    label: "Recibido",
    color: "success"
  },

  cancelado: {
    label: "Cancelado",
    color: "error"
  },

  devuelto: {
    label: "Devuelto",
    color: "error"
  }
};


/*
  |--------------------------------------------------------------------------
  | FoodOrderDetailModal
  |--------------------------------------------------------------------------
*/

const FoodOrderDetailModal = ({
  open,
  order,
  onClose
}) => {

  const statusConfig = ORDER_STATUS[order?.attributes?.status] ?? {
    label: "Desconocido",
    color: "default"
  };

  /*
    |--------------------------------------------------------------------------
    | Productos
    |--------------------------------------------------------------------------
  */

  const items = useMemo(() => {
    return order?.attributes?.items || [];
  }, [order]);

  /*
    |--------------------------------------------------------------------------
    | Cantidad total
    |--------------------------------------------------------------------------
  */

  const totalItems = useMemo(() => {
    return items.reduce((total, item) => {
      return (
        total +
        Number(item?.cantidad ?? item?.quantity ?? 1)
      );
    }, 0);
  }, [items]);

  if (!order) {
    return null;
  }

  /*
    |--------------------------------------------------------------------------
    | Render
    |--------------------------------------------------------------------------
  */

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: {
            xs: 0,
            sm: 3
          },

          margin: {
            xs: 0,
            sm: 2
          },

          width: {
            xs: "100%",
            sm: "calc(100% - 32px)"
          },

          maxHeight: {
            xs: "100%",
            sm: "calc(100% - 64px)"
          }
        }
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          px: {
            xs: 2,
            sm: 3
          },
          pt: {
            xs: 2,
            sm: 2.5
          },
          pb: 1
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              fontWeight={600}
            >
              Detalle del pedido
            </Typography>
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{
                fontSize: {
                  xs: "1.35rem",
                  sm: "1.5rem"
                }
              }}
            >
              Pedido #{order.id}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          px: {
            xs: 2,
            sm: 3
          }
        }}
      >
        <Stack spacing={3}>
          {/* Restaurante */}
          <Box>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "primary.50",
                  color: "primary.main"
                }}
              >
                <Restaurant />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Restaurante
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight={700}
                  noWrap
                >
                  {order?.attributes?.restaurant?.nombre ?? order?.attributes?.restaurant?.name ?? "Restaurante"}
                </Typography>
              </Box>
            </Stack>
          </Box>
          {/* Estado */}
          <Box>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ mb: 1 }}
            >
              Estado del pedido
            </Typography>
            <Chip
              label={statusConfig.label}
              color={statusConfig.color}
              sx={{
                fontWeight: 700
              }}
            />
          </Box>
          {/* Productos */}
          <Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <ShoppingBag
                sx={{
                  color: "primary.main"
                }}
              />
              <Typography
                variant="subtitle2"
                fontWeight={700}
              >
                Productos
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
              >
                ({totalItems})
              </Typography>
            </Stack>
            <Stack spacing={1.5}>
              {items.map((item, index) => {
                /*
                 * Ajustar estos campos cuando tengamos
                 * el schema de products-order.
                 */
                const productName = item?.product?.nombre ?? item?.product?.name ?? item?.nombre ?? item?.name ?? `Producto ${index + 1}`;

                const quantity = Number(item?.cantidad ?? item?.quantity ?? 1);

                const price = Number(item?.precio_unitario ?? item?.price ?? 0);

                const imageUrl = item?.product?.data?.attributes?.imagen_predeterminada?.data?.attributes?.url ?? item?.product?.image?.url ?? item?.imagen?.url ?? item?.image?.url;
                const image = imageUrl ? `${STRAPI_URL}${imageUrl}` : null;
                return (
                  <Box
                    key={
                      item?.id ||
                      `${productName}-${index}`
                    }
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5
                    }}
                  >
                    {/* Imagen */}
                    <Box
                      sx={{
                        width: 58,
                        height: 58,
                        borderRadius: 2,
                        overflow: "hidden",
                        backgroundColor:
                          "action.hover",
                        flexShrink: 0
                      }}
                    >
                      {image ? (
                        <Box
                          component="img"
                          src={image}
                          alt={productName}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "text.disabled"
                          }}
                        >
                          <ShoppingBag />
                        </Box>
                      )}
                    </Box>
                    {/* Producto */}
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {productName}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Cantidad: {quantity}
                      </Typography>
                    </Box>
                    {/* Precio */}
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{
                        flexShrink: 0
                      }}
                    >
                      {formatCurrency(
                        price * quantity,
                        order?.attributes?.moneda ?? "MXN"
                      )}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>
          <Divider />
          {/* Resumen */}
          <Box>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ mb: 1.5 }}
            >
              Resumen del pedido
            </Typography>
            <Stack spacing={1}>
              <Stack
                direction="row"
                justifyContent="space-between"
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Productos
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(
                    Number(order?.attributes?.monto_total || 0) -
                    Number(order?.attributes?.monto_envio || 0),
                    order?.attributes?.moneda || "MXN"
                  )}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                justifyContent="space-between"
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Envío
                </Typography>
                <Typography variant="body2">
                  {formatCurrency(
                    order?.attributes?.monto_envio,
                    order?.attributes?.moneda || "MXN"
                  )}
                </Typography>
              </Stack>
              <Divider sx={{ my: 0.5 }} />
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography
                  variant="body1"
                  fontWeight={800}
                >
                  Total
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  color="primary.main"
                >
                  {formatCurrency(
                    order?.attributes?.monto_total,
                    order?.attributes?.moneda || "MXN"
                  )}
                </Typography>
              </Stack>
            </Stack>
          </Box>
          {/* Dirección */}
          {order?.attributes?.direccion_destino?.data && (
            <Box>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <LocationOn
                  sx={{
                    color: "primary.main"
                  }}
                />
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                >
                  Dirección de entrega
                </Typography>
              </Stack>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: "action.hover"
                }}
              >
                <Typography variant="body2">
                  {order.attributes?.direccion_destino?.data?.attributes?.calle ??
                    order.attributes?.direccion_destino?.data?.attributes?.direccion?.street ??
                    "Dirección de entrega"}
                </Typography>
              </Box>
            </Box>
          )}
          {/* Fecha */}
          <Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Schedule
                sx={{
                  color: "primary.main"
                }}
              />
              <Typography
                variant="subtitle2"
                fontWeight={700}
              >
                Información del pedido
              </Typography>
            </Stack>
            <Stack spacing={0.75}>
              <Stack
                direction="row"
                justifyContent="space-between"
                spacing={2}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Fecha de creación
                </Typography>
                <Typography
                  variant="body2"
                  textAlign="right"
                >
                  {formatDate(
                    order?.attributes?.fecha_creacion
                  )}
                </Typography>
              </Stack>
              {order?.attributes?.fecha_envio && (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Fecha de envío
                  </Typography>

                  <Typography
                    variant="body2"
                    textAlign="right"
                  >
                    {formatDate(
                      order.attributes?.fecha_envio
                    )}
                  </Typography>
                </Stack>
              )}
              {order?.attributes?.fecha_entrega && (
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Fecha de entrega
                  </Typography>
                  <Typography
                    variant="body2"
                    textAlign="right"
                  >
                    {formatDate(
                      order.attributes?.fecha_entrega
                    )}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>
          {/* Guía */}
          {order?.attributes?.guia && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                backgroundColor: "action.hover"
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
              >
                Número de guía
              </Typography>
              <Typography
                variant="body2"
                fontWeight={700}
              >
                {order.attributes?.guia}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default FoodOrderDetailModal;
