import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Rating,
  Stack,
  CircularProgress,
} from "@mui/material";
import { useAuth0 } from "@auth0/auth0-react";

const STRAPI = process.env.REACT_APP_STRAPI_URL;

export default function Resenas({ slug }) {
  const { user } = useAuth0();

  const [resenas, setResenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('reseña', slug);
    if (!slug) return;

    const fetchResenas = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1️⃣ obtener producto por slug
        const prodRes = await fetch(
          `${STRAPI}/api/productos?filters[slug][$eq]=${slug}`
        );
        const prodJson = await prodRes.json();
        const producto = prodJson?.data?.[0];

        if (!producto) {
          setResenas([]);
          return;
        }

        const productoId = producto.id;

        // 2️⃣ obtener ratings del producto
        const ratingsRes = await fetch(
          `${STRAPI}/api/ratings?filters[tipo][$eq]=producto&filters[producto][id][$eq]=${productoId}&populate=*`
        );
        const ratingsJson = await ratingsRes.json();
        const ratings = ratingsJson?.data || [];

        // 3️⃣ enriquecer cada rating con usuario real de Strapi
        const resenasFinales = await Promise.all(
          ratings.map(async (r) => {
            const emailUsuario = r.attributes?.email;

            let usuarioData = null;

            if (emailUsuario) {
              const userRes = await fetch(
                `${STRAPI}/api/users?filters[email][$eq]=${emailUsuario}&populate=profilepic`
              );
              const userJson = await userRes.json();
              usuarioData = userJson?.[0] || null;
            }

            return {
              id: r.id,
              texto: r.attributes?.resena || "",
              calificacion: r.attributes?.calificacion || 0,
              estrellas: (r.attributes?.calificacion || 0) / 2,
              usuario: usuarioData
                ? {
                    nombre: usuarioData.username,
                    foto:
                      usuarioData.profilepic?.url
                        ? `${STRAPI}${usuarioData.profilepic.url}`
                        : null,
                  }
                : {
                    nombre: "Usuario",
                    foto: null,
                  },
            };
          })
        );

        setResenas(resenasFinales);
      } catch (err) {
        console.error(err);
        setError("Error cargando reseñas");
      } finally {
        setLoading(false);
      }
    };

    fetchResenas();
  }, [slug, user?.email]);

  if (loading) {
    return (
      <Box textAlign="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" variant="body2">
        {error}
      </Typography>
    );
  }

  if (resenas.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Este producto aún no tiene reseñas.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h5" mb={2}>
        Reseñas
      </Typography>

      {resenas.map((r) => (
        <Paper key={r.id} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" mb={1}>
            <Avatar src={r.usuario.foto}>
              {r.usuario.nombre?.[0]}
            </Avatar>
            <Box>
              <Typography variant="subtitle1">
                {r.usuario.nombre}
              </Typography>
            </Box>
          </Stack>

          <Rating
            value={r.estrellas}
            precision={0.5}
            readOnly
            size="small"
            sx={{ mb: 1 }}
          />

          <Typography variant="body2">{r.texto}</Typography>
        </Paper>
      ))}
    </Box>
  );
}
