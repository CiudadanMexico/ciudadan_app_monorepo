import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRoles } from '../../Contexts/RolesContext.jsx';
import useAuth0Token from '../../hooks/useAuth0Token.jsx';
import { getMisPostulaciones, resolverPostulacion } from '../../services/cowork/candidatosService.js';

const MORADO = '#8A5CF5';
const MORADO_OSCURO = '#6A3FCB';
const fondo = '#0d0b1a';
const panelBorder = 'rgba(138,92,245,0.28)';
const fontStack = '"Space Grotesk", "Poppins", system-ui, sans-serif';

const ESTADOS = ['pendiente', 'revisada', 'contactada', 'aceptada', 'rechazada'];

const ESTADO_COLOR = {
  pendiente: 'default',
  revisada: 'info',
  contactada: 'warning',
  aceptada: 'success',
  rechazada: 'error',
};

const attr = (o, campo) => (o?.attributes?.[campo] ?? o?.[campo] ?? null);

export default function Postulaciones() {
  const navigate = useNavigate();
  const { isAdmin, isSocio, isRoot } = useRoles();
  const getToken = useAuth0Token();

  const puedeVer = isAdmin() || isSocio() || isRoot();

  const [items, setItems] = useState([]);
  const [agencia, setAgencia] = useState(null);
  const [esRoot, setEsRoot] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [dialog, setDialog] = useState(null);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await getMisPostulaciones(token);
      setItems(Array.isArray(res?.data) ? res.data : []);
      setAgencia(res?.agencia || null);
      setEsRoot(Boolean(res?.esRoot));
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las postulaciones');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (puedeVer) cargar();
    else setLoading(false);
  }, [puedeVer, cargar]);

  const filtradas = useMemo(() => {
    const norm = (p) => ({ ...p, _estado: attr(p, 'estado') || 'pendiente' });
    const all = items.map(norm);
    if (filtro === 'todas') return all;
    return all.filter((p) => p._estado === filtro);
  }, [items, filtro]);

  const abrirResolver = (p) => {
    setDialog({ id: p.id, nombre: attr(p, 'nombre_completo') || 'Candidato' });
    setNotas(attr(p, 'notas') || '');
  };

  const confirmarResolver = async (nuevoEstado) => {
    if (!dialog) return;
    setGuardando(true);
    try {
      const token = await getToken();
      await resolverPostulacion(dialog.id, { estado: nuevoEstado, notas }, token);
      setDialog(null);
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la postulación');
    } finally {
      setGuardando(false);
    }
  };

  if (!puedeVer) {
    return (
      <Box sx={{ minHeight: '60vh', bgcolor: fondo, p: 4, fontFamily: fontStack }}>
        <Alert severity="warning" sx={{ maxWidth: 640, mx: 'auto' }}>
          Esta sección es solo para administradores, socios o root de una agencia.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: fondo, py: { xs: 4, md: 7 }, px: 2, fontFamily: fontStack }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ color: '#cfcfe6', mb: 2, textTransform: 'none', fontFamily: fontStack }}
        >
          Volver
        </Button>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" gap={1}>
          <Typography variant="h4" fontWeight={900} color="#fff" sx={{ fontFamily: fontStack }}>
            <span style={{ color: MORADO }}>Postulaciones</span>
          </Typography>
          <Typography color="#cfcfe6" sx={{ fontFamily: fontStack }}>
            {agencia?.nombre ? `Agencia: ${agencia.nombre}` : ''}
          </Typography>
        </Stack>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel sx={{ color: '#cfcfe6' }}>Estado</InputLabel>
            <Select
              label="Estado"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              sx={{ color: '#fff', '.MuiSvgIcon-root': { color: '#cfcfe6' } }}
            >
              <MenuItem value="todas">Todas</MenuItem>
              {ESTADOS.map((es) => (
                <MenuItem key={es} value={es}>{es}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={cargar} sx={{ color: MORADO, borderColor: MORADO, textTransform: 'none' }}>
            Actualizar
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'rgba(138,92,245,0.06)', border: `1px solid ${panelBorder}` }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: MORADO }} />
            </Box>
          ) : filtradas.length === 0 ? (
            <Typography sx={{ opacity: 0.7, color: '#cfcfe6', fontFamily: fontStack }}>
              No hay postulaciones{esRoot ? '' : ' en tu agencia'} por ahora.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {filtradas.map((p) => {
                const estado = p._estado;
                const area = attr(p, 'area')?.data?.attributes?.name || attr(p, 'area')?.name || null;
                const cv = attr(p, 'cv');
                const cvUrl = cv?.url ? `${process.env.REACT_APP_STRAPI_URL || ''}${cv.url}` : null;
                return (
                  <Paper
                    key={p.id}
                    sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: `1px solid ${panelBorder}` }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography sx={{ color: '#fff', fontWeight: 700 }}>
                          {attr(p, 'nombre_completo') || 'Sin nombre'}
                        </Typography>
                        <Typography sx={{ color: '#cfcfe6', fontSize: '0.9rem' }}>
                          {attr(p, 'email')}
                          {attr(p, 'telefono') ? ` · ${attr(p, 'codigo_pais') || ''} ${attr(p, 'telefono')}` : ''}
                        </Typography>
                        {area && (
                          <Typography sx={{ color: '#9a9ab5', fontSize: '0.82rem' }}>{area}</Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={estado} color={ESTADO_COLOR[estado] || 'default'} size="small" />
                        <Button size="small" variant="outlined" onClick={() => abrirResolver(p)} sx={{ color: MORADO, borderColor: MORADO, textTransform: 'none' }}>
                          Gestionar
                        </Button>
                      </Stack>
                    </Stack>
                    {attr(p, 'descripcion') && (
                      <Typography sx={{ color: '#cfcfe6', fontSize: '0.9rem', mt: 1, whiteSpace: 'pre-wrap' }}>
                        {attr(p, 'descripcion')}
                      </Typography>
                    )}
                    {cvUrl && (
                      <Button size="small" href={cvUrl} target="_blank" rel="noopener" sx={{ color: MORADO, mt: 0.5, textTransform: 'none' }}>
                        Ver CV
                      </Button>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Paper>
      </Box>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontFamily: fontStack }}>Gestionar postulación</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: '#555' }}>{dialog?.nombre}</Typography>
          <TextField
            label="Notas (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, pb: 2 }}>
          {['revisada', 'contactada', 'aceptada', 'rechazada'].map((es) => (
            <Button
              key={es}
              variant={es === 'aceptada' ? 'contained' : 'outlined'}
              disabled={guardando}
              onClick={() => confirmarResolver(es)}
              sx={{
                textTransform: 'capitalize',
                ...(es === 'aceptada'
                  ? { bgcolor: MORADO, '&:hover': { bgcolor: MORADO_OSCURO } }
                  : { color: MORADO, borderColor: MORADO }),
              }}
            >
              {es}
            </Button>
          ))}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

