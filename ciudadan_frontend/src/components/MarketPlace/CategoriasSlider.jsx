import { useRef } from 'react';
import { Box, IconButton, useMediaQuery } from '@mui/material';
import CategoriaCard from './CategoriaCard.jsx';
import '../../styles/CategoriasSlider.css';

const CategoriasSlider = ({ categorias, clasifica, forma }) => {
  const scrollRef = useRef();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const scroll = (dir) => {
    const el = scrollRef.current;
    const amount = 150;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <Box className="slider-wrapper" sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      <Box className="slider-container" sx={{ width: '99%', position: 'relative', display: 'flex', alignItems: 'center' }}>
        
          <IconButton className="slider-arrow left" onClick={() => scroll('left')} sx={{ position: 'absolute', left: 0, zIndex: 1 }}>
            <i className="material-icons">chevron_left</i>
          </IconButton>
        

        <Box
          className="slider-scroll"
          ref={scrollRef}
          sx={{
            overflowX: 'auto',
            display: 'flex',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none', // Firefox
            '&::-webkit-scrollbar': { display: 'none' } // Chrome, Safari
          }}
        >
          {categorias.map((cat, idx) => (
            <Box key={idx} className="slider-item" sx={{ flex: '0 0 auto' }}>
              <CategoriaCard 
                nombre={cat.nombre} 
                imagen={cat.imagen} 
                slug={cat.slug} 
                clasifica={clasifica}
                forma={forma ?? 'circle'} 
              />
            </Box>
          ))}
        </Box>

        
          <IconButton className="slider-arrow right" onClick={() => scroll('right')} sx={{ position: 'absolute', right: 0, zIndex: 1 }}>
            <i className="material-icons">chevron_right</i>
          </IconButton>
        
      </Box>
    </Box>
  );
};

export default CategoriasSlider;
