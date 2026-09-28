import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Button, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { getTareasByUsuario } from '../../services/cowork/queryServices';

/**
 * Evaluation-Token: evaluaciones REALES del usuario.
 *
 * Fuente: `/api/tareas/filtrar?usuarioId=<mi id>` (endpoint existente con ACL
 * server-side: un usuario no privilegiado sólo puede listar SUS resoluciones)
 * y el campo JSON `calificaciones` que escribe `/api/tareas/calificar` con la
 * forma { score, notes, reviewed_by, fecha }.
 *
 * Estados cubiertos: loading / error / vacío / con datos.
 * NO se generan evaluaciones ficticias: sin datos se muestra el vacío.
 */

const formatFecha = (valor) => {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
};

const TareaRow = ({ titulo, score, notes, reviewedBy, fecha }) => (
  <Box
    sx={{
      p: 1.5,
      borderRadius: 2,
      bgcolor: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.08)',
      textAlign: 'left',
      width: '100%',
    }}
  >
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, pr: 1 }}>{titulo}</Typography>
      {score !== null && score !== undefined && (
        <Chip
          size="small"
          label={`${Number(score)} / 10`}
          sx={{ bgcolor: 'rgba(46,230,200,0.18)', color: '#8ee9d6', fontWeight: 700 }}
        />
      )}
    </Stack>
    {notes && (
      <Typography
        sx={{ fontSize: 12, mt: 0.5, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}
      >
        “{notes}”
      </Typography>
    )}
    <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
      {reviewedBy && (
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          Evaluó: {reviewedBy}
        </Typography>
      )}
      {fecha && (
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{fecha}</Typography>
      )}
    </Stack>
  </Box>
);

const Cargando = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
    <CircularProgress size={22} sx={{ color: '#2ee6c8' }} />
  </Box>
);

const BloqueError = ({ mensaje, onRetry }) => (
  <Box sx={{ mt: 1 }}>
    <Typography sx={{ fontSize: 12, color: '#ff8a8a' }}>{mensaje}</Typography>
    <Button size="small" onClick={onRetry} sx={{ mt: 0.5, color: '#c9b4ff', fontSize: 11 }}>
      Reintentar
    </Button>
  </Box>
);

const TokenEvaluation = ({ userId, isAuthenticated }) => {
  const { getAccessTokenSilently } = useAuth0();
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [estado, setEstado] = useState('idle'); // idle | loading | error | ok
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setEvaluaciones([]);
      setEstado('idle');
      return;
    }
    setEstado('loading');
    setError(null);
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      }).catch(() => null);
      const json = await getTareasByUsuario(userId, token);
      const tareas = Array.isArray(json?.data) ? json.data : [];

      // Cada entrada de `calificaciones` es una evaluación.
      const planas = [];
      tareas.forEach((tarea) => {
        const titulo = tarea?.todo?.titulo || tarea?.titulo || `Tarea #${tarea?.id}`;
        const calificaciones = Array.isArray(tarea?.calificaciones) ? tarea.calificaciones : [];
        calificaciones.forEach((cal) => {
          planas.push({
            key: `${tarea.id}-${cal?.fecha || planas.length}`,
            titulo,
            score: cal?.score ?? null,
            notes: cal?.notes || null,
            reviewedBy: cal?.reviewed_by || null,
            fecha: cal?.fecha || tarea?.resolved_at || null,
          });
        });
      });
      planas.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

      setEvaluaciones(planas);
      setEstado('ok');
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar tus evaluaciones');
      setEvaluaciones([]);
      setEstado('error');
    }
  }, [getAccessTokenSilently, isAuthenticated, userId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const promedio = useMemo(() => {
    const conScore = evaluaciones.filter((e) => e.score !== null && e.score !== undefined);
    if (conScore.length === 0) return null;
    return conScore.reduce((acc, e) => acc + Number(e.score), 0) / conScore.length;
  }, [evaluaciones]);

  if (!isAuthenticated) {
    return (
      <Typography sx={{ mt: 1, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
        Inicia sesión para ver tus evaluaciones.
      </Typography>
    );
  }

  if (estado === 'loading' || estado === 'idle') return <Cargando />;
  if (estado === 'error') return <BloqueError mensaje={error} onRetry={cargar} />;

  if (evaluaciones.length === 0) {
    return (
      <Box sx={{ mt: 1, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
          Aún no has resuelto tareas a calificar.
        </Typography>
        <Typography sx={{ fontSize: 11, mt: 0.5, color: 'rgba(255,255,255,0.6)' }}>
          Cuando completes trabajos dentro de Coowork y sean evaluados, tus evaluaciones aparecerán
          aquí.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1, width: '100%' }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" sx={{ mb: 1.5 }}>
        <Chip
          size="small"
          label={`${evaluaciones.length} evaluación${evaluaciones.length === 1 ? '' : 'es'}`}
          sx={{ bgcolor: 'rgba(138,92,245,0.22)', color: '#e5dcff', fontWeight: 600 }}
        />
        {promedio !== null && (
          <Chip
            size="small"
            label={`Promedio ${promedio.toFixed(2)} / 10`}
            sx={{ bgcolor: 'rgba(46,230,200,0.18)', color: '#8ee9d6', fontWeight: 700 }}
          />
        )}
      </Stack>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 1.5 }} />

      <Stack spacing={1} sx={{ maxHeight: 260, overflowY: 'auto', pr: 0.5 }}>
        {evaluaciones.map((evaluacion) => (
          <TareaRow
            key={evaluacion.key}
            titulo={evaluacion.titulo}
            score={evaluacion.score}
            notes={evaluacion.notes}
            reviewedBy={evaluacion.reviewedBy}
            fecha={formatFecha(evaluacion.fecha)}
          />
        ))}
      </Stack>

      <Button size="small" onClick={cargar} sx={{ mt: 1, color: '#c9b4ff', fontSize: 11 }}>
        Actualizar
      </Button>
    </Box>
  );
};

export default TokenEvaluation;

