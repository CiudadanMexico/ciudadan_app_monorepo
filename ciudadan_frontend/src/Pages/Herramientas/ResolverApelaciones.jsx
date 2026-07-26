import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Chip,
} from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import { useRoles } from '../../Contexts/RolesContext.jsx';
import { useTarea } from '../../hooks/useTarea';
import { getResolucionStatusLabel } from '../../utils/cowork.helpers';

const STRAPI = (process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032').replace(/\/$/, '');

const ESTADOS_ABIERTOS = ['abierta', 'en_revision'];

const formatearFecha = (fecha) => {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

export default function ResolverApelaciones() {
  const { isAuthenticated, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const { isAdmin, isSocio } = useRoles();
  const puedeResolver = isAdmin() || isSocio();
  const { resolverApelacion } = useTarea();

  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [dialog, setDialog] = useState({
    open: false,
    tareaId: null,
    apelacionId: null,
    decision: 'aprobada',
    notasResolucion: '',
    scoreFinal: '',
  });
  const [dialogError, setDialogError] = useState(null);

  const fetchApeladas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isAuthenticated) {
        setTareas([]);
        return;
      }

      let token = null;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: {
            audience: process.env.REACT_APP_AUTH0_AUDIENCE || 'https://api.ciudadan.org',
            scope: 'openid profile email offline_access',
          },
        });
      } catch (e) {
        console.debug('getAccessTokenSilently failed:', e?.message || e);
        token = null;
      }

      const res = await fetch(
        `${STRAPI}/api/tareas?filters[apelaciones][$notNull]=true&populate[usuario]=*&populate[todo]=*&pagination[limit]=1000&sort[0]=id:desc`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(`Error fetching apeladas: ${res.status} (token inválido). Intenta recargar o iniciar sesión de nuevo.`);
        }
        throw new Error(`Error fetching apeladas: ${res.status}`);
      }
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
      setTareas(list);
    } catch (err) {
      console.error('ResolverApelaciones.fetch error', err);
      setError(err.message || String(err));
      setTareas([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    fetchApeladas();
  }, [fetchApeladas]);

  const abrirDialog = (tarea, apelacion) => {
    setDialogError(null);
    setDialog({
      open: true,
      tareaId: tarea.id,
      apelacionId: apelacion.id,
      decision: 'aprobada',
      notasResolucion: '',
      scoreFinal: apelacion.scoreSolicitado ? String(apelacion.scoreSolicitado) : '',
    });
  };

  const cerrarDialog = () => {
    setDialog({
      open: false,
      tareaId: null,
      apelacionId: null,
      decision: 'aprobada',
      notasResolucion: '',
      scoreFinal: '',
    });
    setDialogError(null);
  };

  const submitResolucion = async () => {
    try {
      setBusyId(dialog.tareaId);
      setDialogError(null);

      const { tareaId, apelacionId, decision, notasResolucion, scoreFinal } = dialog;

      await resolverApelacion({
        tareaId,
        apelacionId,
        decision,
        notasResolucion,
        scoreFinal: scoreFinal === '' ? undefined : scoreFinal,
      });

      cerrarDialog();
      // Refresca la lista para que la apelación resuelta desaparezca
      await fetchApeladas();
    } catch (err) {
      console.error('Error al resolver apelación', err);
      setDialogError(err.message || 'No se pudo resolver la apelación');
    } finally {
      setBusyId(null);
    }
  };

  if (!puedeResolver) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">
          No tienes permisos para resolver apelaciones. Solo administradores y socios pueden acceder.
        </Typography>
      </Box>
    );
  }

  if (loading && tareas.length === 0) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  // Aplana las apelaciones abiertas de cada tarea para renderizarlas como
  // items individuales. Solo mostramos las apelaciones en estado 'abierta'
  // o 'en_revision' (las resueltas ya no requieren acción).
  const items = tareas.flatMap((t) => {
    const attrs = t.attributes || {};
    const todo = attrs.todo?.data?.attributes || attrs.todo || {};
    const apelaciones = Array.isArray(attrs.apelaciones) ? attrs.apelaciones : [];
    const abiertas = apelaciones.filter((a) => ESTADOS_ABIERTOS.includes(a.estado));
    return abiertas.map((a) => ({ tarea: t, apelacion: a, todo }));
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Resolver Apelaciones</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Revisa y resuelve apelaciones abiertas. Si apruebas con un score mayor al
        actual, el sistema re-paga la diferencia de laborys automáticamente.
      </Typography>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>
          {(error || '').toString().includes('401') || !isAuthenticated ? (
            <Button variant="outlined" onClick={() => loginWithRedirect()}>Iniciar sesión</Button>
          ) : null}
        </Box>
      )}

      {items.length === 0 ? (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography>No hay apelaciones abiertas para resolver.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2} mt={2}>
          {items.map(({ tarea, apelacion, todo }) => {
            const attrs = tarea.attributes || {};
            const usuario = attrs.usuario?.data?.attributes || attrs.usuario || {};
            return (
              <Paper key={`${tarea.id}-${apelacion.id}`} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 240 }}>
                    <Typography fontWeight={700}>
                      #{tarea.id} — {todo.titulo || attrs.titulo || 'Sin título'}
                    </Typography>
                    <Typography variant="body2">
                      Estado: <strong>{getResolucionStatusLabel(attrs.status)}</strong> | Score actual: {attrs.score ?? '—'}
                    </Typography>
                    <Typography variant="caption">
                      Usuario: {usuario.email || usuario.username || '—'}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        size="small"
                        color="warning"
                        label={`Apelación: ${apelacion.estado}`}
                      />
                      {apelacion.scoreSolicitado != null && (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`Solicitado: ${apelacion.scoreSolicitado}`}
                        />
                      )}
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Creada: ${formatearFecha(apelacion.fecha)}`}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                      <strong>Motivo:</strong> {apelacion.motivo}
                    </Typography>
                  </Box>
                  <Box>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={busyId === tarea.id}
                      onClick={() => abrirDialog(tarea, apelacion)}
                    >
                      Resolver
                    </Button>
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Dialog de resolución */}
      <Dialog open={dialog.open} onClose={cerrarDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Resolver apelación — Tarea #{dialog.tareaId}</DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError(null)}>
              {dialogError}
            </Alert>
          )}

          <TextField
            select
            fullWidth
            label="Decisión"
            value={dialog.decision}
            onChange={(e) => setDialog((d) => ({ ...d, decision: e.target.value }))}
            sx={{ mt: 1, mb: 2 }}
          >
            <MenuItem value="aprobada">Aprobar</MenuItem>
            <MenuItem value="rechazada">Rechazar</MenuItem>
          </TextField>

          {dialog.decision === 'aprobada' && (
            <TextField
              fullWidth
              label="Score final (opcional, 1-5)"
              value={dialog.scoreFinal}
              onChange={(e) => setDialog((d) => ({ ...d, scoreFinal: e.target.value }))}
              type="number"
              inputProps={{ min: 1, max: 5, step: 1 }}
              helperText="Si se omite, usa el score solicitado por el apelante. Si es mayor al actual, se re-paga la diferencia en laborys."
              sx={{ mb: 2 }}
            />
          )}

          <TextField
            fullWidth
            multiline
            minRows={3}
            label={dialog.decision === 'rechazada' ? 'Notas de resolución (obligatorio)' : 'Notas de resolución (opcional)'}
            value={dialog.notasResolucion}
            onChange={(e) => setDialog((d) => ({ ...d, notasResolucion: e.target.value }))}
            inputProps={{ maxLength: 2000 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarDialog} disabled={busyId === dialog.tareaId}>Cancelar</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={submitResolucion}
            disabled={
              busyId === dialog.tareaId ||
              (dialog.decision === 'rechazada' && dialog.notasResolucion.trim().length === 0)
            }
          >
            {busyId === dialog.tareaId ? 'Resolviendo…' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
