import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FolderIcon from '@mui/icons-material/Folder';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AppsIcon from '@mui/icons-material/Apps';
import AddTaskIcon from '@mui/icons-material/AddTask';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PsychologyIcon from '@mui/icons-material/Psychology';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { fetchJson, STRAPI_URL } from '../../utils/request.utils';
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

// Mapa de icono por slug o por titulo. Permite que el contenido administrado
// en Strapi (categoria-herramienta) elija su icon. Los slugs no matcheados
// caen a AppsIcon (genérico).
const iconBySlug = {
  'calificar-tarea': <CheckCircleIcon fontSize="large" />,
  'corregir-tarea': <BuildCircleIcon fontSize="large" />,
  'gestionar-tareas': <ListAltIcon fontSize="large" />,
  'agregar-tarea': <AddTaskIcon fontSize="large" />,
  'agregar-socio': <PersonAddIcon fontSize="large" />,
  'gestionar-habilidades': <PsychologyIcon fontSize="large" />,
  'verificar-usuarios': <VerifiedUserIcon fontSize="large" />,
  'carpetas-enlaces': <FolderIcon fontSize="large" />,
  'mi-agencia': <AccountBalanceIcon fontSize="large" />,
  'conductores': <DirectionsCarIcon fontSize="large" />,
};

// Herramientas que solo deben ver admin/socio. Las_ocultamos_ para
// usuarios sin permiso CRUD aunque est�n activas en Strapi.
const SLUGS_SOLO_ADMIN_SOCIO = ['agregar-tarea', 'agregar-socio', 'calificar-tarea', 'corregir-tarea', 'gestionar-tareas', 'gestionar-habilidades'];

const iconFor = (slug, titulo) => {
  const key = slug || (titulo || '').toLowerCase().replace(/\s+/g, '-');
  return iconBySlug[key] || <AppsIcon fontSize="large" />;
};

const HerramientasGrid = () => {
  const [herramientas, setHerramientas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAdmin, isSocio } = useRoles();
  const tienePermisoCRUD = isAdmin() || isSocio();

  useEffect(() => {
    let cancelled = false;

    const loadHerramientas = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchJson(
          `${STRAPI_URL}/api/categorias-herramientas?filters[activa][$eq]=true&_sort=nivel:ASC&pagination[pageSize]=50`
        );
        if (cancelled) return;
        const items = Array.isArray(data?.data) ? data.data : [];
        const parsed = items
          .map((item) => {
            const a = item.attributes || item;
            const slug = a.slug || '';
            const titulo = a.titulo || 'Herramienta';
            return {
              id: item.id,
              name: titulo,
              icon: iconFor(slug, titulo),
              link: slug ? `/herramientas/${slug}` : null,
              descripcion: a.descripcion || '',
              nivel: a.nivel || 0,
              slug,
            };
          })
          .filter((tool) => {
            if (!SLUGS_SOLO_ADMIN_SOCIO.includes(tool.slug)) return true;
            return tienePermisoCRUD;
          });
        setHerramientas(parsed);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Error al cargar herramientas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadHerramientas();
    return () => {
      cancelled = true;
    };
  }, [tienePermisoCRUD]);

  return (
    <Box sx={{ flexGrow: 1, mt: 2 }}>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress sx={{ color: neonGreen }} />
        </Box>
      ) : error ? (
        <Typography color="error" align="center">
          {error}
        </Typography>
      ) : herramientas.length === 0 ? (
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
