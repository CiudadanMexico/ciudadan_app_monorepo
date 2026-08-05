import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth0 } from '@auth0/auth0-react';
import { completarTarea, subirEvidencia } from '../../services/cowork/mutationsServices.js';
import { useTarea } from '../../hooks/useTarea';
import { getTodoStatusLabel } from '../../utils/cowork.helpers';

// Debe coincidir con la whitelist del backend (subir-evidencia.js:43-57) —
// si divergen, el backend rechaza igual con 400, pero mejor avisar antes.
const ALLOWED_MIMES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4', 'audio/mpeg',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ARCHIVOS = 10;

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

// Estados del todo en los que la resolucién ya se entregé/cerrioto (dolida);
// en cualquier otro estado (publicada, asignada, en_proceso, o sin status)
// se puede completar.
const ESTADOS_CERRADOS = [
  'pendiente_revision',
  'corregir',
  'corregida',
  'calificada',
  'pagada',
  'cancelada',
];

// Estados de la resolución en los que el dueño puede apelar la calificación.
// Spec documento-off.md:147-153.
const ESTADOS_APELABLES = ['calificada', 'pagada'];
const SCORE_UMBRAL_APELABLE = 3;

// convertir minutos a hh:mm
const minutosAHoras = (min = 0) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
};

const formatearFecha = (fecha) => {
  if (!fecha) return '—';

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) return '—';

  const dia = date.getUTCDate().toString().padStart(2, '0');
  const mes = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const anio = date.getUTCFullYear();

  return `${dia}/${mes}/${anio}`;
};

