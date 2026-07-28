// src/Pages/MarketPlace/Producto.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Paper,
  Container,
  CircularProgress,
  Divider,
  Chip,
  Button,
  IconButton,
} from '@mui/material';
import { motion } from 'framer-motion';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StarIcon from '@mui/icons-material/Star';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import useProductos from '../../hooks/useProductos.jsx';
import Resenas from '../../components/MarketPlace/Resenas.jsx';
import GaleriaImagenesProducto from '../../components/MarketPlace/GaleriaImagenesProducto.jsx';
import DetalleProducto from '../../components/MarketPlace/DetalleProducto.jsx';
import productoImg from '../../assets/placeholders/producto.png';

import '../../styles/Producto.css';
import '../../styles/DetalleProducto.css';

/**
 * Página de detalle de producto (botones movidos a DetalleProducto)
 *
 * - Trae producto por slug
 * - Enriquecimiento no bloqueante: rankings, reseñas, envío
 * - No contiene acciones (agregar/comprar/favoritos): están en DetalleProducto
 */

const Producto = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const {
    getProductoBySlug,
    precotizacionTotal,
    calcularPromedioRankingsPorProducto,
    obtenerResenas,
  } = useProductos();

  const [producto, setProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imagenIndex, setImagenIndex] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [envioEstimado, setEnvioEstimado] = useState(null);
  const [rankingInfo, setRankingInfo] = useState({ count: 0, avg5: null });
  const [resenasData, setResenasData] = useState([]);

  useEffect(() => {
    let mounted = true;

    const fetchProducto = async () => {
      setLoading(true);
      setError(null);
      setProducto(null);
      setEnvioEstimado(null);
      setRankingInfo({ count: 0, avg5: null });
      setResenasData([]);

      try {
        const data = await getProductoBySlug(slug);
        if (!mounted) return;

        if (!data) {
          setError('No se encontró el producto.');
          return;
        }

        setProducto(data);
        setImagenIndex(0);
        setCantidad(1);

        // enriquecimiento no bloqueante
        (async () => {
          try {
            if (typeof calcularPromedioRankingsPorProducto === 'function') {
              const res = await calcularPromedioRankingsPorProducto(data.id);
              if (!mounted) return;
              setRankingInfo({ count: res.count || 0, avg5: res.avg5 != null ? res.avg5 : null });
            } else {
              const attrs = data.attributes || {};
              const numero = attrs.numero_calificaciones || 0;
              const sumStars = attrs.calificacion || 0;
              const avg = numero ? (sumStars / numero) : null;
              if (!mounted) return;
              setRankingInfo({ count: numero, avg5: avg });
            }
          } catch (err) {
            console.error('[Producto] error calculando ranking:', err);
          }
        })();

        (async () => {
          try {
            if (typeof obtenerResenas === 'function') {
              const rez = await obtenerResenas(data.id);
              if (!mounted) return;
              setResenasData(rez || []);
            } else {
              const rel = data.attributes?.resenas || [];
              if (!mounted) return;
              setResenasData(Array.isArray(rel) ? rel : []);
            }
          } catch (err) {
            console.error('[Producto] error cargando reseñas:', err);
          }
        })();

        (async () => {
          try {
            const envioField = data.attributes?.envio;
            if (envioField && String(envioField).trim() !== '') {
              if (!mounted) return;
              setEnvioEstimado(String(envioField));
            } else {
              if (typeof precotizacionTotal === 'function') {
                const attrs = data.attributes || {};
                const precioNum = Number(attrs.precio) || 0;
                const candidato = {
                  id: data.id,
                  precio: precioNum,
                  largo: attrs.largo,
                  ancho: attrs.ancho,
                  alto: attrs.alto,
                  peso: attrs.peso,
                  cp: attrs.cp || attrs.cp_origen || null,
                };
                const cpDestino = attrs?.cp_destino || attrs?.cp || '11560';
                const total = await precotizacionTotal(candidato, cpDestino);
                if (!mounted) return;
                if (total != null && !isNaN(Number(total))) {
                  const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(total));
                  setEnvioEstimado(fmt);
                } else {
                  setEnvioEstimado('No disponible');
                }
              } else {
                setEnvioEstimado('No disponible');
              }
            }
          } catch (err) {
            console.error('[Producto] error cotizando envío:', err);
            if (mounted) setEnvioEstimado('Error al cotizar');
          }
        })();

      } catch (err) {
        console.error('[Producto] fetch error', err);
        setError('Error cargando el producto.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (slug) fetchProducto();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, getProductoBySlug, precotizacionTotal, calcularPromedioRankingsPorProducto, obtenerResenas]);

  const handleCantidadChange = (newCantidad) => {
    if (newCantidad < 1) return;
    const stockLocal = producto?.attributes?.stock;
    if (typeof stockLocal === 'number' && newCantidad > stockLocal) return;
    setCantidad(newCantidad);
  };

  // derivadas seguras (siempre antes de cualquier return)
  const attrs = producto?.attributes || {};
  const nombre = attrs.nombre || attrs.titulo || 'Sin título';
  const descripcion = attrs.descripcion || '';
  const imagenPredeterminada =
    attrs?.imagen_predeterminada?.data?.[0]?.attributes?.formats?.medium?.url ||
    attrs?.imagen_predeterminada?.data?.[0]?.attributes?.url ||
    null;

  const imagenesRel = Array.isArray(attrs?.imagenes?.data)
    ? attrs.imagenes.data.map(i => `${process.env.REACT_APP_STRAPI_URL}${i.attributes.url}`)
    : [];

  const todasLasImagenes = [
    ...(imagenPredeterminada ? [`${process.env.REACT_APP_STRAPI_URL}${imagenPredeterminada}`] : []),
    ...imagenesRel,
  ];
  if (todasLasImagenes.length === 0) todasLasImagenes.push(productoImg);

  const precioNum = Number(attrs.precio) || null;
  const precioFmt = precioNum != null ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(precioNum) : 'Precio no disponible';

  const stock = attrs.stock;
  const vendidos = attrs.vendidos || 0;
  const marca = attrs.marca || null;
  const localidad = attrs.localidad || null;
  const estado = attrs.estado || null;

  const avg5 = rankingInfo.avg5 != null ? rankingInfo.avg5 : (attrs.numero_calificaciones ? ((attrs.calificacion || 0) / (attrs.numero_calificaciones * 1)) : null);
  const numCalificaciones = rankingInfo.count || attrs.numero_calificaciones || 0;

  // cálculo simple sin hooks para evitar HMR/hook-order issues
  const estrellas = (() => {
    const valor = avg5 != null && !isNaN(Number(avg5)) ? Math.round(Number(avg5)) : 0;
    return Array.from({ length: 5 }).map((_, i) => i < valor);
  })();

  const envioMostrar = envioEstimado || (attrs.envio || null) || 'No disponible';

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <Typography variant="h6" color="error">{error}</Typography>
      </Box>
    );
  }

  if (!producto) return null;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <IconButton onClick={() => navigate(-1)} aria-label="volver">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={700}>{nombre}</Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <GaleriaImagenesProducto
                imagenes={todasLasImagenes}
                nombre={nombre}
                imagenIndex={imagenIndex}
                setImagenIndex={setImagenIndex}
              />
            </motion.div>

            <Box display="flex" gap={1} alignItems="center" mt={2}>
              <LocalShippingIcon sx={{ color: '#6d6e71' }} />
              <Typography variant="body2" color="text.secondary">Envío estimado:</Typography>
              <Typography variant="subtitle2" fontWeight={700}>{envioMostrar}</Typography>
            </Box>

            {typeof stock === 'number' && (
              <Box mt={1}>
                <Chip label={stock === 0 ? 'Agotado' : `Disponibles: ${stock}`} color={stock === 0 ? 'error' : 'default'} />
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box mb={1}>
              <Typography variant="h5" fontWeight={900}>{precioFmt}</Typography>

              <Box display="flex" gap={2} alignItems="center" mt={1}>
                {marca && <Typography variant="body2" color="text.secondary">Marca: <strong>{marca}</strong></Typography>}
                <Typography variant="body2" color="text.secondary">Vendidos: <strong>{vendidos}</strong></Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <Box display="flex" alignItems="center">
                  {estrellas.map((filled, i) => (
                    <StarIcon key={i} fontSize="small" sx={{ color: filled ? '#f7b500' : '#e6e6e6' }} />
                  ))}
                </Box>
                <Typography variant="body2" fontWeight={700}>
                  {avg5 != null ? Number(avg5).toFixed(1) : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">({numCalificaciones})</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* DetalleProducto contiene ahora todas las acciones (agregar, favoritos, comprar) */}
            <DetalleProducto
              producto={producto}
              precio={precioNum}
              marca={marca}
              stock={stock}
              vendidos={vendidos}
              localidad={localidad}
              estado={estado}
              cantidad={cantidad}
              handleCantidadChange={handleCantidadChange}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box mb={3}>
          <Typography variant="h6" fontWeight={700} gutterBottom>Descripción</Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {descripcion || 'Sin descripción disponible.'}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box mb={3}>
          <Typography variant="h6" fontWeight={700} mb={1}>Reseñas</Typography>
          <Resenas slug={slug} />
        </Box>
      </Paper>
    </Container>
  );
};

export default Producto;
