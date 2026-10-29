// src/components/Comunidad/Contactos/ContactosView.jsx
// Vista de contactos de Ciudadan Social con datos REALES de Strapi.
//
// Los contactos son las personas que forman parte de las agencias
// (members/socios): no hay un content-type "contacto" en el backend, asi que
// la fuente de verdad son esas relaciones.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { listarContactos } from '../../../services/comunidad/comunidadContactosService';

const normalizar = (texto) =>
  String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const ContactosView = ({ query = '', onSelectContacto = null }) => {
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;

    listarContactos()
      .then((datos) => {
        if (vigente) setContactos(datos);
      })
      .catch((fallo) => {
        if (vigente) setError(fallo?.message || 'No se pudieron cargar los contactos');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = normalizar(query).trim();
    if (!q) return contactos;

    return contactos.filter((contacto) =>
      [contacto.title, contacto.subtitle, contacto.agencia]
        .map(normalizar)
        .join(' ')
        .includes(q)
    );
  }, [contactos, query]);

  if (cargando) {
    return (
      <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 3 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          Cargando contactos…
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        {error}. Los contactos se muestran cuando el backend habilita la lectura pública
        de agencias y sus miembros.
      </Alert>
    );
  }

  if (!contactos.length) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        Todavía no hay contactos registrados en Ciudadan Social.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" sx={{ px: 1, py: 1 }}>
        Contactos ({filtrados.length})
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: 1.5,
        }}
      >
        {filtrados.map((contacto) => (
          <Paper
            key={contacto.id}
            variant="outlined"
            onClick={() => onSelectContacto && onSelectContacto(contacto)}
            sx={{
              p: 1.5,
              cursor: onSelectContacto ? 'pointer' : 'default',
              '&:hover': { borderColor: 'primary.light' },
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ width: 40, height: 40, fontSize: 15 }}>
                {contacto.avatar}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {contacto.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="div">
                  {contacto.subtitle}
                </Typography>
              </Box>
            </Stack>
            {contacto.tags?.length ? (
              <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                {contacto.tags.slice(0, 3).map((tag) => (
                  <Chip key={tag} size="small" variant="outlined" label={tag} />
                ))}
              </Stack>
            ) : null}
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default ContactosView;
