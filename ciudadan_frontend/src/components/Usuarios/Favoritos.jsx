// src/pages/Favoritos.jsx
import React, { useEffect, useMemo, useState } from "react";
import Pestanas from "../../components/Pestanas.jsx";
import { useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  Button,
  Chip,
  Divider,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { motion } from "framer-motion";

/**
 * Favoritos.jsx (usa Pestanas)
 * - Asegura rutas absolutas en tabs (evita ambigüedades)
 * - Sincroniza tabIndex con location.pathname
 * - Fetch a Strapi v4 con populate=deep,3
 */

const Favoritos = () => {
  const location = useLocation();
  const { user, isLoading } = useAuth0();

  const [tabIndex, setTabIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState(null);

  // basePath para Pestanas — absoluto y sin ambigüedad
  const basePrueba = "/favoritos";

  // IMPORTANTE: uso paths absolutos (empiezan con '/') para que Pestanas calcule absPaths sin sorpresas
  const tabs = [
    { label: "Marketplace", path: "/favoritos/marketplace", tipo: "producto" },
    { label: "Clubs", path: "/favoritos/clubs", tipo: "club" },
    { label: "Contenidos", path: "/favoritos/contenidos", tipo: "contenido" },
    { label: "Cursos", path: "/favoritos/cursos", tipo: "curso" },
  ];

  // responsive
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // sincronizo tabIndex a partir de la URL (más robusto que depender solo de onTabChange)
  useEffect(() => {
    const currentRaw = (location.pathname || "").replace(/\/+$/, "") || "/";
    // busco el mejor match dentro de absPaths generados igual que Pestanas
    const normBase = basePrueba === "/" ? "/" : basePrueba.endsWith("/") ? basePrueba.slice(0, -1) : basePrueba;
    const absPaths = tabs.map((t) => {
      const p = (t.path || "").toString();
      if (!p) return normBase || "/";
      if (p.startsWith("/")) {
        // si path viene como "/marketplace" -> unir con normBase: "/favoritos" + "/marketplace" = "/favoritos/marketplace"
        const joined = `${normBase}${p}`;
        return joined.endsWith("/") && joined !== "/" ? joined.replace(/\/+$/, "") : joined;
      }
      const joined = `${normBase}${p ? "/" + p.replace(/^\/+/, "") : ""}`;
      return joined.endsWith("/") && joined !== "/" ? joined.replace(/\/+$/, "") : joined;
    });

    // best match
    let bestIndex = -1;
    let bestLen = -1;
    absPaths.forEach((pp, i) => {
      const p = (pp || "").replace(/\/+$/, "") || "/";
      if (currentRaw === p) {
        bestIndex = i;
        bestLen = p.length;
      } else if (p !== "/" && currentRaw.startsWith(p + "/")) {
        if (p.length > bestLen) { bestIndex = i; bestLen = p.length; }
      } else if (p !== "/" && currentRaw.startsWith(p)) {
        if (p.length > bestLen) { bestIndex = i; bestLen = p.length; }
      }
    });
    if (bestIndex === -1) bestIndex = 0;
    setTabIndex(bestIndex);
  }, [location.pathname]); // eslint-disable-line

  const currentTipo = useMemo(() => tabs[tabIndex]?.tipo || "producto", [tabIndex]);

  // fetch cada vez que cambia tipo o usuario
  useEffect(() => {
    if (isLoading) return;
    if (!user || !user.email) {
      setItems([]);
      return;
    }

    const fetchFavoritos = async () => {
      setLoadingItems(true);
      setError(null);

      try {
        const baseRaw = process.env.REACT_APP_STRAPI_URL || "";
        const base = baseRaw.replace(/\/+$/, "");
        if (!base) throw new Error("REACT_APP_STRAPI_URL no definido en .env");

        const url = `${base}/api/favoritos?filters[usuario_email][$eq]=${encodeURIComponent(
          user.email
        )}&filters[tipo][$eq]=${encodeURIComponent(currentTipo)}&populate=deep,3&sort[0]=id:desc`;

        const headers = { "Content-Type": "application/json" };
        if (process.env.REACT_APP_STRAPI_TOKEN) {
          headers.Authorization = `Bearer ${process.env.REACT_APP_STRAPI_TOKEN}`;
        }

        const res = await fetch(url, { headers });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Strapi error ${res.status}: ${txt}`);
        }

        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];
        setItems(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error desconocido al obtener favoritos");
        setItems([]);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchFavoritos();
  }, [user, isLoading, currentTipo]);

  // eliminar favorito
  const handleRemove = async (id) => {
    const ok = window.confirm("¿Quitar este favorito?");
    if (!ok) return;

    try {
      const baseRaw = process.env.REACT_APP_STRAPI_URL || "";
      const base = baseRaw.replace(/\/+$/, "");
      if (!base) throw new Error("REACT_APP_STRAPI_URL no definido en .env");

      const headers = { "Content-Type": "application/json" };
      if (process.env.REACT_APP_STRAPI_TOKEN) {
        headers.Authorization = `Bearer ${process.env.REACT_APP_STRAPI_TOKEN}`;
      }

      const res = await fetch(`${base}/api/favoritos/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error al eliminar: ${res.status} ${txt}`);
      }

      setItems((prev) => prev.filter((it) => Number(it.id) !== Number(id)));
    } catch (err) {
      console.error(err);
      alert("No se pudo quitar el favorito: " + (err.message || err));
    }
  };

  if (isLoading) return <p>Cargando autenticación...</p>;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column-reverse" : "row",
        padding: 24,
        gap: 32,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 100%" }}>
        {/* Usamos tu Pestanas — paths absolutos */}
        <Pestanas
          tabs={tabs.map((t) => ({ label: t.label, path: t.path }))}
          basePath={basePrueba}
          onTabChange={(index) => {
            // mantener el estado sincronizado si Pestanas lo reporta
            setTabIndex(index);
          }}
          collapseAt={640}
          backgroundColor="linear-gradient(90deg, #3a0b2e 0%, #5a0f44 50%, #3a0b2e 100%)"
          textColor="#e6d9e2"
          activeColor="#ff4fa3"
        />

        <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: "#fff200",
                    border: "2px solid #6d6e71",
                    display: "inline-block",
                    mr: 1,
                  }}
                />
                Favoritos — {tabs[tabIndex]?.label || "Marketplace"}
              </Typography>

        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: "easeOut" }}
          sx={{
            mt: 3,
            p: { xs: 2, md: 3 },
            borderRadius: 2,
            boxShadow: 3,
            background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.99))",
            border: `1px solid #6d6e71`,
          }}
        >
          <Divider sx={{ mb: 2 }} />

          {loadingItems ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ py: 4 }}>
              <Typography color="error">Error: {error}</Typography>
            </Box>
          ) : items.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography variant="body1">No hay favoritos para mostrar.</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Marca elementos como favoritos para que aparezcan aquí.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {items.map((entry) => {
                const id = entry.id;
                const attrs = entry.attributes || {};

                let usuarioDisplay = "N/A";
                if (attrs.usuario && attrs.usuario.data && attrs.usuario.data.attributes) {
                  const u = attrs.usuario.data.attributes;
                  usuarioDisplay = u.username || u.email || u.nombre || "usuario";
                } else if (attrs.usuario_email) {
                  usuarioDisplay = attrs.usuario_email;
                }

                const tipo = attrs.tipo || currentTipo;
                const publicado = attrs.publishedAt ? "Published" : "Unpublished";

                const titulo =
                  attrs.titulo ||
                  attrs.nombre ||
                  attrs.name ||
                  (attrs.item && attrs.item.data?.attributes?.title) ||
                  `${tipo} #${id}`;

                let imgUrl = null;
                const pickImageFromMedia = (media) => {
                  if (!media) return null;
                  if (Array.isArray(media.data) && media.data[0]?.attributes?.url) {
                    return media.data[0].attributes.url;
                  }
                  if (media.data?.attributes?.url) {
                    return media.data.attributes.url;
                  }
                  return null;
                };

                imgUrl =
                  pickImageFromMedia(attrs.imagen) ||
                  pickImageFromMedia(attrs.preview) ||
                  pickImageFromMedia(attrs.item?.data?.attributes?.imagen);

                if (imgUrl && imgUrl.indexOf("http") !== 0) {
                  const base = (process.env.REACT_APP_STRAPI_URL || "").replace(/\/$/, "");
                  imgUrl = base + imgUrl;
                }

                return (
                  <Grid key={id} item xs={12}>
                    <Card
                      component={motion.div}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      sx={{
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        p: 1.5,
                        borderRadius: 2,
                        border: `1px solid #e6e6e6`,
                      }}
                    >
                      <Avatar
                        variant="rounded"
                        src={imgUrl || undefined}
                        sx={{
                          width: 84,
                          height: 84,
                          bgcolor: imgUrl ? "transparent" : "#fff200",
                          border: "2px solid #6d6e71",
                          color: "#111",
                          fontWeight: 700,
                          ml: 1,
                        }}
                      >
                        {!imgUrl ? (titulo?.charAt(0)?.toUpperCase() || "F") : ""}
                      </Avatar>

                      <CardContent sx={{ flex: 1, py: 0, "&:last-child": { pb: 0 } }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              {titulo}
                            </Typography>

                            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
                              <Chip
                                size="small"
                                label={`tipo: ${tipo}`}
                                sx={{ borderRadius: 1, bgcolor: "#fff200", color: "#000", fontWeight: 600 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                API ID: favorito
                              </Typography>
                            </Box>

                            {attrs.descripcion && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {attrs.descripcion}
                              </Typography>
                            )}

                            <Box sx={{ display: "flex", gap: 2, mt: 1, alignItems: "center" }}>
                              <Typography variant="caption">usuario: {usuarioDisplay}</Typography>
                              <Typography variant="caption">
                                usuario_email: {attrs.usuario_email || "—"}
                              </Typography>
                              <Typography variant="caption">{publicado}</Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-end" }}>
                            <IconButton
                              size="small"
                              onClick={() => handleRemove(id)}
                              sx={{ border: `1px solid #6d6e71` }}
                              title="Quitar favorito"
                            >
                              <DeleteIcon />
                            </IconButton>

                            <Button size="small" variant="outlined" onClick={() => console.log("Ver detalle", tipo, id)}>
                              Ver
                            </Button>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </div>
    </div>
  );
};

export default Favoritos;
