// src/Pages/Coowork/CapitalHumano.jsx
// Capital humano: socios actuales de la agencia + historial de bajas (mock).
// Estética de marca: fondo oscuro #0d0b1a, morado #8A5CF5 / #6A3FCB.
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Paper, Typography, List, ListItem, ListItemText, Button, CircularProgress, Alert, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { getMiembrosAgencia } from '../../services/cowork/queryServices.js';

const MORADO = '#8A5CF5';
const MORADO_OSCURO = '#6A3FCB';
const fondo = '#0d0b1a';
const panelBg = 'rgba(138,92,245,0.06)';
const panelBorder = 'rgba(138,92,245,0.28)';
const fontStack = '"Space Grotesk", "Poppins", system-ui, sans-serif';

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
    <Box sx={{ minHeight: '100vh', bgcolor: fondo, py: { xs: 4, md: 7 }, px: 2, fontFamily: fontStack }}>
      <Box sx={{ maxWidth: 820, mx: 'auto' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: '#cfcfe6', mb: 2, textTransform: 'none', fontFamily: fontStack }}>
          Volver
        </Button>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
          <Typography variant="h4" fontWeight={900} color="#fff" sx={{ fontFamily: fontStack }}>
            <span style={{ color: MORADO }}>{verHistorial ? 'Historial de socios' : 'Capital humano'}</span>
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setVerHistorial((v) => !v)}
            sx={{ color: MORADO, borderColor: MORADO, textTransform: 'none', fontFamily: fontStack, '&:hover': { borderColor: MORADO_OSCURO } }}
          >
            {verHistorial ? 'Ver socios actuales' : 'Ver historial'}
          </Button>
        </Stack>

        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: panelBg, color: '#fff', border: `1px solid ${panelBorder}` }}>
          {loading && !verHistorial ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress sx={{ color: MORADO }} />
            </Box>
          ) : error && !verHistorial ? (
            <Alert severity="error">{error}</Alert>
          ) : lista.length === 0 ? (
            <Typography sx={{ opacity: 0.7, fontFamily: fontStack }}>
              {verHistorial
                ? 'Todavía no hay socios dados de baja.'
                : 'Todavía no hay socios en tu agencia.'}
            </Typography>
          ) : (
            <List dense>
              {lista.map((m) => (
                <ListItem key={m.id} sx={{ bgcolor: 'rgba(138,92,245,0.12)', mb: 1, borderRadius: 2, border: `1px solid ${panelBorder}` }}>
                  <ListItemText
                    primary={<span style={{ fontWeight: 600 }}>{m.email}</span>}
                    secondary={<span style={{ color: '#cfcfe6' }}>{m.username && m.username !== m.email ? m.username : null}</span>}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
