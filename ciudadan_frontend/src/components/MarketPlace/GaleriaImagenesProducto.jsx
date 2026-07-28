import React from 'react';
import { Box, Button, Stack } from '@mui/material';
import productoImg from '../../assets/placeholders/producto.png';
import '../../styles/Producto.css';

const GaleriaImagenesProducto = ({ imagenes, nombre, imagenIndex, setImagenIndex }) => {
  const handlePrev = () => {
    if (!imagenes.length) return;
    setImagenIndex((prev) => (prev === 0 ? imagenes.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (!imagenes.length) return;
    setImagenIndex((prev) => (prev === imagenes.length - 1 ? 0 : prev + 1));
  };

  if (!imagenes.length) imagenes = [productoImg];

  return (
    <Box sx={{ mb: 3 }}>
      <Box className="imagen-principal">
        <img
          src={imagenes[imagenIndex]}
          alt={nombre}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Button onClick={handlePrev} className="boton-previo-siguiente boton-previo">
          <span className="material-icons">keyboard_arrow_left</span>
        </Button>
        <Button onClick={handleNext} className="boton-previo-siguiente boton-siguiente">
          <span className="material-icons">keyboard_arrow_right</span>
        </Button>
      </Box>

      <Stack direction="row" spacing={1} justifyContent="center">
        {imagenes.map((img, idx) => (
          <Box
            key={idx}
            onClick={() => setImagenIndex(idx)}
            className={`thumbnail ${idx === imagenIndex ? 'thumbnail--selected' : ''}`}
          >
            <img src={img} alt={`mini-${nombre}`} loading="lazy" />
          </Box>
        ))}
      </Stack>
    </Box>
  );
};
export default GaleriaImagenesProducto;
