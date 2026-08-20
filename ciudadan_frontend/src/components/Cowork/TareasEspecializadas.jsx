import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddLinkIcon from '@mui/icons-material/AddLink';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { styled } from '@mui/material/styles';
import { useAuth0 } from '@auth0/auth0-react';
import { TareaCard } from './Tareas.jsx';
import { useRoles } from '../../Contexts/RolesContext.jsx';
import { useRecurrenciaValidation } from '../../hooks/useRecurrenciaValidation.jsx';
import {
  assignUserAreas,
  completarTarea,
  proposeSubarea,
  resolverTarea,
  subirDocumentoArea,
  subirEvidencia,
} from '../../services/cowork/mutationsServices.js';
import {
  getAvailableRootAreas,
  getSpecializedTodos,
  getUserAreas,
} from '../../services/cowork/queryServices.js';
import {
  buildAreaHierarchy,
  getActiveRootAreas,
  normalizeTask,
} from '../../utils/cowork.helpers.js';

const neonGreen = '#00ff99';
const amarilloCiudadan = '#f5c400';
const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

// Mismos límites que el resto del módulo (subir-evidencia.js / Perfil.jsx).
const ALLOWED_MIMES_DECLARAR = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE_DECLARAR = 5 * 1024 * 1024;

// Límites para el diálogo de "Resolver y entregar" — mismos que Tareas.jsx /
// Coowork.jsx (evidencia de la resolución, no documentos de área).
const ALLOWED_MIMES_RESOLVER = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4', 'audio/mpeg',
];
const MAX_FILE_SIZE_RESOLVER = 10 * 1024 * 1024;
const MAX_ARCHIVOS_RESOLVER = 10;

const AreaTabs = styled((props) => (
  <Tabs
    {...props}
    slotProps={{ indicator: { children: <span className="MuiTabs-indicatorSpan" /> } }}
  />
))({
  '& .MuiTabs-indicator': {
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    height: 3,
  },
  '& .MuiTabs-indicatorSpan': {
    width: '70%',
    backgroundColor: neonGreen,
    borderRadius: 2,
    boxShadow: `0 0 10px ${neonGreen}`,
  },
});

const AreaTab = styled(Tab)(({ theme }) => ({
  color: '#d6d6d6',
  fontWeight: 700,
  textTransform: 'none',
  minHeight: 48,
  padding: theme.spacing(1, 2),
  '&.Mui-selected': {
    color: neonGreen,
  },
  '&:hover': {
    color: neonGreen,
  },
}));

export const EmptyState = ({ children, actions }) => (
  <Paper
    elevation={0}
    sx={{
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 3,
      bgcolor: 'rgba(255,255,255,0.04)',
      color: '#d6d6d6',
      p: { xs: 3, md: 4 },
      textAlign: 'center',
    }}
  >
    <Stack spacing={2} alignItems="center">
      <Typography>{children}</Typography>
      {actions}
    </Stack>
  </Paper>
);

