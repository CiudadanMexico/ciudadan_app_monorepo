import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Checkbox,
  FormControlLabel,
  Chip,
  Divider,
  Alert,
} from '@mui/material';

import TuneIcon from '@mui/icons-material/Tune';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ProductoModificadores = ({
  modifierGroups = [],
  selectedModifiers = [],
  setSelectedModifiers,
}) => {

  const toggleModifier = (modifierId) => {
    setSelectedModifiers((prev) => {

      const exists = prev.includes(modifierId);

      if (exists) {
        return prev.filter(
          id => id !== modifierId
        );
      }

      return [
        ...prev,
        modifierId
      ];
    });
  };

  const isSelected = (modifierId) =>
    selectedModifiers.includes(modifierId);

  return (
    <Box>

      {/* HEADER */}
      <Box
        sx={{
          display: 'flex',
          alignItems: {
            xs: 'flex-start',
            sm: 'center',
          },
          gap: 1.5,
          mb: 1,
        }}
      >
        <TuneIcon color="primary" />

        <Box>
          <Typography
            variant="h6"
            fontWeight={700}
          >
            Modificadores del producto
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
          >
            Selecciona las opciones que el cliente podrá
            personalizar al realizar su pedido.
          </Typography>
        </Box>
      </Box>

      <Alert
        severity="info"
        sx={{ mb: 3 }}
      >
        Los modificadores se administran desde el módulo
        de modificadores del restaurante. Aquí solamente
        seleccionas cuáles estarán disponibles para este
        producto.
      </Alert>

      {/* SIN GRUPOS */}
      {modifierGroups.length === 0 && (
        <Card
          variant="outlined"
          sx={{
            borderStyle: 'dashed',
          }}
        >
          <CardContent
            sx={{
              py: 5,
              textAlign: 'center',
            }}
          >
            <TuneIcon
              sx={{
                fontSize: 45,
                color: 'text.disabled',
                mb: 1,
              }}
            />

            <Typography
              variant="h6"
              fontWeight={600}
            >
              No hay modificadores disponibles
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Primero debes crear grupos y modificadores
              para tu restaurante.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* GRUPOS */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >

        {modifierGroups.map((group) => {

          const modifiers =
            group.modificadores ||
            group.food_modifiers ||
            [];

          return (
            <Card
              key={group.id}
              variant="outlined"
              sx={{
                borderRadius: 2,
              }}
            >

              <CardContent>

                {/* GRUPO */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 2,
                  }}
                >

                  <Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                    >
                      {group.nombre}
                    </Typography>

                    {group.descripcion && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {group.descripcion}
                      </Typography>
                    )}
                  </Box>

                  <Chip
                    size="small"
                    icon={<CheckCircleIcon />}
                    label={
                      modifiers.filter(
                        modifier =>
                          isSelected(modifier.id)
                      ).length
                    }
                    color="primary"
                    variant="outlined"
                  />

                </Box>

                <Divider sx={{ my: 2 }} />

                {/* MODIFICADORES */}
                {modifiers.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Este grupo no tiene modificadores.
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: '1fr 1fr',
                      },
                      gap: 1,
                    }}
                  >

                    {modifiers.map((modifier) => {

                      const selected =
                        isSelected(modifier.id);

                      return (
                        <Box
                          key={modifier.id}
                          sx={{
                            border: '1px solid',
                            borderColor: selected
                              ? 'primary.main'
                              : 'divider',
                            borderRadius: 2,
                            p: 1,
                            transition: 'all 0.2s',
                            bgcolor: selected
                              ? 'action.selected'
                              : 'transparent',
                          }}
                        >

                          <FormControlLabel
                            sx={{
                              width: '100%',
                              m: 0,
                              alignItems: 'flex-start',
                            }}
                            control={
                              <Checkbox
                                checked={selected}
                                onChange={() =>
                                  toggleModifier(
                                    modifier.id
                                  )
                                }
                              />
                            }
                            label={
                              <Box sx={{ pt: 0.5 }}>
                                <Typography
                                  variant="body2"
                                  fontWeight={
                                    selected
                                      ? 700
                                      : 500
                                  }
                                >
                                  {modifier.nombre}
                                </Typography>

                                {modifier.descripcion && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    {modifier.descripcion}
                                  </Typography>
                                )}

                                {modifier.precio !==
                                  undefined && (
                                  <Typography
                                    variant="caption"
                                    color="primary"
                                    fontWeight={700}
                                  >
                                    {Number(
                                      modifier.precio
                                    ) > 0
                                      ? `+$${Number(
                                          modifier.precio
                                        ).toFixed(2)}`
                                      : 'Sin costo'}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />

                        </Box>
                      );
                    })}

                  </Box>
                )}

              </CardContent>
            </Card>
          );
        })}

      </Box>

      {/* RESUMEN */}
      {selectedModifiers.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="success">
            <Typography
              variant="body2"
              fontWeight={600}
            >
              {selectedModifiers.length}{' '}
              {selectedModifiers.length === 1
                ? 'modificador seleccionado'
                : 'modificadores seleccionados'}
            </Typography>
          </Alert>
        </Box>
      )}

    </Box>
  );
};

export default ProductoModificadores;