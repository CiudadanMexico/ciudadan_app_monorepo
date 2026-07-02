import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  IconButton,
  useMediaQuery
} from '@mui/material';
import { motion } from 'framer-motion';
import { useRoles } from '../../Contexts/RolesContext';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';

const STRAPI = process.env.REACT_APP_STRAPI_URL;

export default function HistorialPublicaciones() {
  const { userData } = useRoles();
  const isMobile = useMediaQuery('(max-width:900px)');

  const [loading, setLoading] = useState(true);
  const [views, setViews] = useState([]);
  const [orden, setOrden] = useState('desc');

  useEffect(() => {
    if (!userData?.id) return;

    const fetchViews = async () => {
      setLoading(true);
      try {
        let url = `${STRAPI}/api/ad-views?populate=ad,ad.archivo&filters[usuario][id][$eq]=${userData.id}`;
        url += `&sort=timestamp:${orden}`;

        const res = await fetch(url);
        const json = await res.json();

        const parsed = (json.data || []).map(v => ({
          id: v.id,
          ...v.attributes
        }));

        setViews(parsed);
      } catch (e) {
        console.error(e);
        setViews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchViews();
  }, [userData?.id, orden]);

  const formatFecha = (iso) =>
    new Date(iso).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

  if (loading) {
    return (
      <Box sx={{ py: 10, textAlign: 'center' }}>
        <CircularProgress sx={{ color: '#b388ff' }} />
        <Typography mt={2} color="#b388ff">
          Cargando historial…
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, #1b0033 0%, #06000f 70%)',
        px: { xs: 1, md: 4 },
        py: 4
      }}
    >
      {/* HEADER */}
      <Stack
        direction={isMobile ? 'column' : 'row'}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        mb={4}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <HistoryIcon sx={{ color: '#9cff57', fontSize: 36 }} />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              color: '#9cff57',
              textShadow: '0 0 12px #9cff57'
            }}
          >
            Historial de Publicaciones
          </Typography>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small">
            <InputLabel sx={{ color: '#c77dff' }}>Orden</InputLabel>
            <Select
              value={orden}
              label="Orden"
              onChange={(e) => setOrden(e.target.value)}
              sx={{
                minWidth: 180,
                color: '#c77dff',
                borderRadius: '14px',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: '#c77dff'
                }
              }}
            >
              <MenuItem value="desc">Más recientes</MenuItem>
              <MenuItem value="asc">Más antiguos</MenuItem>
            </Select>
          </FormControl>

          <IconButton
            onClick={() => setOrden(o => o)}
            sx={{
              color: '#9cff57',
              boxShadow: '0 0 10px #9cff57'
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      {/* GRID */}
      {views.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Typography variant="h6" color="#c77dff">
            Aún no hay publicaciones registradas
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {views.map((view, i) => {
            const ad = view.ad?.data?.attributes;
            const img =
              ad?.archivo?.data?.attributes?.url
                ? STRAPI + ad.archivo.data.attributes.url
                : null;

            return (
              <Grid item xs={12} sm={6} lg={4} key={view.id}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: '22px',
                      background:
                        'linear-gradient(145deg, #14001f, #1f0033)',
                      border: '1px solid #c77dff',
                      boxShadow:
                        '0 0 18px rgba(199,125,255,0.35)',
                      transition: '0.3s',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow:
                          '0 0 28px rgba(156,255,87,0.6)',
                        borderColor: '#9cff57'
                      }
                    }}
                  >
                    {img && (
                      <CardMedia
                        component="img"
                        height="160"
                        image={img}
                        sx={{
                          borderTopLeftRadius: '22px',
                          borderTopRightRadius: '22px'
                        }}
                      />
                    )}

                    <CardContent>
                      <Typography
                        variant="h6"
                        sx={{
                          color: '#c77dff',
                          fontWeight: 800,
                          mb: 1
                        }}
                      >
                        {ad?.titulo || 'Anuncio'}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{ color: '#e0cfff', mb: 2 }}
                      >
                        {ad?.mensaje || '—'}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                      >
                        <Chip
                          label={formatFecha(view.timestamp)}
                          sx={{
                            bgcolor: '#9cff57',
                            color: '#102000',
                            fontWeight: 700
                          }}
                        />
                        {view.tipo && (
                          <Chip
                            label={view.tipo}
                            sx={{
                              bgcolor: '#c77dff',
                              color: '#1b0033'
                            }}
                          />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
