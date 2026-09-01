import React, { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Autocomplete,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Grid2 as Grid,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { buscarSociosSinAgencia, getMiembrosAgencia } from '../../services/cowork/queryServices.js';
import { agregarSocio, darDeBajaSocio } from '../../services/cowork/mutationsServices.js';

const MIN_QUERY_LENGTH = 4;
const SEARCH_DEBOUNCE_MS = 350;

export default function AgregarSocio() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [nombre, setNombre] = useState('');
  const [searching, setSearching] = useState(false);
  const [opciones, setOpciones] = useState([]);
  const [yaTieneAgencia, setYaTieneAgencia] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);

  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);

  const [agenciaNombre, setAgenciaNombre] = useState(null);
  const [miembros, setMiembros] = useState([]);
  const [loadingMiembros, setLoadingMiembros] = useState(true);
  const [miembrosError, setMiembrosError] = useState(null);

  const [bajaTarget, setBajaTarget] = useState(null);
  const [bajaLoading, setBajaLoading] = useState(false);
  const [bajaError, setBajaError] = useState(null);

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

  const cargarMiembros = useCallback(async () => {
    setLoadingMiembros(true);
    setMiembrosError(null);
    try {
      const token = await getToken();
      const res = await getMiembrosAgencia(token);
      setAgenciaNombre(res?.agencia?.nombre || null);
      setMiembros(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setMiembrosError(err.message || 'No se pudieron cargar los miembros de la agencia');
    } finally {
      setLoadingMiembros(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isAuthenticated) cargarMiembros();
  }, [isAuthenticated, cargarMiembros]);

  // Buscador con debounce: no dispara hasta MIN_QUERY_LENGTH caracteres
  // (chat.md: "que no funcione desde las primeras letras").
  useEffect(() => {
    setYaTieneAgencia(null);
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setOpciones([]);
      return;
    }

    let cancelado = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const token = await getToken();
        const res = await buscarSociosSinAgencia(query.trim(), token);
        if (cancelado) return;
        setOpciones(Array.isArray(res?.data) ? res.data : []);
        setYaTieneAgencia(res?.yaTieneAgencia || null);
      } catch (err) {
        if (!cancelado) setAddError(err.message || 'No se pudo buscar');
      } finally {
        if (!cancelado) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [query, getToken]);

  const submit = async (e) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);

    if (!isAuthenticated) {
      setAddError('Debes iniciar sesión para dar de alta un socio');
      return;
    }

    const email = seleccionado?.email || query.trim();
    if (!email || !email.includes('@')) {
      setAddError('Ingresa o selecciona un email válido');
      return;
    }

    setAddLoading(true);
    try {
      const token = await getToken();
      const res = await agregarSocio(
        { email, username: nombre.trim() || undefined, roles_extra: ['socio'] },
        token
      );
      setAddSuccess(res?.message || 'Socio dado de alta correctamente');
      setQuery('');
      setNombre('');
      setSeleccionado(null);
      setOpciones([]);
      cargarMiembros();
    } catch (err) {
      setAddError(err.message || 'No se pudo dar de alta al socio');
    } finally {
      setAddLoading(false);
    }
  };

  const confirmarBaja = async () => {
    if (!bajaTarget) return;
    setBajaLoading(true);
    setBajaError(null);
    try {
      const token = await getToken();
      await darDeBajaSocio(bajaTarget.id, token);
      setBajaTarget(null);
      cargarMiembros();
    } catch (err) {
      setBajaError(err.message || 'No se pudo dar de baja al socio');
    } finally {
      setBajaLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Agregar socio
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Busca por email o nombre de usuario entre quienes no tienen agencia todavía.
        {agenciaNombre ? ` Se agregarán a tu agencia: ${agenciaNombre}.` : ''}
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }} component="form" onSubmit={submit}>
            {addError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAddError(null)}>
                {addError}
              </Alert>
            )}
            {addSuccess && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setAddSuccess(null)}>
                {addSuccess}
              </Alert>
            )}
            {yaTieneAgencia && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {yaTieneAgencia.email} ya pertenece a la agencia "{yaTieneAgencia.agencia.nombre}".
                Debe darse de baja de ahí antes de poder agregarlo aquí.
              </Alert>
            )}

            <Stack spacing={2}>
              <Autocomplete
                freeSolo
                options={opciones}
                loading={searching}
                filterOptions={(x) => x}
                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.email)}
                value={seleccionado}
                onChange={(_, value) => setSeleccionado(typeof value === 'string' ? null : value)}
                inputValue={query}
                onInputChange={(_, value) => {
                  setQuery(value);
                  setSeleccionado(null);
                }}
                disabled={addLoading}
                renderOption={(props, opt) => (
                  <li {...props} key={opt.id}>
                    {opt.email} {opt.username && opt.username !== opt.email ? `(${opt.username})` : ''}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Buscar por email o usuario"
                    placeholder={`Escribe al menos ${MIN_QUERY_LENGTH} caracteres`}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {searching ? <CircularProgress size={18} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              {!seleccionado && (
                <TextField
                  label="Nombre (solo si es un socio nuevo)"
                  placeholder="Nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  disabled={addLoading}
                  helperText="Si el email ya existe como usuario, este campo se ignora."
                />
              )}

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button variant="outlined" onClick={() => navigate(-1)} disabled={addLoading}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={addLoading || (!seleccionado && !query.trim())}
                  startIcon={addLoading ? <CircularProgress size={18} /> : null}
                >
                  {addLoading ? 'Guardando...' : 'Agregar socio'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Miembros actuales{agenciaNombre ? ` de ${agenciaNombre}` : ''}
            </Typography>

            {miembrosError && <Alert severity="error">{miembrosError}</Alert>}
            {bajaError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBajaError(null)}>
                {bajaError}
              </Alert>
            )}

            {loadingMiembros ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : miembros.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Todavía no hay socios en tu agencia.
              </Typography>
            ) : (
              <List dense>
                {miembros.map((m) => (
                  <ListItem
                    key={m.id}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => setBajaTarget(m)} title="Dar de baja">
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={m.email}
                      secondary={
                        Array.isArray(m.roles?.extra) && m.roles.extra.length > 0
                          ? m.roles.extra.map((r) => (
                              <Chip key={r} label={r} size="small" sx={{ mr: 0.5 }} />
                            ))
                          : null
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={!!bajaTarget} onClose={() => setBajaTarget(null)}>
        <DialogTitle>Dar de baja</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Quitar a <strong>{bajaTarget?.email}</strong> de esta agencia?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBajaTarget(null)} disabled={bajaLoading}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmarBaja}
            disabled={bajaLoading}
            startIcon={bajaLoading ? <CircularProgress size={18} /> : null}
          >
            Dar de baja
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
