import { LocalOffer, Restaurant } from "@mui/icons-material";
import { Box, Button, Card, CardContent, CardMedia, Chip, Stack, Typography } from "@mui/material";

const API_URL = process.env.REACT_APP_STRAPI_URL;

const OfertaCard = ({
  oferta,
  onClick
}) => {
  console.log("Oferta:", oferta)
  const attributes = oferta?.attributes ?? {};
  const items = attributes?.items ?? [];

  /*
   * Precio original aproximado
   */
  const precioOriginal = items?.reduce((total, item) => {
    const cantidad = Number(item?.cantidad ?? 1);
    const precio = Number(item?.precio ?? 0);
    return total + cantidad * precio;
  }, 0);

  const precioOferta = Number(attributes?.precio ?? 0);
  const descuento = precioOriginal > precioOferta ? Math.round(((precioOriginal - precioOferta) / precioOriginal) * 100) : 0;

  /*
   * Imagen del primer producto
   */
  const primerItem = items[0];
  const producto = primerItem?.product?.data;
  const imagen = producto?.attributes?.imagen_predeterminada?.data?.attributes?.url;
  const imagenUrl = imagen ? `${API_URL}${imagen}` : null;
  const restaurante = attributes.restaurante?.data;
  const nombreRestaurante = restaurante?.attributes?.slug ?? "Restaurante";

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        overflow: "hidden",
        transition: "transform .2s ease, box-shadow .2s ease",

        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow:
            "0 8px 24px rgba(0,0,0,.12)"
        }
      }}
    >
      {/* IMAGEN */}
      <Box
        sx={{
          position: "relative",
          aspectRatio: "16 / 10",
          backgroundColor: "#eeeeee"
        }}
      >
        {imagenUrl ? (
          <CardMedia
            component="img"
            image={imagenUrl}
            alt={attributes.titulo}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        ) : (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <LocalOffer
              sx={{
                fontSize: 50,
                color: "text.disabled"
              }}
            />
          </Box>
        )}
        {descuento > 0 && (
          <Chip
            label={`-${descuento}%`}
            color="error"
            size="small"
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
              fontWeight: 800
            }}
          />
        )}
      </Box>
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1
        }}
      >
        {/* RESTAURANTE */}
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{ mb: 0.75 }}
        >
          <Restaurant
            sx={{
              fontSize: 17,
              color: "text.secondary"
            }}
          />
          <Typography variant="caption" color="text.secondary" noWrap >
            {nombreRestaurante}
          </Typography>
        </Stack>
        {/* TITULO */}
        <Typography
          variant="h6"
          fontWeight={750}
          sx={{
            lineHeight: 1.25,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}
        >
          {attributes.titulo}
        </Typography>
        {/* DESCRIPCION */}
        {attributes.descripcion && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.75,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}
          >
            {attributes.descripcion}
          </Typography>
        )}
        {/* PRODUCTOS */}
        <Box
          sx={{
            mt: 1.5,
            flex: 1
          }}
        >
          {items.slice(0, 3).map(
            (item, index) => {
              const itemProducto = item.producto?.data;
              const nombre = itemProducto?.attributes?.nombre ?? "Platillo";
              return (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{
                    mb: 0.35
                  }}
                >
                  <strong>{item.cantidad}×</strong>{" "}{nombre}
                </Typography>
              );
            }
          )}
          {items.length > 3 && (
            <Typography variant="caption" color="text.secondary" >
              +{items.length - 3} productos más
            </Typography>

          )}
        </Box>
        {/* PRECIO */}
        <Box
          sx={{
            mt: 2
          }}
        >
          {precioOriginal > precioOferta && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  textDecoration:
                    "line-through"
                }}
              >
                ${precioOriginal.toFixed(2)}
              </Typography>
            )}
          <Typography variant="h5" fontWeight={800} >
            ${precioOferta.toFixed(2)}
          </Typography>
        </Box>
        {/* BUTTON */}
        <Button
          fullWidth
          variant="contained"
          onClick={onClick}
          sx={{
            mt: 2,
            borderRadius: 2
          }}
        >
          Ver oferta
        </Button>
      </CardContent>
    </Card>
  );
};

export default OfertaCard;