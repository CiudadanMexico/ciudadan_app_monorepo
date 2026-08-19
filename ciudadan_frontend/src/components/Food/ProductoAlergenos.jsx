import { Box, Button, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import React from 'react';

function ProductoAlergenos({
  alergenos = [],
  isMobileDevice = false,
  handleChangeAlergenos,
  handleAddAlergeno,
  handleDeleteAlergeno,
}) {
  return (
    <>
      <Typography>Registra alergenos</Typography>
      {
        alergenos.map((alergeno, index) => (
          <Box key={`alergeno-list-item-${index}`} display='flex' alignItems='center' gap={1} flexWrap='wrap'>
            <TextField
              className="input-text"
              label="Nombre"
              name="name"
              value={alergeno}
              onChange={(e) => handleChangeAlergenos(e.target.value, index)}
              sx={{ width: isMobileDevice ? '100%' : '80%' }}
            />
            <Button
              variant="contained"
              color='error'
              onClick={() => handleDeleteAlergeno(index)}
              sx={{
                width: isMobileDevice ? '100%' : '10%',
                height: {
                  xs: 35,
                  md: 55
                }
              }}
            >
              <DeleteIcon />
            </Button>
          </Box>
        ))
      }
      <Button
        variant="contained"
        onClick={() => handleAddAlergeno()}
      >
        <AddIcon />
        <Typography sx={{ textTransform: 'capitalize' }}>
          Agregar
        </Typography>
      </Button>
    </>
  )
}

export default ProductoAlergenos