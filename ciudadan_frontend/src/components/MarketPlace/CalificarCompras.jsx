import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  TextField,
  CircularProgress,
  Paper,
  IconButton,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarHalfIcon from "@mui/icons-material/StarHalf";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { motion } from "framer-motion";
import { useAuth0 } from "@auth0/auth0-react";

const STRAPI = (process.env.REACT_APP_STRAPI_URL || "").replace(/\/+$/, "");

/* ---------------- utils ---------------- */
const estrellasABase10 = (stars) => Math.round(Number(stars || 0) * 2);

/* ---------------- StarRating ---------------- */
function StarRating({ value = 0, onChange }) {
  const val = Number(value || 0);

  return (
    <Box display="flex" gap={0.5}>
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const full = val >= idx;
        const half = !full && val >= idx - 0.5;

        const handleClick = () => {
          if (val >= idx) onChange(idx - 0.5);
          else if (val >= idx - 0.5) onChange(idx);
          else onChange(idx - 0.5);
        };

        return (
          <IconButton key={i} size="small" onClick={handleClick}>
            {full ? (
              <StarIcon sx={{ color: "#f7b500" }} />
            ) : half ? (
              <StarHalfIcon sx={{ color: "#f7b500" }} />
            ) : (
              <StarBorderIcon sx={{ color: "#ccc" }} />
            )}
          </IconButton>
        );
      })}
    </Box>
  );
}

/* ---------------- Item ---------------- */
function CalificarItem({ pedido, item, itemIndex, userId, onDone }) {
  const [rating, setRating] = useState(5);
  const [texto, setTexto] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const prod = item?.producto?.data || item?.producto || null;
  const productoId = prod?.id;

  const nombre =
    prod?.attributes?.nombre || item?.nombre || "Producto";

  const imagen =
    prod?.attributes?.imagen_predeterminada?.data?.attributes?.url
      ? STRAPI + prod.attributes.imagen_predeterminada.data.attributes.url
      : `${STRAPI}/uploads/placeholder.png`;

  const enviar = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();

      // 1️⃣ rating
      await fetch(`${STRAPI}/api/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            calificacion: estrellasABase10(rating),
            usuario: userId,
            producto: productoId,
            resena: texto,
            tipo: "producto",
            timestamp: now,
          },
        }),
      });

      // 2️⃣ actualizar pedido
      const pedidoId = pedido.id;
      const pedidoRes = await fetch(
        `${STRAPI}/api/pedidos/${pedidoId}?populate=item`
      );
      const pedidoJson = await pedidoRes.json();

      const items = [...pedidoJson.data.attributes.item];
      items[itemIndex] = {
        ...items[itemIndex],
        calificado: true,
        fechacalificado: now,
      };

      const todos = items.every((i) => i.calificado);

      await fetch(`${STRAPI}/api/pedidos/${pedidoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            item: items,
            calificado: todos,
            fechacalificado: todos ? now : null,
          },
        }),
      });

      onDone(pedidoId, itemIndex);
      setOpen(false);
      setTexto("");
      alert("Reseña enviada ✔");
    } catch (e) {
      console.error(e);
      alert("Error enviando calificación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ p: 2 }}>
      <Box display="flex" gap={2}>
        <CardMedia
          component="img"
          image={imagen}
          sx={{ width: 100, height: 100, objectFit: "cover" }}
        />
        <Box flex={1}>
          <Typography fontWeight={700}>{nombre}</Typography>

          {!open ? (
            <Button onClick={() => setOpen(true)} variant="contained" sx={{ mt: 1 }}>
              Calificar
            </Button>
          ) : (
            <Box mt={1}>
              <StarRating value={rating} onChange={setRating} />
              <TextField
                fullWidth
                multiline
                minRows={3}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Reseña (opcional)"
                sx={{ mt: 1 }}
              />
              <Box mt={1} display="flex" gap={1}>
                <Button variant="contained" onClick={enviar} disabled={loading}>
                  {loading ? <CircularProgress size={16} /> : "Enviar"}
                </Button>
                <Button onClick={() => setOpen(false)}>Cancelar</Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  );
}

/* ================= MAIN ================= */
export default function CalificarCompras({ tipo = "tienda" }) {
  const { user, isLoading } = useAuth0();

  const [strapiUserId, setStrapiUserId] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  /* -------- 1️⃣ resolver usuario strapi por email -------- */
  useEffect(() => {
    if (isLoading || !user?.email) return;

    const fetchStrapiUser = async () => {
      const q = new URLSearchParams();
      q.append("filters[email][$eq]", user.email);

      const res = await fetch(`${STRAPI}/api/users?${q}`);
      const json = await res.json();

      if (Array.isArray(json) && json.length > 0) {
        setStrapiUserId(json[0].id);
      } else {
        console.error("Usuario no existe en Strapi");
      }
    };

    fetchStrapiUser();
  }, [user, isLoading]);

  /* -------- 2️⃣ pedidos pendientes -------- */
  const fetchPedidos = useCallback(async () => {
    if (!strapiUserId) return;

    setLoading(true);
    const q = new URLSearchParams();
    q.append("filters[usuario][id][$eq]", strapiUserId);
    q.append("filters[finalizado][$eq]", "true");
    q.append("filters[calificado][$eq]", "false");
    q.append("filters[tipo][$eq]", tipo);
    q.append("populate", "item.producto");

    const res = await fetch(`${STRAPI}/api/pedidos?${q}`);
    const json = await res.json();

    setPedidos(json.data || []);
    setLoading(false);
  }, [strapiUserId, tipo]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const onItemDone = (pedidoId, itemIndex) => {
    setPedidos((prev) =>
      prev.map((p) => {
        if (p.id !== pedidoId) return p;
        const items = [...p.attributes.item];
        items[itemIndex] = { ...items[itemIndex], calificado: true };
        return { ...p, attributes: { ...p.attributes, item: items } };
      })
    );
  };

  /* -------- render -------- */
  if (isLoading || loading)
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );

  if (pedidos.length === 0)
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>No tienes pedidos por calificar.</Typography>
      </Paper>
    );

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={800} mb={2}>
        Calificar compras
      </Typography>

      <Grid container spacing={2}>
        {pedidos.map((pedido) =>
          pedido.attributes.item.map((item, idx) =>
            item.calificado ? null : (
              <Grid item xs={12} md={6} key={`${pedido.id}-${idx}`}>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <CalificarItem
                    pedido={pedido}
                    item={item}
                    itemIndex={idx}
                    userId={strapiUserId}
                    onDone={onItemDone}
                  />
                </motion.div>
              </Grid>
            )
          )
        )}
      </Grid>
    </Container>
  );
}
