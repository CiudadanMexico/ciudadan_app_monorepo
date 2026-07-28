import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  useMediaQuery,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { styled } from '@mui/system';
import placeholder from '../../assets/placeholders/placeholder.jpg';
import { useRoles } from '../../Contexts/RolesContext';
import PreLoader from '../../components/PreLoader';
const CardAnimada = styled(Card)(() => ({
  transition: 'transform 0.4s ease, box-shadow 0.4s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: `0 8px 20px rgba(136, 255, 112, 0.35)`,
  },
  backgroundColor: '#252d25',
  color: '#fff',
  border: '2px solid #b8ff57',
  borderRadius: '16px',
}));

export default function EventosGrid() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSelected, setMesSelected] = useState(new Date().getMonth());
  const [ciudadSelected, setCiudadSelected] = useState();
  const isMobile = useMediaQuery('(max-width:600px)');
  const { roles, membresia } = useRoles();
  const baseURL = process.env.REACT_APP_STRAPI_URL;
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const diasSemana = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  useEffect(() => {
    const fetchEventos = async () => {
      const year = new Date().getFullYear();
      const start = new Date(year, mesSelected, 1);
      const end = new Date(year, mesSelected + 1, 0);
      const startISO = start.toISOString().split('T')[0];
      const endISO = end.toISOString().split('T')[0];
      const url = `${baseURL}/api/eventos?filters[fecha_inicio][$gte]=${startISO}&filters[fecha_inicio][$lte]=${endISO}&populate=portada`;

      try {
        const res = await fetch(url);
        if (!res.ok) {
          const errText = await res.text();
          console.error('❌ Server error:', errText);
          setEventos([]);
        } else {
          const json = await res.json();
          const items = Array.isArray(json.data) ? json.data.map(e => e.attributes) : [];
          setEventos(items);
        }
      } catch (err) {
        console.error('❌ Error fetching eventos:', err);
        setEventos([]);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    fetchEventos();
  }, [baseURL, mesSelected]);

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <PreLoader text="Cargando Eventos..." color="success" />
      </Box>
    );
  }

  // Generar días del mes
  const year = new Date().getFullYear();
  const totalDiasMes = new Date(year, mesSelected + 1, 0).getDate();
  const diasDelMes = [];

  for (let d = 1; d <= totalDiasMes; d++) {
    const fecha = new Date(year, mesSelected, d);
    diasDelMes.push({
      dia: d,
      fecha,
      diaSemana: fecha.getDay(),
    });
  }

  // Agrupar eventos por fecha exacta en formato YYYY-MM-DD
  const eventosPorFecha = {};
  eventos.forEach(ev => {
    const fechaStr = new Date(ev.fecha_inicio).toISOString().split('T')[0];
    if (!eventosPorFecha[fechaStr]) eventosPorFecha[fechaStr] = [];
    eventosPorFecha[fechaStr].push(ev);
  });

  // Generar lista de ciudades únicas a partir de los eventos (ordenada)
  const ciudades = Array.from(new Set(eventos.map(e => e.ciudad).filter(Boolean))).sort();

  return (
    <Box sx={{ px: 2, py: 4, pb:0, mb:0 }}>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            color: '#b8ff57',
            textAlign: isMobile ? 'left' : 'center',
            flexGrow: 1,
          }}
        >
          Agenda de {meses[mesSelected]}
        </Typography>

        
          <Button
            variant="contained"
            component={Link}
            to="/eventos/crear-evento"
            sx={{
              backgroundColor: '#91ff49',
              color: '#1a1a1a',
              fontWeight: 'bold',
              '&:hover': { backgroundColor: '#a5ff30' },
              borderRadius: '12px',
              px: 3,
              boxShadow: '0 0 10px #91ff49',
            }}
          >
            + Agregar evento
          </Button>
        

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            flexShrink: 0,
            mt: isMobile ? 1 : 0,
          }}
        >
          <FormControl
            sx={{
              minWidth: 150,
              borderRadius: '12px',
              background: '#101b10',
              boxShadow: '0 0 8px #7fff8d66',
            }}
          >
            <InputLabel id="mes-label" sx={{ color: '#7fff8d' }}>
              Mes
            </InputLabel>
            <Select
              labelId="mes-label"
              id="mes"
              value={mesSelected}
              label="Mes"
              onChange={(e) => setMesSelected(e.target.value)}
              sx={{ color: '#b8ff57' }}
            >
              {meses.map((m, idx) => (
                <MenuItem key={idx} value={idx}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            sx={{
              minWidth: 180,
              borderRadius: '12px',
              background: '#101b10',
              boxShadow: '0 0 8px #7fff8d66',
            }}
          >
            <InputLabel id="ciudad-label" sx={{ color: '#7fff8d' }}>
              Ciudad
            </InputLabel>
            <Select
              labelId="ciudad-label"
              id="ciudad"
              value={ciudadSelected ?? ''}
              label="Ciudad"
              onChange={(e) => setCiudadSelected(e.target.value || undefined)}
              sx={{ color: '#b8ff57' }}
            >
              <MenuItem value="">
                Todas
              </MenuItem>
              {ciudades.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {diasDelMes.map(({ dia, fecha, diaSemana }) => {
          const fechaStr = fecha.toISOString().split('T')[0];
          let eventosDelDia = eventosPorFecha[fechaStr] || [];
          // Aplicar filtro por ciudad si fue seleccionada
          eventosDelDia = eventosDelDia.filter(ev => !ciudadSelected || ev.ciudad === ciudadSelected);
          const label = `${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][diaSemana]} ${dia}`;

          return (
            <Grid
              key={fechaStr}
              item
              xs={12}
              sm={6}
              md={1.7}
              sx={{ minWidth: 150, flexGrow: 1 }}
            >
              <Typography
                variant="h6"
                align="center"
                sx={{
                  color: '#b8ff57',
                  mb: 1,
                  borderBottom: '1px solid #b8ff57',
                }}
              >
                {label}
              </Typography>

              {eventosDelDia.map((evento) => (
                <Link
                  key={evento.slug}
                  to={`/evento/${evento.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <CardAnimada sx={{ mb: 2, cursor: 'pointer' }}>
                    <CardMedia
                      component="img"
                      height="120"
                      image={
                        evento.portada?.data?.attributes?.url
                          ? `${baseURL}${evento.portada.data.attributes.url}`
                          : placeholder
                      }
                      alt={evento.titulo}
                      sx={{
                        objectFit: 'cover',
                        borderTopLeftRadius: '14px',
                        borderTopRightRadius: '14px',
                      }}
                    />
                    <CardContent sx={{ p: 2 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 'bold', color: '#a5ff30' }}
                      >
                        {evento.titulo}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.7 }}>
                        {evento.ciudad} • {evento.estado}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', mt: 1 }}
                      >
                        {evento.hora_inicio} hrs
                      </Typography>
                    </CardContent>
                  </CardAnimada>
                </Link>
              ))}
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
