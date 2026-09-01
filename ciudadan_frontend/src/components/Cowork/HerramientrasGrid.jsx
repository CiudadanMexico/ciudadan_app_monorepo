import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FolderIcon from '@mui/icons-material/Folder';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AddTaskIcon from '@mui/icons-material/AddTask';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PsychologyIcon from '@mui/icons-material/Psychology';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import { useRoles } from '../../Contexts/RolesContext.jsx';

const neonGreen = '#00ff99';
const darkGray = '#1a1a1a';

const ToolCard = styled(Paper)(({ theme }) => ({
  backgroundColor: darkGray,
  color: 'white',
  padding: theme.spacing(2),
  textAlign: 'center',
  cursor: 'pointer',
  border: `1px solid ${neonGreen}`,
  borderRadius: 8,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: `0 0 15px ${neonGreen}`,
    transform: 'translateY(-3px)',
  },
}));

// Herramientas fijas del panel: son enlaces a componentes a cargar, no datos
// dinámicos, así que ya no se traen de Strapi (categorias-herramientas) —
// esa consulta no aportaba nada y complicaba montar el proyecto desde cero
// en cada despliegue (había que sembrar esa coleccion a mano).
// soloAdminSocio: true oculta la herramienta para usuarios sin permiso CRUD.
const HERRAMIENTAS = [
  { slug: 'calificar-tarea', name: 'Calificar Tarea', icon: <CheckCircleIcon fontSize="large" />, soloAdminSocio: true },
  { slug: 'corregir-tarea', name: 'Corregir Tarea', icon: <BuildCircleIcon fontSize="large" />, soloAdminSocio: true },
  { slug: 'gestionar-tareas', name: 'Gestionar Tareas', icon: <ListAltIcon fontSize="large" />, soloAdminSocio: true },
  { slug: 'mi-agencia', name: 'Mi Agencia', icon: <AccountBalanceIcon fontSize="large" />, soloAdminSocio: false },
  { slug: 'agregar-tarea', name: 'Agregar Tarea', icon: <AddTaskIcon fontSize="large" />, soloAdminSocio: true },
  { slug: 'agregar-socio', name: 'Agregar Socio', icon: <PersonAddIcon fontSize="large" />, soloAdminSocio: true },
  { slug: 'asignar-tarea', name: 'Asignar Tarea', icon: <AssignmentIndIcon fontSize="large" />, soloAdminSocio: false },
  { slug: 'gestionar-habilidades', name: 'Gestionar Habilidades', icon: <PsychologyIcon fontSize="large" />, soloAdminSocio: true },
  { slug: 'verificar-usuarios', name: 'Verificar Usuarios', icon: <VerifiedUserIcon fontSize="large" />, soloAdminSocio: false },
  { slug: 'carpetas-enlaces', name: 'Carpetas y Enlaces', icon: <FolderIcon fontSize="large" />, soloAdminSocio: false },
  { slug: 'conductores', name: 'Conductores', icon: <DirectionsCarIcon fontSize="large" />, soloAdminSocio: false },
];

const HerramientasGrid = () => {
  const { isAdmin, isSocio } = useRoles();
  const tienePermisoCRUD = isAdmin() || isSocio();

  const herramientas = HERRAMIENTAS.filter((tool) => !tool.soloAdminSocio || tienePermisoCRUD).map(
    (tool) => ({ ...tool, id: tool.slug, link: `/herramientas/${tool.slug}` })
  );

  return (
    <Box sx={{ flexGrow: 1, mt: 2 }}>
      {herramientas.length === 0 ? (
        <Typography align="center" color="text.secondary">
          No hay herramientas disponibles
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {herramientas.map((tool) => {
            const onClick = (e) => {
              if (!tool.link) return;
              e.preventDefault();
              window.history.pushState({}, '', tool.link);
              window.dispatchEvent(new PopStateEvent('popstate'));
            };
            return (
              <Grid item xs={6} sm={3} key={tool.id}>
                <ToolCard onClick={onClick}>
                  <Box sx={{ mb: 1 }}>{tool.icon}</Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {tool.name}
                  </Typography>
                </ToolCard>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default HerramientasGrid;
