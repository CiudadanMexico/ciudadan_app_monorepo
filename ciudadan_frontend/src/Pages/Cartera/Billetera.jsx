import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, Fade, IconButton, Paper, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HomeIcon from '@mui/icons-material/Home';
import { STRAPI_URL } from '../../utils/request.utils';
import { useRoles } from '../../Contexts/RolesContext.jsx';
import PurpleButton from '../../components/common/PurpleButton.jsx';
import TokenAction from './TokenAction.jsx';
import TokenDetails from './TokenDetails.jsx';
import TokenPanel from './TokenPanel.jsx';
import { TOKENS, STATUS_LABELS, findTokenByParam, getTokenPath } from './tokenConfig';

/**
 * Cartera / Wallet.
 *
 * Refactor de esta iteración:
 *  - Toda la información de cada moneda/token (nombre, imagen, resumen, CTA,
 *    explicación larga y panel de datos) vive en `tokenConfig.js`, no en una
 *    cadena de `selected === '...'`.
 *  - `/cartera/:moneda` selecciona realmente la moneda (deep-link). Un slug
 *    inválido vuelve al resumen sin romper la app.
 *  - El CTA de cada token usa el destino REAL declarado en la configuración.
 */
const TOKEN_RESUMEN = TOKENS.find((item) => item.id === 'resumen');

