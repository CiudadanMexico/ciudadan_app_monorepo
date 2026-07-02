// src/components/MarketPlace/DetalleProducto.jsx
import React, { useEffect, useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  Stack,
  Card,
  CardContent,
  Divider,
  Box,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import BoltIcon from '@mui/icons-material/Bolt';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';

import { useCart } from '../../Contexts/CartContext';
import useFavoritos from '../../hooks/useFavoritos';
import { useAuth0 } from '@auth0/auth0-react';

import '../../styles/DetalleProducto.css';

const MotionButton = motion(Button);

export default function DetalleProducto({
  producto,
  precio,
  marca,
  stock,
  vendidos,
  localidad,
  estado,
  cantidad,
  handleCantidadChange,
}) {
  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth0();

  /* -------------------- estados -------------------- */
  const [costoEnvio, setCostoEnvio] = useState('Calculando…');

  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const [favLoading, setFavLoading] = useState(true);
  const [favAdded, setFavAdded] = useState(false);

  /* -------------------- favoritos hook -------------------- */
  const { addFavorito, existeFavorito } = useFavoritos({
    user: user
      ? { email: user.email }
      : null,
    token: null,
  });

  /* -------------------- ENVÍO (no bloqueante) -------------------- */
  useEffect(() => {
    let mounted = true;

    const calcularEnvio = async () => {
      try {
        const cp_origen = producto?.attributes?.cp_origen || '01000';
        const cp_destino = producto?.attributes?.cp_destino || '02800';

        const response = await fetch(`${STRAPI_URL}/api/shipping/calcular`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cp_origen,
            cp_destino,
            cantidad,
            largo: 2,
            ancho: 2,
            alto: 2,
            peso: 2,
          }),
        });

        if (!mounted) return;

        if (response.ok) {
          const res = await response.json();
          setCostoEnvio(`$${res.costo}`);
        } else {
          setCostoEnvio('No disponible');
        }
      } catch (e) {
        console.error('[ENVÍO]', e);
        if (mounted) setCostoEnvio('No disponible');
      }
    };

    calcularEnvio();
    return () => { mounted = false; };
  }, [cantidad, producto, STRAPI_URL]);

  /* -------------------- FAVORITOS (silent load) -------------------- */
  useEffect(() => {
    let mounted = true;

    const checkFavorito = async () => {
      if (!isAuthenticated || !producto?.id || !existeFavorito) {
        setFavLoading(false);
        return;
      }

      try {
        const existe = await existeFavorito({
          tipo: 'producto',
          id: producto.id,
        });

        if (mounted) setFavAdded(!!existe);
      } catch (e) {
        console.error('[FAVORITOS check]', e);
      } finally {
        if (mounted) setFavLoading(false);
      }
    };

    checkFavorito();
    return () => { mounted = false; };
  }, [isAuthenticated, producto, existeFavorito]);

  /* -------------------- acciones -------------------- */
  const handleAddToCart = async () => {
    if (adding || !producto) return;

    setAdding(true);
    try {
      await addToCart(
        {
          id: producto.id,
          nombre: producto.attributes.nombre,
          marca: producto.attributes.marca,
          precio: producto.attributes.precio,
          imagen_predeterminada:
            producto.attributes.imagen_predeterminada?.data?.attributes,
        },
        cantidad
      );

      setAdded(true);
    } catch (e) {
      console.error('[CART]', e);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleFavorito = async () => {
    if (!isAuthenticated || favLoading) return;

    setFavLoading(true);
    try {
      await addFavorito({
        tipo: 'producto',
        id: producto.id,
        url: `/market/producto/${producto.attributes.slug}`,
      });
      setFavAdded(true);
    } catch (e) {
      console.error('[FAVORITOS add]', e);
    } finally {
      setFavLoading(false);
    }
  };

  const handleBuy = () => {
    navigate(`/market/comprar/${producto.attributes.slug}`);
  };

  /* -------------------- UI -------------------- */
  return (
    <Card elevation={8} sx={{ borderRadius: 3 }}>
      <CardContent>
        {/* Precio + favorito */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" fontWeight={900}>
            ${precio?.toFixed(2) || '0.00'}
          </Typography>

          <IconButton
            onClick={handleToggleFavorito}
            disabled={favLoading || !isAuthenticated}
          >
            {favLoading ? (
              <CircularProgress size={20} />
            ) : favAdded ? (
              <FavoriteIcon sx={{ color: '#7C3AED' }} />
            ) : (
              <FavoriteBorderIcon />
            )}
          </IconButton>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* info */}
        <Stack spacing={0.5}>
          <Typography variant="body2">🌿 <strong>Marca:</strong> {marca || '—'}</Typography>
          <Typography variant="body2">📦 <strong>Stock:</strong> {stock ?? '—'}</Typography>
          <Typography variant="body2">🔥 <strong>Vendidos:</strong> {vendidos ?? 0}</Typography>
          <Typography variant="body2">
            📍 <strong>Ubicación:</strong> {localidad || '—'} {estado || ''}
          </Typography>
          <Typography variant="body2">
            🚚 <strong>Envío:</strong> {costoEnvio}
          </Typography>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* cantidad */}
        <Stack direction="row" spacing={1} justifyContent="center">
          <Button onClick={() => handleCantidadChange(Math.max(1, cantidad - 1))}>
            −
          </Button>

          <TextField
            size="small"
            type="number"
            value={cantidad}
            onChange={(e) => handleCantidadChange(Number(e.target.value))}
            inputProps={{ min: 1, max: stock }}
            sx={{ width: 80 }}
          />

          <Button
            onClick={() =>
              handleCantidadChange(
                stock ? Math.min(stock, cantidad + 1) : cantidad + 1
              )
            }
          >
            +
          </Button>
        </Stack>

        {/* acciones */}
        <Stack spacing={1.5} mt={3}>
          <MotionButton
            fullWidth
            variant="contained"
            startIcon={adding ? <CircularProgress size={18} /> : <AddShoppingCartIcon />}
            onClick={added ? () => navigate('/market/carrito') : handleAddToCart}
            sx={{
              backgroundColor: '#fff200',
              color: '#000',
              fontWeight: 700,
              borderRadius: 2,
              '&:hover': { backgroundColor: '#e6d700' },
            }}
          >
            {added ? 'Ir al carrito' : 'Agregar al carrito'}
          </MotionButton>

          <MotionButton
            fullWidth
            variant="contained"
            startIcon={<BoltIcon />}
            onClick={handleBuy}
            sx={{
              backgroundColor: '#6d6e71',
              fontWeight: 700,
              borderRadius: 2,
            }}
          >
            Comprar ahora
          </MotionButton>
        </Stack>
      </CardContent>
    </Card>
  );
}
