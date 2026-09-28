import React, { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Button, CircularProgress, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { getMisTodosPublicados } from '../../services/cowork/queryServices';
import { TareaCard } from '../../components/Cowork/Tareas.jsx';
import { normalizeTask } from '../../utils/cowork.helpers.js';
import AbreTuAgencia from '../../components/Cowork/AbreTuAgencia.jsx';

const amarilloCiudadan = '#fff200';

/**
 * TodoToken → "Mis tareas publicadas" (/coowork/mi-agencia/tareas).
 *
 * Muestra EXCLUSIVAMENTE las tareas que el socio en sesión publicó en su
 * agencia. El backend (/api/todos/mi-agencia) resuelve usuario + agencia + rol
 * server-side y devuelve sólo `creador = yo AND status = publicada`: otro socio
 * de la misma agencia no puede ver estas tareas ni manipulando la petición
 * desde el navegador.
 *
 * No se inventan acciones: editar/eliminar viven hoy en el tab "Tareas
 * generales" de CoWork, así que esta pantalla enlaza a esa pantalla real.
 */
const MiAgenciaTareas = () => {
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, getAccessTokenSilently } =
    useAuth0();

  const [estado, setEstado] = useState('idle'); // idle | loading | error | ok
  const [todos, setTodos] = useState([]);
  const [meta, setMeta] = useState(null);
  const [reason, setReason] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!isAuthenticated) {
      setTodos([]);
      setEstado('idle');
      return;
    }
    setEstado('loading');
    setError(null);
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      }).catch(() => null);
      const json = await getMisTodosPublicados(token);
      setTodos(Array.isArray(json?.data) ? json.data : []);
      setMeta(json?.meta || null);
      setReason(json && json.ok === false ? json.reason : null);
      setEstado('ok');
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar tus tareas publicadas');
      setTodos([]);
      setEstado('error');
    }
  }, [getAccessTokenSilently, isAuthenticated]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleLogin = () =>
    loginWithRedirect({ appState: { returnTo: window.location.pathname } });

  const Header = (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" fontWeight={700} color="white" gutterBottom>
        📋 Mis tareas publicadas
      </Typography>
      <Typography color="#ccc" sx={{ fontSize: '0.95rem' }}>
        Tareas que publicaste con TodoToken
        {meta?.agencia?.nombre ? ` en ${meta.agencia.nombre}` : ''}. Cada socio administra únicamente
        sus propias publicaciones.
      </Typography>
      <Typography color="#8f8f8f" sx={{ fontSize: '0.8rem', mt: 0.5 }}>
        Sólo se listan tareas en estado <strong>publicada</strong>. Los borradores se gestionarán en
        otra vista (próximamente).
      </Typography>
    </Box>
  );

  const accionesReales = (
    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
      <Button
        component={RouterLink}
        to="/herramientas/agregar-tarea"
        size="small"
        variant="contained"
        sx={{
          bgcolor: amarilloCiudadan,
          color: '#1a1a1a',
          fontWeight: 700,
          textTransform: 'none',
          '&:hover': { bgcolor: '#ffe04a' },
        }}
      >
        Publicar nueva tarea
      </Button>
      <Button
        component={RouterLink}
        to="/coowork?tab=generales"
        size="small"
        variant="outlined"
        sx={{
          borderColor: 'rgba(255,255,255,0.35)',
          color: '#eee',
          textTransform: 'none',
          '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
        }}
      >
        Gestionar en Tareas generales
      </Button>
    </Stack>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0b0716', color: 'white', py: { xs: 3, sm: 5 } }}>
      <Container maxWidth="md">
        {Header}

        {authLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: amarilloCiudadan }} />
          </Box>
        ) : !isAuthenticated ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="#ccc" sx={{ mb: 2 }}>
              Para ver tus tareas publicadas necesitas iniciar sesión.
            </Typography>
            <Button
              variant="contained"
              onClick={handleLogin}
              sx={{
                bgcolor: amarilloCiudadan,
                color: '#1a1a1a',
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              Iniciar sesión
            </Button>
          </Box>
        ) : estado === 'loading' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: amarilloCiudadan }} />
          </Box>
        ) : estado === 'error' ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography color="error">{error}</Typography>
            <Button onClick={cargar} sx={{ mt: 1, color: amarilloCiudadan, textTransform: 'none' }}>
              Reintentar
            </Button>
          </Box>
        ) : reason === 'sin-agencia' ? (
          <AbreTuAgencia detalle="Tu cuenta todavía no pertenece a ninguna Agencia Ciudadan." />
        ) : reason === 'sin-rol-socio' ? (
          <AbreTuAgencia
            titulo="Necesitas ser socio para publicar tareas"
            detalle={
              meta?.agencia?.nombre
                ? `Ya perteneces a ${meta.agencia.nombre}, pero tu cuenta no tiene el rol de socio que permite publicar y administrar tareas.`
                : 'Tu cuenta no tiene el rol de socio que permite publicar tareas.'
            }
            mensaje="La administración de TodoToken está reservada a los socios de una agencia."
          />
        ) : (
          <>
            {accionesReales}

            {todos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color="#ddd" sx={{ fontWeight: 700, mb: 1 }}>
                  Aún no has publicado tareas.
                </Typography>
                <Typography color="#a5a5a5" sx={{ fontSize: '0.9rem' }}>
                  Cuando publiques una tarea con TodoToken aparecerá aquí, con su estado y su
                  recompensa.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {todos.map((todo) => (
                  <TareaCard
                    key={todo.id}
                    tarea={{ ...normalizeTask(todo), todoStatus: todo.status }}
                  />
                ))}
              </Stack>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};


export default MiAgenciaTareas;