const Billetera = () => {
  const { moneda } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const { userData } = useRoles();

  const [cartera, setCartera] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [cargandoHist, setCargandoHist] = useState(false);

  // ── Selección de moneda por URL ───────────────────────────────────────────
  const resuelto = useMemo(() => findTokenByParam(moneda), [moneda]);
  const token = resuelto || TOKEN_RESUMEN;
  const slugInvalido = Boolean(moneda) && !resuelto;

  useEffect(() => {
    // Slug desconocido → volver limpio a /cartera (la app sigue usable).
    if (slugInvalido) navigate('/cartera', { replace: true });
  }, [slugInvalido, navigate]);

  const cargarCarteraYHistorial = useCallback(async () => {
    if (!isAuthenticated) {
      setCartera(null);
      setHistorial([]);
      return;
    }
    setCargando(true);
    try {
      const accessToken = await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      });
      const res = await fetch(`${STRAPI_URL}/api/cartera`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setCartera(data?.data || data);

      const wallet = data?.wallet_address || data?.data?.wallet_address;
      if (wallet) {
        setCargandoHist(true);
        const resHist = await fetch(
          `${STRAPI_URL}/api/transaccion?filters[$or][0][direccion_origen][$eq]=${wallet}&filters[$or][1][direccion_destino][$eq]=${wallet}&sort=createdAt:desc&pagination[limit]=10`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const dataHist = await resHist.json();
        setHistorial(dataHist.data || []);
        setCargandoHist(false);
      }
    } catch {
      setCartera(null);
    } finally {
      setCargando(false);
    }
  }, [getAccessTokenSilently, isAuthenticated]);

  useEffect(() => {
    cargarCarteraYHistorial();
  }, [cargarCarteraYHistorial]);

  const scrollRef = useRef(null);
  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const seleccionar = (item) => navigate(getTokenPath(item));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(1100px 520px at 12% -8%, rgba(138,92,245,0.22) 0%, rgba(0,0,0,0) 60%), radial-gradient(900px 480px at 108% 18%, rgba(106,63,203,0.18) 0%, rgba(0,0,0,0) 55%), radial-gradient(760px 420px at 50% 112%, rgba(46,230,200,0.09) 0%, rgba(0,0,0,0) 58%), linear-gradient(180deg, #0b0716 0%, #0e0a1c 45%, #080512 100%)',
        color: 'white',
      }}
    >
      {/* Selector horizontal de monedas/tokens */}
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
        <IconButton onClick={() => scroll('left')} sx={{ color: '#a78bfa', '&:hover': { color: '#c9b4ff' } }}>
          <ChevronLeftIcon />
        </IconButton>

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
            {TOKENS.map((item) => {
              const isActive = item.id === token.id;
              return (
                <Stack
                  key={item.id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  onClick={() => seleccionar(item)}
                  sx={{
                    cursor: 'pointer',
                    pb: 0.3,
                    px: 1.2,
                    borderRadius: 1.5,
                    borderBottom: isActive ? '2px solid #8A5CF5' : '2px solid transparent',
                    color: isActive ? '#c9b4ff' : 'rgba(255,255,255,0.78)',
                    textShadow: isActive ? '0 0 14px rgba(138,92,245,0.55)' : 'none',
                    bgcolor: isActive ? 'rgba(138,92,245,0.12)' : 'transparent',
                    transition: 'all 0.3s ease',
                    '&:hover': { color: '#c9b4ff', borderBottom: '2px solid rgba(138,92,245,0.6)' },
                  }}
                >
                  {item.imagen ? (
                    <Box
                      component="img"
                      src={item.imagen}
                      alt={item.nombre}
                      sx={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <HomeIcon sx={{ color: '#2ee6c8' }} />
                  )}
                  <Typography sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{item.nombre}</Typography>
                </Stack>
              );
            })}
          </Stack>
        </Box>

        <IconButton onClick={() => scroll('right')} sx={{ color: '#a78bfa', '&:hover': { color: '#c9b4ff' } }}>
          <ChevronRightIcon />
        </IconButton>
      </Box>

      <Fade in timeout={400}>
        <Box
          sx={{
            p: { xs: 2, sm: 5 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper
            elevation={10}
            sx={{
              background:
                'linear-gradient(160deg, rgba(138,92,245,0.16) 0%, rgba(20,12,36,0.94) 45%, rgba(106,63,203,0.18) 100%)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(138,92,245,0.32)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
              p: { xs: 2.5, sm: 4 },
              borderRadius: 4,
              maxWidth: 620,
              width: '100%',
              textAlign: 'center',
              color: 'white',
            }}
          >
            {token.imagen ? (
              <Box
                component="img"
                src={token.imagen}
                alt={token.nombre}
                sx={{
                  width: 50,
                  height: 50,
                  mb: 2,
                  borderRadius: '50%',
                  boxShadow: '0 0 0 4px rgba(138,92,245,0.16), 0 0 26px rgba(138,92,245,0.4)',
                }}
              />
            ) : (
              <HomeIcon sx={{ fontSize: 46, color: '#2ee6c8', mb: 2 }} />
            )}

            {/* Wallet vinculada (sólo dato real) */}
            <Box sx={{ mb: 2 }}>
              {cargando ? (
                <Typography sx={{ fontSize: 12 }}>Cargando cartera...</Typography>
              ) : cartera?.wallet_address ? (
                <Chip
                  label={`Wallet: ${cartera.wallet_address.slice(0, 6)}...${cartera.wallet_address.slice(-4)}`}
                  sx={{ bgcolor: '#8A5CF5', color: 'white', fontFamily: 'monospace' }}
                />
              ) : isAuthenticated ? (
                <PurpleButton href="/cartera/crear" size="small">
                  Crear y vincular wallet
                </PurpleButton>
              ) : null}
              {cartera && (
                <Typography sx={{ fontSize: 11, mt: 1 }}>
                  Saldo Laborys: {cartera.laborysSaldo} | Ganados: {cartera.laborysGanados}
                </Typography>
              )}
            </Box>

            {/* Título, ficha breve y estado */}
            <Typography
              variant="h5"
              sx={{
                mb: 1,
                color: '#c9b4ff',
                fontWeight: 700,
                fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              {token.nombre}
            </Typography>

            {token.resumen && (
              <Typography sx={{ opacity: 0.85, fontSize: 13, mb: 1.5, lineHeight: 1.5 }}>
                {token.resumen}
              </Typography>
            )}

            <Chip
              size="small"
              label={STATUS_LABELS[token.status] || token.status}
              sx={{
                mb: 1,
                bgcolor:
                  token.status === 'activo'
                    ? 'rgba(46,230,200,0.16)'
                    : token.status === 'informativo'
                    ? 'rgba(138,92,245,0.22)'
                    : 'rgba(240,192,64,0.18)',
                color:
                  token.status === 'activo'
                    ? '#8ee9d6'
                    : token.status === 'informativo'
                    ? '#e5dcff'
                    : '#f0c040',
                fontWeight: 700,
                fontSize: 11,
              }}
            />

            {/* Datos reales del token (o mensaje de sesión) */}
            {!isAuthenticated ? (
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ opacity: 0.9 }}>🔒 Inicia sesión para ver tu saldo real</Typography>
                <PurpleButton href="/cartera/crear" sx={{ mt: 2 }}>
                  Ir a crear cartera
                </PurpleButton>
              </Box>
            ) : (
              <Box sx={{ mt: 1, width: '100%' }}>
                <TokenPanel
                  token={token}
                  cartera={cartera}
                  cargando={cargando}
                  historial={historial}
                  cargandoHist={cargandoHist}
                  onRefresh={cargarCarteraYHistorial}
                  userId={userData?.id}
                  email={userData?.email}
                  isAuthenticated={isAuthenticated}
                />
              </Box>
            )}

            {/* CTA declarado por el token en la configuración central */}
            <TokenAction token={token} />

            {/* Explicación larga desplegable (Accordion de MUI) */}
            <TokenDetails nombre={token.nombre} contenido={token.descripcion} />
          </Paper>
        </Box>
      </Fade>
    </Box>
  );
};

export default Billetera;
