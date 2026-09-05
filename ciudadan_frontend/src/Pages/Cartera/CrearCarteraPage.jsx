// src/Pages/Cartera/CrearCarteraPage.jsx
// Página /cartera/crear — crea la wallet (ethers.js) con el mismo estilo
// oscuro/morado de la sección Cartera. Si el usuario no ha iniciado sesión
// se muestra una tarjeta pidiendo iniciar sesión (Auth0).
import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import CrearBilleteraCentralWld from '../../components/Cartera/CrearBilleteraCentralWld.jsx';

const CrearCarteraPage = () => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        // 🌌 Mismo fondo oscurón de marca que la billetera (morado + turquesa sutil)
        background:
          'radial-gradient(1100px 520px at 12% -8%, rgba(138,92,245,0.22) 0%, rgba(0,0,0,0) 60%), radial-gradient(900px 480px at 108% 18%, rgba(106,63,203,0.18) 0%, rgba(0,0,0,0) 55%), radial-gradient(760px 420px at 50% 112%, rgba(46,230,200,0.09) 0%, rgba(0,0,0,0) 58%), linear-gradient(180deg, #0b0716 0%, #0e0a1c 45%, #080512 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 3, md: 7 },
      }}
    >
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center' }}>
        {isLoading ? (
          <CircularProgress sx={{ color: '#8A5CF5' }} />
        ) : !isAuthenticated ? (
          <Paper
            elevation={10}
            sx={{
              background:
                'linear-gradient(160deg, rgba(138,92,245,0.16) 0%, rgba(20,12,36,0.94) 45%, rgba(106,63,203,0.18) 100%)',
              border: '1px solid rgba(138,92,245,0.32)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
              p: { xs: 3, md: 6 },
              borderRadius: { xs: 4, md: 6 },
              maxWidth: 540,
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
                  color: '#ffe066',
                  bgcolor: 'rgba(255,224,102,0.1)',
                  boxShadow: '0 0 26px rgba(255,224,102,0.3)',
                }}
              >
                <LockRoundedIcon sx={{ fontSize: 38 }} />
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
                  fontWeight: 700,
                  color: '#c9b4ff',
                  fontSize: { xs: '1.5rem', md: '2rem' },
                }}
              >
                Inicia sesión para crear tu cartera
              </Typography>
              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: 1.6,
                  maxWidth: 420,
                  mx: 'auto',
                }}
              >
                Tu wallet Ciudadan se asocia a tu cuenta. Entra para generar tu clave, activar
                tu cartera y empezar a ganar Laborys.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => loginWithRedirect({ appState: { returnTo: '/cartera/crear' } })}
                  sx={{
                    px: 3,
                    py: 1.3,
                    borderRadius: 999,
                    fontWeight: 700,
                    fontFamily: '"Space Grotesk", "Poppins", system-ui, sans-serif',
                    bgcolor: '#8A5CF5',
                    color: '#fff',
                    boxShadow: '0 12px 30px rgba(138,92,245,0.35)',
                    '&:hover': { bgcolor: '#6A3FCB' },
                  }}
                >
                  Iniciar sesión
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/cartera')}
                  startIcon={<ArrowBackRoundedIcon />}
                  sx={{
                    px: 3,
                    py: 1.3,
                    borderRadius: 999,
                    fontWeight: 700,
                    color: '#c9b4ff',
                    borderColor: 'rgba(138,92,245,0.5)',
                    '&:hover': { borderColor: '#8A5CF5' },
                  }}
                >
                  Volver a mi cartera
                </Button>
              </Stack>
            </Stack>
          </Paper>
        ) : (
          <CrearBilleteraCentralWld />
        )}
      </Container>
    </Box>
  );
};

export default CrearCarteraPage;