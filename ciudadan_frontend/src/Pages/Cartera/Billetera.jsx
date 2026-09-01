import React, { useRef, useState } from 'react';
import { Box, Stack, Typography, IconButton, Fade, Paper } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HomeIcon from '@mui/icons-material/Home';

// 🪙 Importa imágenes (temporalmente todas Labory)
import PesosImg from '../../assets/monedas/mxn.png';
import LaboryImg from '../../assets/monedas/labory.png';
import CiudadanImg from '../../assets/monedas/ciudadan_logo_public.png';
import PubliaImg from '../../assets/monedas/publia.png';
import ObjectImg from '../../assets/monedas/object.png';
import TaskImg from '../../assets/monedas/task.png';
import TodoImg from '../../assets/monedas/todo.png';
import EvaluationImg from '../../assets/monedas/evaluation.png';
import VoteImg from '../../assets/monedas/vote.png';
import IdImg from '../../assets/monedas/idtoken.png';
import SkillImg from '../../assets/monedas/skill.png';
import SocialImg from '../../assets/monedas/social.png';

// 💡 Importa componentes asociados
import IngresosInfo from './../../components/Cartera/IngresosInfo.jsx';

const Billetera = () => {
  const monedas = [
    { nombre: 'Resumen', icon: <HomeIcon sx={{ color: '#2ee6c8' }} /> },
    { nombre: 'Pesos MXN', img: PesosImg, componente: <IngresosInfo /> },
    { nombre: 'Labory', img: LaboryImg },
    { nombre: 'Ciudadan I-Token', img: CiudadanImg },
    { nombre: 'Publia', img: PubliaImg },
    { nombre: 'Object-Token', img: ObjectImg },
    { nombre: 'TaskToken', img: TaskImg },
    { nombre: 'TodoToken', img: TodoImg },
    { nombre: 'Evaluation-Token', img: EvaluationImg },
    { nombre: 'Vote-Token', img: VoteImg },
    { nombre: 'Id-Token', img: IdImg },
    { nombre: 'Skill-Token', img: SkillImg },
    { nombre: 'Social-Token', img: SocialImg },
  ];

  const scrollRef = useRef(null);
  const [selected, setSelected] = useState(monedas[0].nombre);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const monedaSeleccionada = monedas.find((m) => m.nombre === selected);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        // 🌌 Fondo oscurón de marca: violeta profundo con nebulosas moradas
        // (#8A5CF5 / #6A3FCB) y acento turquesa sutil, coherente con el hero.
        background:
          'radial-gradient(1100px 520px at 12% -8%, rgba(138,92,245,0.22) 0%, rgba(0,0,0,0) 60%), radial-gradient(900px 480px at 108% 18%, rgba(106,63,203,0.18) 0%, rgba(0,0,0,0) 55%), radial-gradient(760px 420px at 50% 112%, rgba(46,230,200,0.09) 0%, rgba(0,0,0,0) 58%), linear-gradient(180deg, #0b0716 0%, #0e0a1c 45%, #080512 100%)',
        color: 'white',
      }}
    >
      {/* 🔳 Barra negra con scroll lateral */}
      <Box
        sx={{
          width: '100%',
          bgcolor: 'rgba(15, 9, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          
          top: 64,
          zIndex: 1000,
          borderBottom: '1px solid rgba(138, 92, 245, 0.28)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          px: 1,
        }}
      >
        {/* Flecha izquierda */}
        <IconButton onClick={() => scroll('left')} sx={{ color: '#a78bfa', '&:hover': { color: '#c9b4ff' } }}>
          <ChevronLeftIcon />
        </IconButton>

        {/* Contenedor scrollable */}
        <Box
          ref={scrollRef}
          sx={{
            display: 'flex',
            overflowX: 'auto',
            scrollBehavior: 'smooth',
            flex: 1,
            py: 1.2,
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Stack direction="row" spacing={4} sx={{ mx: 2 }}>
            {monedas.map((moneda) => {
              const isActive = moneda.nombre === selected;
              return (
                <Stack
                  key={moneda.nombre}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  onClick={() => setSelected(moneda.nombre)}
                  sx={{
                    cursor: 'pointer',
                    pb: 0.3,
                    px: 1.2,
                    borderRadius: 1.5,
                    borderBottom: isActive
                      ? '2px solid #8A5CF5'
                      : '2px solid transparent',
                    color: isActive ? '#c9b4ff' : 'rgba(255,255,255,0.78)',
                    textShadow: isActive ? '0 0 14px rgba(138,92,245,0.55)' : 'none',
                    bgcolor: isActive ? 'rgba(138,92,245,0.12)' : 'transparent',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      color: '#c9b4ff',
                      borderBottom: '2px solid rgba(138,92,245,0.6)',
                    },
                  }}
                >
                  {moneda.icon ? (
                    moneda.icon
                  ) : (
                    <Box
                      component="img"
                      src={moneda.img}
                      alt={moneda.nombre}
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <Typography sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {moneda.nombre}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </Box>

        {/* Flecha derecha */}
        <IconButton onClick={() => scroll('right')} sx={{ color: '#a78bfa', '&:hover': { color: '#c9b4ff' } }}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* 💰 Contenido dinámico */}
      <Fade in={!!selected} timeout={400}>
        <Box
          sx={{
            p: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper
            elevation={10}
            sx={{
              // 💳 Tarjeta glass morada
              background:
                'linear-gradient(160deg, rgba(138,92,245,0.16) 0%, rgba(20,12,36,0.94) 45%, rgba(106,63,203,0.18) 100%)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(138,92,245,0.32)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
              p: 4,
              borderRadius: 4,
              maxWidth: 600,
              textAlign: 'center',
              color: 'white',
            }}
          >
            {/* Imagen o icono */}
            {monedaSeleccionada?.icon ? (
              monedaSeleccionada.icon
            ) : (
              <Box
                component="img"
                src={monedaSeleccionada?.img}
                alt={selected}
                sx={{
                  width: 50,
                  height: 50,
                  mb: 2,
                  borderRadius: '50%',
                  // ✨ Aura neón alrededor de la moneda
                  boxShadow:
                    '0 0 0 4px rgba(138,92,245,0.16), 0 0 26px rgba(138,92,245,0.4)',
                }}
              />
            )}

            {/* Título */}
            <Typography
              variant="h5"
              sx={{
                mb: 2,
                color: '#c9b4ff',
                fontWeight: 700,
                fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              {selected}
            </Typography>

            {/* Contenido dinámico: componente o placeholders */}
            {monedaSeleccionada?.componente ? (
              monedaSeleccionada.componente
            ) : (
              <>
                <Typography sx={{ opacity: 0.9 }}>
                  🔒 <strong>Saldo actual:</strong> [placeholder balance]
                </Typography>
                <Typography sx={{ mt: 1, opacity: 0.9 }}>
                  📊 <strong>Historial de transacciones:</strong> [placeholder movimientos]
                </Typography>
                <Typography sx={{ mt: 1, opacity: 0.9 }}>
                  💡 <strong>Información adicional:</strong> [placeholder descripción del token]
                </Typography>
              </>
            )}
          </Paper>
        </Box>
      </Fade>
    </Box>
  );
};

export default Billetera;
