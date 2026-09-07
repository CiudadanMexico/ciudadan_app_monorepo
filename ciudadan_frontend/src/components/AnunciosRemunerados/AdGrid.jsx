import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Chip,
  useTheme,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
// Botón morado de marca (unificado con el resto de la plataforma)
import PurpleButton from '../common/PurpleButton.jsx';

/**
 * Grid de anuncios publicitarios.
 * Muestra: thumbnail, título, descripción breve, duración, recompensa y
 * un botón Agregar / ✓ (selección múltiple). Los seleccionados forman la
 * playlist, reflejados visualmente por el Chip Check.
 */
export const AdGrid = ({ ads, playlist, togglePlaylist }) => {
  const theme = useTheme();

  if (!ads || ads.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: theme.palette.text.secondary }}>
        <Typography>No hay anuncios disponibles en este momento.</Typography>
      </Box>
    );
  }

  const getThumbnail = (a) => {
    const base = process.env.REACT_APP_STRAPI_URL || '';
    if (a.thumbnail?.url) return `${base}${a.thumbnail.url}`;
    if (a.archivo?.url) return `${base}${a.archivo.url}`;
    if (a.metadata?.thumbnail_url) return a.metadata.thumbnail_url; // seed de test
    return null;
  };

  return (
    <Grid container spacing={{ xs: 2, md: 3 }} sx={{ p: { xs: 2, md: 3 } }}>
      {ads.map((a) => {
        const selected = playlist.includes(a.id);
        const thumb = getThumbnail(a);
        return (
          <Grid item xs={12} sm={6} md={4} key={a.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderColor: selected ? '#8A5CF5' : 'divider',
                borderWidth: selected ? 2 : 1,
                boxShadow: selected ? 3 : 1,
              }}
            >
                            {(thumb || a.titulo) &&
                (thumb ? (
                  <CardMedia
                    component="img"
                    src={thumb}
                    alt={a.titulo}
                    sx={{ height: 140, objectFit: 'cover' }}
                  />
                ) : (
                  <CardMedia
                    component="div"
                    sx={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {a.titulo || 'Sin thumbnail'}
                    </Typography>
                  </CardMedia>
                ))}
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <Typography variant="h6" component="h3" noWrap title={a.titulo}>
                    {a.titulo || 'Anuncio'}
                  </Typography>
                  {selected && (
                    <Chip
                      icon={<CheckCircleOutlineIcon fontSize="small" sx={{ color: '#fff !important' }} />}
                      label="Seleccionado"
                      size="small"
                      // Morado de marca en vez del azul default (no hay ThemeProvider)
                      sx={{ mt: 0.5, bgcolor: '#8A5CF5', color: '#fff' }}
                    />
                  )}
                </Box>

                {(a.descripcion || a.texto) && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    paragraph
                    noWrap
                    title={a.descripcion || a.texto}
                  >
                    {a.descripcion || a.texto}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                  {a.duracion ? (
                    <Typography variant="body2" color="info.main">
                      ⏱ {a.duracion}s
                    </Typography>
                  ) : null}
                  {a.recompensa ? (
                    <Typography variant="body2" color="success.main" fontWeight="bold">
                      🏆 {a.recompensa} laborys
                    </Typography>
                  ) : null}
                </Box>
              </CardContent>

              <CardActions>
                <PurpleButton
                  size="small"
                  onClick={() => togglePlaylist(a.id)}
                  startIcon={selected ? null : <CheckCircleOutlineIcon />}
                  // El estado seleccionado ("Quitar") apaga el glow y atenúa el
                  // botón para conservar la distinción visual sin salir de marca.
                  glowPulse={!selected}
                  sx={selected ? { filter: 'brightness(0.8)', boxShadow: 'none' } : undefined}
                >
                  {selected ? 'Quitar' : 'Agregar'}
                </PurpleButton>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};
