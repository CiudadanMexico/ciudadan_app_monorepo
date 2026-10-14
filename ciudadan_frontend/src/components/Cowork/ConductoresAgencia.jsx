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
import { useAuth0 } from '@auth0/auth0-react';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { resolveValidationByAgendaId } from '../../services/driverVerification/getters';
import {
  AGENDA_ESTADO,
  getAgendaEstadoChipProps,
  getAgendaEstadoLabel,
} from '../../constants/agendaEstado';

const MORADO = '#8A5CF5';
const MORADO_OSCURO = '#6A3FCB';
const fondo = '#0d0b1a';
const cardBg = 'rgba(138,92,245,0.06)';
const cardBorder = 'rgba(138,92,245,0.28)';
const fontStack = '"Space Grotesk", "Poppins", system-ui, sans-serif';

const RowCard = styled(Paper)(({ theme }) => ({
  backgroundColor: cardBg,
  color: 'white',
  padding: theme.spacing(2),
  border: `1px solid ${cardBorder}`,
  borderRadius: 12,
  transition: 'box-shadow .25s ease, transform .15s ease, border-color .25s ease',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  '&:hover': {
    boxShadow: '0 0 18px rgba(138,92,245,0.45)',
    borderColor: MORADO,
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
  const { getAccessTokenSilently } = useAuth0();

  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      });
    } catch (e) {
      console.warn('⚠️ No se pudo obtener token Auth0:', e.message);
      return null;
    }
  }, [getAccessTokenSilently]);

  const fetchConductores = useCallback(
    async ({ showLoading = false } = {}) => {
      if (showLoading) setLoading(true);
      try {
        const token = await getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        // Endpoint dedicado: ya filtra por agencia matriz (o sin agencia) en
        // el backend, en vez del find REST directo sin filtrar por agencia.
        const url = `${STRAPI_URL}/api/agendas/conductores-pendientes`;

        const res = await fetch(url, { headers });
        const json = await res.json();

        setData(json.data || []);
      } catch (error) {
        console.error('Error cargando conductores:', error);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [STRAPI_URL, getToken]
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
        <CircularProgress sx={{ color: MORADO }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: fondo, py: { xs: 3, md: 5 }, px: 2, fontFamily: fontStack }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate('/coowork/admin/herramientas');
        }}
        sx={{ color: '#cfcfe6', mb: 2, textTransform: 'none', fontFamily: fontStack }}
      >
        Volver
      </Button>
      <Typography variant="h4" fontWeight={900} sx={{ mb: 2, color: '#fff', fontFamily: fontStack }}>
        <span style={{ color: MORADO }}>Conductores</span> pendientes
      </Typography>

      <Grid container spacing={2}>
        {data.map((item) => {
          const a = item.attributes;

          return (
            <Grid size={12} key={item.id}>
              <RowCard onClick={() => goToDetalle(item.id)}>
                <DirectionsCarIcon sx={{ color: MORADO }} />

                <Box sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={600} sx={{ color: '#fff', fontFamily: fontStack }}>{a.titulo || 'Sin título'}</Typography>
                    <Chip size="small" {...getAgendaEstadoChipProps(a.estado)} />
                  </Stack>

                  <Typography variant="body2" sx={{ opacity: 0.8, color: '#d8d8ea', fontFamily: fontStack }}>
                    {a.ciudad} {a.estado ? `• ${getAgendaEstadoLabel(a.estado)}` : ''}
                  </Typography>

                  {a.estado === AGENDA_ESTADO.RESUBIR_ARCHIVOS && (
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5, color: '#f59e0b', fontFamily: fontStack }}>
                      Vuelve al preregistro para reenviar los archivos faltantes.
                    </Typography>
                  )}

                  <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.75, color: '#cfcfe6', fontFamily: fontStack }}>
                    {a.descripcion}
                  </Typography>
                </Box>

                <Box
                  sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}
                >
                  <Typography variant="caption" sx={{ color: MORADO, fontWeight: 700, fontFamily: fontStack }}>
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
                      color: MORADO,
                      borderColor: MORADO,
                      textTransform: 'none',
                      fontFamily: fontStack,
                      '&:hover': {
                        borderColor: MORADO_OSCURO,
                        bgcolor: 'rgba(138,92,245,0.12)',
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
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            bgcolor: cardBg,
            border: `1px solid ${cardBorder}`,
          }}
        >
          <DirectionsCarIcon sx={{ fontSize: 44, color: MORADO, mb: 1 }} />
          <Typography sx={{ color: '#d8d8ea', fontFamily: fontStack }}>
            No hay conductores pendientes
          </Typography>
        </Paper>
      )}
      </Box>
    </Box>
  );
};

export default ConductoresAgencia;
