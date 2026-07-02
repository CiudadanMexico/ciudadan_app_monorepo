import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import { styled } from '@mui/material/styles';
import { useAuth0 } from '@auth0/auth0-react';
import { TareaCard } from './Tareas.jsx';
import { useRoles } from '../../Contexts/RolesContext.jsx';
import { useRecurrenciaValidation } from '../../hooks/useRecurrenciaValidation.jsx';
import {
  assignUserAreas,
  createTask,
  updateTodoStatus,
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
  parseAreaSelectValue,
} from '../../utils/cowork.helpers.js';

const neonGreen = '#00ff99';
const amarilloCiudadan = '#f5c400';

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

const EmptyState = ({ children, actions }) => (
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

const AssignAreasForm = ({
  areas,
  selectedAreaIds,
  onChange,
  onAssign,
  loading,
  loadingAreas,
  error,
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
          Asignar áreas
        </Typography>
        <Typography sx={{ color: '#cfcfcf', mt: 0.5 }}>
          Selecciona las áreas principales que quieres asociar a tu perfil.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {loadingAreas ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={28} sx={{ color: amarilloCiudadan }} />
        </Box>
      ) : (
        <FormControl fullWidth disabled={loading || areas.length === 0}>
          <InputLabel sx={{ color: '#d6d6d6' }}>Áreas</InputLabel>
          <Select
            multiple
            value={selectedAreaIds}
            onChange={(event) => {
              onChange(parseAreaSelectValue(event.target.value));
            }}
            input={<OutlinedInput label="Áreas" />}
            renderValue={(selected) =>
              areas
                .filter((area) => selected.includes(area.id))
                .map((area) => area.nombre)
                .join(', ')
            }
            sx={{
              color: 'white',
              '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.25)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: neonGreen },
              '.MuiSvgIcon-root': { color: 'white' },
            }}
          >
            {areas.map((area) => (
              <MenuItem key={area.id} value={area.id}>
                <Checkbox checked={selectedAreaIds.includes(area.id)} />
                <ListItemText primary={area.nombre} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Button
        variant="contained"
        disabled={loading || loadingAreas || selectedAreaIds.length === 0}
        onClick={onAssign}
        sx={{
          alignSelf: { xs: 'stretch', sm: 'flex-start' },
          bgcolor: amarilloCiudadan,
          color: '#1a1a1a',
          fontWeight: 800,
          '&:hover': { bgcolor: '#ffe04a' },
        }}
      >
        {loading ? 'Asignando...' : 'Asignar'}
      </Button>
    </Stack>
  </Paper>
);

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
            {subarea.nombre}
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
  const [selectedAreaIds, setSelectedAreaIds] = useState([]);
  const [areaTab, setAreaTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingAvailableAreas, setLoadingAvailableAreas] = useState(false);
  const [assigningAreas, setAssigningAreas] = useState(false);
  const [error, setError] = useState(null);
  const [assignError, setAssignError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const { canUserTakeTask } = useRecurrenciaValidation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const { userData } = useRoles();
  const userId = userData?.id;

  const fetchAvailableAreas = useCallback(async () => {
    try {
      setLoadingAvailableAreas(true);
      const json = await getAvailableRootAreas();
      setAvailableAreas(getActiveRootAreas(json.data));
    } catch (err) {
      console.error('Error cargando áreas disponibles:', err);
      setError('No se pudieron cargar las áreas disponibles');
    } finally {
      setLoadingAvailableAreas(false);
    }
  }, []);

  const fetchSpecializedTasks = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const userJson = await getUserAreas(userId);
      const userAreas = getActiveRootAreas(userJson?.areas || []);

      setAreas(userAreas);
      setAreaTab(0);

      if (userAreas.length === 0) {
        setTasks([]);
        await fetchAvailableAreas();
        return;
      }

      const todosJson = await getSpecializedTodos();
      setTasks((todosJson.data || []).map(normalizeTask));
    } catch (err) {
      console.error('Error cargando tareas especializadas:', err);
      setError('No se pudieron cargar las tareas especializadas');
      setAreas([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [fetchAvailableAreas, userId]);

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

  const handleAssignAreas = async () => {
    if (!userId || selectedAreaIds.length === 0) return;

    try {
      setAssigningAreas(true);
      setError(null);
      setAssignError(null);
      setSuccess(null);

      await assignUserAreas(userId, selectedAreaIds);

      setSuccess('Áreas asignadas correctamente.');
      setSelectedAreaIds([]);
      await fetchSpecializedTasks();
    } catch (err) {
      console.error('Error asignando áreas:', err);
      setAssignError('No se pudieron asignar las áreas');
    } finally {
      setAssigningAreas(false);
    }
  };

  const handleResolve = useCallback(
    async (todo) => {
      if (!userId) return;

      if (!canUserTakeTask(todo, userId)) {
        setError('Esta tarea ya no está disponible para ser asignada.');
        return;
      }

      try {
        setResolvingId(todo.id);
        setError(null);
        setSuccess(null);

        await createTask(userId, todo.id);
        await updateTodoStatus(todo.id, 'asignada');

        setTasks((prev) => prev.filter((t) => t.id !== todo.id));
        setSuccess(`Tarea "${todo.titulo}" asignada correctamente.`);
      } catch (err) {
        console.error('Error asignando tarea:', err);
        setError(err.message || 'No se pudo asignar la tarea');
      } finally {
        setResolvingId(null);
      }
    },
    [userId, canUserTakeTask]
  );

  const hierarchy = useMemo(() => buildAreaHierarchy(areas, tasks), [areas, tasks]);
  const selectedArea = hierarchy[areaTab];

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

  if (hierarchy.length === 0) {
    return (
      <Box sx={{ mt: 3 }}>
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        <EmptyState>Aún no tienes áreas asignadas para ver tareas especializadas.</EmptyState>
        <AssignAreasForm
          areas={availableAreas}
          selectedAreaIds={selectedAreaIds}
          onChange={setSelectedAreaIds}
          onAssign={handleAssignAreas}
          loading={assigningAreas}
          loadingAreas={loadingAvailableAreas}
          error={assignError}
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
              label={`${area.nombre} (${area.totalTasks})`}
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
                {selectedArea.nombre}
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
                    Estas tareas pertenecen a {selectedArea.nombre} y no están dentro de una
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
            </Stack>
          )}

          {selectedArea.subareas.map((subarea) => (
            <SubareaAccordion
              key={subarea.id}
              subarea={subarea}
              defaultExpanded={selectedArea.subareas.length === 1}
              handleResolve={handleResolve}
              resolvingId={resolvingId}
              canUserTakeTask={canUserTakeTask}
              userId={userId}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default TareasEspecializadas;
