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
  Button,
  useTheme,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

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
                borderColor: selected ? 'primary.main' : 'divider',
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
                      icon={<CheckCircleOutlineIcon fontSize="small" sx={{ color: 'primary.main !important' }} />}
                      label="Seleccionado"
                      color="primary"
                      size="small"
                      sx={{ mt: 0.5 }}
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
                <Button
                  variant={selected ? 'outlined' : 'contained'}
                  size="small"
                  onClick={() => togglePlaylist(a.id)}
                  startIcon={selected ? null : <CheckCircleOutlineIcon />}
                >
                  {selected ? 'Quitar' : 'Agregar'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};
