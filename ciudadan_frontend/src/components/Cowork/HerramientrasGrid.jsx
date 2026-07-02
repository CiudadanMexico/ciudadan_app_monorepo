import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import AddTaskIcon from '@mui/icons-material/AddTask';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FolderIcon from '@mui/icons-material/Folder';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

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

const herramientasMock = [
  {
    name: 'Agregar Tarea',
    icon: <AddTaskIcon fontSize="large" />,
    link: '/herramientas/agregar-tarea',
  },
  {
    name: 'Calificar Tarea',
    icon: <CheckCircleIcon fontSize="large" />,
    link: '/herramientas/calificar-tarea',
  },
  {
    name: 'Carpetas y Enlaces',
    icon: <FolderIcon fontSize="large" />,
    link: '/herramientas/carpetas-enlaces',
  },
  {
    name: 'Mi Agencia',
    icon: <AccountBalanceIcon fontSize="large" />,
    link: '/herramientas/mi-agencia',
  },
  {
    name: 'Conductores',
    icon: <DirectionsCarIcon fontSize="large" />,
    link: '/herramientas/agencia/conductores',
  },
];

const HerramientasGrid = () => {
  return (
    <Box sx={{ flexGrow: 1, mt: 2 }}>
      <Grid container spacing={2}>
        {herramientasMock.map((tool, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <ToolCard
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', tool.link);
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
            >
              <Box sx={{ mb: 1 }}>{tool.icon}</Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {tool.name}
              </Typography>
            </ToolCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default HerramientasGrid;