import React from 'react';
import QRCode from 'react-qr-code';
import { Box, Typography, Button, CircularProgress, Paper } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';

export default function UsuarioPage() {
  const { user, isAuthenticated, loginWithRedirect, isLoading } = useAuth0();

  if (isLoading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );

  if (!isAuthenticated)
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #c8facc, #a8e6a3)',
          p: 4,
        }}
      >
        <Paper
          elevation={6}
          sx={{
            p: 5,
            borderRadius: 4,
            textAlign: 'center',
            maxWidth: 400,
            bgcolor: 'white',
          }}
        >
          <Typography variant="h5" fontWeight="bold" color="success.main" gutterBottom>
            🌿 Bienvenido a Ciudadan.org
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Inicia sesión para acceder a tu perfil y generar tu código QR personal.
          </Typography>
          <Button
            variant="contained"
            color="success"
            onClick={loginWithRedirect}
            sx={{ borderRadius: 3, px: 4 }}
          >
            Iniciar sesión
          </Button>
        </Paper>
      </Box>
    );

  // URL personalizada para el QR (por ejemplo con el ID del usuario)
  const url = `https://ciudadan.org/perfil/${user?.email}`;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #b9fbc0, #96e6a1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 5,
          borderRadius: 4,
          textAlign: 'center',
          maxWidth: 450,
          bgcolor: 'white',
        }}
      >
        <Typography variant="h4" fontWeight="bold" color="success.main" gutterBottom>
          Tu Código QR Personal
        </Typography>

        <Box
          sx={{
            backgroundColor: '#fff',
            p: 3,
            borderRadius: 2,
            display: 'inline-block',
            boxShadow: 3,
          }}
        >
          <QRCode value={url} size={220} />
        </Box>

        <Typography variant="body1" sx={{ mt: 3 }}>
          Escanea este QR para acceder a tu perfil:
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, wordBreak: 'break-all', fontSize: 12 }}
        >
          {url}
        </Typography>
      </Paper>
    </Box>
  );
}
