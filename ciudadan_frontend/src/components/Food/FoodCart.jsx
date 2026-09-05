import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Button,
  Divider,
  Stack,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useFoodCart } from "../../Contexts/FoodCartContext";
import { useNavigate } from "react-router-dom";

const FoodCart = () => {
  const navigate = useNavigate();
  const {
    items,
    subtotal,
    montoEnvio,
    montoTotal,
    updateQuantity,
    removeItem,
    clearCart,
  } = useFoodCart();

  const restaurantes = useMemo(() => {
    return items.reduce((acc, item) => {
      const restauranteId = item.restaurante?.id ?? item.restaurante ?? "sin-restaurante";

      if (!acc[restauranteId]) {
        acc[restauranteId] = {
          restaurante: item.restaurante,
          items: [],
        };
      }

      acc[restauranteId].items.push(item);

      return acc;
    }, {});
  }, [items]);

  if (!items.length) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography variant="h5" fontWeight={700}>
          Tu carrito de comida está vacío
        </Typography>

        <Typography
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          Agrega productos de tus restaurantes favoritos.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="h5"
        fontWeight={700}
        sx={{ mb: 3 }}
      >
        Carrito de comida
      </Typography>

      <Stack spacing={3}>
        {Object.entries(restaurantes).map(
          ([restauranteId, grupo]) => {
            const restaurante = grupo.restaurante;

            const subtotalRestaurante = grupo.items.reduce(
              (total, item) => total + Number(item.subtotal || 0),
              0
            );

            return (
              <Card
                key={restauranteId}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                }}
              >
                <CardContent>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ mb: 2 }}
                  >
                    {restaurante?.nombre ||
                      restaurante?.name ||
                      "Restaurante"}
                  </Typography>

                  <Stack spacing={2}>
                    {grupo.items.map((item) => (
                      <FoodCartItem
                        key={item.item_key}
                        item={item}
                        onIncrease={() =>
                          updateQuantity(
                            item.item_key,
                            item.cantidad + 1
                          )
                        }
                        onDecrease={() =>
                          updateQuantity(
                            item.item_key,
                            item.cantidad - 1
                          )
                        }
                        onRemove={() =>
                          removeItem(item.item_key)
                        }
                      />
                    ))}
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography fontWeight={600}>
                      Subtotal
                    </Typography>

                    <Typography fontWeight={700}>
                      ${subtotalRestaurante.toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            );
          }
        )}
      </Stack>

      <Card
        variant="outlined"
        sx={{
          mt: 3,
          borderRadius: 3,
        }}
      >
        <CardContent>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ mb: 2 }}
          >
            Resumen de compra
          </Typography>

          <SummaryRow
            label="Subtotal"
            value={subtotal}
          />

          <SummaryRow
            label="Envío"
            value={montoEnvio}
          />

          <Divider sx={{ my: 2 }} />

          <SummaryRow
            label="Total"
            value={montoTotal}
            strong
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{
              mt: 3,
              borderRadius: 2,
              fontWeight: 700,
            }}
            onClick={() => {
              // siguiente fase:
              navigate("/carrito/comida/checkout")
            }}
          >
            Continuar con la compra
          </Button>

          <Button
            fullWidth
            color="error"
            sx={{ mt: 1 }}
            onClick={clearCart}
          >
            Vaciar carrito
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

const FoodCartItem = ({
  item,
  onIncrease,
  onDecrease,
  onRemove,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "center",
      }}
    >
      <CardMedia
        component="img"
        image={item.imagen || "/images/food-placeholder.png"}
        alt={item.nombre}
        sx={{
          width: 90,
          height: 90,
          borderRadius: 2,
          objectFit: "cover",
        }}
      />

      <Box sx={{ flex: 1 }}>
        <Typography fontWeight={700}>
          {item.nombre}
        </Typography>

        {item.nombre_variante && (
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {item.nombre_variante}
          </Typography>
        )}

        {Array.isArray(item.modificadores) &&
          item.modificadores.length > 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              {item.modificadores
                .map((m) => m.nombre)
                .join(", ")}
            </Typography>
          )}

        <Typography
          fontWeight={600}
          sx={{ mt: 1 }}
        >
          ${Number(item.precio_unitario || 0).toFixed(2)}
        </Typography>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ mt: 1 }}
        >
          <IconButton
            size="small"
            onClick={onDecrease}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>

          <Typography fontWeight={700}>
            {item.cantidad}
          </Typography>

          <IconButton
            size="small"
            onClick={onIncrease}
          >
            <AddIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            color="error"
            onClick={onRemove}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      <Typography
        fontWeight={700}
        sx={{
          alignSelf: "flex-start",
          whiteSpace: "nowrap",
        }}
      >
        ${Number(item.subtotal || 0).toFixed(2)}
      </Typography>
    </Box>
  );
};

const SummaryRow = ({
  label,
  value,
  strong = false,
}) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      mb: 1,
    }}
  >
    <Typography
      fontWeight={strong ? 700 : 400}
    >
      {label}
    </Typography>

    <Typography
      fontWeight={strong ? 800 : 600}
      variant={strong ? "h6" : "body1"}
    >
      ${Number(value || 0).toFixed(2)}
    </Typography>
  </Box>
);

export default FoodCart;