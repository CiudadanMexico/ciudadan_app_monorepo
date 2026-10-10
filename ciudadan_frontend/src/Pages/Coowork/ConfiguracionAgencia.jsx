// src/Pages/Coowork/ConfiguracionAgencia.jsx
// Placeholder de configuración de la agencia (a construir en pasos siguientes).
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const darkGray = '#002200';

export default function ConfiguracionAgencia() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3, maxWidth: 820, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: '#cfcfe6', mb: 2 }}>
        Volver
      </Button>

      <Paper sx={{ p: 5, borderRadius: 3, bgcolor: darkGray, color: '#fff', textAlign: 'center' }}>
        <Typography variant="h5" fontWeight={800} gutterBottom>
          ⚙️ Configuración
        </Typography>
        <Typography sx={{ opacity: 0.75 }}>Aquí va la configuración.</Typography>
      </Paper>
    </Box>
  );
}
