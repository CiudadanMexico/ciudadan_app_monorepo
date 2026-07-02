import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, useMediaQuery, TextField, Button, CircularProgress } from '@mui/material';
import CategoriaCard from '../MarketPlace/CategoriaCard';
import PreLoader from '../PreLoader.jsx';
import '../../styles/CategoriasSlider.css';
import { useContenido } from '../../hooks/useContenido';

export default function CategoriasSlider() {
  const { categorias, loading, error, crearCategoria } = useContenido();
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Para el slider
  const scrollRef = useRef();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [showArrows, setShowArrows] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const el = scrollRef.current;
      if (el) setShowArrows(el.scrollWidth > el.clientWidth);
    };
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categorias]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    const amount = 150;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  async function handleCrearCategoria(e) {
    e.preventDefault();
    if (!nuevaCategoria.trim()) {
      setMensaje('El nombre de la categoría no puede estar vacío');
      return;
    }
    setMensaje(null);
    setSubmitting(true);
    try {
      await crearCategoria(nuevaCategoria.trim());
      setMensaje('Categoría creada correctamente');
      setNuevaCategoria('');
    } catch {
      setMensaje('Error al crear la categoría');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PreLoader>Cargando Categorías...</PreLoader>;
  if (error) return <p>Error cargando categorías.</p>;

  return (
    <Box>
      <form onSubmit={handleCrearCategoria} style={{ marginBottom: '1rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <TextField
          label="Nueva categoría"
          value={nuevaCategoria}
          onChange={e => setNuevaCategoria(e.target.value)}
          disabled={submitting}
          size="small"
        />
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? 'Creando...' : 'Crear'}
        </Button>
      </form>
      {mensaje && <p>{mensaje}</p>}

      <Box className="slider-container" position="relative">
        {isDesktop && showArrows && (
          <IconButton className="slider-arrow left" onClick={() => scroll('left')} size="large">
            <i className="material-icons">chevron_left</i>
          </IconButton>
        )}

        <Box
          className={`slider-scroll ${!showArrows ? 'centered' : ''}`}
          ref={scrollRef}
          sx={{ display: 'flex', overflowX: 'auto', scrollBehavior: 'smooth', gap: 2 }}
        >
          {categorias.length === 0 ? (
            <Box sx={{ p: 2 }}>No hay categorías disponibles.</Box>
          ) : (
            categorias.map((cat) => (
              <Box key={cat.id} className="slider-item" sx={{ flex: '0 0 auto' }}>
                <CategoriaCard nombre={cat.nombre} imagen={cat.imagen} slug={cat.slug} />
              </Box>
            ))
          )}
        </Box>

        {isDesktop && showArrows && (
          <IconButton className="slider-arrow right" onClick={() => scroll('right')} size="large">
            <i className="material-icons">chevron_right</i>
          </IconButton>
        )}
      </Box>
    </Box>
  );
}
