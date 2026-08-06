import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  Pagination,
  Card,
  Stack,
  CardContent,
  Chip,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import usePreguntasProducto from '../../hooks/usePreguntasProductos';
import PreguntaProductoCard from './PreguntaProductoCard';

const PreguntasProductos = ({ storeId }) => {
  const { enqueueSnackbar } = useSnackbar();
  const { obtenerPreguntasTienda, registrarRespuesta, loading } = usePreguntasProducto();

  const [preguntas, setPreguntas] = useState([]);
  // Nuevos estados
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pagination, setPagination] = useState(null);

  const getStatus = () => {

    switch (tab) {

      case 1:
        return "publicada";

      case 2:
        return "respondida";

      default:
        return "";
    }

  };

  const cargarPreguntas = async (store_id) => {
    try {
      const { data, meta } = await obtenerPreguntasTienda({
        storeId: store_id,
        status: getStatus(),
        page,
        pageSize
      });

      const preguntasConDraft = (data ?? []).map(item => ({
        ...item,
        draftAnswer: item?.attributes?.respuesta ?? ""
      }));

      setPreguntas(preguntasConDraft);
      setPagination(meta?.pagination);
    } catch (error) {
      setPreguntas([]);
      setPagination(null);
    }
  }

  const handleChange = (id, value) => {
    setPreguntas(prev =>
      prev.map(p =>
        p.id === id
          ? {
            ...p,
            draftAnswer: value
          }
          : p
      )
    );
  };

  const handleResponder = async (pregunta) => {
    if (!pregunta?.draftAnswer?.trim()) {
      enqueueSnackbar("Escribe una respuesta antes de enviar", { variant: "warning" });
      return;
    }
    try {
      const preguntaRespondida = await registrarRespuesta(pregunta.id, pregunta.draftAnswer);
      console.log("Pregunta respondida:", preguntaRespondida);
      enqueueSnackbar("Respuesta guardada", { variant: "success" });
      setPreguntas(prev =>
        prev.map(p =>
          p.id === pregunta.id
            ? {
              ...pregunta,
              attributes: { ...pregunta?.attributes, ...preguntaRespondida?.attributes },
              draftAnswer: preguntaRespondida?.attributes?.respuesta ?? ''
            }
            : p
        )
      );
    } catch (error) {
      console.error("Error al guardar respuesta:", error);
      enqueueSnackbar("Error al guardar respuesta", { variant: "error" });
    }
  };

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    if (!storeId) return;
    cargarPreguntas(storeId);
  }, [storeId, page, tab]);

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>;
  }

  return (
    <Box width="100%" p={3}>
      <Tabs
        value={tab}
        onChange={(e, value) => setTab(value)}
        sx={{
          mb: 1
        }}
      >
        <Tab label="Todas" />
        <Tab label="Pendientes" />
        <Tab label="Respondidas" />
      </Tabs>
      {/* Renderización de preguntas */}
      {
        preguntas?.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center">
            <Typography>Sin preguntas registradas</Typography>
          </Box>
        ) : preguntas.map((p) => (
          <PreguntaProductoCard
            key={`pregunta-producto-item-${p?.id}`}
            pregunta={p}
            onChange={handleChange}
            onAnswer={handleResponder}
          />
        ))
      }
      <Box display="flex" justifyContent="center" alignItems="center" my={2}>
        <Pagination
          page={page}
          count={pagination?.pageCount || 1}
          color="primary"
          onChange={(e, value) => setPage(value)}
        />
      </Box>
    </Box>
  );
};

export default PreguntasProductos;
