import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const Paso3 = ({
  handleImagenPredeterminada,
  eliminarImagenPredeterminada,
  previewImagenPredeterminada,
  imagenError,
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Imagen principal
      </Typography>
      <Button
        variant="contained"
        component="label"
        color="primary"
        sx={{ mt: 1, mb: 2 }}
      >
        Subir Imagen Principal
        <input
          hidden
          accept="image/*"
          type="file"
          onChange={handleImagenPredeterminada}
        />
      </Button>

      {imagenError && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          Debes subir una imagen predeterminada
        </Typography>
      )}

      {previewImagenPredeterminada && (
        <Box
          mt={2}
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <Box
            component="img"
            src={previewImagenPredeterminada}
            alt="Imagen Principal"
            sx={{
              width: 120,
              height: 120,
              objectFit: 'cover',
              borderRadius: 2,
              border: '2px solid #6d6e71',
              boxShadow: 2,
            }}
          />
          <Button
            variant="outlined"
            color="error"
            onClick={eliminarImagenPredeterminada}
          >
            Eliminar
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Paso3;
