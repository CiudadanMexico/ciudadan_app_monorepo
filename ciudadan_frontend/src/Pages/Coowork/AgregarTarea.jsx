// src/Pages/Coowork/AgregarTarea.jsx
//
// Formulario de creación de tareas del módulo CoWork.
//
// Rediseño (2026-10-08):
//  - Estética alineada con el resto del módulo: Paper oscuro con borde neón,
//    inputs con outline que brilla al hover/focus, secciones con subtítulos
//    neón y botón amarillo `#f5c400` (mismo patrón que DeclararAreaForm).
//  - Nivel «Especialidad» muestra DOS selects: **Área** y **Especialidad**
//    (skills activas del catálogo filtradas por el área elegida — relación
//    `skill.area`). Ambos obligatorios.
//  - `general`/`becario` ya NO exigen elegir área (spec: sólo requieren
//    usuario verificado); `experto`/`personalizada` sólo piden área.
//  - La lógica pura (visibilidad por nivel, opciones, validación, cadenas de
//    ancestros) vive en `src/utils/agregarTarea.helpers.js` con tests.
//  - Sin console.log de producción y con `res.ok` + estados de carga al traer
//    áreas y skills.
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddTaskIcon from '@mui/icons-material/AddTask';
import useTodos from '../../hooks/useTodos';
import { useNavigate } from 'react-router-dom';
import {
  areaIdOf,
  areaOptions,
  areaPath,
  cadenaDeAreas,
  especialidadOptions,
  getAttr,
  requiereArea,
  requiereEspecialidad,
  validarTarea,
} from '../../utils/agregarTarea.helpers';

const STRAPI = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

const neonGreen = '#00ff99';
const amarilloCiudadan = '#f5c400';

// Estilo compartido de todos los campos (texto claro, contorno gris que
// brilla en verde al hover/focus) — idéntico al resto del módulo cowork.
const fieldSx = {
  input: { color: '#e6ffe6' },
  label: { color: '#d6d6d6' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: neonGreen },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: neonGreen },
  '& .MuiSvgIcon-root': { color: '#d6d6d6' },
};

const Section = ({ title, children }) => (
  <Box
    sx={{
      borderTop: '1px dashed rgba(0,255,153,0.25)',
      pt: 2.5,
      mt: 2.5,
      '&:first-of-type': { borderTop: 'none', mt: 0, pt: 0 },
    }}
  >
    <Typography
      variant="subtitle2"
      sx={{
        color: neonGreen,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        mb: 2,
      }}
    >
      {title}
    </Typography>
    <Stack spacing={2}>{children}</Stack>
  </Box>
);

const Fila = ({ children }) => (
  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
    {children.map((child, idx) => (
      <Box key={idx} sx={{ flex: 1, minWidth: 0 }}>
        {child}
      </Box>
    ))}
  </Stack>
);

