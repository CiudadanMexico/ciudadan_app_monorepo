// src/components/Food/FoodCategorias.jsx
// Slider de categorías de comida. Reutiliza el MISMO componente que muestra las
// categorías en MarketPlace (CategoriasSlider), alimentado con las food-categories.
// Mapea la imagen con fallback (nunca src=''): thumbnail -> small -> original -> placeholder.
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import CategoriasSlider from '../MarketPlace/CategoriasSlider.jsx';

const SEARCH_ORANGE = '#ff6f00';
const PLACEHOLDER =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="100%" height="100%" fill="#ffe6cc"/><text x="50%" y="52%" font-size="14" fill="#ff6f00" text-anchor="middle" dominant-baseline="middle">Comida</text></svg>'
  );

const urlImagen = (cat) => {
  const u = cat?.attributes?.imagen?.urls ?? {};
  return u.thumbnail || u.small || u.medium || u.large || u.original || PLACEHOLDER;
};

export default function FoodCategorias({ categorias = [], loading = false, onSelectCategory, onVerOfertas }) {
  if (loading || categorias.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          background: 'linear-gradient(90deg, rgba(255,242,224,0.95), rgba(255,245,232,0.95))',
        }}
      >
        <DeliveryDiningIcon sx={{ fontSize: 40, color: SEARCH_ORANGE }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#d35400' }}>
            Tu comida favorita en casa en menos de 45 min
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pago justo para quien te la trae • Opciones rápidas y sin contacto
          </Typography>
        </Box>
        <Button
          onClick={onVerOfertas}
          variant="contained"
          sx={{ bgcolor: '#ffb74d', color: '#4b2e00', fontWeight: 700, textTransform: 'none' }}
        >
          Ver ofertas
        </Button>
      </Paper>

      <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label="Entrega rápida" icon={<AccessTimeIcon />} sx={{ bgcolor: '#fff7f0', fontWeight: 700 }} />
        <Chip label="Pago justo" icon={<MonetizationOnIcon />} sx={{ bgcolor: '#fff7f0', fontWeight: 700 }} />
        <Chip label="Vegano" sx={{ bgcolor: '#fff7f0', fontWeight: 700 }} />
        <Chip label="Sin contacto" sx={{ bgcolor: '#fff7f0', fontWeight: 700 }} />
      </Box>

      <Box sx={{ bgcolor: 'transparent', p: 1, borderRadius: 2 }}>
        <CategoriasSlider
          categorias={categorias.map((c) => ({
            nombre: c.attributes?.nombre,
            slug: c.attributes?.slug,
            imagen: urlImagen(c),
          }))}
          onClick={(slug) => onSelectCategory && onSelectCategory(slug)}
        />
      </Box>
    </Box>
  );
}
