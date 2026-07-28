// src/pages/Cursos/CursoDetalle.jsx
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCursos } from '../../hooks/useCursos';
import BotonEditar from '../../components/Cursos/BotonEditar.jsx';
import {
  Box,
  Container,
  Paper,
  Typography,
  Chip,
  Grid,
  CardMedia,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Link as MuiLink,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useState } from 'react';
import FechaCdmx from '../../utils/FechaCdmx';
import { motion } from 'framer-motion';
import Inscripcion from './Inscripcion.jsx';

const CursoDetalle = () => {
  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || '';
  const GOOGLE_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const cleanPath = location.pathname.replace(/\/$/, '');
  const segments = cleanPath.split('/');

  const slug = segments[segments.indexOf('curso') + 1];
  const isInscripcion = segments.includes('inscripcion');

  console.warn('****************** entrando a CursoDetalle, slug:', slug);

  const { cursos = [], loading } = useCursos();
  const [curso, setCurso] = useState(null);

  useEffect(() => {
    if (Array.isArray(cursos) && cursos.length && slug) {
      const encontrado = cursos.find((c) => c.slug === slug);
      setCurso(encontrado ?? null);
    } else {
      setCurso((prev) => prev);
    }
  }, [cursos, slug]);

  const handleEdit = () => {
    navigate(`/cursos/editar/${slug}`);
  };

  const handleInscripcion = () => {
    navigate('inscripcion');
  }


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <CircularProgress color="warning" />
      </Box>
    );
  }

  if (!curso) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
        <Typography variant="h6">Curso no encontrado</Typography>
      </Box>
    );
  }

  // 👉 SI ESTAMOS EN /inscripcion, MOSTRAMOS SOLO EL COMPONENTE DE INSCRIPCIÓN
  if (isInscripcion) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
          <Inscripcion curso={curso} />
        </Paper>
      </Container>
    );
  }


  // Logs útiles para debugging
  console.log('[CursoDetalle] curso:', curso);

  const srcFor = (path = '') => {
    if (!path) return '';
    // si ya es URL absoluta (ej. iframe video) devolverla
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // si Strapi devuelve rutas relativas, anteponer STRAPI_URL
    return `${STRAPI_URL}${path}`;
  };

  const renderGaleria = (items = []) => (
    <Grid container spacing={2}>
      {items.map((item, i) => {
        const src = srcFor(item);
        const isVideo = !!src.match(/\.(mp4|webm|ogg)$/i);

        return (
          <Grid item xs={12} sm={6} md={4} key={i}>
            {isVideo ? (
              <Box sx={{ position: 'relative', paddingTop: '56.25%', borderRadius: 2, overflow: 'hidden' }}>
                <Box
                  component="video"
                  src={src}
                  controls
                  muted
                  sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 }}
                />
              </Box>
            ) : (
              <CardMedia component="img" image={src} alt={`imagen-${i}`} sx={{ borderRadius: 2, width: '100%', height: 250, objectFit: 'cover' }} />
            )}
          </Grid>
        );
      })}
    </Grid>
  );

  const renderVideos = (videos = []) => (
    <Grid container spacing={2}>
      {videos.map((video, i) => (
        <Grid item xs={12} md={6} key={i}>
          <Box component="iframe" src={video} width="100%" height="250" style={{ borderRadius: 8, border: 'none' }} allowFullScreen title={`video-${i}`} />
        </Grid>
      ))}
    </Grid>
  );

  const renderHtml = (htmlContent) => (
    <Box sx={{ mt: 2, p: 2, borderRadius: 2, border: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }} dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );

  // Temario puede ser JSON o string; si JSON espera array de secciones
  const renderTemario = (temario) => {
    if (!temario) return <Typography variant="body2">Sin temario</Typography>;
    let parsed = temario;
    if (typeof temario === 'string') {
      try {
        parsed = JSON.parse(temario);
      } catch (e) {
        // no JSON, mostrar como texto
        return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{temario}</Typography>;
      }
    }
    // si parsed es array
    if (Array.isArray(parsed)) {
      return (
        <List dense>
          {parsed.map((t, idx) => (
            <ListItem key={idx}>
              <ListItemText primary={t.titulo || t.name || `parte ${idx + 1}`} secondary={t.descripcion || t.resumen || ''} />
            </ListItem>
          ))}
        </List>
      );
    }
    // si es objeto
    return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(parsed, null, 2)}</Typography>;
  };

  // Ubicación: puede venir como { lat, lng } o { direccion } o relación Strapi. Hacemos varios intentos.
  const renderMapa = (ubicacion) => {
    if (!ubicacion) return <Typography variant="body2">Sin ubicación</Typography>;

    // If Strapi returned a nested object with data
    const u = ubicacion?.data ? ubicacion.data.attributes || ubicacion.data : ubicacion;

    // Busca lat/lng en distintas formas
    const lat = u?.lat || u?.latitude || u?.location?.lat || u?.location?.latitude;
    const lng = u?.lng || u?.longitude || u?.location?.lng || u?.location?.longitude;
    const direccion = u?.direccion || u?.address || u?.formatted_address || u?.name;

    if (!GOOGLE_KEY) {
      return (
        <Typography variant="body2" color="error">
          API key de Google Maps no encontrada. Añade REACT_APP_GOOGLE_MAPS_API_KEY en el .env
        </Typography>
      );
    }

    let q = '';
    if (lat && lng) {
      q = `${lat},${lng}`;
    } else if (direccion) {
      q = encodeURIComponent(direccion);
    } else {
      // si no hay datos, mostramos mensaje
      return <Typography variant="body2">Ubicación no disponible</Typography>;
    }

    const mapSrc =
      lat && lng
        ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_KEY}&q=${q}`
        : `https://www.google.com/maps/embed/v1/search?key=${GOOGLE_KEY}&q=${q}`;

    return (
      <Box sx={{ width: '100%', height: 320, borderRadius: 2, overflow: 'hidden', boxShadow: 2 }}>
        <iframe
          title="Mapa curso"
          src={mapSrc}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </Box>
    );
  };

  // Archivos (array de rutas relativas)
  const renderArchivos = (archivos = []) => {
    if (!Array.isArray(archivos) || archivos.length === 0) return <Typography variant="body2">No hay archivos</Typography>;
    return (
      <List>
        {archivos.map((a, i) => {
          const href = srcFor(a);
          return (
            <ListItem key={i} secondaryAction={<Button component="a" href={href} target="_blank" rel="noopener noreferrer">Abrir</Button>}>
              <ListItemText primary={a.split('/').pop()} secondary={href} />
            </ListItem>
          );
        })}
      </List>
    );
  };

  // Calendario actividades
  const actividades = Array.isArray(curso.calendario_actividades) ? curso.calendario_actividades : (() => {
    try {
      return curso.calendario_actividades ? JSON.parse(curso.calendario_actividades) : [];
    } catch (e) {
      return [];
    }
  })();

  // Enlaces públicos / privados (asegura que sean arrays de objetos con titulo/url)
  const parseEnlaces = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  };

  const enlacesPublicos = parseEnlaces(curso.enlaces_publicos);
  const enlacesPrivados = parseEnlaces(curso.enlaces_privados);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <BotonEditar handleEdit={handleEdit} maestro_email={curso.maestro_email} />
        </Box>

        {curso.portada && (
          <CardMedia component="img" height="300" image={srcFor(curso.portada)} alt={curso.titulo} sx={{ borderRadius: 2, mb: 2 }} />
        )}

        <Typography variant="h4" gutterBottom color="primary">{curso.titulo}</Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Impartido por: {curso.maestro_nombre || curso.maestro?.nombre || curso.maestro}</Typography>
          <Typography variant="subtitle2" color="text.secondary">{FechaCdmx(curso.fecha_publicacion)}</Typography>
        </Box>

        {curso.tags && (
          <Box sx={{ mb: 2 }}>
            {String(curso.tags).split(',').map((tag) => (
              <Chip key={tag} label={`#${tag.trim()}`} size="small" sx={{ mr: 1, mb: 1 }} color="warning" />
            ))}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Descripción */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          {curso.descripcion ? renderHtml(curso.descripcion) : <Typography variant="body1">{curso.resumen}</Typography>}
        </motion.div>

        {/* Datos importantes */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1">Modalidad</Typography>
              <Typography variant="body2">{curso.modalidad || '—'}</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1">Certificación</Typography>
              <Typography variant="body2">{curso.certificacion || '—'}</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1">¿Con costo?</Typography>
              <Typography variant="body2">{curso.de_pago ? `Sí — $${Number(curso.precio || 0).toFixed(2)} MXN` : 'Gratuito'}</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1">Fecha inicio</Typography>
              <Typography variant="body2">{curso.fecha_inicio ? FechaCdmx(curso.fecha_inicio) : 'Pendiente'}</Typography>
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Temario */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Temario</Typography>
            </AccordionSummary>
            <AccordionDetails>{renderTemario(curso.temario)}</AccordionDetails>
          </Accordion>
        </motion.div>

        {/* Archivos */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Archivos</Typography>
            {renderArchivos(curso.archivos)}
          </Box>
        </motion.div>

        {/* Galería */}
        {Array.isArray(curso.galeria) && curso.galeria.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mt: 3 }}>Galería</Typography>
            {renderGaleria(curso.galeria)}
          </>
        )}

        {/* Videos */}
        {Array.isArray(curso.videos) && curso.videos.length > 0 && (
          <>
            <Typography variant="h6" sx={{ mt: 3 }}>Videos</Typography>
            {renderVideos(curso.videos)}
          </>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Calendario de actividades */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          <Typography variant="h6">Calendario de actividades</Typography>
          {actividades.length === 0 ? (
            <Typography variant="body2">No hay actividades programadas</Typography>
          ) : (
            <List>
              {actividades.map((act, i) => (
                <ListItem key={i} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1 }}>
                  <ListItemText
                    primary={act.titulo || act.name || `Actividad ${i + 1}`}
                    secondary={act.fecha ? FechaCdmx(act.fecha) : 'Fecha pendiente'}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </motion.div>

        <Divider sx={{ my: 3 }} />

        {/* Enlaces públicos */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14 }}>
          <Typography variant="h6">Enlaces públicos</Typography>
          {enlacesPublicos.length === 0 ? (
            <Typography variant="body2">No hay enlaces públicos</Typography>
          ) : (
            <Stack spacing={1} sx={{ mt: 1 }}>
              {enlacesPublicos.map((l, i) => (
                <MuiLink key={i} href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.titulo || l.url}
                </MuiLink>
              ))}
            </Stack>
          )}
        </motion.div>

        <Divider sx={{ my: 2 }} />

        {/* Enlaces privados (si tienes membresía se muestran) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16 }}>
          <Typography variant="h6">Enlaces privados</Typography>
          {enlacesPrivados.length === 0 ? (
            <Typography variant="body2">No hay enlaces privados</Typography>
          ) : (
            <Stack spacing={1} sx={{ mt: 1 }}>
              {enlacesPrivados.map((l, i) => (
                <MuiLink key={i} href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.titulo || l.url}
                </MuiLink>
              ))}
            </Stack>
          )}
        </motion.div>

        <Divider sx={{ my: 3 }} />

        {/* Métodos de cobro */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
          <Typography variant="h6">Métodos de cobro</Typography>
          {Array.isArray(curso.metodos_cobro) && curso.metodos_cobro.length > 0 ? (
            <Box sx={{ mt: 1 }}>{curso.metodos_cobro.map((m, i) => <Chip key={i} label={m} sx={{ mr: 1, mb: 1 }} />)}</Box>
          ) : (
            <Typography variant="body2">No hay métodos de cobro registrados</Typography>
          )}
        </motion.div>

        <Divider sx={{ my: 3 }} />

        {/* Ubicación con Google Maps */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Typography variant="h6">Ubicación</Typography>
          <Box sx={{ mt: 1 }}>{renderMapa(curso.ubicacion)}</Box>
        </motion.div>
      </Paper>

      <Button
            onClick={handleInscripcion}
            variant="contained"
            size="large"
            sx={{
              background: 'linear-gradient(135deg, #1b5e20, #43a047)',
              color: '#fff',
              fontWeight: 700,
              px: 4,
              borderRadius: 3,
              textTransform: 'none',
              boxShadow: '0 6px 20px rgba(67,160,71,0.45)',
              '&:hover': {
                background: 'linear-gradient(135deg, #2e7d32, #66bb6a)',
                boxShadow: '0 8px 26px rgba(102,187,106,0.6)',
              },
            }}
          >
            Inscribirme a este Curso
          </Button>
    </Container>
  );
};

export default CursoDetalle;
