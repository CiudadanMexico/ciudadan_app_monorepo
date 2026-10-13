// src/Pages/Coowork/Clientes.jsx
// Página "Clientes" (a construir). Por ahora solo el título.
// Estética de marca: fondo oscuro #0d0b1a, morado #8A5CF5 / #6A3FCB.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const MORADO = '#8A5CF5';
const fondo = '#0d0b1a';
const fontStack = '"Space Grotesk", "Poppins", system-ui, sans-serif';

export default function Clientes() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: fondo, py: { xs: 4, md: 7 }, px: 2, fontFamily: fontStack }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ color: '#cfcfe6', mb: 2, textTransform: 'none', fontFamily: fontStack }}
        >
          Volver
        </Button>

        <Typography variant="h4" fontWeight={900} color="#fff" sx={{ fontFamily: fontStack }}>
          <span style={{ color: MORADO }}>Clientes</span>
        </Typography>
      </Box>
    </Box>
  );
}
