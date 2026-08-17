import React, {
  useEffect,
  useState
} from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Container,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from "@mui/material";

import {
  LocalOffer,
  Search,
  Restaurant
} from "@mui/icons-material";

import useOfertasComida from "../../hooks/food/useOfertasComida";

import OfertaDetalleCliente from "../../components/Food/OfertaDetalleCliente";
import OfertaCard from "../../components/Food/OfertaCard";


const ComidaOfertas = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { obtenerOfertas, loading, error } = useOfertasComida();


  const [ofertas, setOfertas] = useState([]);
  const [search, setSearch] = useState("");
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState(null);

  const cargarOfertas = async () => {
    const data = await obtenerOfertas({ search });
    setOfertas(data);
  };

  useEffect(() => {
    cargarOfertas();
  }, []);

  /*
   * Búsqueda con pequeño debounce
   */
  useEffect(() => {
    const timeout = setTimeout(() => {
      cargarOfertas();
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#fafafa",
        py: {
          xs: 2,
          sm: 4,
          md: 6
        }
      }}
    >
      <Container maxWidth="xl">
        {/* HERO */}
        <Box
          sx={{
            textAlign: "center",
            mb: {
              xs: 3,
              sm: 5
            }
          }}
        >
          <Chip
            icon={<LocalOffer />}
            label="Promociones especiales"
            color="primary"
            sx={{
              mb: 2,
              fontWeight: 600
            }}
          />
          <Typography
            component="h1"
            sx={{
              fontSize: {
                xs: "1.8rem",
                sm: "2.4rem",
                md: "3rem"
              },
              fontWeight: 800
            }}
          >
            Ofertas gastronómicas
          </Typography>
          <Typography
            color="text.secondary"
            sx={{
              mt: 1,
              maxWidth: 650,
              mx: "auto",
              fontSize: {
                xs: "0.9rem",
                sm: "1rem"
              }
            }}
          >
            Descubre combos, promociones y ofertas especiales de nuestros restaurantes.
          </Typography>
        </Box>
        {/* BUSCADOR */}
        <Box
          sx={{
            maxWidth: 700,
            mx: "auto",
            mb: {
              xs: 3,
              sm: 5
            }
          }}
        >
          <TextField
            fullWidth
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Buscar oferta o restaurante..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
            sx={{
              backgroundColor: "white",
              "& .MuiOutlinedInput-root": {
                borderRadius: 3
              }
            }}
          />
        </Box>
        {/* ERROR */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            No fue posible cargar las ofertas.
          </Alert>
        )}
        {/* LOADING */}
        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 8
            }}
          >
            <CircularProgress />
          </Box>
        )}
        {/* RESULTADOS */}
        {!loading && (
          <>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                Ofertas disponibles
              </Typography>
              <Typography variant="body2" color="text.secondary" >
                {ofertas.length}{" "}
                {ofertas.length === 1 ? "oferta" : "ofertas"}
              </Typography>
            </Box>
            {
              ofertas.length === 0 ? (
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 3,
                    textAlign: "center",
                    py: 7
                  }}
                >
                  <LocalOffer
                    sx={{
                      fontSize: 50,
                      color: "text.disabled"
                    }}
                  />
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ mt: 1 }}
                  >
                    No encontramos ofertas
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }} >
                    Intenta buscar con otro término.
                  </Typography>
                </Card>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(3, 1fr)",
                      lg: "repeat(4, 1fr)"
                    },
                    gap: {
                      xs: 2,
                      sm: 2.5,
                      md: 3
                    }
                  }}
                >
                  {
                    ofertas.map((oferta) => (
                      <OfertaCard
                        key={oferta.id}
                        oferta={oferta}
                        onClick={() =>
                          setOfertaSeleccionada(oferta)
                        }
                      />
                    ))}
                </Box>
              )}
          </>
        )}
      </Container>
      {/* DETALLE */}
      <OfertaDetalleCliente
        oferta={ofertaSeleccionada}
        open={Boolean(ofertaSeleccionada)}
        onClose={() =>
          setOfertaSeleccionada(null)
        }
      />
    </Box>
  );
};


export default ComidaOfertas;