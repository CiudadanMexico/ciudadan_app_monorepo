import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  CardMedia,
  Box,
  Button,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import productoImg from '../../assets/placeholders/producto.png';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';

export default function FoodProductCard({ producto }) {
  const { attributes, id = null } = producto;
  const {
    imagen_predeterminada,
    usa_stock = false,
    slug = '',
    calificacion = 0,
    stock,
    calificaciones = 0,
    vendidos = 0,
    nombre = '',
    descripcion = '',
    precio_base: precio = 0,
    tiempo_preparacion = 0,
    calorias = 0,
    peso = 0,
    porciones = 0,
    es_picante = false,
    nivel_picante,
    vegetariano = false,
    vegano = false,
    sin_gluten = false,
    contiene_lacteos = false,
    contiene_mariscos = false,
    contiene_cerdo = false,
    ingredientes = [],
    alergenos = [],
    temperatura = '',
    horario_disponibilidad,
    fecha_creacion,
    food_categories = [],
    owner_email,
    activo = true
  } = attributes;
  const theme = useTheme();
  const navigate = useNavigate();
  const [favorito, setFavorito] = useState(false);
  const [activado, setActivado] = useState(activo)

  // determinar productId real (acepta varias formas)

  const imagenValida = imagen_predeterminada?.urls?.small ?? imagen_predeterminada?.urls?.thumbnail ?? productoImg;

  const precioFmt = useMemo(() => {
    if (precio == null || Number.isNaN(Number(precio))) return 'Precio no disponible';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(precio));
  }, [precio]);

  const promedioDisplay = useMemo(() => {
    if (calificacion == null || isNaN(Number(calificacion))) return null;
    return Number(calificacion).toFixed(1); // 1 decimal
  }, [calificacion]);

  // ⚠️ IMPORTANTE: los hooks (useMemo) NO deben depender de returns condicionales
  // Se definen siempre, antes de cualquier return.
  const estrellas = useMemo(() => {
    const llenar = calificacion != null && !isNaN(Number(calificacion)) ? Math.round(Number(calificacion)) : 0;
    const arr = [];
    for (let i = 1; i <= 5; i++) {
      arr.push(i <= llenar);
    }
    return arr;
  }, [calificacion]);

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    if (!slug) return;
    // if (mostrarLink) navigate(`/market/producto/${slug}`);
    console.log("handleCardClick")
  };

  const handleClickFavoriteButton = (event) => {
    event.stopPropagation();
    console.log("Editing product action")
  };

  const handleComprar = (event) => {
    event.stopPropagation();
    console.log("handle comprar producto:", producto);
    navigate(`/comida/comprar/${slug}`, { state: { product_id: producto?.id } })
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      style={{ height: '100%' }}
    >
      <Card
        onClick={handleCardClick}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRadius: 2,
          boxShadow: 4,
          overflow: 'hidden',
          cursor: 'default',
        }}
      >
        <Box>
          <Box sx={{ position: 'relative' }}>
            <CardMedia
              component="img"
              image={imagenValida}
              alt={slug || 'Producto'}
              unselectable='off'
              sx={{ height: { xs: 180, sm: 180 }, objectFit: 'cover', width: '100%' }}
            />

            {/* Editar producto */}
            <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 1 }}>
              <Tooltip title='Editar'>
                <IconButton
                  onClick={(e) => handleClickFavoriteButton(e)}
                  size="small"
                  aria-label="Editar"
                  sx={{
                    bgcolor: favorito ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.9)',
                    color: favorito ? '#7C3AED' : '#6d6e71',
                    '&:hover': { bgcolor: favorito ? 'rgba(124,58,237,0.16)' : 'rgba(245,245,245,1)' },
                    boxShadow: '0 3px 10px rgba(0,0,0,0.06)'
                  }}
                >
                  <FavoriteBorderIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Badge de stock / agotado */}
            {usa_stock && typeof stock === 'number' && (
              <Chip
                label={stock === 0 ? 'Agotado' : `Disponibles: ${stock}`}
                color={stock === 0 ? 'error' : 'default'}
                size="small"
                sx={{ position: 'absolute', left: 10, top: 10, bgcolor: stock === 0 ? '#ffebee' : 'rgba(255,255,255,0.9)', fontWeight: 700 }}
              />
            )}
          </Box>

          <CardContent sx={{ pt: 2 }}>
            <Typography variant="subtitle1" component="div" fontWeight={700} noWrap sx={{ mb: 0.5 }}>
              {nombre || 'Sin título'}
            </Typography>

            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="h6" fontWeight={800}>
                {precioFmt}
              </Typography>

              <Box display="flex" alignItems="center" gap={1}>
                <Box display="flex" alignItems="center">
                  {estrellas.map((filled, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {filled ? <StarIcon fontSize="small" sx={{ color: '#f7b500' }} /> : <StarBorderIcon fontSize="small" sx={{ color: '#dcdcdc' }} />}
                    </span>
                  ))}
                </Box>
              </Box>
            </Box>

            {/* número de calificaciones y envío */}
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Box display="flex" alignItems="center" gap={1}>
                {promedioDisplay ? (
                  <Typography variant="body2" fontWeight={700}>{promedioDisplay}</Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">—</Typography>
                )}

                <Typography variant="caption" color="text.secondary">({calificaciones || 0})</Typography>
              </Box>
            </Box>
            {/* vendidos */}
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">Vendidos: {vendidos || 0}</Typography>
            </Box>
            {/* Tiempo preparación / peso */}
            <Box display="flex" justifyContent="space-between" gap={1} flexWrap='wrap'>
              <Typography variant="caption" color="text.secondary">Tiempo preparación: {tiempo_preparacion ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">Peso: {peso ?? 0}</Typography>
            </Box>
            {/* Calorias / porciones */}
            <Box display="flex" justifyContent="space-between" gap={1} flexWrap='wrap'>
              <Typography variant="caption" color="text.secondary">Calorias: {calorias ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">Porciones: {porciones ?? 0}</Typography>
            </Box>
            {/* Picante / Temperatura */}
            <Box display="flex" justifyContent="space-between" gap={1} flexWrap='wrap'>
              <Typography variant="caption" color="text.secondary">Picante: {nivel_picante ?? 'ninguno'}</Typography>
              <Typography variant="caption" color="text.secondary">Temperatura: {temperatura ?? ''}</Typography>
            </Box>
            {/* descripción corta */}
            {descripcion && (
              <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {descripcion}
              </Typography>
            )}
            {/* Categorias */}
            <Typography variant="caption" color="primary" mt={1}>Categorias:</Typography>
            <Box display="flex" alignItems="center" gap={1} flexWrap='wrap' mb={1}>
              {
                (food_categories?.data ?? []).map(({ id: categoryId, attributes }) => (
                  <Typography key={`category-${categoryId}-product-${id}`} variant="caption" color="text.secondary">• {attributes?.nombre ?? ''}</Typography>
                ))
              }
            </Box>
            {/* Ingredientes */}
            <Box display="flex" flexDirection="column" justifyContent="center" flexWrap='wrap'>
              <Typography variant="caption" color="primary">Ingredientes:</Typography>
              {
                ingredientes.map((ingrediente, index) => (
                  <Typography key={`ingrediente-${index}-product-${id}`} variant="caption" color="text.secondary" pl={1}>• {ingrediente?.nombre ?? ''}</Typography>
                ))
              }
            </Box>
            {/* Alergenos */}
            <Box display="flex" flexDirection="column" justifyContent="center" flexWrap='wrap'>
              <Typography variant="caption" color="primary">Alergenos</Typography>
              {
                alergenos.map((alergeno, index) => (
                  <Typography key={`alergeno-${index}-product-${id}`} variant="caption" color="text.secondary" pl={1}>• {alergeno ?? ''}</Typography>
                ))
              }
            </Box>
            {/* Flags */}
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={2}>
              {vegetariano && (<Chip label="Vegetariano" color="success" size="small" sx={{ fontWeight: 700 }} />)}
              {vegano && (<Chip label="Vegano" color="success" size="small" sx={{ fontWeight: 700 }} />)}
              {sin_gluten && (<Chip label="Sin gluten" color="default" size="small" sx={{ fontWeight: 700 }} />)}
              {contiene_lacteos && (<Chip label="Contiene lacteos" color="info" size="small" sx={{ fontWeight: 700 }} />)}
              {contiene_mariscos && (<Chip label="Contiene mariscos" color="error" size="small" sx={{ fontWeight: 700 }} />)}
              {contiene_cerdo && (<Chip label="Contiene cerdo" color="secondary" size="small" sx={{ fontWeight: 700 }} />)}
            </Box>
          </CardContent>
        </Box>

        {/* Footer con botones */}
        <Box display='flex' gap={1} justifyContent='flex-end' sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={(e) => handleComprar(e)}
            variant="outlined"
            fullWidth
            sx={{
              borderColor: '#7C3AED',
              color: '#7C3AED',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: 'rgba(124,58,237,0.06)' }
            }}
          >
            Comprar
          </Button>
        </Box>
      </Card>
    </motion.div >
  );
}
