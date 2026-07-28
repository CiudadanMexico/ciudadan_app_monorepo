import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

const Probador = () => {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();

  const [nombre, setNombre] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCarro = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1️⃣ OBTENER TOKEN AUTH0 (COMO DEBE SER)
        const token = await getAccessTokenSilently();

        // 2️⃣ PETICIÓN AL BACK (NO A STRAPI DIRECTO)
        const res = await fetch(
          'https://back.ciudadan.org/api/contenidos?filters[autor_email][$eq]=mimail@gmail.com',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Error HTTP ${res.status}`);
        }

        const json = await res.json();

        // 3️⃣ LEER RESPUESTA STRAPI
        const registro = json?.data?.[0];

        if (!registro) {
          throw new Error('No se encontró ningún carro');
        }

        setNombre(registro.attributes?.titulo ?? '(sin nombre)');
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchCarro();
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  /* =====================
     RENDER
  ===================== */

  if (isLoading || loading) {
    return (
      <Box mt={4} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Alert severity="warning">
        Debes iniciar sesión para ver esta información
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Error: {error}
      </Alert>
    );
  }

  return (
    <Box mt={4} textAlign="center">
      <Typography variant="h5">
        Nombre del carro:
      </Typography>
      <Typography variant="h4" color="primary">
        {nombre}
      </Typography>
    </Box>
  );
};

export default Probador;
