// src/Pages/Coowork/HabilidadesHub.jsx
// Categoría "Gestionar Habilidades": agrupa Agregar Habilidades (lista
// actual + nueva habilidad) y Verificar Habilidades de Usuario (lo que era
// "Verificar Usuarios"). Al darle muestra las dos opciones.
// Estética de marca: fondo oscuro #0d0b1a, morado #8A5CF5 / #6A3FCB.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid2 as Grid, Card, CardActionArea, CardContent, Button } from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const MORADO = '#8A5CF5';
const MORADO_OSCURO = '#6A3FCB';
const fondo = '#0d0b1a';
const cardBg = 'rgba(138,92,245,0.06)';
const cardBorder = 'rgba(138,92,245,0.28)';
const fontStack = '"Space Grotesk", "Poppins", system-ui, sans-serif';

const OPCIONES = [
  {
    titulo: 'Agregar Habilidades',
    desc: 'Crea y administra las habilidades disponibles.',
    icon: <PsychologyIcon sx={{ fontSize: 26, color: '#fff' }} />,
    slug: 'agregar',
  },
  {
    titulo: 'Verificar Habilidades de Usuario',
    desc: 'Revisa y verifica las habilidades que suben los usuarios.',
    icon: <VerifiedUserIcon sx={{ fontSize: 26, color: '#fff' }} />,
    slug: 'verificar',
  },
];

export default function HabilidadesHub() {
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

        <Typography variant="h4" fontWeight={900} color="#fff" gutterBottom sx={{ fontFamily: fontStack }}>
          Gestionar <span style={{ color: MORADO }}>Habilidades</span>
        </Typography>
        <Typography color="#cfcfe6" sx={{ mb: 4, fontFamily: fontStack }}>
          Crea habilidades y verifica las que suben los usuarios.
        </Typography>

        <Grid container spacing={3}>
          {OPCIONES.map((o) => (
            <Grid size={{ xs: 12, sm: 6 }} key={o.slug}>
              <Card
                sx={{
                  bgcolor: cardBg,
                  color: '#fff',
                  height: '100%',
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 3,
                  transition: 'box-shadow .25s ease, transform .15s ease, border-color .25s ease',
                  '&:hover': {
                    boxShadow: '0 0 18px rgba(138,92,245,0.45)',
                    borderColor: MORADO,
                    transform: 'translateY(-3px)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(`/coowork/admin/herramientas/habilidades/${o.slug}`)}
                  sx={{ height: '100%', p: 3 }}
                >
                  <CardContent sx={{ p: 0 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1.5,
                        background: `linear-gradient(135deg, ${MORADO} 0%, ${MORADO_OSCURO} 100%)`,
                        boxShadow: '0 0 14px rgba(138,92,245,0.4)',
                      }}
                    >
                      {o.icon}
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ fontFamily: fontStack }}>
                      {o.titulo}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5, fontFamily: fontStack }}>
                      {o.desc}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