export const TareaCard = ({ tarea, actions }) => {
  return (
    <Paper
      elevation={4}
      sx={{
        borderRadius: 3,
        p: { xs: 2, sm: 3 },
        bgcolor: '#002200',
        color: 'white',
        width: '100%',
      }}
    >
      <Box
        display="flex"
        flexDirection={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        gap={2}
      >
        {/* titulo */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            fontSize: { xs: '1.1rem', md: '1.25rem' },
          }}
        >
          {tarea.titulo}
        </Typography>

        {/* datos */}
        <Box
          display="flex"
          flexWrap="wrap"
          gap={2}
          justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
        >
          <Typography variant="body2">
            ⏱ {tarea.tiempoMin} min ({minutosAHoras(tarea.tiempoMin)})
          </Typography>

          <Typography variant="body2">💎 {tarea.labory}</Typography>

          <Typography variant="body2">💵 ${tarea.efectivo}</Typography>

          <Typography variant="body2">📅 {formatearFecha(tarea.fechaEntrega)}</Typography>
        </Box>
      </Box>

      {tarea.descripcion && (
        <Typography
          variant="body2"
          sx={{ mt: 1.5, opacity: 0.85, whiteSpace: 'pre-wrap' }}
        >
          {tarea.descripcion}
        </Typography>
      )}

            {tarea.todoStatus && (
        <Box sx={{ mt: 1.5 }}>
          <Typography
            component="span"
            sx={{
              display: 'inline-block',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              bgcolor: 'rgba(0,255,153,0.15)',
              color: '#00ff99',
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            {getTodoStatusLabel(tarea.todoStatus)}
          </Typography>
        </Box>
      )}

      {actions && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>{actions}</Box>
      )}
    </Paper>
  );
};

const Tareas = ({ userId, subTab }) => {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completandoId, setCompletandoId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const { getAccessTokenSilently } = useAuth0();
  const { apelarTarea } = useTarea();

  // --- Apelación UI (Fix G) ---
  // Dialog: motivo (>=10 chars) + scoreSolicitado (opcional, 1-5).
  // Spec documento-off.md:147-164 — el dueño apela si status en
  // ['calificada','pagada'] y score <= 3.
  const [apelacion, setApelacion] = useState({ open: false, tareaId: null, motivo: '', scoreSolicitado: '' });
  const [apelandoId, setApelandoId] = useState(null);

  const abrirApelacion = (tarea) => {
    setActionError(null);
    setApelacion({ open: true, tareaId: tarea.id, motivo: '', scoreSolicitado: '' });
  };

  const cerrarApelacion = () => {
    setApelacion({ open: false, tareaId: null, motivo: '', scoreSolicitado: '' });
  };

  const submitApelacion = async () => {
    try {
      setApelandoId(apelacion.tareaId);
      await apelarTarea(apelacion.tareaId, apelacion.motivo, apelacion.scoreSolicitado || undefined);
      // Quita la tarea de la lista porque ya no es apelable (hay apelación abierta)
      setTareas((prev) => prev.map((t) =>
        t.id === apelacion.tareaId ? { ...t, _apelada: true } : t
      ));
      cerrarApelacion();
    } catch (err) {
      setActionError(err.message || 'No se pudo enviar la apelación');
    } finally {
      setApelandoId(null);
    }
  };

  const puedeApelar = (tarea) => {
    if (!tarea || !tarea.status) return false;
    if (!ESTADOS_APELABLES.includes(tarea.status)) return false;
    const sc = Number(tarea.score ?? 0);
    return sc <= SCORE_UMBRAL_APELABLE;
  };

  // --- Entrega de tarea (notas + enlaces + archivos) ---
  // Reemplaza el "marcar completada" directo: no tenía sentido cerrar una
  // tarea sin poder adjuntar nada de lo que se hizo.
  const [entrega, setEntrega] = useState({ open: false, tareaId: null, notes: '', enlaces: [''] });
  const [archivosEntrega, setArchivosEntrega] = useState([]);
  const [entregaError, setEntregaError] = useState(null);

  const abrirEntrega = (tarea) => {
    setActionError(null);
    setEntregaError(null);
    setEntrega({ open: true, tareaId: tarea.id, notes: '', enlaces: [''] });
    setArchivosEntrega([]);
  };

  const cerrarEntrega = () => {
    if (completandoId) return; // no cerrar a medio envío
    setEntrega({ open: false, tareaId: null, notes: '', enlaces: [''] });
    setArchivosEntrega([]);
    setEntregaError(null);
  };

  const cambiarEnlace = (idx, value) => {
    setEntrega((p) => ({
      ...p,
      enlaces: p.enlaces.map((e, i) => (i === idx ? value : e)),
    }));
  };

  const agregarEnlace = () => {
    setEntrega((p) => ({ ...p, enlaces: [...p.enlaces, ''] }));
  };

  const quitarEnlace = (idx) => {
    setEntrega((p) => ({ ...p, enlaces: p.enlaces.filter((_, i) => i !== idx) }));
  };

  const handleArchivosChange = (e) => {
    const nuevos = Array.from(e.target.files || []);
    setEntregaError(null);
    for (const f of nuevos) {
      if (!ALLOWED_MIMES.includes(f.type)) {
        setEntregaError(`"${f.name}": tipo de archivo no permitido.`);
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setEntregaError(`"${f.name}": excede el máximo de 10MB.`);
        return;
      }
    }
    setArchivosEntrega((prev) => {
      const combinado = [...prev, ...nuevos];
      if (combinado.length > MAX_ARCHIVOS) {
        setEntregaError(`No se pueden adjuntar más de ${MAX_ARCHIVOS} archivos.`);
        return prev;
      }
      return combinado;
    });
    e.target.value = ''; // permite volver a elegir el mismo archivo si lo quita y re-agrega
  };

  const quitarArchivo = (idx) => {
    setArchivosEntrega((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitEntrega = async () => {
    const { tareaId, notes, enlaces } = entrega;
    setCompletandoId(tareaId);
    setEntregaError(null);
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: 'https://api.ciudadan.org',
          scope: 'openid profile email offline_access',
        },
      });

      if (archivosEntrega.length > 0) {
        await subirEvidencia(tareaId, archivosEntrega, notes, token);
      }

      const enlacesLimpios = enlaces.map((e) => e.trim()).filter(Boolean);
      await completarTarea(tareaId, token, { notes, enlaces: enlacesLimpios });

      setTareas((prev) =>
        prev.map((t) => (t.id === tareaId ? { ...t, todoStatus: 'pendiente_revision' } : t))
      );
      setEntrega({ open: false, tareaId: null, notes: '', enlaces: [''] });
      setArchivosEntrega([]);
    } catch (err) {
      setEntregaError(err.message || 'No se pudo entregar la tarea');
    } finally {
      setCompletandoId(null);
    }
  };

  useEffect(() => {
    const fetchTareas = async () => {
      if (subTab === 0 && !userId) {
        setLoading(false);
        return;
      }

      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: 'https://api.ciudadan.org',
            scope: 'openid profile email offline_access',
          },
        });
        const res = await fetch(
          subTab === 0
            ? `${STRAPI_URL}/api/tareas/filtrar?usuarioId=${userId}&pageSize=100`
            : `${STRAPI_URL}/api/todos`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error('Error cargando tareas');

        const json = await res.json();

        if (!json.data || json.data.length === 0) {
          setTareas([]);
          setLoading(false);
          return;
        }

        const parsed = json.data.map((t) => {
          const attrs = t.attributes || t;
          const todo = attrs.todo?.data?.attributes || attrs.todo || {};

          // Helper: si el campo JSON es un objeto {metodo, monto, fecha, origen}, extraer monto
          const extractAmount = (val) => {
            if (val == null) return 0;
            if (typeof val === 'number') return val;
            if (typeof val === 'object' && typeof val.monto === 'number') return val.monto;
            if (typeof val === 'object' && typeof val.monto === 'string') return Number(val.monto) || 0;
            return 0;
          };

          return {
            id: t.id,
            titulo: todo.titulo || attrs.titulo || 'Sin título',
            descripcion: todo.descripcion || attrs.descripcion || '',
            tiempoMin: todo.minutos_desarrollo || attrs.minutos_desarrollo || 0,
            labory: extractAmount(todo.reward_laborys ?? todo.recompensa),
            efectivo: extractAmount(todo.reward_cash),
            fechaEntrega: todo.fecha_entrega || attrs.fecha_entrega || null,
            todoStatus: todo.status || attrs.status || null,
            status: attrs.status || null,
            score: attrs.score ?? null,
          };
        });

        setTareas(parsed);
      } catch (err) {
        setError('No se pudieron cargar las tareas');
      }

      setLoading(false);
    };

    fetchTareas();
  }, [userId, subTab, getAccessTokenSilently]);

  // loading
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress sx={{ color: '#00ff99' }} />
      </Box>
    );
  }

  // error
  if (error) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // sin tareas
  if (tareas.length === 0) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            opacity: 0.8,
            fontSize: { xs: '1.1rem', md: '1.3rem' },
          }}
        >
          No tienes tareas asignadas
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2, md: 3 },
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, md: 3 }}>
        {tareas.map((tarea) => {
          const yaCerrada =
            tarea.todoStatus && ESTADOS_CERRADOS.includes(tarea.todoStatus);

          return (
            <Grid item xs={12} key={tarea.id}>
              <TareaCard
                tarea={tarea}
                actions={
                  subTab === 0 ? (
                    <>
                      {puedeApelar(tarea) && !tarea._apelada ? (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => abrirApelacion(tarea)}
                          sx={{
                            color: '#ffb74d',
                            borderColor: '#ffb74d',
                            fontWeight: 700,
                            '&:hover': { bgcolor: 'rgba(255,183,77,0.12)', borderColor: '#ffb74d' },
                          }}
                        >
                          Apelar calificación
                        </Button>
                      ) : null}
                      {!yaCerrada ? (
                        <Button
                          variant="contained"
                          size="small"
                          disabled={completandoId === tarea.id}
                          onClick={() => abrirEntrega(tarea)}
                          sx={{
                            bgcolor: '#00ff99',
                            color: '#002200',
                            fontWeight: 700,
                            '&:hover': { bgcolor: '#00cc7a' },
                          }}
                        >
                          {completandoId === tarea.id
                            ? 'Marcando...'
                            : 'Marcar completada'}
                        </Button>
                      ) : null}
                    </>
                  ) : null
                }
              />
            </Grid>
          );
        })}
      </Grid>

      {/* Dialog de apelación — el backend valida dueño, estado (calificada/pagada) y score<=3 */}
      <Dialog
        open={apelacion.open}
        onClose={cerrarApelacion}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Apelar calificación de tarea #{apelacion.tareaId}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              Solo se puede apelar si la tarea está{' '}
              <strong>calificada</strong> o <strong>pagada</strong> y el score
              recibido fue <strong>≤ {SCORE_UMBRAL_APELABLE}</strong>. Un socio/admin
              revisará tu solicitud y podrá re-pagar laborys si procede.
            </Alert>
            <TextField
              label="Motivo de la apelación *"
              placeholder="Explica por qué la calificación fue injusta (mín. 10 caracteres)"
              value={apelacion.motivo}
              onChange={(e) => setApelacion((p) => ({ ...p, motivo: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
              error={apelacion.motivo.trim().length > 0 && apelacion.motivo.trim().length < 10}
              helperText={
                apelacion.motivo.trim().length > 0 && apelacion.motivo.trim().length < 10
                  ? 'El motivo debe tener al menos 10 caracteres'
                  : ''
              }
            />
            <TextField
              label="Score que consideras justo (opcional, 1-5)"
              type="number"
              inputProps={{ min: 1, max: 5, step: 1 }}
              value={apelacion.scoreSolicitado}
              onChange={(e) => setApelacion((p) => ({ ...p, scoreSolicitado: e.target.value }))}
              fullWidth
              helperText="Si lo dejas vacío, el revisor decidirá el score final."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarApelacion} disabled={apelandoId === apelacion.tareaId}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={
              apelandoId === apelacion.tareaId ||
              apelacion.motivo.trim().length < 10
            }
            onClick={submitApelacion}
          >
            {apelandoId === apelacion.tareaId ? 'Enviando…' : 'Enviar apelación'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de entrega: notas + enlaces + archivos. El backend guarda
          notas/enlaces en la tarea (completar.js) y los archivos vía
          /tareas/subir-evidencia (se suben antes de marcar completada). */}
      <Dialog open={entrega.open} onClose={cerrarEntrega} fullWidth maxWidth="sm">
        <DialogTitle>Entregar tarea #{entrega.tareaId}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {entregaError && (
              <Alert severity="error" onClose={() => setEntregaError(null)}>
                {entregaError}
              </Alert>
            )}

            <TextField
              label="Notas (opcional)"
              placeholder="Describe lo que hiciste, comentarios para quien la revise..."
              value={entrega.notes}
              onChange={(e) => setEntrega((p) => ({ ...p, notes: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Enlaces (opcional)
              </Typography>
              <Stack spacing={1}>
                {entrega.enlaces.map((enlace, idx) => (
                  <Stack key={idx} direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="https://..."
                      value={enlace}
                      onChange={(e) => cambiarEnlace(idx, e.target.value)}
                    />
                    <IconButton
                      size="small"
                      onClick={() => quitarEnlace(idx)}
                      disabled={entrega.enlaces.length === 1 && !enlace}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Button
                size="small"
                startIcon={<AddLinkIcon />}
                onClick={agregarEnlace}
                sx={{ mt: 1 }}
              >
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
                disabled={archivosEntrega.length >= MAX_ARCHIVOS}
              >
                Elegir archivos
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={handleArchivosChange}
                />
              </Button>
              {archivosEntrega.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5, rowGap: 1 }}>
                  {archivosEntrega.map((f, idx) => (
                    <Chip
                      key={`${f.name}-${idx}`}
                      label={f.name}
                      onDelete={() => quitarArchivo(idx)}
                      size="small"
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarEntrega} disabled={completandoId === entrega.tareaId}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={completandoId === entrega.tareaId}
            onClick={submitEntrega}
            sx={{ bgcolor: '#00ff99', color: '#002200', '&:hover': { bgcolor: '#00cc7a' } }}
          >
            {completandoId === entrega.tareaId ? 'Entregando…' : 'Entregar tarea'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Tareas;