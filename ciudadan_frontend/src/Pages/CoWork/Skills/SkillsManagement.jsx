// src/Pages/CoWork/Skills/SkillsManagement.jsx
//
// Reescrito en MUI: la versión anterior usaba Ant Design (librería no
// instalada en el proyecto — nunca podía siquiera importarse) y no estaba
// conectada a ninguna ruta, así que era inalcanzable. El hook useSkills.js
// que consume ya fue corregido (antes su fetch/create/update siempre
// devolvían datos vacíos/undefined por un desajuste de forma de respuesta
// en el backend — ver src/api/skill/controllers/skill.js).
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
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useRoles } from '../../../Contexts/RolesContext';
import { useSkills } from '../../../hooks/useSkills/useSkills';
import { areasIdOf, areaPath } from '../../../utils/agregarTarea.helpers';

const STRAPI = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

const emptyForm = { name: '', description: '', is_active: true, area: '' };

const SkillsManagement = () => {
  const { isAdmin, isEditor, isRoot } = useRoles();
  const puedeGestionar = isAdmin() || isEditor() || isRoot();
  const { skills, fetchSkills, createSkill, updateSkill, deleteSkill, loading, error } = useSkills();

  const [dialog, setDialog] = useState({ open: false, editingId: null, form: emptyForm });
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);

  const [areas, setAreas] = useState([]);

  useEffect(() => {
    if (puedeGestionar) fetchSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeGestionar]);

  // Áreas activas para el select de "área padre" (lectura pública:
  // GET /api/areas está en auth:false, igual que consumen AgregarTarea y el
  // panel de tareas especializadas).
  useEffect(() => {
    if (!puedeGestionar) return;
    (async () => {
      try {
        const res = await fetch(
          `${STRAPI}/api/areas?filters[is_active][$ne]=false&pagination[limit]=1000&sort[0]=name:asc&populate[parent_area]=*`
        );
        if (!res.ok) throw new Error(`areas ${res.status}`);
        const json = await res.json();
        setAreas(json.data || []);
      } catch (err) {
        console.warn('No se pudieron cargar las áreas para skills:', err.message);
      }
    })();
  }, [puedeGestionar]);

  if (!puedeGestionar) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="error">
          Solo administradores y editores pueden gestionar habilidades.
        </Alert>
      </Box>
    );
  }

  const abrirCrear = () => {
    setActionError(null);
    setDialog({ open: true, editingId: null, form: emptyForm });
  };

  const abrirEditar = (skill) => {
    setActionError(null);
    setDialog({
      open: true,
      editingId: skill.id,
      form: {
        name: skill.attributes?.name || '',
        description: skill.attributes?.description || '',
        is_active: skill.attributes?.is_active !== false,
        area: areasIdOf(skill.attributes?.areas)[0] ?? '',
      },
    });
  };

  const cerrarDialog = () => {
    if (saving) return;
    setDialog({ open: false, editingId: null, form: emptyForm });
  };

  const submitDialog = async () => {
    if (!dialog.form.name.trim()) {
      setActionError('El nombre es requerido');
      return;
    }
    // Toda skill debe colgar de un área: es lo que permite mostrar las
    // especialidades filtradas por área en el formulario de agregar tarea.
    if (!dialog.form.area) {
      setActionError('Selecciona el área padre de la habilidad');
      return;
    }
    const payload = {
      name: dialog.form.name?.trim(),
      description: dialog.form.description ?? '',
      is_active: dialog.form.is_active !== false,
      areas: dialog.form.area ? [Number(dialog.form.area)] : [],
    };
    setSaving(true);
    setActionError(null);
    try {
      if (dialog.editingId) {
        await updateSkill(dialog.editingId, payload);
      } else {
        await createSkill(payload);
      }
      setDialog({ open: false, editingId: null, form: emptyForm });
      await fetchSkills();
    } catch (err) {
      setActionError(err.message || 'No se pudo guardar la habilidad');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (skill) => {
    if (!window.confirm(`¿Eliminar la habilidad "${skill.attributes?.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setActionError(null);
    try {
      await deleteSkill(skill.id);
      await fetchSkills();
    } catch (err) {
      setActionError(err.message || 'No se pudo eliminar la habilidad');
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Gestión de habilidades</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCrear}>
          Nueva habilidad
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Colección de habilidades (nombre + <strong>área padre requerida</strong> + estado
        activo). El área es lo que permite mostrar las especialidades filtradas por
        área en el formulario de <em>Agregar tarea</em> (nivel «Especialidad»).
      </Typography>

      {(error || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError || error}
        </Alert>
      )}

      <Paper variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Área</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="center">Activo</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : skills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No hay habilidades registradas</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                skills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell>{skill.attributes?.name}</TableCell>
                    <TableCell>
                      {areasIdOf(skill.attributes?.areas).length > 0
                        ? areaPath(
                            areas.find((a) => Number(a.id) === Number(areasIdOf(skill.attributes?.areas)[0])) ||
                              skill.attributes?.areas,
                            areas
                          )
                        : <em>Sin área (editar para asignar)</em>}
                    </TableCell>
                    <TableCell>
                      {skill.attributes?.description || <em>Sin descripción</em>}
                    </TableCell>
                    <TableCell align="center">
                      {skill.attributes?.is_active !== false ? 'Sí' : 'No'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => abrirEditar(skill)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(skill)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={dialog.open} onClose={cerrarDialog} fullWidth maxWidth="sm">
        <DialogTitle>{dialog.editingId ? 'Editar habilidad' : 'Nueva habilidad'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre *"
              value={dialog.form.name}
              onChange={(e) => setDialog((p) => ({ ...p, form: { ...p.form, name: e.target.value } }))}
              fullWidth
              disabled={saving}
            />
            <FormControl fullWidth required disabled={saving}>
              <InputLabel id="skill-area-label">Área *</InputLabel>
              <Select
                labelId="skill-area-label"
                value={dialog.form.area}
                label="Área *"
                onChange={(e) => setDialog((p) => ({ ...p, form: { ...p.form, area: e.target.value } }))}
              >
                <MenuItem value="">
                  <em>Elige el área padre</em>
                </MenuItem>
                {areas.map((a) => (
                  <MenuItem key={a.id} value={String(a.id)}>
                    {areaPath(a, areas)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Descripción (opcional)"
              value={dialog.form.description}
              onChange={(e) => setDialog((p) => ({ ...p, form: { ...p.form, description: e.target.value } }))}
              multiline
              minRows={2}
              fullWidth
              disabled={saving}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={dialog.form.is_active}
                  onChange={(e) => setDialog((p) => ({ ...p, form: { ...p.form, is_active: e.target.checked } }))}
                  disabled={saving}
                />
              }
              label="Activa"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={submitDialog} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SkillsManagement;
