// src/components/Gana.jsx
import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const W = 180;
const H = Math.sqrt(3) / 2 * W;
const HALF_H = H / 2;

function Hexagon({ count, src, left, top, animationStyle, visible, btn }) {
  const [hovered, setHovered] = useState(false);

  // estilos del wrapper: el hexágono con clipPath
  const wrapperSx = {
    position: 'absolute',
    width: W,
    height: H,
    left,
    top,
    boxShadow: '10px 10px 8px #0f0, 10px 10px 10px #0f0',
    border: '10px solid #0f0',
    overflow: 'hidden',
    zIndex: visible ? 20 : 2,
    opacity: 0,
    ...animationStyle,
    animationFillMode: 'forwards',
    backgroundImage: `url(${src})`,
    backgroundSize: 'cover',
    backgroundPosition: `center ${hovered ? '20px' : '0px'}`, 
    transition: 'background-position 0.3s ease',
    clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
    cursor: visible ? 'pointer' : 'default',
  };

  // configuraciones del botón
  const isRed = count === 18 || count === 30;
  const buttonSx = {
    position: 'absolute',
    width: '100%',
    left: '50%',
    top: H / 2,
    transform: 'translate(-50%,-50%)',
    backgroundColor: `${isRed ? '#A6D1B3' : '#fff200'}`,
    color: `${isRed ? 'blue' : 'green'}`,
    fontWeight: 'bold',
    fontSize: '0.75rem',
    px: 2,
    py: 0.5,
    borderRadius: '999px',
    textTransform: 'none',
    zIndex: 20000,
    whiteSpace: 'nowrap',
    border: `2px solid ${isRed ? '#0f0' : '#0f0'}`,
    transition: isRed ? undefined : 'transform 0.2s ease, box-shadow 0.2s ease',
    // solo si no es rojo, agregamos el hover
    ...(isRed
      ? {}
      : {
          '&:hover': {
            transform: 'translate(-50%, -50%) scale(1.1)',
            boxShadow: '0 0 8px #0f0, 0 0 12px #0f0',
          },
        }
    ),
  };

  return (
    <Box
      sx={wrapperSx}
      onMouseEnter={() => visible && setHovered(true)}
      onMouseLeave={() => visible && setHovered(false)}
    >
      {visible && btn && (
        <Button component={Link} to={btn.path} sx={buttonSx}>
          {btn.label}
        </Button>
      )}
    </Box>
  );
}

