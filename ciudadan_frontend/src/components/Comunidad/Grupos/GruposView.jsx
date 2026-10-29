// src/components/Comunidad/Grupos/GruposView.jsx
// Vista de Grupos de Ciudadan Social con datos REALES de Strapi.
//
// Los grupos son las `agencias` del backend (nodos con miembros y socios). El
// CTA de WhatsApp NO lleva URL fija: sale de la configuracion publica del
// backend; si no hay una URL https valida, el CTA no se muestra.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';

import {
  listarGrupos,
  obtenerUrlWhatsapp,
} from '../../../services/comunidad/comunidadGruposService';

const normalizar = (texto) =>
  String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const GruposView = ({ query = '', onSelectGrupo = null }) => {
  const [grupos, setGrupos] = useState([]);
  const [whatsappUrl, setWhatsappUrl] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;

    listarGrupos()
      .then((datos) => {
        if (vigente) setGrupos(datos);
      })
      .catch((fallo) => {
        if (vigente) setError(fallo?.message || 'No se pudieron cargar los grupos');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    obtenerUrlWhatsapp().then((url) => {
      if (vigente) setWhatsappUrl(url);
    });

    return () => {
      vigente = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = normalizar(query).trim();
    if (!q) return grupos;

    return grupos.filter((grupo) =>
      [grupo.title, grupo.subtitle, grupo.tipo, grupo.localidad]
        .map(normalizar)
        .join(' ')
        .includes(q)
    );
  }, [grupos, query]);

  if (cargando) {
    return (
      <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 3 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          Cargando grupos…
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        {error}. Los grupos se muestran cuando el backend habilita la lectura pública de
        agencias.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 1 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ px: 1, py: 1 }}
      >
        <Typography variant="subtitle2">Grupos ({filtrados.length})</Typography>
        {whatsappUrl && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ChatIcon />}
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Entrar al grupo de WhatsApp
          </Button>
        )}
      </Stack>

      {!grupos.length ? (
        <Alert severity="info" sx={{ m: 1 }}>
          Todavía no hay grupos registrados en Ciudadan Social.
        </Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 1.5,
          }}
        >
          {filtrados.map((grupo) => (
            <Paper
              key={grupo.id}
              variant="outlined"
              onClick={() => onSelectGrupo && onSelectGrupo(grupo)}
              sx={{
                p: 1.5,
                cursor: onSelectGrupo ? 'pointer' : 'default',
                '&:hover': { borderColor: 'primary.light' },
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ width: 40, height: 40, fontSize: 15 }}>
                  {grupo.avatar}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {grupo.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {grupo.subtitle}
                  </Typography>
                </Box>
              </Stack>

              {grupo.localidad ? (
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
                  {grupo.localidad}
                </Typography>
              ) : null}

              <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap' }}>
                {grupo.tipo && <Chip size="small" label={grupo.tipo} />}
                {grupo.totalAudited > 0 && (
                  <Chip size="small" variant="outlined" label={`${grupo.totalAudited} auditados`} />
                )}
                {grupo.trustScore !== null && grupo.trustScore !== undefined && (
                  <Chip size="small" variant="outlined" label={`confianza ${grupo.trustScore}`} />
                )}
              </Stack>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default GruposView;
