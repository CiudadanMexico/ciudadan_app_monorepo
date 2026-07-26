import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress, Paper, Stack } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import useTodos from '../../hooks/useTodos';
import { getResolucionStatusLabel } from '../../utils/cowork.helpers';

const STRAPI = (process.env.REACT_APP_STRAPI_URL || '').replace(/\/$/, '');

export default function CorregirTarea() {
  const { isAuthenticated, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const { corregirTarea } = useTodos();

  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchTareasCompletadas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isAuthenticated) {
        setTareas([]);
        setLoading(false);
        return;
      }

      // Backend policies validate against Auth0 /userinfo, so we MUST send the Auth0
      // access token (with audience), NOT the Strapi JWT. We always use
      // getAccessTokenSilently because it auto-refreshes expired tokens — the
      // accessToken from useAuthInfo context can be stale, causing intermittent 403s.
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

      // Usamos el endpoint dedicado /tareas/filtrar que ya popula todo
      // (todo, usuario, reviewed_by, agencia). Solo tareas 'completada' pueden corregirse.
      const res = await fetch(`${STRAPI}/api/tareas/filtrar?status=completada&pageSize=100`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(`Error fetching tareas: ${res.status} (token inválido). Intenta recargar o iniciar sesión de nuevo.`);
        }
        throw new Error(`Error fetching tareas: ${res.status}`);
      }
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
      setTareas(list);
    } catch (err) {
      console.error('CorregirTarea.fetch error', err);
      setError(err.message || String(err));
      // Clear stale tareas so the user doesn't see/act on outdated data.
      setTareas([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    fetchTareasCompletadas();
  }, [fetchTareasCompletadas]);

  const handleCorregir = async (tarea) => {
    try {
      const notesStr = window.prompt('Describe qué debe corregirse:', '');
      if (notesStr === null) return;
      const notes = notesStr || '';

      setBusyId(tarea.id);
      await corregirTarea(tarea.id, notes);

      // Optimistic update: remove the task from the list immediately so the
      // user sees it disappear without needing to reload the page.
      setTareas((prev) => prev.filter((t) => t.id !== tarea.id));

      alert('Tarea marcada para corrección correctamente');
    } catch (err) {
      console.error('Error al marcar corrección', err);
      alert(err.message || 'Error al marcar tarea para corrección');
    } finally {
      setBusyId(null);
      // Always refresh the list after a corregir attempt (success or error)
      // to keep it in sync — removes stale tasks that are no longer corregible.
      await fetchTareasCompletadas();
    }
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Corregir Tarea</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Marca tareas completadas que requieren corrección antes de ser calificadas.
      </Typography>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>
          {(error || '').toString().includes('401') || !isAuthenticated ? (
            <Button variant="outlined" onClick={() => loginWithRedirect()}>Iniciar sesión</Button>
          ) : null}
        </Box>
      )}

      {tareas.length === 0 ? (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography>No hay tareas completadas pendientes de revisión.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2} mt={2}>
          {tareas.map((t) => {
            const attrs = t.attributes || {};
            const todo = attrs.todo?.data?.attributes || attrs.todo || {};
            return (
              <Paper key={t.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography fontWeight={700}>{todo.titulo || attrs.titulo || 'Sin título'}</Typography>
                  <Typography variant="body2">Estado: {getResolucionStatusLabel(attrs.status)}</Typography>
                  <Typography variant="caption">
                    Usuario: {attrs.usuario?.data?.attributes?.email || attrs.usuario?.email || '—'}
                  </Typography>
                </Box>
                <Box>
                  <Button
                    variant="contained"
                    color="warning"
                    disabled={busyId === t.id}
                    onClick={() => handleCorregir(t)}
                  >
                    {busyId === t.id ? 'Enviando...' : 'Marcar para corregir'}
                  </Button>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
