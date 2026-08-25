import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import AddLinkIcon from '@mui/icons-material/AddLink';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

// Íconos
import GroupIcon from '@mui/icons-material/Group';
import BuildIcon from '@mui/icons-material/Build';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import PaidIcon from '@mui/icons-material/Paid';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import BookIcon from '@mui/icons-material/Book';
import { useAuth0 } from '@auth0/auth0-react';
import Tareas, { TareaCard } from './../../components/Cowork/Tareas.jsx';
import TareasEspecializadas, { EmptyState } from './../../components/Cowork/TareasEspecializadas.jsx';
import EventosGrid from './../Eventos/EventosGrid.jsx';
import HerramientrasGrid from './../../components/Cowork/HerramientrasGrid.jsx';
import ConductoresAgencia from './../../components/Cowork/ConductoresAgencia.jsx';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { useRoles } from '../../Contexts/RolesContext.jsx';
import { useSearchParams } from 'react-router-dom';
import { getGeneralTodos, getCartera } from '../../services/cowork/queryServices.js';
import { resolverTarea, completarTarea, subirEvidencia } from '../../services/cowork/mutationsServices.js';
import { useRecurrenciaValidation } from '../../hooks/useRecurrenciaValidation.jsx';
import useTodos from '../../hooks/useTodos.jsx';
import { normalizeTask } from '../../utils/cowork.helpers.js';

// Colores base
const neonGreen = '#00ff99';
const amarilloCiudadan = '#f5c400';
const darkGray = '#1a1a1a';
const fondoVerdeOscuro = '#022b23'; // 🟢 Nuevo color de fondo

// Mismos límites que el diálogo de entrega en Tareas.jsx — "Resolver" ahora
// pide de una vez la evidencia (spec: "no tiene sentido resolver y ya, hay
// que pedir otros campos"), en vez de solo tomar la tarea y dejar la entrega
// para después en otra pantalla.
const ALLOWED_MIMES_RESOLVER = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4', 'audio/mpeg',
];
const MAX_FILE_SIZE_RESOLVER = 10 * 1024 * 1024;
const MAX_ARCHIVOS_RESOLVER = 10;

