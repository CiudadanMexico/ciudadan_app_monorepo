import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Grid2 as Grid,
  Button,
  Chip,
  Stack,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { resolveValidationByAgendaId } from '../../services/driverVerification/gettters';
import {
  AGENDA_ESTADO,
  getAgendaEstadoChipProps,
  getAgendaEstadoLabel,
} from '../../constants/agendaEstado';

const neonGreen = '#00ff99';
const darkGray = '#1a1a1a';

const RowCard = styled(Paper)(({ theme }) => ({
  backgroundColor: darkGray,
  color: 'white',
  padding: theme.spacing(2),
  border: `1px solid ${neonGreen}`,
  borderRadius: 8,
  transition: 'all 0.25s ease',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  '&:hover': {
    boxShadow: `0 0 12px ${neonGreen}`,
    transform: 'translateY(-2px)',
  },
}));

const getValidationIdFromAgenda = (item) => {
  const metadata = item?.attributes?.metadata || item?.metadata || {};
  const preregistro = metadata.preregistro_conductor || {};
  return metadata.validation_id || preregistro.validation_id || null;
};

const ConductoresAgencia = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const navigate = useNavigate();

  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

  const fetchConductores = useCallback(
    async ({ showLoading = false } = {}) => {
      if (showLoading) setLoading(true);
      try {
        const url = `${STRAPI_URL}/api/agendas?filters[descripcion][$containsi]=Preregistro conductor&filters[$or][0][estado][$eq]=pendiente&filters[$or][1][estado][$eq]=en_revision&filters[$or][2][estado][$eq]=resubir_archivos&sort=createdAt:desc`;

        const res = await fetch(url);
        const json = await res.json();

        setData(json.data || []);
      } catch (error) {
        console.error('Error cargando conductores:', error);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [STRAPI_URL]
  );

  useEffect(() => {
    fetchConductores({ showLoading: true });
  }, [fetchConductores]);

  useEffect(() => {
    const onFocus = () => fetchConductores();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchConductores]);

  const goToDetalle = (id) => {
    const link = `/herramientas/procesar-conductor/${id}`;
    window.history.pushState({}, '', link);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const goToVerification = async (item) => {
    setResolvingId(item.id);
    try {
      let validationId = getValidationIdFromAgenda(item);

      if (!validationId) {
        const resolved = await resolveValidationByAgendaId(item.id);
        validationId = resolved?.id;
      }

      if (!validationId) {
        throw new Error('No se encontró una validación asociada a esta cita.');
      }

      navigate(`/validations/${validationId}/review`);
    } catch (error) {
      console.error('Error resolviendo validación:', error);
      window.alert(error?.message || 'No se pudo abrir la validación.');
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, color: 'white', fontWeight: 600 }}>
        Conductores pendientes
      </Typography>

      <Grid container spacing={2}>
        {data.map((item) => {
          const a = item.attributes;

          return (
            <Grid size={12} key={item.id}>
              <RowCard onClick={() => goToDetalle(item.id)}>
                <DirectionsCarIcon sx={{ color: neonGreen }} />

                <Box sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={600}>{a.titulo || 'Sin título'}</Typography>
                    <Chip size="small" {...getAgendaEstadoChipProps(a.estado)} />
                  </Stack>

                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    {a.ciudad} {a.estado ? `• ${getAgendaEstadoLabel(a.estado)}` : ''}
                  </Typography>

                  {a.estado === AGENDA_ESTADO.RESUBIR_ARCHIVOS && (
                    <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5, color: '#f59e0b' }}>
                      Vuelve al preregistro para reenviar los archivos faltantes.
                    </Typography>
                  )}

                  <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.6 }}>
                    {a.descripcion}
                  </Typography>
                </Box>

                <Box
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}
                >
                  <Typography variant="caption" sx={{ color: neonGreen, fontWeight: 600 }}>
                    Ver →
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={resolvingId === item.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      goToVerification(item);
                    }}
                    sx={{
                      color: neonGreen,
                      borderColor: neonGreen,
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: neonGreen,
                        bgcolor: 'rgba(0,255,153,0.08)',
                      },
                    }}
                  >
                    {resolvingId === item.id ? 'Abriendo...' : 'Verificar'}
                  </Button>
                </Box>
              </RowCard>
            </Grid>
          );
        })}
      </Grid>

      {data.length === 0 && (
        <Typography sx={{ mt: 3, opacity: 0.6 }}>No hay conductores pendientes</Typography>
      )}
    </Box>
  );
};

export default ConductoresAgencia;
