import React, { useCallback, useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Slider,
  Checkbox,
  FormControlLabel,
  Button,
} from '@mui/material';
import useTodos from '../../hooks/useTodos';
import { useNavigate } from 'react-router-dom';

const STRAPI = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

const getAttributes = (item) => item?.attributes || item || {};

const getRelationItem = (relation) => relation?.data ?? relation ?? null;

const getAreaParentId = (area) => {
  const attrs = getAttributes(area);
  const parentArea = getRelationItem(attrs.parent_area);

  if (!parentArea) return null;

  return parentArea.id ?? getAttributes(parentArea).id ?? null;
};

const isParentArea = (area) => {
  const attrs = getAttributes(area);

  return Number(attrs.level ?? attrs.nivel ?? 0) === 0 && !getAreaParentId(area);
};

export default function AgregarTarea() {
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const { createTodo } = useTodos();

  const [allAreas, setAllAreas] = useState([]);
  const [areas, setAreas] = useState([]);
  const [subareas, setSubareas] = useState([]);

  const [areaSeleccionada, setAreaSeleccionada] = useState(null);
  const [subareaSeleccionada, setSubareaSeleccionada] = useState(null);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [tipo, setTipo] = useState('tarea');
  const [ambito, setAmbito] = useState('plataforma');
  const [nivel, setNivel] = useState('general');
  const [recurrencia, setRecurrencia] = useState('unica');

  const [minutos, setMinutos] = useState(0);
  const [laborys, setLaborys] = useState(0);
  const [efectivo, setEfectivo] = useState(0);

  const [vence, setVence] = useState(false);
  const [fechaEntrega, setFechaEntrega] = useState('');

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      });
    } catch (e) {
      console.warn('⚠️ No se pudo obtener token Auth0:', e.message);
      return null;
    }
  }, [getAccessTokenSilently]);

  // ---------------------
  // CARGAR AREAS
  // ---------------------

  useEffect(() => {
    async function fetchAreas() {
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `${STRAPI}/api/areas?populate[parent_area]=*&pagination[limit]=1000&sort[0]=name:asc`,
        { headers }
      );

      const json = await res.json();

      const lista = json.data || [];

      setAllAreas(lista);

      const principales = lista.filter(isParentArea);

      setAreas(principales);
    }

    fetchAreas();
  }, [getToken]);

  // ---------------------
  // CARGAR SUBAREAS
  // ---------------------

  useEffect(() => {
    if (!areaSeleccionada) {
      setSubareas([]);
      return;
    }

    const areaSubareas = allAreas.filter(
      (area) => Number(getAreaParentId(area)) === Number(areaSeleccionada)
    );

    setSubareas(areaSubareas);
  }, [allAreas, areaSeleccionada]);

  // ---------------------
  // SUBMIT
  // ---------------------

  const submit = async (e) => {
    e.preventDefault();

    try {
      if (!isAuthenticated) {
        throw new Error('Debes iniciar sesión para crear tareas');
      }

      if (!areaSeleccionada) {
        throw new Error('Selecciona un área principal.');
      }

      console.log('Creando tarea con:', {
        titulo,
        descripcion,
        tipo,
        ambito,
        nivel,
        recurrencia,
        minutos_desarrollo: minutos,
        reward_laborys: laborys,
        reward_cash: efectivo,
        areas: [areaSeleccionada],
        subareas: subareaSeleccionada ? [subareaSeleccionada] : [],
        user_email: user?.email,
        user_sub: user?.sub,
      });

      await createTodo({
        titulo,
        descripcion,

        tipo,
        ambito,
        nivel,
        recurrencia,

        minutos_desarrollo: minutos,

        reward_laborys: laborys,
        reward_cash: efectivo,

        vence,
        fecha_entrega: vence ? fechaEntrega : null,

        areas: [areaSeleccionada],
        subareas: subareaSeleccionada ? [subareaSeleccionada] : [],

        creador: user?.email || null,

        status: 'publicada',

        fecha_publicacion: new Date().toISOString(),
      });

      alert('Tarea creada');
      navigate('/coowork?tab=generales');
    } catch (err) {
      console.error('Error creando tarea:', err);
      alert(err.message || 'No se pudo crear la tarea');
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
      <Paper
        elevation={3}
        sx={{
          bgcolor: '#013b0c',
          p: 4,
          borderRadius: 3,
          width: '100%',
          maxWidth: 520,
        }}
      >
        <Typography variant="h5" color="white" gutterBottom>
          Agregar Tarea
        </Typography>

        <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            fullWidth
            sx={{ bgcolor: 'white', borderRadius: 1 }}
          />

          <TextField
            label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            sx={{ bgcolor: 'white', borderRadius: 1 }}
          />

          {/* AREA */}
          <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 1 }}>
            <InputLabel>Área</InputLabel>
            <Select
              value={areaSeleccionada || ''}
              label="Área"
              onChange={(e) => {
                setAreaSeleccionada(e.target.value);
                setSubareaSeleccionada(null);
              }}
            >
              <MenuItem value="">Área</MenuItem>
              {areas.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {getAttributes(a).name || getAttributes(a).nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* SUBAREA */}
          {subareas.length > 0 && (
            <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 1 }}>
              <InputLabel>Subárea</InputLabel>
              <Select
                value={subareaSeleccionada || ''}
                label="Subárea"
                onChange={(e) => setSubareaSeleccionada(e.target.value)}
              >
                <MenuItem value="">Subárea</MenuItem>
                {subareas.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {getAttributes(s).name || getAttributes(s).nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* ENUMS */}
          <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 1 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={tipo} label="Tipo" onChange={(e) => setTipo(e.target.value)}>
              <MenuItem value="tarea">Tarea</MenuItem>
              <MenuItem value="subtarea">Subtarea</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 1 }}>
            <InputLabel>Ámbito</InputLabel>
            <Select value={ambito} label="Ámbito" onChange={(e) => setAmbito(e.target.value)}>
              <MenuItem value="privada">Privada</MenuItem>
              <MenuItem value="plataforma">Plataforma</MenuItem>
            </Select>
          </FormControl>

            <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 1 }}>
            <InputLabel>Nivel</InputLabel>
            <Select value={nivel} label="Nivel" onChange={(e) => setNivel(e.target.value)}>
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="becario">Becario</MenuItem>
              <MenuItem value="especialidad">Especialidad</MenuItem>
              <MenuItem value="experto">Experto</MenuItem>
              <MenuItem value="personalizada">Personalizada</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ bgcolor: 'white', borderRadius: 1 }}>
            <InputLabel>Recurrencia</InputLabel>
            <Select
              value={recurrencia}
              label="Recurrencia"
              onChange={(e) => setRecurrencia(e.target.value)}
            >
              <MenuItem value="unica">Única</MenuItem>
              <MenuItem value="abierta">Abierta</MenuItem>
              <MenuItem value="periodica">Periódica</MenuItem>
            </Select>
          </FormControl>

          {/* MINUTOS */}
          <Box>
            <Typography color="white" variant="body2" gutterBottom>
              Minutos desarrollo: {minutos}
            </Typography>
            <Slider
              min={0}
              max={240}
              value={Number(minutos)}
              onChange={(e, v) => setMinutos(v)}
              sx={{ color: '#00ff99' }}
            />
          </Box>

          {/* PAGOS */}
          <TextField
            label="Pago Laborys"
            value={laborys}
            onChange={(e) => setLaborys(e.target.value)}
            fullWidth
            sx={{ bgcolor: 'white', borderRadius: 1 }}
          />

          <TextField
            label="Pago efectivo"
            value={efectivo}
            onChange={(e) => setEfectivo(e.target.value)}
            fullWidth
            sx={{ bgcolor: 'white', borderRadius: 1 }}
          />

          {/* FECHA */}
          <FormControlLabel
            control={<Checkbox checked={vence} onChange={() => setVence(!vence)} />}
            label="Tiene fecha de entrega"
            sx={{ color: 'white' }}
          />

          {vence && (
            <TextField
              type="date"
              label="Fecha de entrega"
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{ bgcolor: 'white', borderRadius: 1 }}
            />
          )}

          <Button
            type="submit"
            variant="contained"
            sx={{
              bgcolor: '#fff200',
              color: '#000',
              fontWeight: 'bold',
              py: 1.5,
              '&:hover': { bgcolor: '#ffea00' },
            }}
          >
            CREAR TAREA
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