// Reemplaza al viejo "Asignar áreas" (selección múltiple + asignación
// instantánea, sin documentos ni aprobación — justo lo que se pidió quitar:
// "eso de asignar áreas no va ahí"). Ahora es una auto-declaración de UNA
// sola área con experiencia + comprobantes, que queda pendiente de
// aprobación (mismo criterio que "aprobar socio": aquí es "aprobar
// habilidades", vía la cola de VerificarUsuarios.jsx).
const DeclararAreaForm = ({
  areas,
  areaId,
  onChangeArea,
  experiencia,
  onChangeExperiencia,
  archivos,
  onChangeArchivos,
  onQuitarArchivo,
  onSubmit,
  loading,
  loadingAreas,
  error,
  success,
  // Props de "escribirla si no existe" (Fix 5.3):
  userId,
  onProposeSubarea,
  proposingSubarea,
  proposedError,
  proposedSuccess,
}) => (
  <Paper
    elevation={0}
    sx={{
      border: '1px solid rgba(0,255,153,0.18)',
      borderRadius: 3,
      bgcolor: 'rgba(0,0,0,0.22)',
      color: 'white',
      p: { xs: 2.5, md: 3 },
      mt: 3,
    }}
  >
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6" fontWeight={800}>
          ¿Cuál de estas áreas tienes?
        </Typography>
        <Typography sx={{ color: '#cfcfcf', mt: 0.5 }}>
          Elige tu área, cuéntanos tu experiencia y sube tus comprobantes. Un socio de esa área
          (o un admin) revisará tu solicitud.
        </Typography>
      </Box>

      {success && <Alert severity="success">{success}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {loadingAreas ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={28} sx={{ color: amarilloCiudadan }} />
        </Box>
      ) : (
        <FormControl fullWidth disabled={loading || areas.length === 0}>
          <InputLabel sx={{ color: '#d6d6d6' }}>Área</InputLabel>
          <Select
            value={areaId}
            label="Área"
            onChange={(event) => onChangeArea(event.target.value)}
            sx={{
              color: 'white',
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: neonGreen },
              '.MuiSvgIcon-root': { color: 'white' },
            }}
          >
            {areas.map((area) => (
              <MenuItem key={area.id} value={area.id}>
                {area.name || area.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <TextField
        label="Tu experiencia y certificaciones"
        placeholder="Cuéntanos brevemente tu experiencia en esta área..."
        value={experiencia}
        onChange={(e) => onChangeExperiencia(e.target.value)}
        multiline
        minRows={3}
        fullWidth
        disabled={loading}
        InputLabelProps={{ sx: { color: '#d6d6d6' } }}
        sx={{
          '.MuiOutlinedInput-root': { color: 'white' },
          '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
        }}
      />

      <Box>
        <Button
          variant="outlined"
          component="label"
          startIcon={<AttachFileIcon />}
          disabled={loading}
          sx={{ borderColor: neonGreen, color: neonGreen }}
        >
          Subir comprobantes
          <input type="file" multiple hidden onChange={onChangeArchivos} />
        </Button>
        {archivos.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5, rowGap: 1 }}>
            {archivos.map((f, idx) => (
              <Chip key={`${f.name}-${idx}`} label={f.name} onDelete={() => onQuitarArchivo(idx)} size="small" />
            ))}
          </Stack>
        )}
      </Box>

      <Button
        variant="contained"
        disabled={loading || loadingAreas || !areaId || archivos.length === 0}
        onClick={onSubmit}
        sx={{
          alignSelf: { xs: 'stretch', sm: 'flex-start' },
          bgcolor: amarilloCiudadan,
          color: '#1a1a1a',
          fontWeight: 800,
          '&:hover': { bgcolor: '#ffe04a' },
        }}
      >
        {loading ? 'Enviando...' : 'Enviar para aprobación'}
      </Button>

      {/* Spec 5.3 — "escribirla si no existe": si la carrera/oficio del usuario
          no está en la lista fija de áreas raíz, puede proponerla como subárea
          para que un socio la revise. No crea el área inmediatamente: queda
          registrada en user.area_details.proposed_subareas[] con estado
          'pending' hasta aprobación. */}
      <Box
        sx={{
          mt: 1,
          p: 2,
          border: '1px dashed rgba(0,255,153,0.25)',
          borderRadius: 2,
          bgcolor: 'rgba(0,255,153,0.04)',
        }}
      >
        <Typography variant="subtitle2" sx={{ color: neonGreen, mb: 1 }}>
          ¿No encuentras tu carrera o especialidad?
        </Typography>
        <Typography variant="caption" sx={{ color: '#cfcfcf', display: 'block', mb: 1.5 }}>
          Escríbela y el equipo la revisará para crearla como subárea dentro del área que elijas.
        </Typography>
        <ProposeSubareaForm
          areas={areas}
          userId={userId}
          onSubmit={onProposeSubarea}
          submitting={proposingSubarea}
          submitError={proposedError}
          successMessage={proposedSuccess}
        />
      </Box>
    </Stack>
  </Paper>
);

// Sub-forma controlada para proponer una subárea nueva.
const ProposeSubareaForm = ({ areas, userId, onSubmit, submitting, submitError, successMessage }) => {
  const [areaId, setAreaId] = useState('');
  const [nombre, setNombre] = useState('');
  const [obs, setObs] = useState('');
  const [localError, setLocalError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError(null);
    if (!userId) {
      setLocalError('Debes iniciar sesión para proponer una subárea.');
      return;
    }
    if (!areaId) {
      setLocalError('Selecciona el área raíz bajo la cual proponer.');
      return;
    }
    if (!nombre.trim()) {
      setLocalError('Escribe el nombre de la carrera o especialidad.');
      return;
    }
    onSubmit({ areaId: Number(areaId), nombre: nombre.trim(), observaciones: obs });
    setNombre('');
    setObs('');
  };

  return (
    <Stack spacing={1.5} component="form" onSubmit={handleSubmit}>
      <FormControl fullWidth size="small">
        <InputLabel sx={{ color: '#d6d6d6' }}>Área raíz</InputLabel>
        <Select
          value={areaId}
          label="Área raíz"
          onChange={(e) => setAreaId(e.target.value)}
          input={<OutlinedInput label="Área raíz" />}
          sx={{
            color: 'white',
            '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
            '.MuiSvgIcon-root': { color: 'white' },
          }}
        >
          {areas.map((area) => (
            <MenuItem key={area.id} value={area.id}>
              {area.name || area.nombre}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        size="small"
        label="Nombre de la carrera / especialidad"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        inputProps={{ maxLength: 200 }}
        sx={{
          input: { color: 'white' },
          label: { color: '#d6d6d6' },
          '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: neonGreen },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: neonGreen },
        }}
      />
      <TextField
        size="small"
        label="Observaciones (opcional)"
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        inputProps={{ maxLength: 500 }}
        sx={{
          input: { color: 'white' },
          label: { color: '#d6d6d6' },
          '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: neonGreen },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: neonGreen },
        }}
      />
      {localError && <Alert severity="error" sx={{ py: 0.5 }}>{localError}</Alert>}
      {submitError && <Alert severity="error" sx={{ py: 0.5 }}>{submitError}</Alert>}
      {successMessage && <Alert severity="success" sx={{ py: 0.5 }}>{successMessage}</Alert>}
      <Button
        type="submit"
        variant="outlined"
        disabled={submitting}
        sx={{
          alignSelf: 'flex-start',
          borderColor: neonGreen,
          color: neonGreen,
          textTransform: 'none',
          '&:hover': { bgcolor: 'rgba(0,255,153,0.08)', borderColor: neonGreen },
        }}
      >
        {submitting ? 'Enviando propuesta...' : 'Proponer subárea'}
      </Button>
    </Stack>
  );
};

const TaskGrid = ({ tasks, renderActions }) => (
  <Stack spacing={{ xs: 2, md: 3 }}>
    {tasks.map((task) => (
      <Box key={task.id}>
        <TareaCard tarea={task} actions={renderActions?.(task)} />
      </Box>
    ))}
  </Stack>
);

const SubareaAccordion = ({
  subarea,
  defaultExpanded,
  handleResolve,
  resolvingId,
  canUserTakeTask,
  userId,
}) => (
  <Accordion
    defaultExpanded={defaultExpanded}
    disableGutters
    elevation={0}
    sx={{
      border: '1px solid rgba(0,255,153,0.22)',
      borderRadius: '14px !important',
      bgcolor: 'rgba(0, 255, 153, 0.055)',
      color: 'white',
      overflow: 'hidden',
      '&:before': { display: 'none' },
      // '&.Mui-expanded': {
      //   my: 1.5,
      // },
    }}
  >
    <AccordionSummary
      expandIcon={<ExpandMoreIcon sx={{ color: neonGreen }} />}
      sx={{
        minHeight: 64,
        px: { xs: 2, md: 3 },
        '& .MuiAccordionSummary-content': {
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          my: 1.5,
        },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0}>
        <AccountTreeIcon sx={{ color: neonGreen, fontSize: 20, flexShrink: 0 }} />
        <Box minWidth={0}>
          <Typography fontWeight={800} noWrap>
            {subarea.name || subarea.nombre}
          </Typography>
          <Typography variant="caption" sx={{ color: '#bcebd8' }}>
            Subárea
          </Typography>
        </Box>
      </Stack>
      <Chip
        size="small"
        label={`${subarea.tasks.length} tareas`}
        sx={{
          bgcolor: 'rgba(0,255,153,0.12)',
          border: '1px solid rgba(0,255,153,0.35)',
          color: neonGreen,
          fontWeight: 700,
          flexShrink: 0,
        }}
      />
    </AccordionSummary>
    <AccordionDetails
      sx={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        px: { xs: 2, md: 3 },
        py: { xs: 2, md: 3 },
        bgcolor: 'rgba(0,0,0,0.18)',
      }}
    >
      <TaskGrid
        tasks={subarea.tasks}
        renderActions={(task) =>
          task.status === 'publicada' && canUserTakeTask(task, userId) ? (
            <Button
              variant="contained"
              size="small"
              disabled={resolvingId === task.id}
              onClick={() => handleResolve(task)}
              sx={{
                bgcolor: '#00ff99',
                color: '#002200',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { bgcolor: '#00e68a' },
                '&.Mui-disabled': { bgcolor: 'rgba(0,255,153,0.3)', color: '#004d33' },
              }}
            >
              {resolvingId === task.id ? 'Asignando...' : 'Resolver tarea'}
            </Button>
          ) : null
        }
      />
    </AccordionDetails>
  </Accordion>
);

const TareasEspecializadas = () => {
  const [areas, setAreas] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [availableAreas, setAvailableAreas] = useState([]);
  const [areaTab, setAreaTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingAvailableAreas, setLoadingAvailableAreas] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Auto-declaración de área (reemplaza el viejo "asignar áreas" múltiple e
  // instantáneo): una sola área + experiencia + comprobantes, mandado a
  // aprobación. Ver DeclararAreaForm más arriba.
  const [declararAreaId, setDeclararAreaId] = useState('');
  const [declararExperiencia, setDeclararExperiencia] = useState('');
  const [declararArchivos, setDeclararArchivos] = useState([]);
  const [declarando, setDeclarando] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [declararSuccess, setDeclararSuccess] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const { userData } = useRoles();
  const userId = userData?.id;
  const { canUserTakeTask } = useRecurrenciaValidation(userData);

  const fetchAvailableAreas = useCallback(async () => {
    try {
      setLoadingAvailableAreas(true);
      let token = null;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: { audience: 'https://api.ciudadan.org', scope: 'openid profile email offline_access' },
        });
      } catch { /* token optional for public routes */ }
      const json = await getAvailableRootAreas(token);
      setAvailableAreas(getActiveRootAreas(json.data));
    } catch (err) {
      console.error('Error cargando áreas disponibles:', err);
      setError('No se pudieron cargar las áreas disponibles');
    } finally {
      setLoadingAvailableAreas(false);
    }
  }, [getAccessTokenSilently]);

  const fetchSpecializedTasks = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      let token = null;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: { audience: 'https://api.ciudadan.org', scope: 'openid profile email offline_access' },
        });
      } catch { /* token optional for public routes */ }

      const userJson = await getUserAreas(userId, token);
      const userAreas = getActiveRootAreas(userJson?.areas || []);

      setAreas(userAreas);
      setAreaTab(0);

      // Antes: si el usuario no tenía áreas verificadas, ni siquiera se
      // pedían las tareas — eso también ocultaba las de nivel `becario`,
      // que el PDF dice que se agrupan como especializadas en la UI pero
      // (por decisión del usuario) NO requieren área/habilidad verificada,
      // igual que las generales. Ahora siempre se piden las tareas; si no
      // tiene áreas, simplemente no habrá tareas de área para mostrar, pero
      // las de becario sí deben verse.
      const todosJson = await getSpecializedTodos(token);
      setTasks((todosJson.data || []).map(normalizeTask));

      if (userAreas.length === 0) {
        await fetchAvailableAreas();
      }
    } catch (err) {
      console.error('Error cargando tareas especializadas:', err);
      setError('No se pudieron cargar las tareas especializadas');
      setAreas([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [fetchAvailableAreas, getAccessTokenSilently, userId]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setLoading(false);
      setError(null);
      setAssignError(null);
      setSuccess(null);
      setAreas([]);
      setTasks([]);
      return;
    }

    if (!userId) {
      setLoading(true);
      return;
    }

    fetchSpecializedTasks();
  }, [authLoading, fetchSpecializedTasks, isAuthenticated, userId]);

  const handleLogin = () => {
    loginWithRedirect({
      appState: {
        returnTo: window.location.pathname + window.location.search,
      },
    });
  };

  const handleDeclararArchivosChange = (e) => {
    const nuevos = Array.from(e.target.files || []);
    setAssignError(null);
    for (const f of nuevos) {
      if (!ALLOWED_MIMES_DECLARAR.includes(f.type)) {
        setAssignError(`"${f.name}": solo se aceptan JPG, PNG o PDF.`);
        return;
      }
      if (f.size > MAX_FILE_SIZE_DECLARAR) {
        setAssignError(`"${f.name}": excede el máximo de 5MB.`);
        return;
      }
    }
    setDeclararArchivos((prev) => [...prev, ...nuevos]);
    e.target.value = '';
  };

  const handleQuitarDeclararArchivo = (idx) => {
    setDeclararArchivos((prev) => prev.filter((_, i) => i !== idx));
  };

  // Auto-declaración de área: sube cada comprobante a la Media Library de
  // Strapi, asocia la relación de área al usuario, y registra documentos +
  // experiencia en area_details (status 'pending' por defecto) para que
  // quede en la cola de aprobación de VerificarUsuarios.jsx — reemplaza el
  // viejo "asignar áreas" instantáneo sin revisión.
  const handleDeclararArea = async () => {
    if (!userId || !declararAreaId || declararArchivos.length === 0) return;

    try {
      setDeclarando(true);
      setError(null);
      setAssignError(null);
      setDeclararSuccess(null);

      let token = null;
      try {
        token = await getAccessTokenSilently({
          authorizationParams: { audience: 'https://api.ciudadan.org', scope: 'openid profile email offline_access' },
        });
      } catch { /* token optional */ }

      const actuales = (userData?.areas || []).map((a) => (typeof a === 'object' ? a.id : Number(a)));
      const nuevosIds = Array.from(new Set([...actuales, Number(declararAreaId)]));
      await assignUserAreas(userId, nuevosIds, token);

      for (const file of declararArchivos) {
        const formData = new FormData();
        formData.append('files', file);
        formData.append('ref', 'plugin::users-permissions.user');
        formData.append('refId', userId);
        formData.append('field', 'documentos');
        const res = await fetch(`${STRAPI_URL}/api/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) throw new Error(`No se pudo subir "${file.name}" (${res.status})`);
        const uploaded = await res.json();
        const f = Array.isArray(uploaded) ? uploaded[0] : uploaded;
        await subirDocumentoArea(
          userId,
          declararAreaId,
          { nombre: f?.name || file.name, url: f?.url || '', size: file.size, tipo: file.type },
          token,
          declararExperiencia
        );
      }

      setDeclararSuccess('Tu solicitud fue enviada. Un socio de esa área (o un admin) la revisará.');
      setDeclararAreaId('');
      setDeclararExperiencia('');
      setDeclararArchivos([]);
      await fetchSpecializedTasks();
    } catch (err) {
      console.error('Error declarando área:', err);
      setAssignError(err.message || 'No se pudo enviar tu solicitud');
    } finally {
      setDeclarando(false);
    }
  };

  // Spec 5.3 — "escribirla si no existe": el usuario propone una subárea
  // (carrera/oficio) nueva que no encuentra en la lista de áreas. La
  // propuesta se guarda en user.area_details.proposed_subareas[] para
  // revisión de socio/verificador. Backend: POST /users/:id/proponer-subarea.
  const [proposingSubarea, setProposingSubarea] = useState(false);
  const [proposedError, setProposedError] = useState(null);
  const [proposedSuccess, setProposedSuccess] = useState(null);

  const handleProposeSubarea = useCallback(
    async ({ areaId, nombre, observaciones }) => {
      if (!userId) {
        setProposedError('Debes iniciar sesión para proponer una subárea.');
        return;
      }
      try {
        setProposingSubarea(true);
        setProposedError(null);
        setProposedSuccess(null);

        let token = null;
        try {
          token = await getAccessTokenSilently({
            authorizationParams: { audience: 'https://api.ciudadan.org', scope: 'openid profile email offline_access' },
          });
        } catch { /* token optional */ }

        await proposeSubarea(userId, areaId, nombre, observaciones, token);
        setProposedSuccess(`Propuesta "${nombre}" enviada. Un socio la revisará y la creará si corresponde.`);
      } catch (err) {
        console.error('Error proponiendo subárea:', err);
        setProposedError(
          err?.message || 'No se pudo enviar la propuesta. Intenta de nuevo más tarde.'
        );
      } finally {
        setProposingSubarea(false);
      }
    },
    [userId, getAccessTokenSilently]
  );

  // Resolver ya no es "un clic y ya" — spec: "resolver tarea debe de traer
  // para rellenar todo para resolverla, no debe de darse por resuelta en
  // automático, eso no tiene sentido". Igual que en Coowork.jsx (Tareas
  // Generales), pide notas/enlaces/archivos y hace resolver + entregar en
  // una sola acción.
  const [resolverDialog, setResolverDialog] = useState({ open: false, todo: null, notes: '', enlaces: [''] });
  const [archivosResolver, setArchivosResolver] = useState([]);
  const [resolverDialogError, setResolverDialogError] = useState(null);

  const abrirResolverDialog = useCallback(
    (todo) => {
      if (!userId) return;
      if (!canUserTakeTask(todo, userId)) {
        setError('Esta tarea ya no está disponible para ser asignada.');
        return;
      }
      setResolverDialogError(null);
      setResolverDialog({ open: true, todo, notes: '', enlaces: [''] });
      setArchivosResolver([]);
    },
    [userId, canUserTakeTask]
  );

  const cerrarResolverDialog = () => {
    if (resolvingId) return;
    setResolverDialog({ open: false, todo: null, notes: '', enlaces: [''] });
    setArchivosResolver([]);
    setResolverDialogError(null);
  };

  const cambiarEnlaceResolver = (idx, value) => {
    setResolverDialog((p) => ({ ...p, enlaces: p.enlaces.map((e, i) => (i === idx ? value : e)) }));
  };
  const agregarEnlaceResolver = () => {
    setResolverDialog((p) => ({ ...p, enlaces: [...p.enlaces, ''] }));
  };
  const quitarEnlaceResolver = (idx) => {
    setResolverDialog((p) => ({ ...p, enlaces: p.enlaces.filter((_, i) => i !== idx) }));
  };

  const handleArchivosResolverChange = (e) => {
    const nuevos = Array.from(e.target.files || []);
    setResolverDialogError(null);
    for (const f of nuevos) {
      if (!ALLOWED_MIMES_RESOLVER.includes(f.type)) {
        setResolverDialogError(`"${f.name}": tipo de archivo no permitido.`);
        return;
      }
      if (f.size > MAX_FILE_SIZE_RESOLVER) {
        setResolverDialogError(`"${f.name}": excede el máximo de 10MB.`);
        return;
      }
    }
    setArchivosResolver((prev) => {
      const combinado = [...prev, ...nuevos];
      if (combinado.length > MAX_ARCHIVOS_RESOLVER) {
        setResolverDialogError(`No se pueden adjuntar más de ${MAX_ARCHIVOS_RESOLVER} archivos.`);
        return prev;
      }
      return combinado;
    });
    e.target.value = '';
  };
  const quitarArchivoResolver = (idx) => {
    setArchivosResolver((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitResolverConEvidencia = useCallback(
    async () => {
      const todo = resolverDialog.todo;
      if (!todo) return;

      setResolvingId(todo.id);
      setResolverDialogError(null);
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: 'https://api.ciudadan.org',
            scope: 'openid profile email offline_access',
          },
        });

        const resolverRes = await resolverTarea(todo.id, token);
        const tareaId = resolverRes?.data?.id;
        if (!tareaId) throw new Error('No se pudo obtener el id de la tarea recién creada');

        if (archivosResolver.length > 0) {
          await subirEvidencia(tareaId, archivosResolver, resolverDialog.notes, token);
        }

        const enlacesLimpios = resolverDialog.enlaces.map((e) => e.trim()).filter(Boolean);
        await completarTarea(tareaId, token, { notes: resolverDialog.notes, enlaces: enlacesLimpios });

        setTasks((prev) => prev.filter((t) => t.id !== todo.id));
        setSuccess(`Tarea "${todo.titulo}" resuelta y entregada correctamente.`);
        setResolverDialog({ open: false, todo: null, notes: '', enlaces: [''] });
        setArchivosResolver([]);
      } catch (err) {
        console.error('Error resolviendo tarea:', err);
        setResolverDialogError(err.message || 'No se pudo resolver la tarea');
      } finally {
        setResolvingId(null);
      }
    },
    [resolverDialog, archivosResolver, getAccessTokenSilently]
  );

  const hierarchy = useMemo(() => buildAreaHierarchy(areas, tasks), [areas, tasks]);
  const selectedArea = hierarchy[areaTab];

  // Tareas nivel `becario`: el PDF las agrupa como "especializadas" en la
  // UI, pero no requieren área verificada — no encajan en buildAreaHierarchy
  // (que agrupa por área) porque normalmente no tienen `areas` asignadas.
  // Se muestran aparte, siempre, sin depender de que el usuario tenga áreas.
  const becarioTasks = useMemo(() => tasks.filter((t) => t.nivel === 'becario'), [tasks]);

  useEffect(() => {
    if (areaTab >= hierarchy.length) setAreaTab(0);
  }, [areaTab, hierarchy.length]);

  if (authLoading || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: amarilloCiudadan }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        actions={
          <Button
            variant="contained"
            onClick={handleLogin}
            sx={{
              bgcolor: amarilloCiudadan,
              color: '#1a1a1a',
              fontWeight: 800,
              '&:hover': { bgcolor: '#ffe04a' },
            }}
          >
            Iniciar Sesión
          </Button>
        }
      >
        Para ver tareas especializadas debes iniciar sesión.
      </EmptyState>
    );
  }

  if (error) {
    return <EmptyState>{error}</EmptyState>;
  }

  const seccionBecario = becarioTasks.length > 0 && (
    <Stack spacing={1.75} sx={{ mb: 4 }}>
      <Box>
        <Typography variant="h5" fontWeight={800} color="white">
          Becario
        </Typography>
        <Typography sx={{ color: '#cfcfcf', mt: 0.5 }}>
          Tareas de nivel becario — no requieren área ni habilidad verificada, cualquier usuario
          registrado las puede resolver.
        </Typography>
      </Box>
      <TaskGrid
        tasks={becarioTasks}
        renderActions={(task) =>
          task.status === 'publicada' && canUserTakeTask(task, userId) ? (
            <Button
              variant="contained"
              size="small"
              disabled={resolvingId === task.id}
              onClick={() => abrirResolverDialog(task)}
              sx={{
                bgcolor: '#00ff99',
                color: '#002200',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { bgcolor: '#00e68a' },
                '&.Mui-disabled': { bgcolor: 'rgba(0,255,153,0.3)', color: '#004d33' },
              }}
            >
              {resolvingId === task.id ? 'Asignando...' : 'Resolver tarea'}
            </Button>
          ) : null
        }
      />
    </Stack>
  );

  if (hierarchy.length === 0) {
    return (
      <Box sx={{ mt: 3 }}>
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        {seccionBecario}
        <EmptyState>Aún no tienes áreas asignadas para ver tareas especializadas.</EmptyState>
        <DeclararAreaForm
          areas={availableAreas}
          areaId={declararAreaId}
          onChangeArea={setDeclararAreaId}
          experiencia={declararExperiencia}
          onChangeExperiencia={setDeclararExperiencia}
          archivos={declararArchivos}
          onChangeArchivos={handleDeclararArchivosChange}
          onQuitarArchivo={handleQuitarDeclararArchivo}
          onSubmit={handleDeclararArea}
          loading={declarando}
          loadingAreas={loadingAvailableAreas}
          error={assignError}
          success={declararSuccess}
          userId={userId}
          onProposeSubarea={handleProposeSubarea}
          proposingSubarea={proposingSubarea}
          proposedError={proposedError}
          proposedSuccess={proposedSuccess}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      {seccionBecario}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid rgba(0,255,153,0.18)',
          borderRadius: 3,
          bgcolor: 'rgba(0,0,0,0.22)',
          mb: 4,
          width: { xs: '100%', md: 'min(1020px, calc(100vw - 64px))' },
          maxWidth: '100vw',
          mx: { xs: 0, md: '50%' },
          transform: { xs: 'none', md: 'translateX(-50%)' },
          overflow: 'hidden',
        }}
      >
        <AreaTabs
          value={areaTab}
          onChange={(event, newValue) => setAreaTab(newValue)}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          allowScrollButtonsMobile
          centered={!isMobile}
        >
          {hierarchy.map((area) => (
            <AreaTab
              key={area.id}
              icon={<AccountTreeIcon />}
              iconPosition="start"
              label={`${area.name || area.nombre} (${area.totalTasks})`}
            />
          ))}
        </AreaTabs>
      </Paper>

      {selectedArea && (
        <Stack spacing={3}>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <PrecisionManufacturingIcon sx={{ color: amarilloCiudadan }} />
              <Typography variant="h5" fontWeight={800} color="white">
                {selectedArea.name || selectedArea.nombre}
              </Typography>
              <Chip
                size="small"
                label={`${selectedArea.totalTasks} tareas`}
                sx={{
                  bgcolor: 'rgba(245,196,0,0.14)',
                  color: amarilloCiudadan,
                  border: `1px solid ${amarilloCiudadan}`,
                  fontWeight: 700,
                }}
              />
            </Stack>
            <Typography sx={{ color: '#cfcfcf', mt: 1 }}>
              Tareas agrupadas según las subáreas asociadas en Strapi.
            </Typography>
          </Box>

          {selectedArea.totalTasks === 0 && (
            <EmptyState>No hay tareas asociadas a esta área principal.</EmptyState>
          )}

          {selectedArea.directTasks.length > 0 && (
            <Stack spacing={1.75}>
              {selectedArea.subareas.length > 0 && (
                <Box>
                  <Typography variant="overline" sx={{ color: amarilloCiudadan, fontWeight: 800 }}>
                    Tareas directas del área
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#d8d8d8' }}>
                    Estas tareas pertenecen a {selectedArea.name || selectedArea.nombre} y no están dentro de una
                    subárea.
                  </Typography>
                </Box>
              )}
              <TaskGrid
                tasks={selectedArea.directTasks}
                renderActions={(task) =>
                  task.status === 'publicada' && canUserTakeTask(task, userId) ? (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={resolvingId === task.id}
                      onClick={() => abrirResolverDialog(task)}
                      sx={{
                        bgcolor: '#00ff99',
                        color: '#002200',
                        fontWeight: 700,
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#00e68a' },
                        '&.Mui-disabled': { bgcolor: 'rgba(0,255,153,0.3)', color: '#004d33' },
                      }}
                    >
                      {resolvingId === task.id ? 'Asignando...' : 'Resolver tarea'}
                    </Button>
                  ) : null
                }
              />
            </Stack>
          )}

          {selectedArea.subareas.map((subarea) => (
            <SubareaAccordion
              key={subarea.id}
              subarea={subarea}
              defaultExpanded={selectedArea.subareas.length === 1}
              handleResolve={abrirResolverDialog}
              resolvingId={resolvingId}
              canUserTakeTask={canUserTakeTask}
              userId={userId}
            />
          ))}
        </Stack>
      )}

      <Dialog open={resolverDialog.open} onClose={cerrarResolverDialog} fullWidth maxWidth="sm">
        <DialogTitle>Resolver: {resolverDialog.todo?.titulo}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {resolverDialogError && (
              <Alert severity="error" onClose={() => setResolverDialogError(null)}>
                {resolverDialogError}
              </Alert>
            )}

            <TextField
              label="Notas (opcional)"
              placeholder="Describe lo que hiciste, comentarios para quien la revise..."
              value={resolverDialog.notes}
              onChange={(e) => setResolverDialog((p) => ({ ...p, notes: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Enlaces (opcional)
              </Typography>
              <Stack spacing={1}>
                {resolverDialog.enlaces.map((enlace, idx) => (
                  <Stack key={idx} direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="https://..."
                      value={enlace}
                      onChange={(e) => cambiarEnlaceResolver(idx, e.target.value)}
                    />
                    <IconButton
                      size="small"
                      onClick={() => quitarEnlaceResolver(idx)}
                      disabled={resolverDialog.enlaces.length === 1 && !enlace}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Button size="small" startIcon={<AddLinkIcon />} onClick={agregarEnlaceResolver} sx={{ mt: 1 }}>
                Agregar enlace
              </Button>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Archivos (opcional) — imágenes, PDF, Word, Excel, video, audio (máx. 10MB c/u)
              </Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
                disabled={archivosResolver.length >= MAX_ARCHIVOS_RESOLVER}
              >
                Elegir archivos
                <input type="file" multiple hidden onChange={handleArchivosResolverChange} />
              </Button>
              {archivosResolver.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5, rowGap: 1 }}>
                  {archivosResolver.map((f, idx) => (
                    <Chip key={`${f.name}-${idx}`} label={f.name} onDelete={() => quitarArchivoResolver(idx)} size="small" />
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarResolverDialog} disabled={!!resolvingId}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!!resolvingId}
            onClick={submitResolverConEvidencia}
            sx={{ bgcolor: neonGreen, color: '#002200', '&:hover': { bgcolor: '#00cc7a' } }}
          >
            {resolvingId ? 'Enviando…' : 'Resolver y entregar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TareasEspecializadas;
