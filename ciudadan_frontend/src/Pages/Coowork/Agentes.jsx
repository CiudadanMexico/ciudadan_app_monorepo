// src/Pages/Coowork/Agentes.jsx
// Agentes: vista de agentes (a construir en pasos posteriores).
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

export default function Agentes() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: fondo,
        py: { xs: 4, md: 7 },
        px: 2,
        fontFamily: fontStack,
      }}
    >
      <Box sx={{ maxWidth: 820, mx: 'auto' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ color: '#cfcfe6', mb: 2, textTransform: 'none', fontFamily: fontStack }}
        >
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
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="12" cy="3.5" r="1.8" fill="#8A5CF5" />
              <line x1="12" y1="5.3" x2="12" y2="7.5" stroke="#8A5CF5" strokeWidth="1.6" strokeLinecap="round" />
              <rect x="4" y="7.5" width="16" height="13" rx="3" fill="#fff" />
              <circle cx="8.5" cy="11.2" r="1.8" fill="#8A5CF5" />
              <circle cx="15.5" cy="11.2" r="1.8" fill="#8A5CF5" />
              <rect x="9" y="14.6" width="6" height="1.8" rx="0.9" fill="#8A5CF5" />
            </svg>
          </Box>

          <Typography variant="h4" fontWeight={900} gutterBottom sx={{ fontFamily: fontStack }}>
            <span style={{ color: MORADO }}>Agentes</span>
          </Typography>

          <Typography sx={{ opacity: 0.75, fontFamily: fontStack }}>
            Vista de agentes.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
