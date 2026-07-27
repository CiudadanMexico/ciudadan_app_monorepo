import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  Typography,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

// Íconos
import GroupIcon from '@mui/icons-material/Group';
import BuildIcon from '@mui/icons-material/Build';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PaidIcon from '@mui/icons-material/Paid';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import BookIcon from '@mui/icons-material/Book';
import { useAuth0 } from '@auth0/auth0-react';
import Tareas, { TareaCard } from './../../components/Cowork/Tareas.jsx';
import TareasEspecializadas, { EmptyState } from './../../components/Cowork/TareasEspecializadas.jsx';
import EventosGrid from './../Eventos/EventosGrid.jsx';
import HerramientrasGrid from './../../components/Cowork/HerramientrasGrid.jsx';
import { useRoles } from '../../Contexts/RolesContext.jsx';
import { useSearchParams } from 'react-router-dom';
import { getGeneralTodos, getCartera, getTareasPendientesCalificacion } from '../../services/cowork/queryServices.js';
import { resolverTarea } from '../../services/cowork/mutationsServices.js';
import { useRecurrenciaValidation } from '../../hooks/useRecurrenciaValidation.jsx';
import useTodos from '../../hooks/useTodos.jsx';
import { normalizeTask } from '../../utils/cowork.helpers.js';

// Colores base
const neonGreen = '#00ff99';
const amarilloCiudadan = '#f5c400';
const darkGray = '#1a1a1a';
const fondoVerdeOscuro = '#022b23'; // 🟢 Nuevo color de fondo

const getTabFromSearchParams = (searchParams) => {
  const tabParam = searchParams.get('tab');

  switch (tabParam) {
    case 'socio':
      return 0;
    case 'generales':
      return 1;
    case 'especializadas':
      return 2;
    default:
      return 0;
  }
};

// 🔹 Tabs principales (barra amarilla)
const StyledTab = styled(Tab)(({ theme }) => ({
  color: 'white',
  fontWeight: 600,
  textTransform: 'uppercase',
  fontSize: '0.9rem',
  padding: theme.spacing(1.5, 3),
  transition: 'all 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  '& .MuiSvgIcon-root': {
    fontSize: '1.3rem',
  },
  '&.Mui-selected': {
    color: amarilloCiudadan,
  },
  '&:hover': {
    color: amarilloCiudadan,
  },
}));

const StyledTabs = styled((props) => (
  <Tabs {...props} TabIndicatorProps={{ children: <span className="MuiTabs-indicatorSpan" /> }} />
))({
  '& .MuiTabs-indicator': {
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    height: 3,
  },
  '& .MuiTabs-indicatorSpan': {
    width: '60%',
    backgroundColor: amarilloCiudadan,
    borderRadius: 2,
    boxShadow: `0 0 10px ${amarilloCiudadan}`,
  },
});

// 🔹 Subtabs (barra verde neón)
const SubTab = styled(Tab)(({ theme }) => ({
  color: '#bbb',
  fontWeight: 500,
  textTransform: 'none',
  fontSize: '0.9rem',
  padding: theme.spacing(1.2, 2),
  transition: 'all 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  '& .MuiSvgIcon-root': {
    fontSize: '1.2rem',
  },
  '&.Mui-selected': {
    color: neonGreen,
    textShadow: `0 0 6px ${neonGreen}`,
  },
  '&:hover': {
    color: neonGreen,
  },
}));

const SubTabs = styled((props) => (
  <Tabs {...props} TabIndicatorProps={{ children: <span className="MuiTabs-indicatorSpan" /> }} />
))({
  '& .MuiTabs-indicator': {
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    height: 2,
  },
  '& .MuiTabs-indicatorSpan': {
    width: '40%',
    backgroundColor: neonGreen,
    borderRadius: 2,
    boxShadow: `0 0 8px ${neonGreen}`,
  },
});

