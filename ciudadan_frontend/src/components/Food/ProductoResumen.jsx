import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Button,
  IconButton,
  Paper,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const ProductoResumen = ({
  formData,
  categories,
  ingredientes,
  alergenos,
  previewImagenPredeterminada,
  variants = [],
  onAddVariant,
  onEditVariant,
  onRemoveVariant,
}) => {
  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Resumen del producto
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Revisa los datos antes de continuar. Puedes agregar variantes de este producto
          (por ejemplo, distintos tamaños o presentaciones) reutilizando estos mismos datos.
        </Typography>

        <Card sx={{ maxWidth: 360, borderRadius: 2, boxShadow: 4, overflow: 'hidden' }}>
          <Box sx={{ position: 'relative' }}>
            <CardMedia
              component="img"
              image={previewImagenPredeterminada}
              alt={formData.nombre || 'Platillo'}
              sx={{ height: 180, objectFit: 'cover' }}
            />
            {formData.stockEnable && (
              <Chip
                label={
                  Number(formData.stock) === 0
                    ? 'Agotado'
                    : `Disponibles: ${formData.stock}`
                }
                color={Number(formData.stock) === 0 ? 'error' : 'default'}
                size="small"
                sx={{
                  position: 'absolute',
                  left: 10,
                  top: 10,
                  bgcolor: 'rgba(255,255,255,0.9)',
                  fontWeight: 700,
                }}
              />
            )}
          </Box>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {formData.nombre || 'Sin título'}
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              ${formData.precio_base || 0}
            </Typography>

            <Box display="flex" justifyContent="space-between" gap={1} flexWrap="wrap" mt={1}>
              <Typography variant="caption" color="text.secondary">
                Prep: {formData.tiempo_preparacion || 0} min
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Peso: {formData.peso || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Calorías: {formData.calorias || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Porciones: {formData.porciones || 0}
              </Typography>
            </Box>

            {formData.descripcion && (
              <Typography
                variant="body2"
                color="text.secondary"
                mt={1}
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {formData.descripcion}
              </Typography>
            )}

            <Box mt={1} display="flex" gap={1} flexWrap="wrap">
              {categories
                .filter((cat) => formData.food_categories.includes(cat.id))
                .map(({ id, attributes }) => (
                  <Chip key={id} size="small" label={attributes?.nombre ?? ''} />
                ))}
            </Box>

            <Box mt={1} display="flex" gap={1} flexWrap="wrap">
              {formData.vegetariano && <Chip label="Vegetariano" color="success" size="small" />}
              {formData.vegano && <Chip label="Vegano" color="success" size="small" />}
              {formData.sin_gluten && <Chip label="Sin gluten" size="small" />}
              {formData.contiene_lacteos && <Chip label="Lácteos" color="info" size="small" />}
              {formData.contiene_mariscos && <Chip label="Mariscos" color="error" size="small" />}
              {formData.contiene_cerdo && <Chip label="Cerdo" color="secondary" size="small" />}
            </Box>

            <Box mt={1.5}>
              <Typography variant="caption" color="primary">
                Ingredientes:
              </Typography>
              {ingredientes.map((ing, i) => (
                <Typography key={i} variant="caption" color="text.secondary" display="block" pl={1}>
                  • {ing?.nombre}
                </Typography>
              ))}
            </Box>

            <Box mt={1}>
              <Typography variant="caption" color="primary">
                Alergenos:
              </Typography>
              {alergenos.map((a, i) => (
                <Typography key={i} variant="caption" color="text.secondary" display="block" pl={1}>
                  • {a}
                </Typography>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Divider />

      <Box>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={1}
          flexWrap="wrap"
          gap={1}
        >
          <Box>
            <Typography variant="h6">Variantes</Typography>
            <Typography variant="body2" color="text.secondary">
              Opcional. Agrega tamaños o presentaciones distintas reutilizando los datos de
              este producto.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAddVariant}>
            Agregar variante
          </Button>
        </Box>

        {variants.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderStyle: 'dashed' }}>
            <Typography color="text.secondary">Aún no has agregado variantes.</Typography>
          </Paper>
        ) : (
          <Box display="flex" flexDirection="column" gap={1}>
            {variants.map((v) => (
              <Paper
                key={v.tempId}
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography fontWeight={700}>{v.nombre}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ${v.precio} · {v.imagenes?.length || 0} imágenes de galería
                    {v.imagen_predeterminada ? ' · con imagen principal' : ' · sin imagen principal'}
                  </Typography>
                </Box>
                <Box>
                  <IconButton onClick={() => onEditVariant(v)} aria-label="editar variante">
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => onRemoveVariant(v.tempId)}
                    aria-label="eliminar variante"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ProductoResumen;