import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import FolderIcon from '@mui/icons-material/Folder';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import GroupsIcon from '@mui/icons-material/Groups';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PermMediaIcon from '@mui/icons-material/PermMedia';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PsychologyIcon from '@mui/icons-material/Psychology';
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

const RobotIcon = ({ fontSize = 'medium' }) => {
  // Tamaños aproximados de MUI (small 20 / medium 24 / large 28 píxeles).
  const size = fontSize === 'large' ? 28 : fontSize === 'medium' ? 24 : 20;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="3.5" r="1.6" fill="#8A5CF5" />
      <line x1="12" y1="5.1" x2="12" y2="7.2" stroke="#8A5CF5" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="4.2" y="7.2" width="15.6" height="13" rx="3" fill="#fff" />
      <circle cx="8.4" cy="11.2" r="1.7" fill="#8A5CF5" />
      <circle cx="15.6" cy="11.2" r="1.7" fill="#8A5CF5" />
      <rect x="9" y="14.5" width="6" height="1.8" rx="0.9" fill="#8A5CF5" />
    </svg>
  );
};

const HERRAMIENTAS = [
  { slug: 'mi-agencia', name: 'Mi Agencia', icon: <AccountBalanceIcon fontSize="large" />, soloAdminSocio: false },
  { slug: 'clientes', name: 'Clientes', icon: <GroupsIcon fontSize="large" />, soloAdminSocio: false },
  { slug: 'tareas', name: 'Tareas', icon: <AssignmentIcon fontSize="large" />, soloAdminSocio: true },
  { slug: 'tablero', name: 'Tablero', icon: <DashboardIcon fontSize="large" />, soloAdminSocio: false, external: true, link: 'https://planka.ciudadan.org' },
  { slug: 'conductores', name: 'Conductores', icon: <DirectionsCarIcon fontSize="large" />, soloAdminSocio: false },
  { slug: 'gestionar-habilidades', name: 'Gestionar Habilidades', icon: <PsychologyIcon fontSize="large" />, soloAdminSocio: true },
  // Unidad de Disco Virtual: abre drive.ciudadan.org en una pestaña nueva
  // (external:true -> window.open en vez de navegación SPA interna).
  { slug: 'unidad-disco', name: 'Unidad de Disco Virtual', icon: <FolderIcon fontSize="large" />, soloAdminSocio: false, external: true, link: 'https://drive.ciudadan.org' },
  // Multimedia: abre /multimedia en pestana nueva (mismo destino Centro Multimedia,
  // Bloque 5C), no a /coowork/admin/herramientas/multimedia. Equipo: admin/root/socio/colaborador/becario.
  { slug: 'multimedia', name: 'Multimedia', icon: <PermMediaIcon fontSize="large" />, soloAdminSocio: true, external: true, link: '/multimedia' },
  // Agentes: vivienda/agentes de campo, puntera del programa de agentes de la agencia.
  { slug: 'agentes', name: 'Agentes', icon: <RobotIcon fontSize="large" />, soloAdminSocio: false, external: true, link: 'https://gameview.ciudadan.org' },
];

const HerramientasGrid = () => {
  const { isAdminLike, isSocioLike } = useRoles();
  const navigate = useNavigate();
  const tienePermisoCRUD = isAdminLike() || isSocioLike();

  const herramientas = HERRAMIENTAS.filter((tool) => !tool.soloAdminSocio || tienePermisoCRUD).map(
    (tool) => ({ ...tool, id: tool.slug, link: tool.link || `/coowork/admin/herramientas/${tool.slug}` })
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
            return (
              <Grid item xs={6} sm={3} key={tool.id}>
                <ToolCard
                  onClick={() =>
                    tool.external
                      ? window.open(tool.link, '_blank', 'noopener,noreferrer')
                      : navigate(tool.link)
                  }
                >
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
