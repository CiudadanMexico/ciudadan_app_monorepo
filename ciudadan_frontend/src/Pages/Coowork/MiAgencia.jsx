// src/Pages/Coowork/MiAgencia.jsx
// Hub de "Mi Agencia" (categoría): Agregar socio, Capital humano, Configuración.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid2 as Grid, Card, CardActionArea, CardContent } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupsIcon from '@mui/icons-material/Groups';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Button } from '@mui/material';

const darkGray = '#002200';
const neonGreen = '#00ff99';

const secciones = [
  {
    titulo: 'Agregar socio',
    desc: 'Invita o da de alta socios en tu agencia y revisa las invitaciones.',
    icon: <PersonAddIcon sx={{ fontSize: 40, color: neonGreen }} />,
    to: '/coowork/herramientas/mi-agencia/agregar-socio',
  },
  {
    titulo: 'Capital humano',
    desc: 'Socios actuales de la agencia y su historial.',
    icon: <GroupsIcon sx={{ fontSize: 40, color: neonGreen }} />,
    to: '/coowork/herramientas/mi-agencia/capital-humano',
  },
  {
    titulo: 'Configuración',
    desc: 'Ajustes de tu agencia.',
    icon: <SettingsIcon sx={{ fontSize: 40, color: neonGreen }} />,
    to: '/coowork/herramientas/mi-agencia/configuracion',
  },
];

export default function MiAgencia() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ color: '#cfcfe6', mb: 2 }}
      >
        Volver
      </Button>

      <Typography variant="h5" fontWeight={800} color="white" gutterBottom>
        Mi Agencia
      </Typography>
      <Typography color="#ccc" sx={{ mb: 3 }}>
        Administra los socios y la configuración de tu agencia.
      </Typography>

      <Grid container spacing={3}>
        {secciones.map((s) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.titulo}>
            <Card sx={{ bgcolor: darkGray, color: '#fff', height: '100%', border: '1px solid #0a3d0a' }}>
              <CardActionArea onClick={() => navigate(s.to)} sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ mb: 1 }}>{s.icon}</Box>
                  <Typography variant="h6" fontWeight={700}>
                    {s.titulo}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.75, mt: 1 }}>
                    {s.desc}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
