import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Stack, Typography, IconButton, Fade, Paper } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
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

  // 💰 Saldo real en Laborys: GET /api/cartera (mismo endpoint que usan Taxiz y Coowork).
  // Los pesos se muestran como conversión con la tasa del ecosistema: 1 Labory = $80 MXN.
  const strapiUrl = process.env.REACT_APP_STRAPI_URL || '';
  const { getAccessTokenSilently } = useAuth0();
  const [saldoLaborys, setSaldoLaborys] = useState(null);

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      });
    } catch (e) {
      console.warn('⚠️ No se pudo obtener token Auth0:', e.message);
      return null;
    }
  }, [getAccessTokenSilently]);

  useEffect(() => {
    let activo = true;
    const cargarSaldo = async () => {
      if (!strapiUrl) return;
      try {
        const headers = { 'Content-Type': 'application/json' };
        const token = await getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`${strapiUrl}/api/cartera`, { headers });
        if (!response.ok) throw new Error('No se pudo consultar la cartera del usuario');
        const data = await response.json();
        if (activo) setSaldoLaborys(data?.laborysSaldo ?? 0);
      } catch (err) {
        console.warn('[Cartera] no se pudo consultar el saldo:', err);
      }
    };
    cargarSaldo();
    return () => {
      activo = false;
    };
  }, [getToken, strapiUrl]);

  const TASA_PESOS = 80;
  const saldoNum = saldoLaborys == null ? null : Number(saldoLaborys) || 0;
  const saldoPesos = saldoNum == null ? null : saldoNum * TASA_PESOS;
  const formatoPesos = (v) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

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
          
          position: 'sticky',
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
          <Stack direction="row" spacing={{ xs: 4, md: 6 }} sx={{ mx: 2 }}>
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
                        width: { xs: 22, md: 30 },
                        height: { xs: 22, md: 30 },
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <Typography sx={{ whiteSpace: 'nowrap', fontWeight: 600, fontSize: { xs: '0.85rem', md: '1rem' } }}>
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
            p: { xs: 3, md: 7 },
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
              p: { xs: 3, md: 6 },
              borderRadius: { xs: 4, md: 6 },
              maxWidth: { xs: 620, md: 980 },
              width: '100%',
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
                  width: { xs: 76, md: 112 },
                  height: { xs: 76, md: 112 },
                  mb: { xs: 2, md: 3 },
                  borderRadius: '50%',
                  // ✨ Aura neón alrededor de la moneda
                  boxShadow: {
                    xs: '0 0 0 4px rgba(138,92,245,0.16), 0 0 26px rgba(138,92,245,0.4)',
                    md: '0 0 0 6px rgba(138,92,245,0.18), 0 0 40px rgba(138,92,245,0.5)',
                  },
                }}
              />
            )}

            {/* Título */}
            <Typography
              variant="h5"
              sx={{
                mb: 2,
                fontSize: { xs: '1.55rem', md: '2.3rem' },
                color: '#c9b4ff',
                fontWeight: 700,
                fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              {selected}
            </Typography>

            {/* 💰 Saldo real: Laborys desde /api/cartera y pesos como conversión (1 Labory = $80 MXN) */}
            {(selected === 'Labory' || selected === 'Pesos MXN') && (
              <Stack spacing={1} alignItems="center" sx={{ mb: { xs: 2.5, md: 3.5 } }}>
                <Typography
                  sx={{
                    fontSize: { xs: '2.7rem', md: '4.4rem' },
                    fontWeight: 700,
                    fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
                    lineHeight: 1.05,
                    color: '#fff',
                    textShadow: '0 0 26px rgba(138,92,245,0.5)',
                  }}
                >
                  {saldoNum == null ? (
                    '—'
                  ) : selected === 'Labory' ? (
                    <>
                      {saldoNum.toLocaleString('es-MX')}{' '}
                      <Box component="span" sx={{ fontSize: { xs: '1.05rem', md: '1.5rem' }, color: '#c9b4ff' }}>
                        Laborys
                      </Box>
                    </>
                  ) : (
                    formatoPesos(saldoPesos)
                  )}
                </Typography>
                <Typography sx={{ opacity: 0.85, fontSize: { xs: '0.9rem', md: '1.05rem' } }}>
                  {saldoNum == null
                    ? 'Cargando saldo…'
                    : selected === 'Labory'
                    ? `≈ ${formatoPesos(saldoPesos)} MXN`
                    : 'Convertido de tus Laborys'}{' '}
                  · 1 Labory = $80 MXN
                </Typography>
              </Stack>
            )}

            {/* Contenido dinámico: componente o placeholders */}
            {monedaSeleccionada?.componente ? (
              monedaSeleccionada.componente
            ) : (
              <>
                {selected !== 'Labory' && (
                  <Typography sx={{ opacity: 0.9 }}>
                    🔒 <strong>Saldo actual:</strong> [placeholder balance]
                  </Typography>
                )}
                <Typography sx={{ mt: selected !== 'Labory' ? 1 : 0, opacity: 0.9 }}>
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