export default function AgregarTarea() {
  const { user, isAuthenticated } = useAuth0();
  const navigate = useNavigate();
  const { createTodo } = useTodos();

  const [areas, setAreas] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(true);

  const [areaSeleccionada, setAreaSeleccionada] = useState(null);
  const [skillSeleccionado, setSkillSeleccionado] = useState(null);

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
  const [asignable, setAsignable] = useState(false);

  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);

  // --------------------- CARGAR AREAS (lectura pública) ---------------------
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        setLoadingAreas(true);
        const res = await fetch(
          `${STRAPI}/api/areas?pagination[limit]=1000&sort[0]=name:asc&populate[parent_area]=*&filters[is_active][$ne]=false`
        );
        if (!res.ok) throw new Error(`No se pudieron cargar las áreas (${res.status})`);
        const json = await res.json();
        if (vivo) setAreas(json.data || []);
      } catch (err) {
        console.error('Error cargando áreas:', err);
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setLoadingAreas(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // --------------------- CARGAR SKILLS (lectura pública) ---------------------
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        setLoadingSkills(true);
        const res = await fetch(
          `${STRAPI}/api/skills?populate[area]=*&pagination[limit]=1000&sort[0]=name:asc&filters[is_active][$ne]=false`
        );
        if (!res.ok) throw new Error(`No se pudieron cargar las especialidades (${res.status})`);
        const json = await res.json();
        if (vivo) setSkills(json.data || []);
      } catch (err) {
        console.error('Error cargando skills:', err);
        if (vivo) setError(err.message);
      } finally {
        if (vivo) setLoadingSkills(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // Áreas mostradas según el nivel: en especialidad sólo las que tienen skills
  // (si no, el select dejaría huecos sin especialidad posible).
  const opcionesArea = useMemo(
    () => areaOptions(areas, skills, nivel),
    [areas, skills, nivel]
  );

  const opcionesEspecialidad = useMemo(
    () => especialidadOptions(skills, areaSeleccionada),
    [skills, areaSeleccionada]
  );

  const cambiarNivel = (nuevoNivel) => {
    setNivel(nuevoNivel);
    // Al cambiar de nivel se caen las selecciones que ya no aplican.
    if (!requiereArea(nuevoNivel)) setAreaSeleccionada(null);
    if (!requiereEspecialidad(nuevoNivel)) setSkillSeleccionado(null);
  };

  const cambiarArea = (nuevaArea) => {
    setAreaSeleccionada(nuevaArea);
    setSkillSeleccionado(null); // las especialidades dependen del área
  };

  // --------------------- SUBMIT ---------------------
  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (!isAuthenticated) {
        throw new Error('Debes iniciar sesión para crear tareas');
      }

      const mensajeValidacion = validarTarea({
        nivel,
        areaSeleccionada,
        skillSeleccionado,
        skills,
      });
      if (mensajeValidacion) throw new Error(mensajeValidacion);

      setCreando(true);

      const areaObj = areas.find((a) => Number(areaIdOf(a)) === Number(areaSeleccionada)) || null;
      const esEspecializada = requiereArea(nivel);

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

        // `areas` lleva la cadena completa (raíz … propia) para que el chip de
        // la raíz siga agrupando la tarea y `canUserRateTask` filtre bien.
        areas: esEspecializada ? cadenaDeAreas(areaObj, areas) : [],
        subareas:
          esEspecializada && Number(getAttr(areaObj).level ?? 0) > 0
            ? [Number(areaSeleccionada)]
            : [],
        skills:
          requiereEspecialidad(nivel) && skillSeleccionado
            ? [Number(skillSeleccionado)]
            : [],

        creador: user?.email || null,

        status: 'publicada',

        asignable,

        fecha_publicacion: new Date().toISOString(),
      });

      // La tarea recién publicada vive en su pestaña: las especializadas van
      // a "especializadas" (donde se verá su chip/tareas), el resto a
      // "generales".
      navigate(esEspecializada ? '/coowork?tab=especializadas' : '/coowork?tab=generales');
    } catch (err) {
      console.error('Error creando tarea:', err);
      setError(err.message || 'No se pudo crear la tarea');
      setCreando(false);
    }
  };

  const mostrarEspecialidad = requiereEspecialidad(nivel);
  const mostrarArea = requiereArea(nivel);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: { xs: 2, md: 4 } }}>
      <Paper
        elevation={0}
        sx={{
          border: '1px solid rgba(0,255,153,0.18)',
          borderRadius: 3,
          bgcolor: 'rgba(0,0,0,0.22)',
          color: 'white',
          p: { xs: 2.5, md: 4 },
          width: '100%',
          maxWidth: 760,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <AddTaskIcon sx={{ color: amarilloCiudadan }} />
          <Typography variant="h5" fontWeight={800}>
            Agregar tarea
          </Typography>
        </Stack>
        <Typography sx={{ color: '#cfcfcf', mb: 3 }}>
          Publica una tarea para la red CoWork. Con nivel «Especialidad» deberás elegir el área y
          la especialidad (habilidad) a la que pertenece.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={submit}>
          {/* ---------------- IDENTIFICACIÓN ---------------- */}
          <Section title="Identificación">
            <TextField
              label="Título"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              fullWidth
              required
              sx={fieldSx}
            />
            <TextField
              label="Descripción"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              multiline
              minRows={3}
              fullWidth
              sx={fieldSx}
            />
          </Section>

          {/* ---------------- CLASIFICACIÓN ---------------- */}
          <Section title="Clasificación">
            <Fila>
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel>Tipo</InputLabel>
                <Select value={tipo} label="Tipo" onChange={(e) => setTipo(e.target.value)}>
                  <MenuItem value="tarea">Tarea</MenuItem>
                  <MenuItem value="subtarea">Subtarea</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel>Ámbito</InputLabel>
                <Select value={ambito} label="Ámbito" onChange={(e) => setAmbito(e.target.value)}>
                  <MenuItem value="privada">Privada</MenuItem>
                  <MenuItem value="plataforma">Plataforma</MenuItem>
                </Select>
              </FormControl>
            </Fila>

            <Fila>
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel>Nivel</InputLabel>
                <Select
                  value={nivel}
                  label="Nivel"
                  onChange={(e) => cambiarNivel(e.target.value)}
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="becario">Becario</MenuItem>
                  <MenuItem value="especialidad">Especialidad</MenuItem>
                  <MenuItem value="experto">Experto</MenuItem>
                  <MenuItem value="personalizada">Personalizada</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={fieldSx}>
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
            </Fila>

            {/* Nivel especialidad → DOS selects: área y especialidad (skill).
                Niveles especializados sin skill (experto/personalizada) → sólo
                área. General/becario → nada (no la requieren). */}
            {mostrarArea && (
              <FormControl
                fullWidth
                disabled={loadingAreas || opcionesArea.length === 0}
                error={!loadingAreas && opcionesArea.length === 0}
                sx={fieldSx}
              >
                <InputLabel>{loadingAreas ? 'Cargando áreas…' : 'Área'}</InputLabel>
                <Select
                  value={areaSeleccionada || ''}
                  label="Área"
                  onChange={(e) => cambiarArea(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Elige el área</em>
                  </MenuItem>
                  {opcionesArea.map((a) => (
                    <MenuItem key={areaIdOf(a)} value={areaIdOf(a)}>
                      {areaPath(a, areas)}
                    </MenuItem>
                  ))}
                </Select>
                {!loadingAreas && opcionesArea.length === 0 && (
                  <Typography variant="caption" sx={{ color: '#ff8f8f', mt: 0.75 }}>
                    No hay áreas disponibles para este nivel.
                  </Typography>
                )}
              </FormControl>
            )}

            {mostrarEspecialidad && (
              <FormControl
                fullWidth
                disabled={loadingSkills || !areaSeleccionada}
                error={
                  Boolean(areaSeleccionada) && !loadingSkills && opcionesEspecialidad.length === 0
                }
                sx={fieldSx}
              >
                <InputLabel>
                  {loadingSkills
                    ? 'Cargando especialidades…'
                    : !areaSeleccionada
                      ? 'Elige primero el área'
                      : 'Especialidad'}
                </InputLabel>
                <Select
                  value={skillSeleccionado || ''}
                  label="Especialidad"
                  onChange={(e) => setSkillSeleccionado(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Elige la especialidad</em>
                  </MenuItem>
                  {opcionesEspecialidad.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {getAttr(s).name}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" sx={{ color: '#cfcfcf', mt: 0.75 }}>
                  {areaSeleccionada && opcionesEspecialidad.length === 0 && !loadingSkills
                    ? 'Este área no tiene especialidades activas. Créalas en «Gestión de habilidades».'
                    : 'Sólo aparecen las especialidades activas de esta área.'}
                </Typography>
              </FormControl>
            )}
          </Section>

          {/* ---------------- RECOMPENSA ---------------- */}
          <Section title="Recompensa">
            <Box>
              <Typography variant="body2" sx={{ color: '#e6ffe6' }} gutterBottom>
                Minutos de desarrollo: <strong>{minutos}</strong>
              </Typography>
              <Slider
                min={0}
                max={240}
                value={Number(minutos)}
                onChange={(e, v) => setMinutos(v)}
                sx={{ color: neonGreen, '& .MuiSlider-thumb': { borderColor: neonGreen } }}
              />
            </Box>
            <Fila>
              <TextField
                label="Pago Laborys"
                type="number"
                value={laborys}
                onChange={(e) => setLaborys(e.target.value)}
                fullWidth
                sx={fieldSx}
              />
              <TextField
                label="Pago efectivo"
                type="number"
                value={efectivo}
                onChange={(e) => setEfectivo(e.target.value)}
                fullWidth
                sx={fieldSx}
              />
            </Fila>
          </Section>

          {/* ---------------- FECHAS Y ASIGNACIÓN ---------------- */}
          <Section title="Fechas y asignación">
            <FormControlLabel
              control={
                <Checkbox
                  checked={vence}
                  onChange={() => setVence(!vence)}
                  sx={{ color: 'rgba(255,255,255,0.6)', '&.Mui-checked': { color: neonGreen } }}
                />
              }
              label="Tiene fecha de entrega"
              sx={{ color: '#e6ffe6' }}
            />

            {vence && (
              <TextField
                type="date"
                label="Fecha de entrega"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                sx={fieldSx}
              />
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={asignable}
                  onChange={() => setAsignable(!asignable)}
                  sx={{ color: 'rgba(255,255,255,0.6)', '&.Mui-checked': { color: neonGreen } }}
                />
              }
              label="¿Es asignable? (se podrá asignar a usuarios específicos)"
              sx={{ color: '#e6ffe6' }}
            />
          </Section>

          <Button
            type="submit"
            variant="contained"
            disabled={creando}
            startIcon={creando ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              mt: 3,
              width: '100%',
              bgcolor: amarilloCiudadan,
              color: '#1a1a1a',
              fontWeight: 800,
              py: 1.4,
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': { bgcolor: '#ffe04a' },
              '&.Mui-disabled': { bgcolor: 'rgba(245,196,0,0.45)', color: '#1a1a1a' },
            }}
          >
            {creando ? 'Creando…' : 'Crear tarea'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
