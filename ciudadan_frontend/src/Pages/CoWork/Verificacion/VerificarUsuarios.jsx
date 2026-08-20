// src/Pages/CoWork/Verificacion/VerificarUsuarios.jsx
//
// Cola de verificación de áreas/subáreas (spec: "Un socio/verificador
// revisa documentos y marca el área como verificada o en proceso").
// Reemplaza a UserVerification.jsx, que estaba huérfano (ningún route lo
// importaba) y además usaba Ant Design (no instalado) — nunca funcionó.
//
// Muestra, para cada usuario con algo pendiente:
//   - Áreas asignadas sin verificar (o con documentos nuevos) -> Verificar/
//     Pendiente/Rechazar (POST /areas/verificar-area vía useTarea.verificarArea).
//   - Propuestas de subárea (carrera/oficio en texto libre) pendientes ->
//     Aprobar (crea la subárea real y la asigna) / Rechazar
//     (POST /users/:id/revisar-subarea, endpoint nuevo).
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Link as MuiLink,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import { useRoles } from '../../../Contexts/RolesContext';
import { useTarea } from '../../../hooks/useTarea';
import { revisarSubarea } from '../../../services/cowork/mutationsServices';
import { getUsuariosParaVerificacion } from '../../../services/cowork/queryServices';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL || 'http://localhost:33032';

const badge = (status) => {
  if (status === 'verified') return <Chip size="small" color="success" label="✓ Verificada" />;
  if (status === 'rejected') return <Chip size="small" color="error" label="✕ Rechazada" />;
  return <Chip size="small" color="warning" label="⏳ Pendiente" />;
};

