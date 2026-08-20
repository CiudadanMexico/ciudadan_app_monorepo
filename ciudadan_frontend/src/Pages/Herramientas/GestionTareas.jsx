import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useTarea } from '../../hooks/useTarea';
import { getResolucionStatusLabel } from '../../utils/cowork.helpers';

// Estados válidos de una resolución (tarea) — mismo enum del schema backend.
// El lifecycle igual valida la transición del lado del servidor; esto solo
// evita mandar un valor que ni siquiera existe.
const ESTADOS_TAREA = [
  'en_proceso', 'completada', 'corregir', 'corregida',
  'calificada', 'pagada', 'cancelada', 'modificada',
];

export default function GestionTareas() {
  const { tareas, loading, error, fetchTareas, editarTarea, eliminarTarea, canCRUD } = useTarea();

  const [actionError, setActionError] = useState(null);

  // Diálogo de edición (reemplaza la ausencia total de "editar").
  const [editDialog, setEditDialog] = useState({ open: false, tarea: null, status: '', score: '', notes: '' });
  const [editando, setEditando] = useState(false);

  // Diálogo de confirmación de borrado (reemplaza window.confirm/alert).
  const [confirmDelete, setConfirmDelete] = useState({ open: false, tarea: null });
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    if (canCRUD) fetchTareas();
  }, [canCRUD, fetchTareas]);

  const abrirEditar = (t) => {
    setActionError(null);
    setEditDialog({
      open: true,
      tarea: t,
      status: t.status || 'en_proceso',
      score: t.score ?? '',
      notes: t.notes || '',
    });
  };

  const cerrarEditar = () => {
    if (editando) return;
    setEditDialog({ open: false, tarea: null, status: '', score: '', notes: '' });
  };

  const submitEditar = async () => {
    setEditando(true);
    setActionError(null);
    try {
      const cambios = { status: editDialog.status, notes: editDialog.notes };
      if (editDialog.score !== '') cambios.score = Number(editDialog.score);
      await editarTarea(editDialog.tarea.id, cambios);
      setEditDialog({ open: false, tarea: null, status: '', score: '', notes: '' });
    } catch (err) {
      setActionError(err.message || 'No se pudo editar la tarea');
    } finally {
      setEditando(false);
    }
  };

  const abrirConfirmDelete = (t) => {
    setActionError(null);
    setConfirmDelete({ open: true, tarea: t });
  };

  const cerrarConfirmDelete = () => {
    if (eliminando) return;
    setConfirmDelete({ open: false, tarea: null });
  };

  const confirmarEliminar = async () => {
    setEliminando(true);
    setActionError(null);
    try {
      await eliminarTarea(confirmDelete.tarea.id);
      await fetchTareas();
      setConfirmDelete({ open: false, tarea: null });
    } catch (err) {
      console.error('Error eliminando tarea', err);
      setActionError(err.message || 'Error al eliminar tarea');
    } finally {
      setEliminando(false);
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

      {(error || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError || error}
        </Alert>
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
                  <Tooltip title="Editar">
                    <IconButton onClick={() => abrirEditar(t)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton color="error" onClick={() => abrirConfirmDelete(t)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Diálogo de edición */}
      <Dialog open={editDialog.open} onClose={cerrarEditar} fullWidth maxWidth="sm">
        <DialogTitle>Editar tarea #{editDialog.tarea?.id}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth disabled={editando}>
              <InputLabel id="estado-label">Estado</InputLabel>
              <Select
                labelId="estado-label"
                label="Estado"
                value={editDialog.status}
                onChange={(e) => setEditDialog((p) => ({ ...p, status: e.target.value }))}
              >
                {ESTADOS_TAREA.map((s) => (
                  <MenuItem key={s} value={s}>{getResolucionStatusLabel(s)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Score (0-5)"
              type="number"
              inputProps={{ min: 0, max: 5, step: 1 }}
              value={editDialog.score}
              onChange={(e) => setEditDialog((p) => ({ ...p, score: e.target.value }))}
              fullWidth
              disabled={editando}
            />
            <TextField
              label="Notas"
              value={editDialog.notes}
              onChange={(e) => setEditDialog((p) => ({ ...p, notes: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
              disabled={editando}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarEditar} disabled={editando}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={submitEditar} disabled={editando}>
            {editando ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación de borrado */}
      <Dialog open={confirmDelete.open} onClose={cerrarConfirmDelete} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar tarea</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que deseas eliminar la tarea #{confirmDelete.tarea?.id}? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarConfirmDelete} disabled={eliminando}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={confirmarEliminar} disabled={eliminando}>
            {eliminando ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
