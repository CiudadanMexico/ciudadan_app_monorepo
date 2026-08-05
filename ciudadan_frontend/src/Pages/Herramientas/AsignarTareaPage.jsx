import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { useRoles } from '../../Contexts/RolesContext.jsx';
import { getTodosAsignables, getUsuariosRed, getTareasByTodo } from '../../services/cowork/queryServices.js';
import { getAttributes, normalizeAreas, getTodoStatusLabel } from '../../utils/cowork.helpers.js';
import { useAutocompletarAsignacion } from '../../hooks/useAutocompletarAsignacion.jsx';
import AsignarTarea from '../../components/Cowork/herramientas/AsignarTarea.jsx';

const normalizeRelation = (relation) => {
  // Ojo: para relaciones oneToOne vacías Strapi devuelve { data: null }, así
  // que NO se puede usar `relation?.data ?? relation` (el `??` no distingue
  // "data es null" de "data no existe" y devolvería el wrapper en vez de null).
  const value = relation && typeof relation === 'object' && 'data' in relation
    ? relation.data
    : relation;
  if (!value) return null;
  const attrs = getAttributes(value);
  return { id: value.id ?? attrs.id, ...attrs };
};

const normalizeTodoAsignable = (item) => {
  const attrs = getAttributes(item);
  return {
    id: item.id,
    titulo: attrs.titulo,
    nivel: attrs.nivel,
    status: attrs.status,
    asignable: attrs.asignable,
    areas: normalizeAreas(attrs.areas),
    creador: normalizeRelation(attrs.creador),
    createdBy: normalizeRelation(attrs.created_by),
    asignadoA: normalizeRelation(attrs.asignado_a),
    asignador: normalizeRelation(attrs.asignador),
  };
};

/**
 * Página "Asignar tarea" (Fase 6, README_logica_cowork.md).
 *
 * Lista las tareas (`todo`) marcadas como `asignable=true` creadas por el
 * socio en sesión (admin ve todas), permite elegir una y muestra el widget
 * `AsignarTarea` con los candidatos ya filtrados por la matriz
 * agencia-local/federal × general/especializada (`useAutocompletarAsignacion`).
 */
export default function AsignarTareaPage() {
  const { getAccessTokenSilently } = useAuth0();
  const { userData, isAdmin, isSocio } = useRoles();
  const tienePermiso = isAdmin() || isSocio();

  const [todos, setTodos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [asignadosActuales, setAsignadosActuales] = useState([]);
  const [loadingAsignados, setLoadingAsignados] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

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

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [todosJson, usuariosJson] = await Promise.all([
        getTodosAsignables(token),
        getUsuariosRed(token),
      ]);
      const listaTodos = Array.isArray(todosJson?.data) ? todosJson.data.map(normalizeTodoAsignable) : [];
      const listaUsuarios = Array.isArray(usuariosJson) ? usuariosJson : [];
      setTodos(listaTodos);
      setUsuarios(listaUsuarios);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los datos de asignación');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (tienePermiso) {
      cargar();
    } else {
      setLoading(false);
    }
  }, [tienePermiso, cargar]);

  // Al elegir un todo, cargamos quién ya está asignado (tareas activas, no
  // canceladas) para precargar la selección en el widget y permitir
  // agregar/quitar (Fase 6: "edición continua").
  useEffect(() => {
    if (!seleccionado) {
      setAsignadosActuales([]);
      return;
    }
    let cancelado = false;
    (async () => {
      setLoadingAsignados(true);
      try {
        const token = await getToken();
        const json = await getTareasByTodo(seleccionado.id, token);
        const items = Array.isArray(json?.data) ? json.data : [];
        const activos = items
          .map((item) => getAttributes(item))
          .filter((attrs) => attrs.status !== 'cancelada' && attrs.usuario)
          .map((attrs) => normalizeRelation(attrs.usuario))
          .filter(Boolean);
        if (!cancelado) setAsignadosActuales(activos);
      } catch (err) {
        if (!cancelado) setAsignadosActuales([]);
      } finally {
        if (!cancelado) setLoadingAsignados(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [seleccionado, getToken]);

  // Solo las tareas creadas por el socio en sesión; admin ve todas
  // (mismo criterio que la policy can-asignar-tarea.js en el backend).
  const misAsignables = useMemo(() => {
    if (!userData) return [];
    if (isAdmin()) return todos;
    return todos.filter(
      (t) => t.creador?.id === userData.id || t.createdBy?.id === userData.id
    );
  }, [todos, userData, isAdmin]);

  const candidatos = useAutocompletarAsignacion(usuarios, userData, seleccionado);

  const handleAsignado = (data) => {
    setMensaje(`Tarea asignada a ${data?.asignados?.length ?? 0} usuario(s).`);
    setSeleccionado(null);
    cargar();
  };

  if (!tienePermiso) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">
          No tienes permisos para asignar tareas. Solo administradores y socios pueden acceder.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Asignar tarea
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Selecciona una de tus tareas marcadas como "¿Es asignable?" para elegir
        a qué usuarios se le asigna. Puedes volver a entrar para agregar o
        quitar usuarios en cualquier momento.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {mensaje && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMensaje(null)}>
          {mensaje}
        </Alert>
      )}

      {!seleccionado ? (
        misAsignables.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography>
              No tienes tareas asignables todavía. Marca "¿Es asignable?" al
              crear una tarea en "Agregar Tarea" para que aparezca aquí.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {misAsignables.map((t) => (
              <Paper
                key={t.id}
                sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Box>
                  <Typography fontWeight={700}>{t.titulo || `Tarea ${t.id}`}</Typography>
                  <Typography variant="body2">
                    Estado: {getTodoStatusLabel(t.status)} | Nivel: {t.nivel || 'general'}
                  </Typography>
                  {t.asignadoA && (
                    <Typography variant="caption" color="text.secondary">
                      Asignado actualmente a: {t.asignadoA.username || t.asignadoA.email || `Usuario ${t.asignadoA.id}`}
                    </Typography>
                  )}
                </Box>
                <Button variant="contained" onClick={() => setSeleccionado(t)}>
                  Asignar
                </Button>
              </Paper>
            ))}
          </Stack>
        )
      ) : (
        <Paper sx={{ p: 2 }}>
          <Button sx={{ mb: 1 }} onClick={() => setSeleccionado(null)}>
            &larr; Volver al listado
          </Button>
          {loadingAsignados ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <AsignarTarea
              todo={seleccionado}
              candidatos={candidatos}
              asignadosActuales={asignadosActuales}
              onAsignado={handleAsignado}
            />
          )}
        </Paper>
      )}
    </Box>
  );
}
