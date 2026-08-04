import { Box, Button, Card, CardContent, Chip, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

function PreguntaProductoCard({
  pregunta,
  onChange,
  onAnswer
}) {
  return (
    <Card
      elevation={2}
      sx={{
        mb: 3,
        borderRadius: 3
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography fontWeight={600}>{pregunta?.attributes.usuario?.data?.attributes?.username}</Typography>
            <Typography variant="caption" color="text.secondary">{dayjs(pregunta?.attributes.fechapregunta).fromNow()}</Typography>
          </Box>
          <Chip
            label={pregunta?.attributes?.status === "respondida" ? "Respondida" : "Pendiente"}
            color={pregunta?.attributes?.status === "respondida" ? "success" : "warning"}
          />
        </Stack>
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">Producto</Typography>
          <Typography fontWeight={500}>{pregunta?.attributes.producto?.data?.attributes?.nombre}</Typography>
        </Box>
        <Box mt={2}>
          <Typography variant="subtitle2" color="primary" >Pregunta</Typography>
          <Typography>{pregunta?.attributes.pregunta}</Typography>
        </Box>
        {
          pregunta?.attributes.status === "respondida" ?
            <Box mt={3}>
              <Typography variant="subtitle2" color="success.main">Respuesta</Typography>
              <Typography>{pregunta?.attributes.respuesta}</Typography>
            </Box>
            :
            <Box mt={3}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Escribir respuesta"
                value={pregunta?.draftAnswer}
                onChange={(e) =>
                  onChange(
                    pregunta?.id,
                    e.target.value
                  )
                }
              />

              <Box
                display="flex"
                justifyContent="flex-end"
                mt={2}
              >

                <Button
                  variant="contained"
                  onClick={() =>
                    onAnswer(pregunta)
                  }
                >
                  Responder
                </Button>
              </Box>
            </Box>
        }
      </CardContent>
    </Card>
  )
}

export default PreguntaProductoCard