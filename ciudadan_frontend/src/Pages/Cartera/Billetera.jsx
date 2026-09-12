import React, { useRef, useState, useEffect } from 'react';
import { Box, Stack, Typography, IconButton, Fade, Paper, Button, Chip } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import { STRAPI_URL } from '../../utils/request.utils';
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
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [cartera, setCartera] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [cargandoHist, setCargandoHist] = useState(false);

  const cargarCarteraYHistorial = async () => {
    if (!isAuthenticated) { setCartera(null); setHistorial([]); return; }
    setCargando(true);
    try {
      const token = await getAccessTokenSilently({ authorizationParams: { audience: 'https://api.ciudadan.org' } });
      const r = await fetch(`${STRAPI_URL}/api/cartera`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setCartera(d?.data || d);
      // historial paginado (últimas 10 tx donde participa la wallet)
      if (d?.wallet_address || d?.data?.wallet_address) {
        const wallet = d.wallet_address || d.data.wallet_address;
        setCargandoHist(true);
        const rh = await fetch(`${STRAPI_URL}/api/transaccion?filters[$or][0][direccion_origen][$eq]=${wallet}&filters[$or][1][direccion_destino][$eq]=${wallet}&sort=createdAt:desc&pagination[limit]=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const hd = await rh.json();
        setHistorial(hd.data || []);
        setCargandoHist(false);
      }
    } catch { setCartera(null); } finally { setCargando(false); }
  };

  useEffect(() => { cargarCarteraYHistorial(); }, [isAuthenticated, getAccessTokenSilently]);

  const monedas = [
    { nombre: 'Resumen', icon: <HomeIcon sx={{ color: '#f0c040' }} /> },
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
        bgcolor: '#001a00', // 🌿 Verde oscuro más profundo
        color: 'white',
      }}
    >
      {/* 🔳 Barra negra con scroll lateral */}
      <Box
        sx={{
          width: '100%',
          bgcolor: 'black',
          display: 'flex',
          alignItems: 'center',
          
          top: 64,
          zIndex: 1000,
          borderBottom: '2px solid #222',
          px: 1,
        }}
      >
        {/* Flecha izquierda */}
        <IconButton onClick={() => scroll('left')} sx={{ color: '#f0c040' }}>
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
                    borderBottom: isActive
                      ? '2px solid #f0c040'
                      : '2px solid transparent',
                    color: isActive ? '#f0c040' : 'white',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      color: '#f0c040',
                      borderBottom: '2px solid #f0c040',
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
        <IconButton onClick={() => scroll('right')} sx={{ color: '#f0c040' }}>
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
              bgcolor: '#002200',
              p: 4,
              borderRadius: 3,
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
                }}
              />
            )}

            {/* Wallet vinculada - solo real con Auth */}
            <Box sx={{ mb: 2 }}>
              {cargando ? <Typography sx={{ fontSize: 12 }}>Cargando cartera...</Typography> :
                cartera?.wallet_address ? (
                  <Chip label={`Wallet: ${cartera.wallet_address.slice(0,6)}...${cartera.wallet_address.slice(-4)}`} sx={{ bgcolor: '#8A5CF5', color: 'white', fontFamily: 'monospace' }} />
                ) : isAuthenticated ? (
                  <Button href="/cartera/crear" size="small" sx={{ bgcolor: '#ffe066', color: 'black', fontWeight: 700 }}>Crear y vincular wallet</Button>
                ) : null}
              {cartera && <Typography sx={{ fontSize: 11, mt: 1 }}>Saldo Laborys: {cartera.laborysSaldo} | Ganados: {cartera.laborysGanados}</Typography>}
            </Box>

            {/* Título */}
            <Typography
              variant="h5"
              sx={{ mb: 2, color: '#f0c040', fontWeight: 'bold' }}
            >
              {selected}
            </Typography>

            {/* Contenido dinámico - modo real: requiere login */}
            {monedaSeleccionada?.componente ? (
              monedaSeleccionada.componente
            ) : !isAuthenticated ? (
              <Box>
                <Typography sx={{ opacity: 0.9 }}>🔒 Inicia sesión para ver tu saldo real</Typography>
                <Button href="/cartera/crear" sx={{ mt: 2, bgcolor: '#ffe066', color: 'black' }}>Ir a crear cartera</Button>
              </Box>
            ) : cargando ? (
              <Typography>Cargando saldo...</Typography>
            ) : !cartera ? (
              <Box><Typography>Creando cartera...</Typography></Box>
            ) : selected === 'Resumen' ? (
              <>
                <Typography sx={{ opacity: 0.9, fontSize: '1.1rem' }}>
                  🔒 <strong>Laborys saldo:</strong> {Number(cartera?.laborysSaldo || 0).toFixed(2)} LBY
                </Typography>
                <Typography sx={{ opacity: 0.9 }}>
                  💰 <strong>Peso MXN (1 LBY = 80 MXN):</strong> ${(Number(cartera?.laborysSaldo || 0) * 80).toFixed(2)} MXN
                </Typography>
                <Typography sx={{ mt: 1, opacity: 0.9 }}>
                  📈 <strong>Laborys ganados:</strong> {Number(cartera?.laborysGanados || 0).toFixed(2)}
                </Typography>
                <Typography sx={{ mt: 1, opacity: 0.9 }}>
                  🔗 <strong>Wallet:</strong> {cartera?.wallet_address || 'sin vincular'}
                </Typography>
                <Typography sx={{ mt: 1, opacity: 0.7, fontSize: 12 }}>
                  💡 Resumen provisional - ledger: {cartera?.wallet_address ? 'conectado a blockchain' : 'vincula tu wallet para operar'}
                </Typography>
              </>
            ) : selected === 'Labory' ? (
              <>
                <Typography sx={{ opacity: 0.9, fontSize: '1.4rem', fontWeight: 700 }}>
                  {Number(cartera?.laborysSaldo || 0).toFixed(2)} LBY
                </Typography>
                <Typography sx={{ opacity: 0.9 }}>≈ ${(Number(cartera?.laborysSaldo || 0) * 80).toFixed(2)} MXN</Typography>
                <Typography sx={{ mt: 1, opacity: 0.9 }}>📊 Ganados totales: {Number(cartera?.laborysGanados || 0).toFixed(2)} LBY</Typography>
                <Typography sx={{ mt: 1, opacity: 0.6, fontSize: 12, fontStyle: 'italic' }}>💡 ¿Qué es Labory? Cómo se gana — Texto pendiente (reemplazar con el que te pase tu superior)</Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Button href="/market" size="small" sx={{ bgcolor: '#f0c040', color: 'black', fontWeight: 700 }}>Comprar Labory</Button>
                  <Button disabled size="small" sx={{ border: '1px solid #666', color: '#666' }}>Vender Labory (próximamente - lógica semanal pendiente)</Button>
                </Box>
                <Box sx={{ mt: 2, width: '100%', textAlign: 'left', bgcolor: 'rgba(255,255,255,0.06)', p: 2, borderRadius: 2, maxHeight: 220, overflowY: 'auto' }}>
                  <Typography sx={{ fontWeight: 700, mb: 1, fontSize: 13 }}>📜 Historial — últimas 3 + Ver más</Typography>
                  {cargandoHist ? <Typography sx={{ fontSize: 12 }}>Cargando...</Typography> : historial.length === 0 ? <Typography sx={{ fontSize: 12, opacity: 0.7 }}>Sin movimientos aún. Haz un earn o pago.</Typography> : historial.slice(0,3).map(tx => (
                    <Box key={tx.id} sx={{ fontSize: 11, py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: 'monospace' }}>
                      <div>#{tx.id} nonce:{tx.attributes.nonce} {tx.attributes.tipo} {Number(tx.attributes.monto_laborys)} LBY → {tx.attributes.hash_transaccion?.slice(0,12)}...</div>
                    </Box>
                  ))}
                  {historial.length > 3 && <Button size="small" sx={{ mt: 1, fontSize: 11, color: '#f0c040' }} onClick={() => alert(JSON.stringify(historial.slice(3,10), null, 2))}>Ver más ({historial.length - 3} restantes)</Button>}
                </Box>
                <Button onClick={cargarCarteraYHistorial} size="small" sx={{ mt: 1, border: '1px solid #f0c040', color: '#f0c040' }}>Refrescar</Button>
              </>
            ) : selected === 'Pesos MXN' ? (
              <>
                <Typography sx={{ opacity: 0.9, fontSize: '1.3rem' }}>
                  ${(Number(cartera?.laborysSaldo || 0) * 80).toFixed(2)} MXN
                </Typography>
                <Typography sx={{ opacity: 0.7, fontSize: 12 }}>Conversión Labory → MXN (1 LBY = 80 MXN, saldo {Number(cartera?.laborysSaldo || 0).toFixed(2)} LBY)</Typography>
              </>
            ) : selected === 'Ciudadan I-Token' ? (
              <>
                <Typography sx={{ opacity: 0.9 }}>🪙 <strong>Ciudadan I-Token:</strong> {Number(cartera?.ciudadanTokens || 0).toFixed(2)}</Typography>
                <Typography sx={{ opacity: 0.9 }}>📈 Rendimientos: {Number(cartera?.ciudadanRendimientos || 0).toFixed(2)}</Typography>
                <Typography sx={{ mt: 1, opacity: 0.5, fontSize: 11, fontStyle: 'italic' }}>Placeholder — pendiente nombre de colección/campos reales que te pase tu superior</Typography>
                <Box sx={{ mt: 1, textAlign: 'left', bgcolor: 'rgba(255,255,255,0.06)', p: 1.5, borderRadius: 2, maxHeight: 160, overflowY: 'auto' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>📜 Historial Investment (mock 3)</Typography>
                  {historial.filter(tx => tx.attributes.tipo === 'tarea').slice(0,3).map(tx => (
                    <Box key={tx.id} sx={{ fontSize: 11, py: 0.5, fontFamily: 'monospace' }}>{tx.attributes.tipo} {Number(tx.attributes.monto_laborys)} I-Token → {tx.attributes.hash_transaccion?.slice(0,10)}...</Box>
                  ))}
                  {historial.length===0 && <Typography sx={{ fontSize: 11, opacity: 0.7 }}>Sin movimientos I-Token aún</Typography>}
                </Box>
              </>
            ) : selected === 'Publia' || selected === 'Object-Token' ? (
              <>
                <Typography sx={{ opacity: 0.7, fontSize: 13, fontStyle: 'italic', mb: 2 }}>Texto pendiente — aquí irá el texto que te pase tu superior sobre {selected}. Por ahora lorem: {selected} es un token informativo sin saldo en ledger.</Typography>
                <Button href="/market" variant="contained" sx={{ bgcolor: '#f0c040', color: 'black', fontWeight: 700 }}>Comprar Laborys</Button>
                <Typography sx={{ mt: 1, fontSize: 11, opacity: 0.6 }}>Link a /market o /cartera/crear</Typography>
              </>
            ) : (
              <>
                <Typography sx={{ opacity: 0.9 }}>
                  🔗 <strong>{selected}:</strong> Llamada a la acción
                </Typography>
                <Button href="/coowork" size="small" sx={{ mt: 1, border: '1px solid #f0c040', color: '#f0c040' }}>Ir a {selected.includes('Task') || selected.includes('Todo') ? 'Cowork - Tareas' : selected.includes('Skill') ? 'Cowork - Skills' : selected.includes('ID') ? 'Perfil' : 'Comunidad'}</Button>
                <Typography sx={{ mt: 1, fontSize: 11, opacity: 0.6 }}>Placeholder — próximamente</Typography>
              </>
            )}
          </Paper>
        </Box>
      </Fade>
    </Box>
  );
};

export default Billetera;
