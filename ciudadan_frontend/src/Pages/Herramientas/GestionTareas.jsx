import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CircularProgress, Paper, Stack,
  IconButton, Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTarea } from '../../hooks/useTarea';
import { getResolucionStatusLabel } from '../../utils/cowork.helpers';

export default function GestionTareas() {
  const { tareas, loading, error, fetchTareas, eliminarTarea, canCRUD } = useTarea();

  const [busy, setBusy] = useState(false);

  // Fetch tareas on mount
  useEffect(() => {
    if (canCRUD) fetchTareas();
  }, [canCRUD, fetchTareas]);

  const handleDelete = async (t) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta tarea? Esta acción no se puede deshacer.')) return;
    try {
      setBusy(true);
      await eliminarTarea(t.id);
      await fetchTareas();
    } catch (err) {
      console.error('Error eliminando tarea', err);
      alert(err.message || 'Error al eliminar tarea');
    } finally {
      setBusy(false);
    }
  };

  if (!canCRUD) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">
          No tienes permisos para gestionar tareas. Solo administradores y socios pueden acceder.
        </Typography>
      </Box>
    );
  }

  if (loading && tareas.length === 0) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Gestionar Tareas</Typography>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
      )}

      {tareas.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography>No hay tareas registradas.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {tareas.map((t) => {
            return (
              <Paper key={t.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700}>
                    #{t.id} — {t.todo?.titulo || 'Sin título'}
                  </Typography>
                  <Typography variant="body2">
                    Estado: <strong>{getResolucionStatusLabel(t.status)}</strong> | Tipo: {t.tipo || '—'} | Score: {t.score ?? '—'}
                  </Typography>
                  <Typography variant="caption">
                    Usuario: {t.usuario?.email || '—'}
                  </Typography>
                  {t.notes && (
                    <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                      Notas: {t.notes}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Tooltip title="Eliminar">
                    <IconButton color="error" onClick={() => handleDelete(t)} disabled={busy}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