// Antes esto devolvía índices numéricos absolutos (0/1/2), que dependían de
// cuántos tabs existieran según el rol (tienePermisoCRUD quita/agrega el tab
// "Admin/Socio"). Eso causaba bugs reales: el efecto que carga las tareas
// generales comparaba `tab === 1` a secas, que es el índice correcto SOLO
// para un socio — para un usuario normal (sin ese tab), "Tareas" es el
// índice 0, así que fetchGeneralTodos() nunca se disparaba y la lista
// quedaba vacía para cualquiera que no fuera socio/admin. Usar valores con
// nombre elimina esa clase de bug de raíz.
const getTabFromSearchParams = (searchParams) => {
  const tabParam = searchParams.get('tab');
  if (['socio', 'mistareas', 'generales', 'especializadas', 'conductores'].includes(tabParam)) {
    return tabParam;
  }
  return null;
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
  const { userData, isAdmin, isSocio, isVerificador } = useRoles();
  const tienePermisoCRUD = isAdmin() || isSocio();
  // chat.md: verificador (sin admin/socio) NO ve "Herramientas" ni el resto
  // del tab Socio — solo le aparece "Verificar Conductores", nada más.
  const soloVerificador = isVerificador() && !tienePermisoCRUD;
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    return getTabFromSearchParams(searchParams) || (tienePermisoCRUD ? 'socio' : 'generales');
  });
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { canUserTakeTask } = useRecurrenciaValidation();
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0();
  const { updateTodo, deleteTodo } = useTodos();

  const handleLoginGenerales = () => {
    loginWithRedirect({
      appState: {
        returnTo: window.location.pathname + window.location.search,
      },
    });
  };

  useEffect(() => {
    if (!searchParams.get('tab')) return;
    const parsed = getTabFromSearchParams(searchParams);
    if (parsed) setTab(parsed);
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
    if (tab === 'generales') fetchGeneralTodos();
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
    if (tab === 'socio' && subTab === 3) fetchCartera();
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

  // Resolver ya no es "un clic y ya" — pide de una vez notas/enlaces/
  // archivos (mismos campos que el diálogo de entrega en Tareas.jsx) y hace
  // resolver + entregar en una sola acción, en vez de dejar al usuario sin
  // ningún lugar obvio para completar lo que acaba de tomar.
  const [resolverDialog, setResolverDialog] = useState({ open: false, todo: null, notes: '', enlaces: [''] });
  const [archivosResolver, setArchivosResolver] = useState([]);
  const [resolverDialogError, setResolverDialogError] = useState(null);

  const abrirResolverDialog = useCallback(
    (todo) => {
      const userId = userData?.id;
      if (!userId) return;
      if (!canUserTakeTask(todo, userId)) {
        setGeneralError('Esta tarea ya no está disponible para ser asignada.');
        return;
      }
      setResolverDialogError(null);
      setResolverDialog({ open: true, todo, notes: '', enlaces: [''] });
      setArchivosResolver([]);
    },
    [userData?.id, canUserTakeTask]
  );

  const cerrarResolverDialog = () => {
    if (resolvingGeneralId) return; // no cerrar a medio envío
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

      setResolvingGeneralId(todo.id);
      setResolverDialogError(null);
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: { audience: 'https://api.ciudadan.org' },
        });

        // 1. Tomar la tarea (crea la resolución en en_proceso).
        const resolverRes = await resolverTarea(todo.id, token);
        const tareaId = resolverRes?.data?.id;
        if (!tareaId) throw new Error('No se pudo obtener el id de la tarea recién creada');

        // 2. Subir evidencia (si adjuntó archivos).
        if (archivosResolver.length > 0) {
          await subirEvidencia(tareaId, archivosResolver, resolverDialog.notes, token);
        }

        // 3. Entregar (notas + enlaces) — la deja lista para revisión.
        const enlacesLimpios = resolverDialog.enlaces.map((e) => e.trim()).filter(Boolean);
        await completarTarea(tareaId, token, { notes: resolverDialog.notes, enlaces: enlacesLimpios });

        setGeneralTodos((prev) => prev.filter((t) => t.id !== todo.id));
        setResolverDialog({ open: false, todo: null, notes: '', enlaces: [''] });
        setArchivosResolver([]);

        // Llevar al usuario a donde puede ver el resultado de su entrega.
        if (tienePermisoCRUD) {
          setTab('socio');
          setSubTab(0);
        } else {
          setTab('mistareas');
        }
      } catch (err) {
        console.error('Error resolviendo tarea general:', err);
        setResolverDialogError(err.message || 'No se pudo resolver la tarea');
      } finally {
        setResolvingGeneralId(null);
      }
    },
    [resolverDialog, archivosResolver, getAccessTokenSilently, tienePermisoCRUD]
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

  // Nota: "Calificar Tareas" ya no vive embebido aquí — se consolidó en la
  // página dedicada /herramientas/calificar-tarea (CalificarTarea.jsx),
  // que usa can-calificar-tarea.js (matriz agencia/área de Fase 4). Tener
  // las dos implementaciones en paralelo (esta y la de Herramientas)
  // duplicaba la sección en la UI.


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
            {tienePermisoCRUD && (
              <StyledTab value="socio" icon={<GroupIcon />} label={isAdmin() ? 'Admin' : 'Socio'} />
            )}
            <StyledTab value="generales" icon={<WorkOutlineIcon />} label="Tareas Generales" />
            <StyledTab value="especializadas" icon={<PrecisionManufacturingIcon />} label="Tareas Especializadas" />
            {soloVerificador && (
              <StyledTab value="conductores" icon={<DirectionsCarIcon />} label="Verificar Conductores" />
            )}
            {/* "Mis Tareas": antes el único lugar para entregar una tarea ya
                tomada (con archivos/enlaces/notas) vivía dentro del tab
                Socio -> sub-tab Tareas, inalcanzable para cualquier usuario
                sin rol admin/socio. Un usuario normal podía darle "Resolver"
                pero nunca volver a encontrar esa tarea para completarla. */}
            {isAuthenticated && !tienePermisoCRUD && (
              <StyledTab value="mistareas" icon={<AssignmentIndIcon />} label="Mis Tareas" />
            )}
          </StyledTabs>
        </Container>
      </Box>
      {/* 💚 Sub-barra (solo en Socio) */}
      <AnimatePresence>
        {tab === 'socio' && tienePermisoCRUD && (
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
                </SubTabs>
              </Container>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
      {/* 🔸 Contenido principal */}
      <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
        {tab === 'socio' && tienePermisoCRUD && (
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
          </motion.div>
        )}

        {tab === 'mistareas' && !tienePermisoCRUD && (
          <motion.div
            key="mis-tareas"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Tareas userId={userData?.id} subTab={0} />
          </motion.div>
        )}

        {tab === 'conductores' && soloVerificador && (
          <motion.div
            key="conductores"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <ConductoresAgencia />
          </motion.div>
        )}

        {tab === 'generales' && (
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
                            onClick={() => abrirResolverDialog(todo)}
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

        {tab === 'especializadas' && (
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

      {/* Resolver una tarea general ya no es "un clic y ya" — pide notas,
          enlaces y archivos de una vez, y hace resolver+entregar en una sola
          acción (mismos campos que el diálogo de entrega en Tareas.jsx). */}
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
          <Button onClick={cerrarResolverDialog} disabled={!!resolvingGeneralId}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!!resolvingGeneralId}
            onClick={submitResolverConEvidencia}
            sx={{ bgcolor: neonGreen, color: '#002200', '&:hover': { bgcolor: '#00cc7a' } }}
          >
            {resolvingGeneralId ? 'Enviando…' : 'Resolver y entregar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CooWork;
