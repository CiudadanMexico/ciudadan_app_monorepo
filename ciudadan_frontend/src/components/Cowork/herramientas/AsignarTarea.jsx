import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Alert, Autocomplete, TextField } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import { asignarTarea } from '../../../services/cowork/mutationsServices';

const userLabel = (u) => u?.username || u?.email || `Usuario ${u?.id}`;

/**
 * Vista de asignación de tareas (Fase 6, README_logica_cowork.md).
 *
 * Recibe un `todo`, la lista de `candidatos` ya filtrados por la matriz
 * agencia-local/federal × general/especializada (`useAutocompletarAsignacion`)
 * y opcionalmente `asignadosActuales` (quién ya está asignado hoy). Usa un
 * Autocomplete con búsqueda por nombre/correo — el spec pide explícitamente
 * autocompletar en vez de una lista completa, sobre todo para el caso
 * "agencia federal" donde el universo de candidatos puede ser toda la red.
 *
 * Es una edición continua: se puede volver a llamar con una selección
 * distinta para agregar o quitar usuarios — el backend (`asignar.js`)
 * calcula el diff.
 */
export default function AsignarTarea({ todo, candidatos = [], asignadosActuales = [], onAsignado }) {
  const { getAccessTokenSilently } = useAuth0();
  const [seleccionados, setSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Precarga la selección con los usuarios ya asignados cuando cambia el
  // todo (o cuando llegan los datos de asignados actuales).
  useEffect(() => {
    setSeleccionados(asignadosActuales);
    setError(null);
  }, [todo?.id, asignadosActuales]);

  // El universo de opciones del Autocomplete debe incluir tanto los
  // candidatos filtrados por la matriz como los ya asignados (para poder
  // seguir viéndolos/quitarlos aunque, por algún cambio de área/agencia,
  // ya no calificaran como "candidato" nuevo).
  const opciones = React.useMemo(() => {
    const porId = new Map();
    for (const u of [...asignadosActuales, ...candidatos]) {
      if (u && u.id != null) porId.set(u.id, u);
    }
    return Array.from(porId.values());
  }, [candidatos, asignadosActuales]);

  const confirmar = async () => {
    if (seleccionados.length === 0) {
      setError('Selecciona al menos un usuario');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const token = await getAccessTokenSilently();
      const res = await asignarTarea(todo.id, seleccionados.map((u) => u.id), token);
      if (onAsignado) onAsignado(res.data);
    } catch (e) {
      setError(e.message || 'Error al asignar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Asignar: {todo?.titulo || todo?.id}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Autocomplete
        multiple
        options={opciones}
        value={seleccionados}
        onChange={(e, nuevaSeleccion) => setSeleccionados(nuevaSeleccion)}
        getOptionLabel={userLabel}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        filterSelectedOptions
        renderInput={(params) => (
          <TextField
            {...params}
            label="Buscar usuario por nombre o correo"
            placeholder="Escribe para buscar..."
          />
        )}
        noOptionsText="Sin candidatos que coincidan"
        sx={{ mb: 2 }}
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        {opciones.length} usuario(s) disponibles según la agencia/área de la tarea. Quita de la
        selección a quien ya no deba estar asignado — se aplicará al confirmar.
      </Typography>

      <Button
        variant="contained"
        disabled={cargando || seleccionados.length === 0}
        onClick={confirmar}
      >
        {cargando ? 'Guardando...' : `Confirmar asignación (${seleccionados.length})`}
      </Button>
    </Box>
  );
}
