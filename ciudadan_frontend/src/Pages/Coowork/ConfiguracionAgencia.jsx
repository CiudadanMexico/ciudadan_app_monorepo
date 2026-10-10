// src/Pages/Coowork/ConfiguracionAgencia.jsx
// Placeholder de configuración de la agencia (a construir en pasos siguientes).
// Estética de marca: fondo oscuro #0d0b1a, morado #8A5CF5 / #6A3FCB.
import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';

const MORADO = '#8A5CF5';
const MORADO_OSCURO = '#6A3FCB';
const fondo = '#0d0b1a';
const panelBg = 'rgba(138,92,245,0.06)';
const panelBorder = 'rgba(138,92,245,0.28)';
const fontStack = '"Space Grotesk", "Poppins", system-ui, sans-serif';

export default function ConfiguracionAgencia() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: fondo, py: { xs: 4, md: 7 }, px: 2, fontFamily: fontStack }}>
      <Box sx={{ maxWidth: 820, mx: 'auto' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: '#cfcfe6', mb: 2, textTransform: 'none', fontFamily: fontStack }}>
          Volver
        </Button>

        <Paper
          sx={{
            p: 5,
            borderRadius: 4,
            bgcolor: panelBg,
            color: '#fff',
            border: `1px solid ${panelBorder}`,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              background: `linear-gradient(135deg, ${MORADO} 0%, ${MORADO_OSCURO} 100%)`,
              boxShadow: '0 0 18px rgba(138,92,245,0.45)',
              fontSize: 34,
            }}
          >
            ⚙️
          </Box>
          <Typography variant="h5" fontWeight={800} gutterBottom sx={{ fontFamily: fontStack }}>
            <span style={{ color: MORADO }}>Configuración</span>
          </Typography>
          <Typography sx={{ opacity: 0.75, fontFamily: fontStack }}>Aquí va la configuración.</Typography>
        </Paper>
      </Box>
    </Box>
  );
}
