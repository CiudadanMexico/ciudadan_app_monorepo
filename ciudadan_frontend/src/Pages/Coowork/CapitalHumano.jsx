// src/Pages/Coowork/CapitalHumano.jsx
// Capital humano: socios actuales de la agencia + historial de bajas (mock).
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Paper, Typography, List, ListItem, ListItemText, Button, CircularProgress, Alert, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { getMiembrosAgencia } from '../../services/cowork/queryServices.js';

const darkGray = '#002200';
const neonGreen = '#00ff99';

// Deuda: el backend no guarda aún el histórico de socios dados de baja.
// Se deja el mock listo para enchufar el endpoint real cuando exista.
const HISTORIAL_MOCK = [];

export default function CapitalHumano() {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();

  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verHistorial, setVerHistorial] = useState(false);

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      });
    } catch {
      return null;
    }
  }, [getAccessTokenSilently]);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const res = await getMiembrosAgencia(token);
        if (cancelado) return;
        setMiembros(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        if (!cancelado) setError(err.message || 'No se pudieron cargar los socios');
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [getToken]);

  const lista = verHistorial ? HISTORIAL_MOCK : miembros;

  return (
    <Box sx={{ p: 3, maxWidth: 820, mx: 'auto' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: '#cfcfe6', mb: 2 }}>
        Volver
      </Button>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={800} color="white">
          {verHistorial ? 'Historial de socios' : 'Capital humano'}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => setVerHistorial((v) => !v)}
          sx={{ color: neonGreen, borderColor: neonGreen, textTransform: 'none' }}
        >
          {verHistorial ? 'Ver socios actuales' : 'Ver historial'}
        </Button>
      </Stack>

      <Paper sx={{ p: 3, borderRadius: 3, bgcolor: darkGray, color: '#fff' }}>
        {loading && !verHistorial ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress sx={{ color: neonGreen }} />
          </Box>
        ) : error && !verHistorial ? (
          <Alert severity="error">{error}</Alert>
        ) : lista.length === 0 ? (
          <Typography sx={{ opacity: 0.7 }}>
            {verHistorial
              ? 'Todavía no hay socios dados de baja.'
              : 'Todavía no hay socios en tu agencia.'}
          </Typography>
        ) : (
          <List dense>
            {lista.map((m) => (
              <ListItem key={m.id} sx={{ bgcolor: '#003300', mb: 1, borderRadius: 1 }}>
                <ListItemText primary={m.email} secondary={m.username && m.username !== m.email ? m.username : null} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