export default function VerificarUsuarios() {
  const { isAdmin, isSocio, isVerificador } = useRoles();
  const puedeVerificar = isAdmin() || isSocio() || isVerificador();
  const { getAccessTokenSilently } = useAuth0();
  const { verificarArea } = useTarea();

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [obsPorArea, setObsPorArea] = useState({});
  const [motivoPorPropuesta, setMotivoPorPropuesta] = useState({});
  const [busyKey, setBusyKey] = useState(null);

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({
        authorizationParams: { audience: 'https://api.ciudadan.org' },
      });
    } catch {
      return null;
    }
  }, [getAccessTokenSilently]);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const json = await getUsuariosParaVerificacion(token);
      setUsuarios(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (puedeVerificar) fetchUsuarios();
  }, [puedeVerificar, fetchUsuarios]);

  if (!puedeVerificar) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="error">
          Solo administradores, socios o verificadores pueden acceder a esta herramienta.
        </Alert>
      </Box>
    );
  }

  const handleSetStatus = async (userId, areaId, status) => {
    const key = `area-${userId}-${areaId}`;
    const observaciones = (obsPorArea[key] || '').trim();
    if (status === 'rejected' && !observaciones) {
      setError('Para rechazar un área, escribe una observación explicando por qué.');
      return;
    }
    setError(null);
    setBusyKey(key);
    try {
      await verificarArea({ userId, areaId, status, observaciones });
      await fetchUsuarios();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la verificación');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRevisarPropuesta = async (userId, propuesta, decision) => {
    const key = `prop-${userId}-${propuesta.areaId}-${propuesta.nombre}`;
    const motivo = (motivoPorPropuesta[key] || '').trim();
    if (decision === 'rejected' && !motivo) {
      setError('Para rechazar una propuesta, escribe un motivo.');
      return;
    }
    setError(null);
    setBusyKey(key);
    try {
      const token = await getToken();
      await revisarSubarea(
        userId,
        { areaId: propuesta.areaId, nombre: propuesta.nombre, decision, motivo },
        token
      );
      await fetchUsuarios();
    } catch (err) {
      setError(err.message || 'No se pudo revisar la propuesta');
    } finally {
      setBusyKey(null);
    }
  };

  const cola = usuarios
    .map((u) => {
      const details = u.area_details && typeof u.area_details === 'object' ? u.area_details : {};
      const areas = Array.isArray(u.areas) ? u.areas : [];
      const areasPendientes = areas.filter((a) => {
        const entry = details[String(a.id)] || details[a.id];
        const status = entry?.status || 'pending';
        return status === 'pending';
      });
      const propuestas = Array.isArray(details.proposed_subareas) ? details.proposed_subareas : [];
      const propuestasPendientes = propuestas.filter((p) => !p.estado || p.estado === 'pending');
      return { user: u, details, areasPendientes, propuestasPendientes };
    })
    .filter((x) => x.areasPendientes.length > 0 || x.propuestasPendientes.length > 0);

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Verificación de áreas
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Revisa la documentación que cada usuario subió y marca su área como verificada o
        rechazada. También puedes aprobar o rechazar propuestas de carreras/oficios nuevos.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : cola.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">No hay nada pendiente de verificación 🎉</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {cola.map(({ user, details, areasPendientes, propuestasPendientes }) => (
            <Paper key={user.id} variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {user.username || user.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>

              {areasPendientes.map((a) => {
                const entry = details[String(a.id)] || details[a.id] || {};
                const documentos = Array.isArray(entry.documentos) ? entry.documentos : [];
                const key = `area-${user.id}-${a.id}`;
                const busy = busyKey === key;
                return (
                  <Box key={a.id} sx={{ mt: 2, pl: 1, borderLeft: '3px solid', borderColor: 'warning.main' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {a.name}
                      </Typography>
                      {badge(entry.status || 'pending')}
                    </Stack>

                    {documentos.length > 0 ? (
                      <Stack spacing={0.25} sx={{ mb: 1 }}>
                        {documentos.map((d, i) => (
                          <MuiLink
                            key={i}
                            href={d.url?.startsWith('http') ? d.url : `${STRAPI_URL}${d.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="caption"
                          >
                            📄 {d.nombre || d.name || `documento ${i + 1}`}
                          </MuiLink>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        El usuario aún no subió ningún documento para esta área.
                      </Typography>
                    )}

                    <TextField
                      size="small"
                      placeholder="Observaciones (requerido si rechazas)"
                      value={obsPorArea[key] || ''}
                      onChange={(e) => setObsPorArea((p) => ({ ...p, [key]: e.target.value }))}
                      fullWidth
                      disabled={busy}
                      sx={{ mb: 1, maxWidth: 400 }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={busy}
                        onClick={() => handleSetStatus(user.id, a.id, 'verified')}
                      >
                        Verificar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={busy}
                        onClick={() => handleSetStatus(user.id, a.id, 'rejected')}
                      >
                        Rechazar
                      </Button>
                    </Stack>
                  </Box>
                );
              })}

              {propuestasPendientes.map((p, i) => {
                const key = `prop-${user.id}-${p.areaId}-${p.nombre}`;
                const busy = busyKey === key;
                return (
                  <Box key={i} sx={{ mt: 2, pl: 1, borderLeft: '3px solid', borderColor: 'info.main' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Propone: "{p.nombre}"{' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        (subárea nueva bajo {p.areaName})
                      </Typography>
                    </Typography>
                    {p.observaciones && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {p.observaciones}
                      </Typography>
                    )}
                    <TextField
                      size="small"
                      placeholder="Motivo (requerido si rechazas)"
                      value={motivoPorPropuesta[key] || ''}
                      onChange={(e) => setMotivoPorPropuesta((p2) => ({ ...p2, [key]: e.target.value }))}
                      fullWidth
                      disabled={busy}
                      sx={{ my: 1, maxWidth: 400 }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={busy}
                        onClick={() => handleRevisarPropuesta(user.id, p, 'approved')}
                      >
                        Aprobar (crea la subárea)
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        disabled={busy}
                        onClick={() => handleRevisarPropuesta(user.id, p, 'rejected')}
                      >
                        Rechazar
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Paper>
          ))}
        </Stack>
      )}
      <Divider sx={{ my: 3 }} />
    </Box>
  );
}
