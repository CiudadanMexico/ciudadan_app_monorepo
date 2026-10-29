// src/components/Comunidad/Chats/ChatsView.jsx
// Vista de conversaciones de Ciudadan Social con datos REALES de Strapi.
//
// A diferencia del placeholder del contenedor de pestanas (MOCK_CONTENT /
// CHAT_THREADS), esta vista lista los mensajes que existen en el content-type
// `message` y arma los hilos a partir de ellos.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import {
  listarConversaciones,
} from '../../../services/comunidad/comunidadChatsService';

const normalizar = (texto) =>
  String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const ChatsView = ({ threadId = null, onOpenThread = null, query = '' }) => {
  const [conversaciones, setConversaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;

    listarConversaciones()
      .then((datos) => {
        if (vigente) setConversaciones(datos);
      })
      .catch((fallo) => {
        if (vigente) setError(fallo?.message || 'No se pudieron cargar las conversaciones');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const filtradas = useMemo(() => {
    const q = normalizar(query).trim();
    if (!q) return conversaciones;

    return conversaciones.filter((conversacion) => {
      const haystack = [
        conversacion.title,
        conversacion.subtitle,
        ...(conversacion.messages || []).map((mensaje) => mensaje.texto),
      ]
        .map(normalizar)
        .join(' ');
      return haystack.includes(q);
    });
  }, [conversaciones, query]);

  const seleccionada = useMemo(
    () => conversaciones.find((conversacion) => String(conversacion.id) === String(threadId)) || null,
    [conversaciones, threadId]
  );

  if (cargando) {
    return (
      <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 3 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          Cargando conversaciones…
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        {error}. Las conversaciones se muestran cuando el backend habilita la lectura
        pública de mensajes.
      </Alert>
    );
  }

  if (!conversaciones.length) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Todavía no hay mensajes en Ciudadan Social. Cuando se publiquen, aquí aparecerán
        las conversaciones.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 320px) 1fr' }, gap: 2 }}>
      <Paper variant="outlined" sx={{ p: 1 }}>
        <Typography variant="subtitle2" sx={{ px: 1, py: 1 }}>
          Conversaciones ({filtradas.length})
        </Typography>
        <Divider />
        <Stack spacing={0.5} sx={{ p: 0.5 }}>
          {filtradas.map((conversacion) => {
            const activo = String(conversacion.id) === String(threadId);
            const ultimo = (conversacion.messages || [])[0];

            return (
              <Paper
                key={conversacion.id}
                variant={activo ? 'elevation' : 'outlined'}
                onClick={() => onOpenThread && onOpenThread(conversacion.id)}
                sx={{
                  p: 1.2,
                  cursor: onOpenThread ? 'pointer' : 'default',
                  borderColor: activo ? 'primary.main' : 'divider',
                  '&:hover': { borderColor: 'primary.light' },
                }}
              >
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Avatar sx={{ width: 36, height: 36, fontSize: 14 }}>
                    {conversacion.avatar}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {conversacion.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {ultimo?.texto || conversacion.subtitle}
                    </Typography>
                  </Box>
                  {conversacion.unreadCount > 0 && (
                    <Chip size="small" color="primary" label={conversacion.unreadCount} />
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, minHeight: 220 }}>
        {!seleccionada ? (
          <Typography variant="body2" color="text.secondary">
            Selecciona una conversación para ver los mensajes.
          </Typography>
        ) : (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {seleccionada.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {seleccionada.messagesCount} mensajes
              {seleccionada.ultimoActividad
                ? ` · última actividad ${new Date(seleccionada.ultimoActividad).toLocaleString('es-MX')}`
                : ''}
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={1.2}>
              {(seleccionada.messages || []).map((mensaje) => (
                <Box
                  key={mensaje.id ?? `${mensaje.emisor}-${mensaje.timestamp}`}
                  sx={{
                    alignSelf: mensaje.sinLeer ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    p: 1.2,
                    borderRadius: 2,
                    bgcolor: mensaje.sinLeer ? 'primary.main' : 'grey.100',
                    color: mensaje.sinLeer ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.75 }} component="div">
                    {mensaje.emisor}
                    {mensaje.hora ? ` · ${mensaje.hora}` : ''}
                  </Typography>
                  <Typography variant="body2">{mensaje.texto}</Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ChatsView;
