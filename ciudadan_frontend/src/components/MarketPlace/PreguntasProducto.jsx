import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const PreguntasProducto = () => {
  const { slug } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const [preguntas, setPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answerMap, setAnswerMap] = useState({});
  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL.replace(/\/$/, '') + '/api';

  useEffect(() => {
    const fetchPreguntas = async () => {
      try {
        const url = `${STRAPI_URL}/preguntas-productos?populate=*&filters[store][slug][$eq]=${slug}&sort=fechapregunta:asc`;
        const res = await axios.get(url);
        setPreguntas(res.data.data || []);
      } catch (err) {
        console.error('Error cargando preguntas:', err);
        enqueueSnackbar('Error al cargar preguntas', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchPreguntas();
  }, [slug]);

  const handleChange = (id, value) => {
    setAnswerMap(prev => ({ ...prev, [id]: value }));
  };

  const handleResponder = async (pregunta) => {
    const id = pregunta.id;
    const respuesta = answerMap[id];
    if (!respuesta) {
      enqueueSnackbar('Escribe una respuesta antes de enviar', { variant: 'warning' });
      return;
    }
    try {
      await axios.put(
        `${STRAPI_URL}/preguntas-productos/${id}`,
        { data: { respuesta, status: 'respondida', fecharespuesta: new Date().toISOString() } }
      );
      enqueueSnackbar('Respuesta guardada', { variant: 'success' });
      // actualizar estado local
      setPreguntas(prev => prev.map(p => p.id === id ? { ...p, attributes: { ...p.attributes, respuesta, status: 'respondida', fecharespuesta: new Date().toISOString() } } : p));
    } catch (err) {
      console.error('Error respondiendo pregunta:', err);
      enqueueSnackbar('Error al guardar respuesta', { variant: 'error' });
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  // separar
  const publicadas = preguntas.filter(p => p.attributes.status === 'publicada');
  const respondidas = preguntas.filter(p => p.attributes.status === 'respondida');

  const renderPublicadas = () => (
    <Box mb={4}>
      <Typography variant="h5" gutterBottom>Preguntas sin responder</Typography>
      {publicadas.length === 0 && <Typography>No hay preguntas pendientes.</Typography>}
      {publicadas.map(p => (
        <Box key={p.id} mb={3}>
          <Typography><strong>Pregunta:</strong> {p.attributes.pregunta}</Typography>
          <TextField
            multiline
            minRows={2}
            placeholder="Escribe tu respuesta..."
            fullWidth
            sx={{ mt: 1 }}
            value={answerMap[p.id] || ''}
            onChange={e => handleChange(p.id, e.target.value)}
          />
          <Button
            variant="contained"
            sx={{ mt: 1 }}
            onClick={() => handleResponder(p)}
          >
            Responder
          </Button>
          <Divider sx={{ my: 2 }} />
        </Box>
      ))}
    </Box>
  );

  const renderRespondidas = () => (
    <Box mb={4}>
      <Typography variant="h5" gutterBottom>Preguntas respondidas</Typography>
      {respondidas.length === 0 && <Typography>No hay preguntas respondidas.</Typography>}
      {respondidas.map(p => (
        <Box key={p.id} mb={2}>
          <Typography><strong>Pregunta:</strong> {p.attributes.pregunta}</Typography>
          <Typography sx={{ mt: 0.5 }}><strong>Respuesta:</strong> {p.attributes.respuesta}</Typography>
          <Divider sx={{ my: 2 }} />
        </Box>
      ))}
    </Box>
  );

  return (
    <Box width="100%" p={3}>
      {renderPublicadas()}
      {renderRespondidas()}
    </Box>
  );
};

export default PreguntasProducto;
