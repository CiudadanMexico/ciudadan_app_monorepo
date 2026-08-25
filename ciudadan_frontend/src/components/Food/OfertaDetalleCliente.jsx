import React from "react";

import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography
} from "@mui/material";

import {
  Close,
  LocalOffer
} from "@mui/icons-material";

const OfertaDetalleCliente = ({ oferta, open, onClose }) => {
  if (!oferta) {
    return null;
  }

  const attributes = oferta?.attributes ?? {};
  const items = attributes?.items ?? [];
  const precioOferta = Number(attributes?.precio ?? 0);

  return (

    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={window.innerWidth < 600}
      PaperProps={{
        sx: {
          borderRadius: {
            xs: 0,
            sm: 3
          }
        }
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2
        }}
      >
        <Box>
          <Chip
            icon={<LocalOffer />}
            label="Oferta"
            size="small"
            color="primary"
            sx={{ mb: 1 }}
          />
          <Typography variant="h5" fontWeight={800}>
            {attributes.titulo}
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {
          attributes.descripcion && (
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {attributes.descripcion}
            </Typography>
          )
        }
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
          Esta oferta incluye
        </Typography>
        <Stack spacing={2}>
          {
            items.map((item, index) => {
              const producto = item?.product?.data;
              const productoAttributes = producto?.attributes || {};
              const modificadores = item?.food_modifiers?.data || [];

              return (
                <Box key={index}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 2
                    }}
                  >
                    <Typography fontWeight={600}>
                      {item.cantidad}×{" "}{productoAttributes.nombre ?? "Platillo"}
                    </Typography>
                    <Typography color="text.secondary">
                      $ {Number(item.precio ?? 0).toFixed(2)}
                    </Typography>
                  </Box>
                  {
                    modificadores.length > 0 && (
                      <Box
                        sx={{
                          mt: 1,
                          pl: 2
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" >
                          Incluye:
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          flexWrap="wrap"
                          useFlexGap
                          sx={{ mt: 0.5 }}
                        >
                          {
                            modificadores.map((modifier) => {
                              const modifierAttributes = modifier?.attributes ?? {};
                              return (
                                <Chip
                                  key={modifier.id}
                                  size="small"
                                  variant="outlined"
                                  label={modifierAttributes?.nombre}
                                />
                              );
                            })
                          }
                        </Stack>
                      </Box>
                    )
                  }
                </Box>
              );
            })
          }
        </Stack>
        <Divider sx={{ my: 3 }} />
        <Box
          sx={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center"
          }}
        >
          <Typography variant="h6" fontWeight={700} >
            Precio de la oferta
          </Typography>
          <Typography variant="h4" fontWeight={800} >
            ${precioOferta.toFixed(2)}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          p: 2
        }}
      >
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onClose}
          sx={{
            borderRadius: 2
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};


export default OfertaDetalleCliente;