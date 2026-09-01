// src/components/Cartera/CrearBilleteraCentralWld.jsx
// Generador de cartera ethers.js restilizado con el tema de la sección Cartera.
import React, { useCallback, useState } from 'react';
import { ethers } from 'ethers';
import {
  Box, Button, Chip, CircularProgress, Paper, Stack, Typography,
} from '@mui/material';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

const MORADO = '#8A5CF5';
const AMARILLO = '#ffe066';

const CrearBilleteraCentralWld = () => {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const [walletInfo, setWalletInfo] = useState(null);
  const [creando, setCreando] = useState(false);
  const [activado, setActivado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const strapiUrl = process.env.REACT_APP_STRAPI_URL || '';

  const activarCartera = useCallback(async () => {
    if (!strapiUrl) return;
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      });
      await fetch(`${strapiUrl}/api/cartera`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (e) {
      console.warn('[CrearBilletera] no se pudo activar la cartera:', e.message);
    }
  }, [getAccessTokenSilently, strapiUrl]);

  const generarCartera = async () => {
    setCreando(true);
    const wallet = ethers.Wallet.createRandom();
    setWalletInfo({ address: wallet.address, privateKey: wallet.privateKey });
    await activarCartera();
    setActivado(true);
    setCreando(false);
  };

  const copiar = (texto) => {
    if (!navigator.clipboard) return;
    navigator.clipboard
      .writeText(texto)
      .then(() => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1600);
      })
      .catch(() => {});
  };

  return (
    <Paper
      elevation={10}
      sx={{
        // 💳 Misma tarjeta glass morada que la billetera
        background:
          'linear-gradient(160deg, rgba(138,92,245,0.16) 0%, rgba(20,12,36,0.94) 45%, rgba(106,63,203,0.18) 100%)',
        border: '1px solid rgba(138,92,245,0.32)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        p: { xs: 3, md: 6 },
        borderRadius: { xs: 4, md: 6 },
        maxWidth: 720,
        width: '100%',
        textAlign: 'center',
        color: 'white',
      }}
    >
      <Stack spacing={2.5} alignItems="center">
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: MORADO,
            bgcolor: 'rgba(138,92,245,0.14)',
            boxShadow: '0 0 26px rgba(138,92,245,0.4)',
          }}
        >
          <AccountBalanceWalletRoundedIcon sx={{ fontSize: 40 }} />
        </Box>

        <Box>
          <Typography
            variant="h4"
            sx={{
              fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
              fontWeight: 700,
              color: '#c9b4ff',
              fontSize: { xs: '1.6rem', md: '2.2rem' },
            }}
          >
            Crea tu cartera
          </Typography>
          <Typography sx={{ mt: 0.6, color: 'rgba(255,255,255,0.8)', maxWidth: 460, mx: 'auto', lineHeight: 1.6 }}>
            Genera la clave criptográfica de tu wallet con <strong>ethers.js</strong>. Al crearla
            activas tu cartera Ciudadan y empiezas a acumular Laborys.
          </Typography>
        </Box>

        {!walletInfo ? (
          <Button
            variant="contained"
            size="large"
            onClick={generarCartera}
            disabled={creando}
            startIcon={creando ? <CircularProgress size={18} color="inherit" /> : <AccountBalanceWalletRoundedIcon />}
            sx={{
              px: 3.5,
              py: 1.4,
              borderRadius: 999,
              fontWeight: 700,
              fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
              bgcolor: AMARILLO,
              color: '#3a2c00',
              boxShadow: '0 12px 30px rgba(255,224,102,0.28)',
              '&:hover': { bgcolor: '#ffd94d' },
            }}
          >
            {creando ? 'Generando…' : 'Generar cartera'}
          </Button>
        ) : (
          <>
            <Stack spacing={1.5} sx={{ width: '100%', textAlign: 'left' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.66)', mb: 0.4 }}>
                  Dirección de tu wallet
                </Typography>
                <Box
                  onClick={() => copiar(walletInfo.address)}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(138,92,245,0.3)',
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                    cursor: 'pointer',
                    '&:hover': { borderColor: MORADO },
                  }}
                >
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.82rem', wordBreak: 'break-all', color: '#e8e0ff' }}>
                    {walletInfo.address}
                  </Typography>
                  <ContentCopyRoundedIcon sx={{ fontSize: 18, color: '#a78bfa' }} />
                </Box>
              </Box>
<Box>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.66)', mb: 0.4 }}>
                  Clave privada
                </Typography>
                <Box
                  onClick={() => copiar(walletInfo.privateKey)}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,120,120,0.35)',
                    borderRadius: 2,
                    px: 1.5,
                    py: 1,
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#ff7878' },
                  }}
                >
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem', wordBreak: 'break-all', color: '#ffd2d2' }}>
                    {walletInfo.privateKey}
                  </Typography>
                  <ContentCopyRoundedIcon sx={{ fontSize: 18, color: '#ff9d9d' }} />
                </Box>
              </Box>

              {copiado && (
                <Typography sx={{ color: '#2ee6c8', fontSize: '0.85rem' }}>✓ Copiado al portapapeles</Typography>
              )}

              <Typography sx={{ fontSize: '0.85rem', color: '#ffb3b3', lineHeight: 1.5 }}>
                ⚠️ Guarda esta clave privada en un lugar seguro. Quien la tenga controla tu wallet.
              </Typography>
            </Stack>

            {activado && (
              <Chip
                label="✓ Cartera activada — listo para ganar Laborys"
                sx={{
                  bgcolor: 'rgba(46,230,200,0.12)',
                  color: '#2ee6c8',
                  fontWeight: 700,
                  border: '1px solid rgba(46,230,200,0.35)',
                }}
              />
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => navigate('/cartera')}
                sx={{
                  px: 2.6,
                  py: 1.2,
                  borderRadius: 999,
                  fontWeight: 700,
                  color: '#c9b4ff',
                  borderColor: 'rgba(138,92,245,0.5)',
                  '&:hover': { borderColor: MORADO, bgcolor: 'rgba(138,92,245,0.1)' },
                }}
              >
                Volver a mi cartera
              </Button>
              <Button
                variant="contained"
                onClick={generarCartera}
                sx={{
                  px: 2.6,
                  py: 1.2,
                  borderRadius: 999,
                  fontWeight: 700,
                  bgcolor: '#2ee6c8',
                  color: '#002018',
                  '&:hover': { bgcolor: '#1fd4b7' },
                }}
              >
                Generar otra
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  );
};

export default CrearBilleteraCentralWld;
