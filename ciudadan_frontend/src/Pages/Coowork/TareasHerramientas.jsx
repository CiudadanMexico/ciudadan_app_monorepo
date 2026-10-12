// src/Pages/Coowork/TareasHerramientas.jsx
// Hub de la categoría "Tareas": agrupa calificar, corregir, gestionar,
// agregar y asignar tarea. Al darle muestra todas esas opciones.
// Estética de marca: fondo oscuro #0d0b1a, morado #8A5CF5 / #6A3FCB,
// Space Grotesk (igual que /candidatos).
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid2 as Grid, Card, CardActionArea, CardContent, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AddTaskIcon from '@mui/icons-material/AddTask';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const MORADO = '#8A5CF5';
const MORADO_OSCURO = '#6A3FCB';
const fondo = '#0d0b1a';
const cardBg = 'rgba(138,92,245,0.06)';
const cardBorder = 'rgba(138,92,245,0.28)';
const fontStack = '"Space Grotesk", "Poppins", system-ui, sans-serif';

const TAREAS = [
  {
    titulo: 'Calificar Tarea',
    desc: 'Califica las tareas completadas.',
    icon: <CheckCircleIcon sx={{ fontSize: 42, color: MORADO }} />,
    slug: 'calificar-tarea',
  },
  {
    titulo: 'Corregir Tarea',
    desc: 'Envía tareas a corrección.',
    icon: <BuildCircleIcon sx={{ fontSize: 42, color: MORADO }} />,
    slug: 'corregir-tarea',
  },
  {
    titulo: 'Gestionar Tareas',
    desc: 'Administra las tareas de la agencia.',
    icon: <ListAltIcon sx={{ fontSize: 42, color: MORADO }} />,
    slug: 'gestionar-tareas',
  },
  {
    titulo: 'Agregar Tarea',
    desc: 'Crea una tarea nueva.',
    icon: <AddTaskIcon sx={{ fontSize: 42, color: MORADO }} />,
    slug: 'agregar-tarea',
  },
  {
    titulo: 'Asignar Tarea',
    desc: 'Asigna tareas a los socios.',
    icon: <AssignmentIndIcon sx={{ fontSize: 42, color: MORADO }} />,
    slug: 'asignar-tarea',
  },
];

export default function TareasHerramientas() {
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
          <span style={{ color: MORADO }}>Tareas</span>
        </Typography>
        <Typography color="#cfcfe6" sx={{ mb: 4, fontFamily: fontStack }}>
          Herramientas para crear, asignar, gestionar, corregir y calificar tareas.
        </Typography>

        <Grid container spacing={3}>
          {TAREAS.map((t) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.slug}>
              <Card
                sx={{
                  bgcolor: cardBg,
                  color: '#fff',
                  height: '100%',
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 3,
                  transition: 'box-shadow .25s ease, transform .15s ease, border-color .25s ease',
                  '&:hover': {
                    boxShadow: `0 0 18px rgba(138,92,245,0.45)`,
                    borderColor: MORADO,
                    transform: 'translateY(-3px)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(`/coowork/admin/herramientas/tareas/${t.slug}`)}
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
                      <Box sx={{ display: 'flex', color: '#fff' }}>{React.cloneElement(t.icon, { sx: { fontSize: 26, color: '#fff' } })}</Box>
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ fontFamily: fontStack }}>
                      {t.titulo}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5, fontFamily: fontStack }}>
                      {t.desc}
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
