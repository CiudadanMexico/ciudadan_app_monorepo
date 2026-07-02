import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Chip,
  Divider,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import RateReviewIcon from "@mui/icons-material/RateReview";
import { motion } from "framer-motion";
import CalificarCompras from "./CalificarCompras"; // ajusta ruta si cambia

export default function HistorialPagos({ items = [], user }) {
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

  // ─────────────────────────────────────────────
  // Filtrar solo pedidos finalizados
  // ─────────────────────────────────────────────
  const pedidosFinalizados = useMemo(() => {
    return items.filter(
      (p) =>
        p?.attributes?.finalizado === true
    );
  }, [items]);

  // ─────────────────────────────────────────────
  // Si el usuario está calificando → render directo
  // ─────────────────────────────────────────────
  if (pedidoSeleccionado) {
    return (
      <CalificarCompras
        pedido={pedidoSeleccionado}
        user={user}
        onClose={() => setPedidoSeleccionado(null)}
      />
    );
  }

  // ─────────────────────────────────────────────
  // UI principal
  // ─────────────────────────────────────────────
  if (pedidosFinalizados.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="h6">Aún no tienes compras finalizadas</Typography>
        <Typography variant="body2" color="text.secondary">
          Cuando completes un pedido, aquí podrás calificarlo.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {pedidosFinalizados.map((entry) => {
        const id = entry.id;
        const attrs = entry.attributes || {};

        const nombre = attrs.nombre || `Pedido #${id}`;
        const total = attrs.total ?? attrs.monto_total ?? 0;
        const moneda = attrs.moneda || "MXN";
        const fecha = attrs.fecha_finalizado || attrs.updatedAt;
        const calificado = attrs.calificado === true;

        // imagen
        let imgUrl = null;
        if (
          attrs.imagen_predeterminada?.data?.attributes?.url
        ) {
          imgUrl = attrs.imagen_predeterminada.data.attributes.url;
        }

        if (imgUrl && !imgUrl.startsWith("http")) {
          const base = (process.env.REACT_APP_STRAPI_URL || "").replace(/\/$/, "");
          imgUrl = base + imgUrl;
        }

        return (
          <Grid item xs={12} key={id}>
            <Card
              component={motion.div}
              whileHover={{ scale: 1.01 }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                p: 2,
                borderRadius: 2,
                border: "1px solid #e0e0e0",
              }}
            >
              <Avatar
                variant="rounded"
                src={imgUrl || undefined}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: "#fff200",
                  border: "2px solid #6d6e71",
                  fontWeight: 700,
                }}
              >
                {!imgUrl ? nombre.charAt(0) : ""}
              </Avatar>

              <CardContent sx={{ flex: 1, py: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {nombre}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Total: {Number(total).toLocaleString()} {moneda}
                </Typography>

                {fecha && (
                  <Typography variant="caption" color="text.secondary">
                    Finalizado: {new Date(fecha).toLocaleString()}
                  </Typography>
                )}

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  {calificado ? (
                    <Chip
                      icon={<AssignmentTurnedInIcon />}
                      label="Compra calificada"
                      color="success"
                      size="small"
                    />
                  ) : (
                    <Chip
                      icon={<StarIcon />}
                      label="Pendiente de calificar"
                      sx={{
                        bgcolor: "#3a0f55",
                        color: "#fff",
                        fontWeight: 600,
                      }}
                      size="small"
                    />
                  )}
                </Box>
              </CardContent>

              {!calificado && (
                <Button
                  variant="contained"
                  startIcon={<RateReviewIcon />}
                  sx={{
                    bgcolor: "#6a1b9a",
                    "&:hover": { bgcolor: "#4a136b" },
                  }}
                  onClick={() => setPedidoSeleccionado(entry)}
                >
                  Calificar
                </Button>
              )}
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
