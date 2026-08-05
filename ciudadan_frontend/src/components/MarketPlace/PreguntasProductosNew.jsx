import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography
} from "@mui/material";

import { useEffect, useState } from "react";
import usePreguntasProducto from "../../hooks/usePreguntasProductos";
import { useAuth0 } from "@auth0/auth0-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);

dayjs.locale("es");

const PreguntasProductoNew = ({
  productoId,
  usuarioId,
  storeId,
}) => {

  const {
    obtenerPreguntas,
    crearPregunta,
    saving,
    loading,
  } = usePreguntasProducto();

  const { isAuthenticated } = useAuth0();

  const [preguntas, setPreguntas] = useState([]);

  const [texto, setTexto] = useState("");

  const cargarPreguntas = async (product_id) => {

    const data = await obtenerPreguntas(product_id);
    setPreguntas(data);

  }

  useEffect(() => {

    cargarPreguntas(productoId);

  }, [productoId]);

  const guardarPregunta = async () => {

    if (texto.trim() === "") return;

    const nueva = await crearPregunta({

      producto: productoId,
      usuario: usuarioId,
      store: storeId,
      pregunta: texto

    });

    setTexto("");
    setPreguntas(prev => [
      nueva.data,
      ...prev
    ]);

  }

  if (loading) {

    return (

      <Box
        display="flex"
        justifyContent="center"
        py={4}
      >

        <CircularProgress />

      </Box>

    )

  }

  return (

    <Stack spacing={2}>

      {
        isAuthenticated ? (

          <>
            <TextField
              multiline
              rows={3}
              fullWidth
              label="Escribe tu pregunta"
              placeholder="Pregunta cualquier duda sobre este producto..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />

            <Button
              variant="contained"
              onClick={guardarPregunta}
              disabled={saving || texto.trim() === ""}
            >
              {
                saving
                  ? <CircularProgress size={20} color="inherit" />
                  : "Preguntar"
              }
            </Button>
          </>
        ) : (
          <Card
            variant="outlined"
            sx={{
              bgcolor: "grey.50",
              borderStyle: "dashed"
            }}
          >
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700}>¿Tienes alguna duda sobre este producto?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Inicia sesión para realizar preguntas al vendedor.</Typography>
            </CardContent>
          </Card>
        )
      }
      <Divider />
      {
        loading ? (
          <Box display="flex" justifyContent="center" alignItems="center">
            <CircularProgress color="inherit" size={20} title="Cargando" />
          </Box>
        ) :
          preguntas.length === 0 ?
            <Typography>Todavía no existen preguntas respondidas.</Typography>
            :
            preguntas.map((item) => (
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  mb: 2
                }}
                key={`pregunta-item-${item?.id}-producto-${productoId}`}
              >
                <CardContent>
                  <Typography fontWeight={700} color="primary">Pregunta</Typography>
                  <Typography>{item.attributes.pregunta}</Typography>

                  <Typography variant="caption" color="text.secondary">
                    {dayjs(item.attributes.fechapregunta).fromNow()}
                  </Typography>
                  {
                    item?.attributes?.respuesta && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography fontWeight={700} color="success.main">Respuesta</Typography>
                        <Typography>
                          {item.attributes.respuesta}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Respondido {" "}
                          {dayjs(item.attributes.fecha_respuesta).fromNow()}
                        </Typography>
                      </>
                    )
                  }

                </CardContent>
              </Card>
            ))
      }
    </Stack>

  )

}

export default PreguntasProductoNew;