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
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PlaceIcon from '@mui/icons-material/Place';
import productoImg from '../../assets/placeholders/producto.png';

// Componente ProductoCard
// Props esperadas:
// - titulo (string)
// - slug (string)
// - descripcion (string)
// - imagen (url string)
// - imagenes (objeto si quieres usar galería)
// - precio (number)
// - envioAprox (string)  -> ej. "$120 aprox." o null
// - localidad (string)
// - estado (string)
// - calificacion (number 0..5 o null)
// - numeroCalificaciones (number)
// - vendidos (number)
// - total (string como `$123.45`) opcional
// - stock (number) opcional
// - onAgregarCarrito (func) opcional
// - mostrarLink (boolean) por defecto true

export default function ProductoCard({
  titulo,
  slug,
  descripcion,
  imagenes,
  imagen,
  precio,
  envioAprox,
  localidad,
  estado,
  calificacion,
  numeroCalificaciones = 0,
  vendidos = 0,
  total,
  stock,
  onAgregarCarrito,
  mostrarLink = true,
  productoId = null,        // acepta id del producto (recomendado)
  id = null,                // fallback si te pasaron prop id
  currentUserId = null,     // opcional: id del usuario actual (si ya lo tienes)
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [favorito, setFavorito] = useState(false);

  // determinar productId real (acepta varias formas)
  const productId = productoId || id || null;

  const imagenValida = imagen && imagen !== `${process.env.REACT_APP_STRAPI_URL}` ? imagen : productoImg;

  const precioFmt = useMemo(() => {
    if (total) return total;
    if (precio == null || Number.isNaN(Number(precio))) return 'Precio no disponible';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(precio));
  }, [precio, total]);

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
    if (mostrarLink) navigate(`/market/producto/${slug}`);
  };

  const handleFavoritos = (e) => {
    e.stopPropagation();
    if (slug) {
      // navegamos a la ruta que pediste y marcamos favorito optimista
      navigate(`/favoritos/agregar/producto/${slug}`);
      setFavorito(true);
    }
  };

  const handleAgregarCarrito = (e) => {
    e.stopPropagation();
    if (typeof onAgregarCarrito === 'function') return onAgregarCarrito({ slug, titulo, precio });
    navigate('/comprar');
  };

  // ----------------------
  // Check favoritos (no bloqueante)
  // Consulta collection 'favoritos' filtrando por usuario y producto.
  // Si currentUserId no se pasa, intenta obtenerlo desde /api/users/me (requiere sesión).
  // ----------------------
  React.useEffect(() => {
    let mounted = true;
    const checkFavorito = async () => {
      try {
        if (!productId) return; // necesitamos id del producto para checar

        let userIdLocal = currentUserId;
        if (!userIdLocal) {
          try {
            const meRes = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/users/me`, { credentials: 'include' });
            if (meRes.ok) {
              const meJson = await meRes.json();
              // Strapi puede devolver el user en different shapes; intentar varias
              userIdLocal = meJson?.id || meJson?.data?.id || (meJson?.data && meJson.data.id) || null;
            }
          } catch (e) {
            // ignore — si no hay sesión, no marcamos como favorito
          }
        }

        if (!userIdLocal) return;

        const url = `${process.env.REACT_APP_STRAPI_URL}/api/favoritos?filters[usuario][id][$eq]=${userIdLocal}&filters[producto][id][$eq]=${productId}`;
        const res = await fetch(url, { credentials: 'include' });
        if (!mounted) return;
        if (!res.ok) return;
        const json = await res.json();
        const items = json?.data || [];
        if (!mounted) return;
        setFavorito(items.length > 0);
      } catch (err) {
        console.error('[ProductoCard] Error verificando favoritos:', err);
      }
    };

    checkFavorito();
    return () => { mounted = false; };
  }, [productId, currentUserId]);

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
          cursor: mostrarLink ? 'pointer' : 'default',
        }}
      >
        <Box>
          <Box sx={{ position: 'relative' }}>
            <CardMedia
              component="img"
              image={imagenValida}
              alt={titulo || 'Producto'}
              sx={{ height: { xs: 180, sm: 180 }, objectFit: 'cover', width: '100%' }}
            />

            {/* Favoritos - corazón */}
            <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 1 }}>
              <Tooltip title={favorito ? 'Favorito agregado' : 'Agregar a favoritos'}>
                <IconButton
                  onClick={handleFavoritos}
                  size="small"
                  aria-label="Agregar a favoritos"
                  sx={{
                    bgcolor: favorito ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.9)',
                    color: favorito ? '#7C3AED' : '#6d6e71',
                    '&:hover': { bgcolor: favorito ? 'rgba(124,58,237,0.16)' : 'rgba(245,245,245,1)' },
                    boxShadow: '0 3px 10px rgba(0,0,0,0.06)'
                  }}
                >
                  {favorito ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>

            {/* Badge de stock / agotado */}
            {typeof stock === 'number' && (
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
              {titulo || 'Sin título'}
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

                <Typography variant="caption" color="text.secondary">({numeroCalificaciones || 0})</Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={0.5}>
                <LocalShippingIcon fontSize="small" sx={{ color: '#6d6e71' }} />
                <Typography variant="caption" color="text.secondary">{envioAprox || 'Estimación no disponible'}</Typography>
              </Box>
            </Box>

            {/* localidad / vendidos */}
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <PlaceIcon fontSize="small" sx={{ color: '#6d6e71' }} />
                <Typography variant="caption" color="text.secondary">{localidad ? `${localidad}${estado ? `, ${estado}` : ''}` : 'Ubicación no disponible'}</Typography>
              </Box>

              <Typography variant="caption" color="text.secondary">Vendidos: {vendidos || 0}</Typography>
            </Box>

            {/* descripción corta */}
            {descripcion && (
              <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {descripcion}
              </Typography>
            )}
          </CardContent>
        </Box>

        {/* Footer con botones */}
        <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
          <Button
            onClick={handleAgregarCarrito}
            variant="contained"
            fullWidth
            sx={{
              backgroundColor: '#10B981', // verde pro
              color: '#fff',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: '#0ea46f' }
            }}
            startIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 4H3v2h2.2l1.6 8.6a2 2 0 002 1.4h7.4v-2H9.8l-.3-1.4h9.1a1 1 0 00.96-.74l1-4A1 1 0 0019.6 6H6.2" fill="#fff"/></svg>}
          >
            Agregar
          </Button>

          <Button
            onClick={(e) => { e.stopPropagation(); navigate(`/product/compra/${slug || ''}`); }}
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
    </motion.div>
  );
}
