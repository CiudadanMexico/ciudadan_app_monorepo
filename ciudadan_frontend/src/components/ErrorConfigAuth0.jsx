// Componente que valida la configuracion de Auth0 al arrancar.
// Si faltan dominio o Client ID, muestra un error visible en lugar de
// redirigir a un dominio inexistente (https://authorize/?client_id=...).
import React from 'react';
import { Alert, Box, Container, Typography } from '@mui/material';

export function auth0ConfigValida() {
  return Boolean(process.env.REACT_APP_AUTH0_DOMAIN && process.env.REACT_APP_AUTH0_CLIENT_ID);
}

export function auth0ConfigFaltante() {
  const faltan = [];
  if (!process.env.REACT_APP_AUTH0_DOMAIN) faltan.push('REACT_APP_AUTH0_DOMAIN');
  if (!process.env.REACT_APP_AUTH0_CLIENT_ID) faltan.push('REACT_APP_AUTH0_CLIENT_ID');
  return faltan;
}

export default function ErrorConfigAuth0() {
  const faltan = auth0ConfigFaltante();
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Box textAlign="center">
        <Typography variant="h5" fontWeight={800} gutterBottom>
          Error de configuración de autenticación
        </Typography>
        <Alert severity="error" sx={{ mt: 2, textAlign: 'left' }}>
          Faltan variables de entorno de Auth0: {faltan.join(', ')}. La aplicación no puede
          iniciar sesión hasta que se configuren y se recompile el frontend (CRA las incorpora
          en el build).
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Valores esperados: dominio del tenant (p. ej. ciudadan.us.auth0.com) y Client ID de la
          aplicación SPA. Revisa el archivo .env del frontend.
        </Typography>
      </Box>
    </Container>
  );
}
