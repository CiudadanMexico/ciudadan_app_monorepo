import React from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

function ProductoIngredientes({
  ingredientes = [],
  unidades = [],
  handleChangeIngrediente,
  handleDeleteIngrediente,
  handleAddIngrediente,
  isMobileDevice=false,
}) {
  return (
    <>
      <Typography>Ingredientes</Typography>
      {
        ingredientes.map((ingrediente, index) => (
          <Box
            key={`ingrediente-list-item-${index}`}
            display="flex"
            gap={1}
            flexWrap="wrap"
            alignItems="center"
            mb={2}
          >
            <TextField
              className="input-text"
              label="Nombre"
              value={ingrediente?.nombre ?? ''}
              onChange={(e) =>
                handleChangeIngrediente("nombre", e.target.value, index)
              }
              sx={{
                width: {
                  xs: "100%",
                  md: "40%"
                }
              }}
            />
            <TextField
              className="input-text"
              label="Cantidad"
              type="number"
              value={ingrediente?.cantidad ?? ''}
              inputProps={{ min: 0 }}
              onChange={(e) =>
                handleChangeIngrediente("cantidad", e.target.value, index)
              }
              min={0}
              sx={{
                width: {
                  xs: "48%",
                  md: "18%"
                }
              }}
            />
            <FormControl
              sx={{
                width: {
                  xs: "48%",
                  md: "25%"
                }
              }}
            >
              <InputLabel>Unidad</InputLabel>
              <Select
                value={ingrediente?.unidad ?? "unidad"}
                label="Unidad"
                onChange={(e) =>
                  handleChangeIngrediente("unidad", e.target.value, index)
                }
              >
                {unidades.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item?.label ?? ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              color="error"
              onClick={() => handleDeleteIngrediente(index)}
              sx={{
                width: {
                  xs: "100%",
                  md: "10%"
                },
                height: {
                  xs: 35,
                  md: 56
                }
              }}
              size={isMobileDevice?'medium':'small'}
            >
              <DeleteIcon />
            </Button>
          </Box>
        ))
      }
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => handleAddIngrediente()}
      >
        <Typography sx={{ textTransform: 'capitalize' }}>
          Agregar
        </Typography>
      </Button>
    </>
  )
}

export default ProductoIngredientes