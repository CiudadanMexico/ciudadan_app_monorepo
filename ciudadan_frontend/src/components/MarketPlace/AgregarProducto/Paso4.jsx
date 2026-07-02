import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const Paso4 = ({
  handleImagenes,
  eliminarImagen,
  previewImages = [],
}) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Galería de Imágenes
      </Typography>

      <Button
        variant="contained"
        component="label"
        color="primary"
        sx={{ mt: 1, mb: 2 }}
      >
        Subir Imágenes
        <input
          hidden
          multiple
          accept="image/*"
          type="file"
          onChange={handleImagenes}
        />
      </Button>

      {previewImages.length > 0 && (
        <Box
          mt={2}
          display="flex"
          flexWrap="wrap"
          gap={2}
          justifyContent="center"
        >
          {previewImages.map((src, index) => (
            <Box
              key={index}
              position="relative"
              sx={{
                width: 120,
                height: 120,
                borderRadius: 2,
                overflow: 'hidden',
                border: '2px solid #6d6e71',
                boxShadow: 2,
              }}
            >
              <img
                src={src}
                alt={`preview-${index}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => eliminarImagen(index)}
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  minWidth: 'unset',
                  width: 24,
                  height: 24,
                  padding: 0,
                  fontSize: 12,
                }}
              >
                ✕
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default Paso4;
