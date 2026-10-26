import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardActionArea, CircularProgress, Grid2 as Grid, Typography,
} from '@mui/material';
import repartidorService from '../../../services/Repartidor/repartidorService';
import { TarjetaPaso } from '../helpers';

/**
 * Paso 6 (spec §6.9, decisión 12): capacitación propia del MVP — cinco
 * módulos, examen de 10 preguntas, aprobado con >= 8. Las respuestas
 * correctas NUNCA viajan al cliente; la calificación es server-side y se
 * permiten reintentos. No hay aprobación automática por pasar el examen.
 */
const StepCapacitacion = ({ token, me, recargar, siguiente, toast }) => {
  const [cuestionario, setCuestionario] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    let vivo = true;
    repartidorService
      .obtenerCuestionario(token)
      .then((resp) => { if (vivo) setCuestionario(resp); })
      .catch((e) => { if (vivo) setCuestionario({ error: e.message }); });
    return () => { vivo = false; };
  }, [token]);

  const contestar = (qid, idx) => setRespuestas((prev) => ({ ...prev, [qid]: idx }));

  const enviar = async () => {
    setEnviando(true);
    try {
      const resp = await repartidorService.presentarExamen(token, respuestas);
      setResultado(resp);
      await recargar();
      if (resp.passed) toast?.success(`¡Examen aprobado! ${resp.score}/${resp.total}`);
      else toast?.info(`Intento registrado: ${resp.score}/${resp.total}. Puedes reintentar.`);
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (cuestionario?.error) return <Alert severity="error">{cuestionario.error}</Alert>;
  if (!cuestionario) return <CircularProgress sx={{ color: '#8A5CF5' }} />;

  const respondidas = Object.keys(respuestas).length;
  const todas = respondidas === cuestionario.preguntas.length;

  if (me?.data?.training?.status === 'aprobado' && !resultado) {
    return (
      <TarjetaPaso titulo="6. Capacitación">
        <Alert severity="success" sx={{ mb: 2 }}>
          Ya aprobaste el examen ({me.data.training.score}/10). Puedes continuar directamente.
        </Alert>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={() => siguiente(6)}
            sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' }, fontWeight: 700 }}
          >
            Ir al resumen final
          </Button>
        </Box>
      </TarjetaPaso>
    );
  }

  return (
    <TarjetaPaso titulo={`6. Capacitación (aprobado con ${cuestionario.aprobado_con}/10) `}>
      <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.8)' }}>
        Cinco módulos: vialidad, higiene, uso de la app, reglas básicas e incidentes.
        Dos preguntas por módulo; se contesta en una sola tanda y puedes reintentar.
      </Typography>

      {cuestionario.intentos?.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Intentos previos: {cuestionario.intentos.map((i) => `${i.score}/10${i.passed ? ' ✓' : ''}`).join(' · ')}
        </Alert>
      )}

      {resultado && (
        <Alert severity={resultado.passed ? 'success' : 'warning'} sx={{ mb: 2 }}>
          Resultado del intento: <strong>{resultado.score}/{resultado.total}</strong>
          {resultado.passed ? ' — ¡aprobado!' : ' — aún no apruebas; revisa e reintenta.'}
        </Alert>
      )}

      <Grid container spacing={2}>
        {cuestionario.preguntas.map((p, idx) => (
          <Grid key={p.id} size={{ xs: 12 }}>
            <Typography variant="subtitle2" sx={{ color: '#8A5CF5', mb: 1 }}>
              Módulo {p.modulo} · Pregunta {idx + 1} de {cuestionario.preguntas.length}
            </Typography>
            <Typography variant="body1" sx={{ color: '#fff', mb: 1 }}>{p.pregunta}</Typography>
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
              {p.opciones.map((op, i) => (
                <Card
                  key={i}
                  variant="outlined"
                  sx={{
                    borderColor: respuestas[p.id] === i ? '#8A5CF5' : 'rgba(255,255,255,0.12)',
                    bgcolor: respuestas[p.id] === i ? 'rgba(138,92,245,0.18)' : 'transparent',
                  }}
                >
                  <CardActionArea onClick={() => contestar(p.id, i)} sx={{ px: 2, py: 1 }}>
                    <Typography variant="body2" sx={{ color: '#fff' }}>{op}</Typography>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Typography variant="caption" sx={{ alignSelf: 'center', color: 'rgba(255,255,255,0.6)' }}>
          {respondidas}/{cuestionario.preguntas.length} respondidas
        </Typography>
        <Button
          variant="contained"
          disabled={!todas || enviando}
          onClick={enviar}
          sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' }, fontWeight: 700 }}
        >
          {enviando ? 'Calificando…' : 'Enviar examen'}
        </Button>
      </Box>

      {resultado?.passed && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => siguiente(6)}
            sx={{ color: '#fff', borderColor: 'rgba(138,92,245,0.5)' }}
          >
            Continuar al resumen →
          </Button>
        </Box>
      )}
    </TarjetaPaso>
  );
};

export default StepCapacitacion;
