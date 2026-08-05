import React, { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  InputLabel,
  FormControl,
  Select,
  Button,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getAgencias } from '../../services/cowork/queryServices.js';
import { agregarSocio } from '../../services/cowork/mutationsServices.js';

const STRAPI = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

const getAttributes = (item) => item?.attributes || item || {};

export default function AgregarSocio() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  const [agencias, setAgencias] = useState([]);
  const [agenciaId, setAgenciaId] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      });
    } catch (e) {
      console.warn('No se pudo obtener token Auth0:', e.message);
      return null;
    }
  }, [getAccessTokenSilently]);

  // Cargar agencias
  useEffect(() => {
    async function fetchAgencias() {
      const token = await getToken();
      try {
        const json = await getAgencias(token);
        const lista = Array.isArray(json.data) ? json.data : [];
        setAgencias(lista);
      } catch (err) {
        setError(err.message || 'No se pudieron cargar las agencias');
      }
    }
    fetchAgencias();
  }, [getToken]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isAuthenticated) {
      setError('Debes iniciar sesión para dar de alta un socio');
      return;
    }
    if (!agenciaId) {
      setError('Selecciona una agencia');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Ingresa un email válido');
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const res = await agregarSocio(
        agenciaId,
        { email, username: username || undefined, roles_extra: ['socio'] },
        token
      );
      setSuccess(res?.message || 'Socio dado de alta correctamente');
      setEmail('');
      setUsername('');
    } catch (err) {
      setError(err.message || 'No se pudo dar de alta al socio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Agregar socio
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Da de alta un usuario como socio miembro de una agencia. Si el usuario
        no existe, se crea automáticamente (la autenticación la gestiona Auth0).
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3 }} component="form" onSubmit={submit}>
        <Stack spacing={2}>
          <FormControl fullWidth required>
            <InputLabel id="agencia-label">Agencia</InputLabel>
            <Select
              labelId="agencia-label"
              label="Agencia"
              value={agenciaId}
              onChange={(e) => setAgenciaId(e.target.value)}
              disabled={loading}
            >
              {agencias.length === 0 ? (
                <MenuItem value="" disabled>
                  No hay agencias
                </MenuItem>
              ) : (
                agencias.map((a) => {
                  const attrs = getAttributes(a);
                  const id = a.id ?? attrs.id;
                  const nombre = attrs.nombre || `Agencia ${id}`;
                  const tipo = attrs.tipo || '';
                  return (
                    <MenuItem key={id} value={id}>
                      {nombre} {tipo ? `(${tipo})` : ''}
                    </MenuItem>
                  );
                })
              )}
            </Select>
          </FormControl>

          <TextField
            label="Email del socio"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            placeholder="socio@ejemplo.com"
          />

          <TextField
            label="Nombre de usuario (opcional)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            placeholder="Si se omite, se usa el email"
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || !agenciaId || !email}
              startIcon={loading ? <CircularProgress size={18} /> : null}
            >
              {loading ? 'Guardando...' : 'Dar de alta socio'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