const CooWork = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => getTabFromSearchParams(searchParams));
  const [subTab, setSubTab] = useState(0);
  const [generalTodos, setGeneralTodos] = useState([]);
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [resolvingGeneralId, setResolvingGeneralId] = useState(null);
  const [generalError, setGeneralError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [cartera, setCartera] = useState(null);
  const [loadingCartera, setLoadingCartera] = useState(false);
  const [carteraError, setCarteraError] = useState(null);
  const theme = useTheme();
  const { userData, isAdmin, isSocio } = useRoles();
  const tienePermisoCRUD = isAdmin() || isSocio();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { canUserTakeTask } = useRecurrenciaValidation();
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const { updateTodo, deleteTodo, rateTask } = useTodos();

  const handleLoginGenerales = () => {
    loginWithRedirect({
      appState: {
        returnTo: window.location.pathname + window.location.search,
      },
    });
  };

  useEffect(() => {
    if (!searchParams.get('tab')) return;
    setTab(getTabFromSearchParams(searchParams));
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleTabChange = (event, newValue) => setTab(newValue);
  const handleSubTabChange = (event, newValue) => setSubTab(newValue);

  const fetchGeneralTodos = useCallback(async () => {
    try {
      setLoadingGeneral(true);
      setGeneralError(null);
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      }).catch(() => null);
      const json = await getGeneralTodos(token);
      setGeneralTodos(
        (json.data || [])
          .map(normalizeTask)
          .filter((todo) => todo.status === 'publicada' && todo.nivel === 'general')
      );
    } catch (err) {
      console.error('Error cargando tareas generales:', err);
      setGeneralError('No se pudieron cargar las tareas generales');
    } finally {
      setLoadingGeneral(false);
    }
  }, [getAccessTokenSilently]);

  useEffect(() => {
    if (tab === 1) fetchGeneralTodos();
  }, [tab, fetchGeneralTodos]);

  const fetchCartera = useCallback(async () => {
    try {
      setLoadingCartera(true);
      setCarteraError(null);
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      }).catch(() => null);
      const json = await getCartera(token);
      const attrs = json.data?.attributes || json.data || json;
      setCartera(attrs);
    } catch (err) {
      console.error('Error cargando cartera:', err);
      setCarteraError('No se pudo cargar el historial de pagos');
    } finally {
      setLoadingCartera(false);
    }
  }, [getAccessTokenSilently]);

  useEffect(() => {
    if (tab === 0 && subTab === 3) fetchCartera();
  }, [tab, subTab, fetchCartera]);

  const handleEditGeneral = useCallback((todo) => {
    setEditForm({
      id: todo.id,
      titulo: todo.titulo || '',
      descripcion: todo.descripcion || '',
      tiempoMin: todo.tiempoMin || 0,
      labory: todo.labory || 0,
      efectivo: todo.efectivo || 0,
      fechaEntrega: todo.fechaEntrega ? todo.fechaEntrega.slice(0, 10) : '',
    });
    setEditDialogOpen(true);
  }, []);

  const handleCloseEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setEditForm(null);
  }, []);

  const handleEditFormChange = useCallback(
    (field) => (event) => {
      const value = event.target.value;
      setEditForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editForm) return;

    setSavingEdit(true);
    try {
      await updateTodo(editForm.id, {
        titulo: editForm.titulo,
        descripcion: editForm.descripcion,
        minutos_desarrollo: Number(editForm.tiempoMin) || 0,
        reward_laborys: Number(editForm.labory) || 0,
        reward_cash: Number(editForm.efectivo) || 0,
        fecha_entrega: editForm.fechaEntrega
          ? new Date(editForm.fechaEntrega).toISOString()
          : null,
      });

      setGeneralTodos((prev) =>
        prev.map((t) =>
          t.id === editForm.id
            ? {
                ...t,
                titulo: editForm.titulo,
                descripcion: editForm.descripcion,
                tiempoMin: Number(editForm.tiempoMin) || 0,
                labory: Number(editForm.labory) || 0,
                efectivo: Number(editForm.efectivo) || 0,
                fechaEntrega: editForm.fechaEntrega
                  ? new Date(editForm.fechaEntrega).toISOString()
                  : null,
              }
            : t
        )
      );

      handleCloseEditDialog();
    } catch (err) {
      console.error('Error guardando la tarea:', err);
      setGeneralError('No se pudo guardar la tarea (¿tienes permiso de admin/socio?)');
    } finally {
      setSavingEdit(false);
    }
  }, [editForm, updateTodo, handleCloseEditDialog]);

  const handleResolveGeneral = useCallback(
    async (todo) => {
      const userId = userData?.id;
      if (!userId) return;

      if (!canUserTakeTask(todo, userId)) {
        setGeneralError('Esta tarea ya no está disponible para ser asignada.');
        return;
      }

      try {
        setResolvingGeneralId(todo.id);
        setGeneralError(null);

        const token = await getAccessTokenSilently({
          authorizationParams: { audience: 'https://api.ciudadan.org' },
        });
        await resolverTarea(todo.id, token);

        setGeneralTodos((prev) => prev.filter((t) => t.id !== todo.id));
      } catch (err) {
        console.error('Error asignando tarea general:', err);
        setGeneralError(err.message || 'No se pudo asignar la tarea');
      } finally {
        setResolvingGeneralId(null);
      }
    },
    [userData?.id, canUserTakeTask, getAccessTokenSilently]
  );

  // ---------------------------
  // ELIMINAR TAREA GENERAL (solo socio/admin)
  // ---------------------------
  const [deletingGeneralId, setDeletingGeneralId] = useState(null);

  const handleDeleteGeneral = useCallback(
    async (todo) => {
      const confirmed = window.confirm(
        `¿Eliminar la tarea "${todo.titulo}"?\nEsta acción no se puede deshacer.`
      );
      if (!confirmed) return;

      try {
        setDeletingGeneralId(todo.id);
        setGeneralError(null);
        await deleteTodo(todo.id);
        setGeneralTodos((prev) => prev.filter((t) => t.id !== todo.id));
      } catch (err) {
        console.error('Error eliminando tarea general:', err);
        setGeneralError(err.message || 'No se pudo eliminar la tarea (¿tienes permiso de admin/socio?)');
      } finally {
        setDeletingGeneralId(null);
      }
    },
    [deleteTodo]
  );

  // ---------------------------
  // CALIFICAR TAREA (sub-tab Socio / "Calificar Tareas")
  // ---------------------------
  const [tareasPendientes, setTareasPendientes] = useState([]);
  const [loadingTareasPendientes, setLoadingTareasPendientes] = useState(false);
  const [tareasPendientesError, setTareasPendientesError] = useState(null);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [rateForm, setRateForm] = useState(null);
  const [savingRate, setSavingRate] = useState(false);
  const [ratingTareaId, setRatingTareaId] = useState(null);

  const fetchTareasPendientes = useCallback(async () => {
    try {
      setLoadingTareasPendientes(true);
      setTareasPendientesError(null);
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      }).catch(() => null);
      const json = await getTareasPendientesCalificacion(token);
      const items = (json.data || []).map((item) => {
        const attrs = item.attributes || item;
        const usuario = attrs.usuario?.data?.attributes || attrs.usuario || {};
        const todo = attrs.todo?.data?.attributes || attrs.todo || {};
        return {
          id: item.id,
          titulo: todo.titulo || attrs.titulo || 'Sin título',
          descripcion: todo.descripcion || '',
          status: attrs.status,
          score: attrs.score ?? 0,
          usuarioEmail: usuario.email || '—',
          usuarioId: usuario.id || null,
          todoId: attrs.todo?.data?.id || attrs.todo?.id || null,
        };
      });
      setTareasPendientes(items);
    } catch (err) {
      console.error('Error cargando tareas pendientes de calificación:', err);
      setTareasPendientesError('No se pudieron cargar las tareas pendientes de calificación');
    } finally {
      setLoadingTareasPendientes(false);
    }
  }, [getAccessTokenSilently]);

  useEffect(() => {
    if (tab === 0 && subTab === 4 && tienePermisoCRUD) {
      fetchTareasPendientes();
    }
  }, [tab, subTab, tienePermisoCRUD, fetchTareasPendientes]);

  const handleOpenRate = useCallback((tarea) => {
    setRateForm({
      id: tarea.id,
      titulo: tarea.titulo,
      usuarioEmail: tarea.usuarioEmail,
      score: 5,
      notes: '',
    });
    setRateDialogOpen(true);
  }, []);

  const handleCloseRateDialog = useCallback(() => {
    setRateDialogOpen(false);
    setRateForm(null);
  }, []);

  const handleRateFormChange = useCallback((field) => (event) => {
    const value = event.target.value;
    setRateForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleRateSubmit = useCallback(async () => {
    if (!rateForm) return;
    setSavingRate(true);
    setRatingTareaId(rateForm.id);
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      }).catch(() => null);
      await rateTask(rateForm.id, { score: Number(rateForm.score), notes: rateForm.notes }, token);
      // Remover de la lista local de pendientes (ya fue calificada+pada en BE)
      setTareasPendientes((prev) => prev.filter((t) => t.id !== rateForm.id));
      handleCloseRateDialog();
    } catch (err) {
      console.error('Error calificando tarea:', err);
      setTareasPendientesError(
        err.message || 'No se pudo calificar la tarea (¿tienes permiso de admin/socio?)'
      );
    } finally {
      setSavingRate(false);
      setRatingTareaId(null);
    }
  }, [rateForm, rateTask, getAccessTokenSilently, handleCloseRateDialog]);


  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        bgcolor: fondoVerdeOscuro, // 🟢 Fondo aplicado aquí
        color: 'white',
        pb: 6,
      }}
    >
      {/* 🟨 Barra amarilla de tabs principales */}
      <Box
        sx={{
          width: '100%',
          bgcolor: 'purple',
          color: 'white',
          top: 64,
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}
      >
        <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center' }}>
          <StyledTabs
            value={tab}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons={isMobile ? 'auto' : false}
            allowScrollButtonsMobile
            centered={!isMobile}
          >
            <StyledTab icon={<GroupIcon />} label="Socio" />
            <StyledTab icon={<WorkOutlineIcon />} label="Tareas Generales" />
            <StyledTab icon={<PrecisionManufacturingIcon />} label="Tareas Especializadas" />
          </StyledTabs>
        </Container>
      </Box>
      {/* 💚 Sub-barra (solo en Socio) */}
      <AnimatePresence>
        {tab === 0 && (
          <motion.div
            key="subbar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Box
              sx={{
                width: '100%',
                bgcolor: darkGray,
                color: 'white',
                borderTop: '1px solid #333',
                borderBottom: '1px solid #333',
              }}
            >
              <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center' }}>
                <SubTabs
                  value={subTab}
                  onChange={handleSubTabChange}
                  variant={isMobile ? 'scrollable' : 'standard'}
                  scrollButtons={isMobile ? 'auto' : false}
                  allowScrollButtonsMobile
                  centered={!isMobile}
                >
                  <SubTab icon={<AssignmentIcon />} label="Tareas" />
                  <SubTab icon={<BuildIcon />} label="Herramientas" />
                  <SubTab icon={<BookIcon />} label="Bitácora" />
                  <SubTab icon={<PaidIcon />} label="Historial de Pagos" />
                  {tienePermisoCRUD && <SubTab icon={<StarIcon />} label="Calificar Tareas" />}
                </SubTabs>
              </Container>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
      {/* 🔸 Contenido principal */}
      <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
        {tab === 0 && (
          <motion.div
            key="socio-content"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {subTab === 0 && <Tareas userId={userData?.id} subTab={subTab} />}
            {subTab === 1 && <HerramientrasGrid />}
            {subTab === 2 && <EventosGrid />}
            {subTab === 3 && (
              <>
                <Typography variant="h5" fontWeight={700} gutterBottom color="white">
                  💸 Historial de Pagos
                </Typography>
                <Typography color="#ccc" sx={{ mb: 3 }}>
                  Consulta tus aportaciones, movimientos y balances personales.
                </Typography>
                {carteraError && (
                  <Typography color="error" sx={{ mb: 2 }}>
                    {carteraError}
                  </Typography>
                )}
                {loadingCartera ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress sx={{ color: neonGreen }} />
                  </Box>
                ) : cartera ? (
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: 1, minWidth: 200, p: 3, borderRadius: 2, bgcolor: darkGray, border: `1px solid ${neonGreen}` }}>
                        <Typography variant="caption" color="#aaa">Laborys Saldo</Typography>
                        <Typography variant="h4" fontWeight={700} color={neonGreen}>
                          {Number(cartera.laborysSaldo ?? 0).toLocaleString('es-ES')}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 200, p: 3, borderRadius: 2, bgcolor: darkGray, border: `1px solid ${amarilloCiudadan}` }}>
                        <Typography variant="caption" color="#aaa">Laborys Ganados</Typography>
                        <Typography variant="h4" fontWeight={700} color={amarilloCiudadan}>
                          {Number(cartera.laborysGanados ?? 0).toLocaleString('es-ES')}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: 1, minWidth: 200, p: 3, borderRadius: 2, bgcolor: darkGray, border: '1px solid #555' }}>
                        <Typography variant="caption" color="#aaa">Ciudadan Tokens</Typography>
                        <Typography variant="h5" fontWeight={600} color="white">
                          {Number(cartera.ciudadanTokens ?? 0).toLocaleString('es-ES')}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 200, p: 3, borderRadius: 2, bgcolor: darkGray, border: '1px solid #555' }}>
                        <Typography variant="caption" color="#aaa">Ciudadan Rendimientos</Typography>
                        <Typography variant="h5" fontWeight={600} color="white">
                          {Number(cartera.ciudadanRendimientos ?? 0).toLocaleString('es-ES')}
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                ) : (
                  <Typography color="#aaa" sx={{ textAlign: 'center', py: 4 }}>
                    No hay información de pagos disponible.
                  </Typography>
                )}
              </>
            )}
            {subTab === 4 && tienePermisoCRUD && (
              <>
                <Typography variant="h5" fontWeight={700} gutterBottom color="white">
                  ⭐ Calificar Tareas
                </Typography>
                <Typography color="#ccc" sx={{ mb: 3 }}>
                  Resoluciones enviadas a revisión (status <code>completada</code>). Al calificar
                  se paga laborys automáticamente al usuario y la tarea pasa a <code>pagada</code>.
                </Typography>

                {tareasPendientesError && (
                  <Typography color="error" sx={{ mb: 2 }}>
                    {tareasPendientesError}
                  </Typography>
                )}

                {loadingTareasPendientes ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: amarilloCiudadan }} />
                  </Box>
                ) : tareasPendientes.length === 0 ? (
                  <Typography sx={{ color: '#aaa', textAlign: 'center', py: 6 }}>
                    No hay tareas pendientes de calificación.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {tareasPendientes.map((tarea) => (
                      <TareaCard
                        key={tarea.id}
                        tarea={{
                          id: tarea.id,
                          titulo: `#${tarea.id} — ${tarea.titulo}`,
                          descripcion: tarea.descripcion,
                          status: tarea.status,
                          usuarioEmail: tarea.usuarioEmail,
                        }}
                        actions={
                          <Button
                            variant="contained"
                            size="small"
                            disabled={ratingTareaId === tarea.id}
                            onClick={() => handleOpenRate(tarea)}
                            sx={{
                              bgcolor: amarilloCiudadan,
                              color: '#1a1a1a',
                              fontWeight: 700,
                              textTransform: 'none',
                              '&:hover': { bgcolor: '#ffe04a' },
                              '&.Mui-disabled': { bgcolor: 'rgba(245,196,0,0.3)' },
                            }}
                          >
                            {ratingTareaId === tarea.id ? 'Calificando...' : 'Calificar'}
                          </Button>
                        }
                      />
                    ))}
                  </Stack>
                )}
              </>
            )}
          </motion.div>
        )}

        {tab === 1 && (
          <motion.div
            key="generales"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Typography variant="h5" fontWeight={700} gutterBottom color="white">
              🧱 Tareas Generales
            </Typography>
            <Typography color="#ccc" sx={{ mb: 3 }}>
              Estas tareas están disponibles para que cualquier socio las resuelva.
            </Typography>

            {authLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress sx={{ color: amarilloCiudadan }} />
              </Box>
            ) : (
              <>
                {generalError && (
                  <Typography color="error" sx={{ mb: 2 }}>
                    {generalError}
                  </Typography>
                )}
                {!isAuthenticated && (
                  <Typography color="#ccc" sx={{ mb: 2, fontStyle: 'italic', fontSize: '0.9rem' }}>
                    Para resolver una tarea debes iniciar sesión.
                  </Typography>
                )}

                {loadingGeneral ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress sx={{ color: amarilloCiudadan }} />
              </Box>
            ) : generalTodos.length === 0 ? (
              <Typography sx={{ color: '#aaa', textAlign: 'center', py: 6 }}>
                No hay tareas generales disponibles en este momento.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {generalTodos.map((todo) => (
                  <TareaCard
                    key={todo.id}
                    tarea={todo}
                    actions={
                      <>
                        {tienePermisoCRUD && (
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => handleEditGeneral(todo)}
                              sx={{
                                color: 'white',
                                bgcolor: 'rgba(255,255,255,0.08)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' },
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {tienePermisoCRUD && (
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              disabled={deletingGeneralId === todo.id}
                              onClick={() => handleDeleteGeneral(todo)}
                              sx={{
                                color: '#ff6b6b',
                                bgcolor: 'rgba(255,107,107,0.08)',
                                '&:hover': { bgcolor: 'rgba(255,107,107,0.22)' },
                                '&.Mui-disabled': { color: 'rgba(255,107,107,0.4)' },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!isAuthenticated ? (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={handleLoginGenerales}
                            sx={{
                              bgcolor: amarilloCiudadan,
                              color: '#1a1a1a',
                              fontWeight: 700,
                              textTransform: 'none',
                              '&:hover': { bgcolor: '#ffe04a' },
                            }}
                          >
                            Iniciar sesión y resolver
                          </Button>
                        ) : canUserTakeTask(todo, userData?.id) ? (
                          <Button
                            variant="contained"
                            size="small"
                            disabled={resolvingGeneralId === todo.id}
                            onClick={() => handleResolveGeneral(todo)}
                            sx={{
                              bgcolor: neonGreen,
                              color: '#002200',
                              fontWeight: 700,
                              textTransform: 'none',
                              '&:hover': { bgcolor: '#00e68a' },
                              '&.Mui-disabled': {
                                bgcolor: 'rgba(0,255,153,0.3)',
                                color: '#004d33',
                              },
                            }}
                          >
                            {resolvingGeneralId === todo.id ? 'Asignando...' : 'Resolver tarea'}
                          </Button>
                        ) : null}
                      </>
                    }
                  />
                ))}
              </Stack>
            )}
              </>
            )}
          </motion.div>
        )}

        {tab === 2 && (
          <motion.div
            key="especializadas"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Typography variant="h5" fontWeight={700} gutterBottom color="white">
              ⚙️ Tareas Especializadas
            </Typography>
            <Typography color="#ccc">
              Gestiona tareas técnicas y de alto impacto dentro del ecosistema Ciudadan.
            </Typography>
            <TareasEspecializadas />
          </motion.div>
        )}
      </Container>

      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Editar tarea</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Título"
              value={editForm?.titulo || ''}
              onChange={handleEditFormChange('titulo')}
              fullWidth
            />
            <TextField
              label="Descripción"
              value={editForm?.descripcion || ''}
              onChange={handleEditFormChange('descripcion')}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Tiempo (minutos)"
              type="number"
              value={editForm?.tiempoMin ?? 0}
              onChange={handleEditFormChange('tiempoMin')}
              fullWidth
            />
            <TextField
              label="Labory"
              type="number"
              value={editForm?.labory ?? 0}
              onChange={handleEditFormChange('labory')}
              fullWidth
            />
            <TextField
              label="Efectivo"
              type="number"
              value={editForm?.efectivo ?? 0}
              onChange={handleEditFormChange('efectivo')}
              fullWidth
            />
            <TextField
              label="Fecha de entrega"
              type="date"
              value={editForm?.fechaEntrega || ''}
              onChange={handleEditFormChange('fechaEntrega')}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={savingEdit}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={savingEdit}
            sx={{ bgcolor: neonGreen, color: '#002200', '&:hover': { bgcolor: '#00e68a' } }}
          >
            {savingEdit ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Calificar Tarea: score + notes. Backend Fix H calificar.js
          ejecuta transacción atómica (calificada→pagada, paga laborys,
          propaga al todo) y devuelve la respuesta del pago. */}
      <Dialog open={rateDialogOpen} onClose={handleCloseRateDialog} fullWidth maxWidth="sm">
        <DialogTitle>Calificar Resolución</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Tarea: <strong>{rateForm?.titulo}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Usuario: {rateForm?.usuarioEmail}
            </Typography>
            <TextField
              label="Score (0–100)"
              type="number"
              inputProps={{ min: 0, max: 100 }}
              value={rateForm?.score ?? 5}
              onChange={handleRateFormChange('score')}
              fullWidth
            />
            <TextField
              label="Observaciones (opcional)"
              value={rateForm?.notes ?? ''}
              onChange={handleRateFormChange('notes')}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRateDialog} disabled={savingRate}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleRateSubmit}
            disabled={savingRate}
            sx={{ bgcolor: amarilloCiudadan, color: '#1a1a1a', '&:hover': { bgcolor: '#ffe04a' } }}
          >
            {savingRate ? 'Calificando...' : 'Calificar y Pagar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CooWork;