export default function Gana() {
  let imgCounter = 1;
  const topHalves = [];
  const fullRows = [];
  const bottomHalves = [];
  const visibleIds = [12, 13, 16, 17, 18, 30, 31];
  const buttonConfig = {
    12: { label: 'Promueve las membresías', path: '/gana/promueve' },
    13: { label: 'Vende', path: '/gana/vende' },
    16: { label: 'Afilia tu Club', path: '/clubs/tipos-clubs' },
    17: { label: 'Genera Contenido', path: '/gana/genera-contenidos' },
    18: { label: '...próximamente', path: '' },
    30: { label: '...próximamente', path: '' },
    31: { label: 'Abrir Franquicia en mi país', path: '/gana/internacionaliza' },
  };

  const getAnimation = (count) => {
    switch (count) {
      case 13: return { animation: 'enterTopRight 1s ease-out' };
      case 12: return { animation: 'enterTopLeft 1s ease-out' };
      case 16: return { animation: 'enterLeft 1s ease-out' };
      case 17: return { animation: 'fadeExplode 0.8s ease-out' };
      case 18: return { animation: 'enterRight 1s ease-out' };
      case 30: return { animation: 'enterBottomLeft 1s ease-out' };
      case 31: return { animation: 'enterBottomRight 1s ease-out' };
      default:  return {};
    }
  };

  const animationStyles = `
    @keyframes enterTopRight    { 0% { transform:translate(100px,-100px);opacity:0 } 100%{transform:translate(0,0);opacity:1} }
    @keyframes enterTopLeft     { 0% { transform:translate(-100px,-100px);opacity:0 } 100%{transform:translate(0,0);opacity:1} }
    @keyframes enterLeft        { 0% { transform:translateX(-150px);opacity:0 }    100%{transform:translateX(0);opacity:1} }
    @keyframes enterRight       { 0% { transform:translateX(150px);opacity:0 }     100%{transform:translateX(0);opacity:1} }
    @keyframes enterBottomLeft  { 0% { transform:translate(-100px,100px);opacity:0 } 100%{transform:translate(0,0);opacity:1} }
    @keyframes enterBottomRight { 0% { transform:translate(100px,100px);opacity:0 }  100%{transform:translate(0,0);opacity:1} }
    @keyframes fadeExplode      { 0% { opacity:0;transform:scale(0.3) }   100%{opacity:1;transform:scale(1)} }
  `;

  // 1) Media fila superior
  for (let col = 0; col < 5; col++) {
    const count = imgCounter++;
    const imgName = visibleIds.includes(count)
      ? `hexagono${count}.png`
      : `hexagono.png`;
    const src = require(`../../assets/hexagonales/${imgName}`);
    topHalves.push(
      <Hexagon
        key={`t1-${col}`}
        count={count}
        src={src}
        left={col * W}
        top={-HALF_H}
        animationStyle={getAnimation(count)}
        visible={visibleIds.includes(count)}
        btn={buttonConfig[count]}
      />
    );
  }

  // 1b) Media fila superior desplazada
  for (let col = 0; col < 5; col++) {
    const count = imgCounter++;
    const imgName = visibleIds.includes(count)
      ? `hexagono${count}.png`
      : `hexagono.png`;
    const src = require(`../../assets/hexagonales/${imgName}`);
    topHalves.push(
      <Hexagon
        key={`t2-${col}`}
        count={count}
        src={src}
        left={HALF_H + W + col * W}
        top={-HALF_H}
        animationStyle={getAnimation(count)}
        visible={visibleIds.includes(count)}
        btn={buttonConfig[count]}
      />
    );
  }

  // 2) Filas completas
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const count = imgCounter++;
      const imgName = visibleIds.includes(count)
        ? `hexagono${count}.png`
        : `hexagono.png`;
      const src = require(`../../assets/hexagonales/${imgName}`);
      const left = count >= 11 && count <= 15
        ? col * W - HALF_H
        : row * col * W - HALF_H - 100;
      const top = count === 15
        ? row * HALF_H + 70 - 100
        : count >= 11 && count <= 15
          ? row * HALF_H + 50
          : row * HALF_H + 100;
      fullRows.push(
        <Hexagon
          key={`f-${row}-${col}`}
          count={count}
          src={src}
          left={left}
          top={top}
          animationStyle={getAnimation(count)}
          visible={visibleIds.includes(count)}
          btn={buttonConfig[count]}
        />
      );
    }
  }

  // 3) Media fila inferior
  for (let col = 0; col < 6; col++) {
    const count = imgCounter++;
    const imgName = visibleIds.includes(count)
      ? `hexagono${count}.png`
      : `hexagono.png`;
    const src = require(`../../assets/hexagonales/${imgName}`);
    bottomHalves.push(
      <Hexagon
        key={`b-${col}`}
        count={count}
        src={src}
        left={col * W - 450}
        top={HALF_H + 230}
        animationStyle={getAnimation(count)}
        visible={visibleIds.includes(count)}
        btn={buttonConfig[count]}
      />
    );
  }

  const containerW = 3 * W;
  const containerH = H + 3 * (H * 0.75) + HALF_H;

  return (
  <Box sx={{ background: '#0f1f17', py: 6, px: 2, mt: '-100px', mb: '-42px', overflow: 'hidden' }}>
    <style>{animationStyles}</style>
    
    {/* Contenedor externo que permite scroll horizontal en móvil */}
    <Box 
      sx={{ 
        overflowX: { xs: 'auto', md: 'hidden' }, 
        px: { xs: 1, md: 0 } 
      }}
    >
      {/* Contenedor interno que sí respeta el tamaño */}
      <Box 
        sx={{ 
          position: 'relative', 
          width: containerW, 
          height: containerH, 
          mx: { xs: 0, md: 'auto' }, 
          minWidth: containerW 
        }}
      >
        {topHalves}
        {fullRows}
        {bottomHalves}
      </Box>
    </Box>
    
  </Box>
);

}
