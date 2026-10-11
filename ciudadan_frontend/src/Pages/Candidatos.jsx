// src/Pages/Candidatos.jsx
// Formulario público de postulación a socio (/candidatos).
// Reutiliza estilos del sitio: PurpleButton + paleta morada + MUI.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Grid2 as Grid,
  Alert,
  CircularProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import PurpleButton from '../components/common/PurpleButton.jsx';
import paises from '../assets/paises.json';
import { getAvailableRootAreas } from '../services/cowork/queryServices.js';
import { crearPostulacionSocio } from '../services/cowork/candidatosService.js';

const MORADO = '#8A5CF5';
const fondo = '#0d0b1a';

const inputSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
    '&:hover fieldset': { borderColor: MORADO },
    '&.Mui-focused fieldset': { borderColor: MORADO },
  },
  '& .MuiInputLabel-root': { color: '#cfcfe6' },
  '& .MuiInputLabel-root.Mui-focused': { color: MORADO },
};

const labelProps = { sx: { color: '#cfcfe6' } };

export default function Candidatos() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre_completo: '',
    email: '',
    codigo_pais: '+52',
    telefono: '',
    area: '',
    descripcion: '',
  });
  const [cv, setCv] = useState(null);
  const [areas, setAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [enviado, setEnviado] = useState(false);

  const getToken = useCallback(async () => null, []);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setLoadingAreas(true);
      try {
        const token = await getToken();
        const json = await getAvailableRootAreas(token);
        if (cancelado) return;
        const data = Array.isArray(json?.data) ? json.data : [];
        setAreas(
          data.map((a) => ({
            id: a.id,
            nombre: a.attributes?.name ?? a.name ?? `Área ${a.id}`,
          }))
        );
      } catch {
        if (!cancelado) setAreas([]);
      } finally {
        if (!cancelado) setLoadingAreas(false);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [getToken]);

  const set = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }));

  const errores = useMemo(() => {
    const e = {};
    if (!form.nombre_completo.trim()) e.nombre_completo = 'Escribe tu nombre completo';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Correo no válido';
    if (!form.telefono.trim()) e.telefono = 'Escribe tu teléfono';
    if (!form.area) e.area = 'Selecciona un área';
    return e;
  }, [form]);

  const valido = Object.keys(errores).length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valido || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await crearPostulacionSocio({
        nombre_completo: form.nombre_completo.trim(),
        email: form.email.trim(),
        codigo_pais: form.codigo_pais,
        telefono: form.telefono.trim(),
        area: form.area,
        descripcion: form.descripcion.trim(),
        cv,
        metadata: { origen: 'web-candidatos' },
      });
      setEnviado(true);
    } catch (err) {
      setError(err.message || 'No se pudo enviar tu postulación');
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: fondo, py: { xs: 4, md: 8 }, px: 2 }}>
        <Paper
          elevation={10}
          sx={{
            maxWidth: 560,
            mx: 'auto',
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.03)',
            border: `1px solid ${MORADO}`,
            textAlign: 'center',
          }}
        >
          <Typography variant="h5" fontWeight={800} color="#fff" gutterBottom>
            ¡Gracias por postularte! 🎉
          </Typography>
          <Typography color="#cfcfe6" sx={{ mb: 3 }}>
            Recibimos tu postulación. El equipo de la agencia la revisará y te contactará.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ color: '#cfcfe6' }}>
              Volver al inicio
            </Button>
            <PurpleButton onClick={() => setEnviado(false)}>Enviar otra</PurpleButton>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: fondo, py: { xs: 4, md: 8 }, px: 2 }}>
      <Box sx={{ maxWidth: 680, mx: 'auto' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: '#cfcfe6', mb: 2 }}>
          Volver
        </Button>

        <Typography variant="h4" fontWeight={900} color="#fff" gutterBottom>
          Postúlate como <span style={{ color: MORADO }}>socio</span>
        </Typography>
        <Typography color="#cfcfe6" sx={{ mb: 4 }}>
          Únete a una agencia Ciudadan. Llena el formulario y nos pondremos en contacto contigo.
        </Typography>

        <Paper
          component="form"
          onSubmit={handleSubmit}
          elevation={10}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Nombre completo"
              value={form.nombre_completo}
              onChange={set('nombre_completo')}
              error={!!errores.nombre_completo}
              helperText={errores.nombre_completo}
              fullWidth
              sx={inputSx}
              InputLabelProps={labelProps}
            />

            <TextField
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={set('email')}
              error={!!errores.email}
              helperText={errores.email}
              fullWidth
              sx={inputSx}
              InputLabelProps={labelProps}
            />

            <Grid container spacing={2}>
              <Grid size={{ xs: 4, sm: 3 }}>
                <FormControl fullWidth sx={inputSx}>
                  <InputLabel sx={{ color: '#cfcfe6' }}>País</InputLabel>
                  <Select
                    label="País"
                    value={form.codigo_pais}
                    onChange={set('codigo_pais')}
                    renderValue={(val) => {
                      const p = paises.find((x) => x.code === val);
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <img src={p?.flag} alt={val} style={{ width: 22, height: 15, borderRadius: 2 }} />
                          {val}
                        </Box>
                      );
                    }}
                  >
                    {paises.map((p) => (
                      <MenuItem key={p.code} value={p.code}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <img src={p.flag} alt={p.label} style={{ width: 22, height: 15, borderRadius: 2 }} />
                          {p.code} · {p.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 8, sm: 9 }}>
                <TextField
                  label="Teléfono / WhatsApp"
                  value={form.telefono}
                  onChange={set('telefono')}
                  error={!!errores.telefono}
                  helperText={errores.telefono}
                  fullWidth
                  sx={inputSx}
                  InputLabelProps={labelProps}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: MORADO }} fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth error={!!errores.area} sx={inputSx}>
              <InputLabel sx={{ color: '#cfcfe6' }}>Área de interés</InputLabel>
              <Select
                label="Área de interés"
                value={form.area}
                onChange={set('area')}
                endAdornment={
                  loadingAreas ? <CircularProgress size={18} sx={{ mr: 3, color: MORADO }} /> : null
                }
              >
                {areas.map((a) => (
                  <MenuItem key={a.id} value={String(a.id)}>
                    {a.nombre}
                  </MenuItem>
                ))}
              </Select>
              {errores.area && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                  {errores.area}
                </Typography>
              )}
            </FormControl>

            <TextField
              label="¿Por qué quieres ser socio? (opcional)"
              value={form.descripcion}
              onChange={set('descripcion')}
              multiline
              minRows={3}
              fullWidth
              sx={inputSx}
              InputLabelProps={labelProps}
            />

            <Box>
              <Button
                component="label"
                variant="outlined"
                startIcon={<AttachFileIcon />}
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.25)',
                  textTransform: 'none',
                  '&:hover': { borderColor: MORADO },
                }}
              >
                {cv ? cv.name : 'Subir CV (extracto)'}
                <input
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={(e) => setCv(e.target.files?.[0] || null)}
                />
              </Button>
              <Typography variant="caption" color="#9a9ab5" sx={{ display: 'block', mt: 0.5 }}>
                PDF, Word o imagen. Máx. 10 MB.
              </Typography>
            </Box>

            <PurpleButton
              type="submit"
              fullWidth
              disabled={!valido || enviando}
              startIcon={enviando ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
              sx={{ py: 1.3, mt: 1 }}
            >
              {enviando ? 'Enviando...' : 'Enviar postulación'}
            </PurpleButton>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
