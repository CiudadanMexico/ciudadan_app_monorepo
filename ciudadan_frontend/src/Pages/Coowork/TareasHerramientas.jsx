// src/Pages/Coowork/TareasHerramientas.jsx
// Hub de la categoría "Tareas": agrupa calificar, corregir, gestionar,
// agregar y asignar tarea. Al darle muestra todas esas opciones.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid2 as Grid, Card, CardActionArea, CardContent, Button } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AddTaskIcon from '@mui/icons-material/AddTask';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const darkGray = '#002200';
const neonGreen = '#00ff99';

const TAREAS = [
  {
    titulo: 'Calificar Tarea',
    desc: 'Califica las tareas completadas.',
    icon: <CheckCircleIcon sx={{ fontSize: 40, color: neonGreen }} />,
    slug: 'calificar-tarea',
  },
  {
    titulo: 'Corregir Tarea',
    desc: 'Envía tareas a corrección.',
    icon: <BuildCircleIcon sx={{ fontSize: 40, color: neonGreen }} />,
    slug: 'corregir-tarea',
  },
  {
    titulo: 'Gestionar Tareas',
    desc: 'Administra las tareas de la agencia.',
    icon: <ListAltIcon sx={{ fontSize: 40, color: neonGreen }} />,
    slug: 'gestionar-tareas',
  },
  {
    titulo: 'Agregar Tarea',
    desc: 'Crea una tarea nueva.',
    icon: <AddTaskIcon sx={{ fontSize: 40, color: neonGreen }} />,
    slug: 'agregar-tarea',
  },
  {
    titulo: 'Asignar Tarea',
    desc: 'Asigna tareas a los socios.',
    icon: <AssignmentIndIcon sx={{ fontSize: 40, color: neonGreen }} />,
    slug: 'asignar-tarea',
  },
];

export default function TareasHerramientas() {
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
        Tareas
      </Typography>
      <Typography color="#ccc" sx={{ mb: 3 }}>
        Herramientas para crear, asignar, gestionar, corregir y calificar tareas.
      </Typography>

      <Grid container spacing={3}>
        {TAREAS.map((t) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.slug}>
            <Card sx={{ bgcolor: darkGray, color: '#fff', height: '100%', border: '1px solid #0a3d0a' }}>
              <CardActionArea
                onClick={() => navigate(`/coowork/herramientas/tareas/${t.slug}`)}
                sx={{ height: '100%' }}
              >
                <CardContent>
                  <Box sx={{ mb: 1 }}>{t.icon}</Box>
                  <Typography variant="h6" fontWeight={700}>
                    {t.titulo}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.75, mt: 1 }}>
                    {t.desc}
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
