import React, { useMemo } from "react";

import {
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Typography
} from "@mui/material";


const ModificadoresOferta = ({
  grupos = [],
  seleccionados = [],
  onChange,
  loading = false
}) => {

  const isSelected = (modifierId) => {
    return seleccionados.some(
      (id) =>
        String(id) === String(modifierId)
    );
  };


  const handleToggle = (modifierId) => {

    if (isSelected(modifierId)) {

      onChange(
        seleccionados.filter(
          (id) =>
            String(id) !== String(modifierId)
        )
      );

      return;
    }


    onChange([
      ...seleccionados,
      modifierId
    ]);

  };


  if (loading) {

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          py: 3
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );

  }


  if (!grupos.length) {

    return (
      <Typography
        variant="body2"
        color="text.secondary"
      >
        No hay grupos de modificadores disponibles
        para este restaurante.
      </Typography>
    );

  }

  return (

    <Stack spacing={2}>

      {
        grupos.map((grupo) => {
          const attributes = grupo.attributes || {};
          const modifiers = attributes.food_modifiers?.data || [];

          /*
           * No mostramos grupos que no tengan modificadores disponibles.
           */
          if (!modifiers.length) {
            return null;
          }

          return (
            <Paper
              key={grupo.id}
              variant="outlined"
              sx={{
                borderRadius: 2,
                overflow: "hidden"
              }}
            >
              {/* GRUPO */}
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  backgroundColor: "action.hover"
                }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  {attributes.nombre}
                </Typography>
                {attributes.descripcion && (
                  <Typography variant="caption" color="text.secondary">
                    {attributes.descripcion}
                  </Typography>
                )}
              </Box>
              {/* MODIFICADORES */}
              <Box sx={{ p: 1.5 }}>
                <Stack spacing={0.5}>
                  {
                    modifiers.map((modifier) => {

                      const modifierAttributes = modifier?.attributes || {};
                      const selected = isSelected(modifier.id);
                      const precio = Number(modifierAttributes?.precio ?? 0);

                      /*
                       * Solo mostramos modificadores activos y disponibles.
                       */
                      if (modifierAttributes?.activo === false ?? modifierAttributes?.disponible === false) {
                        return null;
                      }
                      return (
                        <FormControlLabel
                          key={modifier.id}
                          control={
                            <Checkbox
                              checked={selected}
                              onChange={() =>
                                handleToggle(modifier.id)
                              }
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" fontWeight={selected ? 600 : 400}>
                                {modifierAttributes.nombre}
                              </Typography>
                              {
                                precio > 0 && (
                                  <Typography variant="caption" color="text.secondary">
                                    +$ {precio.toFixed(2)}
                                  </Typography>
                                )
                              }

                            </Box>
                          }
                          sx={{
                            m: 0,
                            width: "100%"
                          }}
                        />
                      );
                    })
                  }
                </Stack>
              </Box>
            </Paper>
          );
        })
      }
    </Stack>
  );
};


export default ModificadoresOferta;