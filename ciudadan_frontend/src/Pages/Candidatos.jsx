/**
 * /candidatos — postulación a socio. Requiere login (Auth0); el correo
 * viene de la cuenta; teléfono con bandera de país. Verde Generación.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Typography, Stack, Alert, Button, CircularProgress, TextField, FormControlLabel, Checkbox, FormHelperText, MenuItem } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import LoginIcon from '@mui/icons-material/Login';

import RegistrationField from '../components/Generation/registro/RegistrationField';
import paises from '../assets/paises.json';
import { getAvailableRootAreas, getAgencias } from '../services/cowork/queryServices.js';
import { crearPostulacionSocio } from '../services/cowork/candidatosService.js';
import { GEN_FONTS, pageContainerSx } from '../components/Generation/GenerationTheme';


const FIELDS = [
  { name: 'nombre', label: 'Nombre', type: 'text', required: true, half: true, validate: 'name' },
  { name: 'apellidos', label: 'Apellidos', type: 'text', required: true, half: true, validate: 'name' },
  { name: 'area', label: 'Área de interés', type: 'select', required: true, half: true, options: [] },
  { name: 'agencia', label: 'Agencia a la que te postulas', type: 'select', required: true, half: true, options: [] },
  { name: 'descripcion', label: '¿Por qué quieres ser socio?', type: 'textarea', required: true },
  { name: 'cv', label: 'Subir CV', type: 'file', helperText: 'PDF, Word o imagen. Máx. 10 MB.' },
  { name: 'consentimiento', label: 'Acepto que Ciudadan use estos datos para evaluar mi postulación.', type: 'consent', required: true },
];

const attr = (o, campo) => (o?.attributes?.[campo] ?? o?.[campo] ?? null);

export default function Candidatos() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, loginWithRedirect } = useAuth0();

  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [areas, setAreas] = useState([]);
  const [agencias, setAgencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [codigoPais, setCodigoPais] = useState('+52');
  const paisSel = useMemo(() => paises.find((p) => p.code === codigoPais) || paises[0], [codigoPais]);


  const handleChange = (n, v) => {
    setValues(p => ({ ...p, [n]: v }));
    setErrors(p => ({ ...p, [n]: undefined }));
  };

  const validate = () => {
    const next = {};
    FIELDS.forEach(f => {
      const v = values[f.name];
      if (f.required && (v === undefined || v === '' || v === null || v === false)) { next[f.name] = 'Este campo es obligatorio.'; return; }
      if (f.validate === 'name' && v) {
        const t = String(v).trim();
        if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’\- ]+$/.test(t)) next[f.name] = 'Solo letras, espacios, guiones y apóstrofes.';
        else if (t.replace(/[\s'’\-]+/g, '').length < 2) next[f.name] = 'Escribe al menos 2 letras.';
        else if (t.length > 60) next[f.name] = 'Máximo 60 caracteres.';
      }
    });
    const tel = String(values.telefono || '').replace(/\D/g, '');
    if (tel.length < 8) next.telefono = 'Escribe un teléfono válido.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      try {
        const [jA, jG] = await Promise.all([getAvailableRootAreas(), getAgencias()]);
        if (cancelado) return;
        setAreas((Array.isArray(jA?.data) ? jA.data : []).map(a => ({ value: String(a.id), label: attr(a, 'name') || 'Área ' + a.id })));
        setAgencias((Array.isArray(jG?.data) ? jG.data : []).map(g => ({ value: String(g.id), label: attr(g, 'nombre') || 'Agencia ' + g.id })));
      } catch {
        if (!cancelado) { setAreas([]); setAgencias([]); }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!isAuthenticated) {
      await loginWithRedirect({ appState: { target: '/candidatos' } });
      return;
    }
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const tel = String(values.telefono || '').replace(/\D/g, '');
      const form = new FormData();
      form.append('data', JSON.stringify({
        nombre_completo: (values.nombre || '').trim() + ' ' + (values.apellidos || '').trim(),
        email: user?.email || '',
        telefono: (tel || '0000') + '@' + paisSel.code,
        codigo_pais: paisSel.code,
        area: values.area,
        agencia: values.agencia,
        descripcion: values.descripcion || '',
      }));
      if (values.cv?.file) {
        form.append('files.cv', values.cv.file, values.cv.file.name);
      }
      await crearPostulacionSocio(form);
      setEnviado(true);
    } catch {
      setSubmitError('No se pudo enviar la postulación. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={pageContainerSx}><CircularProgress /></Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box sx={pageContainerSx}>
        <Alert icon={<LoginIcon />} severity="info">
          Para postularte a una agencia debes iniciar sesión con tu cuenta de Ciudadan.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => loginWithRedirect({ appState: { target: '/candidatos' } })} startIcon={<LoginIcon />}>
            Iniciar sesión para postularte
          </Button>
        </Box>
      </Box>
    );
  }

  if (enviado) {
    return (
      <Box sx={pageContainerSx}>
        <Alert severity="success">
          ¡Postulación enviada correctamente! Revisa tu correo para confirmar.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => navigate('/')} startIcon={<ArrowBackIcon />}>
            Volver al inicio
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...pageContainerSx,
        background: 'linear-gradient(135deg, #0b7a4b 0%, #1a9e6a 50%, #2aae7e 100%)',
        color: '#fff',
      }}
    >
      <Stack direction="row" alignItems="center" mb={2} spacing={1}>
        <Button variant="text" onClick={() => navigate('/empleos')}>
          Volver
        </Button>
        <Box sx={{ flex: 1 }} />
        <Typography variant="h4" fontFamily={GEN_FONTS.principal}>
          Postularte a socio
        </Typography>
      </Stack>

      <Stack spacing={2}>
        <TextField
          label="Correo de la cuenta (solo lectura)"
          value={user?.email || ''}
          disabled
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Nombre"
          value={values.nombre || ''}
          error={submitAttempted && Boolean(errors.nombre)}
          helperText={errors.nombre || ' '}
          onChange={(e) => handleChange('nombre', e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Apellidos"
          value={values.apellidos || ''}
          error={submitAttempted && Boolean(errors.apellidos)}
          helperText={errors.apellidos || ' '}
          onChange={(e) => handleChange('apellidos', e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          label="Área de interés"
          value={values.area || ''}
          error={submitAttempted && Boolean(errors.area)}
          helperText={errors.area || ' '}
          onChange={(e) => handleChange('area', e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        >
          {areas.map((a) => (
            <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Agencia a la que te postulas"
          value={values.agencia || ''}
          error={submitAttempted && Boolean(errors.agencia)}
          helperText={errors.agencia || ' '}
          onChange={(e) => handleChange('agencia', e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        >
          {agencias.map((g) => (
            <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="¿Por qué quieres ser socio?"
          multiline
          rows={4}
          value={values.descripcion || ''}
          error={submitAttempted && Boolean(errors.descripcion)}
          helperText={errors.descripcion || ' '}
          onChange={(e) => handleChange('descripcion', e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            label="Teléfono"
            value={values.telefono || ''}
            error={submitAttempted && Boolean(errors.telefono)}
            helperText={errors.telefono || ' '}
            onChange={(e) => handleChange('telefono', e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              alignItems: 'center',
            }}
          >
            {paises.map((pais) => (
              <Button
                key={pais.code}
                size="small"
                onClick={() => setCodigoPais(pais.code)}
                sx={{
                  p: 0.5,
                  minWidth: 0,
                  bgcolor: codigoPais === pais.code ? 'rgba(255,255,255,0.22)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                }}
              >
                <img src={pais.flag} style={{ width: 18, height: 12, display: 'block' }} alt="" />
              </Button>
            ))}
          </Box>
        </Box>
        <RegistrationField
          field={{ name: 'cv', label: 'Subir CV', type: 'file', helperText: 'PDF, Word o imagen. Máx. 10 MB.' }}
          value={values.cv || null}
          onChange={(file) => handleChange('cv', { file, type: file?.type || '', size: file?.size || 0, name: file?.name || '' })}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={<Checkbox checked={Boolean(values.consentimiento)} onChange={(e) => handleChange('consentimiento', e.target.checked)} name="consentimiento" sx={{ color: '#0b7a4b', '&.Mui-checked': { color: '#0b7a4b' } }} />}
            label="Acepto que Ciudadan use estos datos para evaluar mi postulación."
          />
        </Box>
        {errors.consentimiento && <FormHelperText error>{errors.consentimiento}</FormHelperText>}
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Button variant="contained" onClick={() => navigate('/empleos')} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="contained" color="primary" onClick={handleSubmit} disabled={submitting} startIcon={<SendIcon />}>
            {submitting ? <CircularProgress size={24} /> : 'Enviar postulación'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
