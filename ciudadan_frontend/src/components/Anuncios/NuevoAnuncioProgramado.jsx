import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Chip,
  CircularProgress,
  Tooltip,
  Divider
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useRoles } from '../../Contexts/RolesContext';

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

// Simple Markdown-to-HTML very small subset for preview: bold (**text**), links [t](url)
function tinyMdToHtml(md = '') {
  // escape
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = esc(md);
  // bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // links
  html = html.replace(/\[(.+?)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  // line breaks
  html = html.replace(/\n/g, '<br/>');
  return html;
}

// WYSIWYG fallback
function RichTextFallback({ value, onChange }) {
  return (
    <TextField
      label="Mensaje (Markdown)"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      multiline
      minRows={5}
      fullWidth
      placeholder={'Escribe como en un chat:\n**Promo hoy** 🔥\n2x1 hasta medianoche\n[Comprar](https://...)'}
    />
  );
}

export default function NuevoAnuncioProgramado() {
  const navigate = useNavigate();
  const { userData, isActivaMembresia } = useRoles();

  // Form state
  const [tipo, setTipo] = useState('texto'); // texto, imagen, texto con imagen, audio, video
  const [cuerpo, setCuerpo] = useState('');
  const [link, setLink] = useState('');
  const [hora, setHora] = useState('12:00');

  // Scheduling
  const [modoProgramacion, setModoProgramacion] = useState('única'); // 'única' | 'periodo'
  const [fechaUnica, setFechaUnica] = useState(() => new Date().toISOString().slice(0,10));
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0,10));
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().slice(0,10));

  // File handling
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileMeta, setFileMeta] = useState({ duration: null, size: null });

  // UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const videoRef = useRef(null);

  // Guard: membership
  useEffect(() => {
    if (!isActivaMembresia()) {
      // Optionally redirect or show message — here we just keep the form but it'll fail to submit.
    }
  }, [isActivaMembresia]);

  // file change handler
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFileMeta({ duration: null, size: f.size });

    // preview
    const url = URL.createObjectURL(f);
    setFilePreview(url);

    if (f.type.startsWith('video/')) {
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.onloadedmetadata = () => {
        window.URL.revokeObjectURL(vid.src);
        setFileMeta((m) => ({ ...m, duration: vid.duration }));
      };
      vid.src = url;
    }
  };

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  // Basic validation
  const validate = () => {
    if (!userData?.id) return 'Usuario no disponible';
    if (!isActivaMembresia()) return 'Necesitas una membresía activa para crear anuncios';
    if (!tipo) return 'Selecciona un tipo de anuncio';
    if (tipo === 'texto' && !cuerpo) return 'Escribe el texto del anuncio';
    if (['imagen','texto con imagen','audio','video'].includes(tipo) && !file) return 'Sube el archivo correspondiente';
    if (tipo === 'video' && fileMeta.duration != null && fileMeta.duration > 60) return 'Los videos deben durar máximo 60 segundos';
    if (modoProgramacion === 'única' && !fechaUnica) return 'Selecciona la fecha de publicación';
    if (modoProgramacion === 'periodo' && (!fechaInicio || !fechaFin)) return 'Selecciona inicio y fin del periodo';
    if (modoProgramacion === 'periodo' && new Date(fechaFin) < new Date(fechaInicio)) return 'La fecha fin debe ser igual o posterior a la fecha inicio';
    return null;
  };

  // upload file helper
  const uploadFile = async (f) => {
    const fd = new FormData();
    fd.append('files', f);
    const res = await fetch(`${STRAPI_URL}/api/upload`, {
      method: 'POST',
      credentials: 'include',
      body: fd,
    });
    if (!res.ok) throw new Error('Error subiendo archivo');
    const json = await res.json();
    // Strapi returns array
    const id = Array.isArray(json) ? json[0]?.id : json[0]?.id;
    return id;
  };

  // submit
  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    const v = validate();
    if (v) return setError(v);

    setSaving(true);
    try {
      let archivoId = null;
      if (file) {
        archivoId = await uploadFile(file);
      }

      // prepare payload - adapt fields used in your Strapi model
      const data = {
        tipo,
        cuerpo,
        link,
        hora,
        activo: true,
        status: 'activo',
        default: false,
        fecha_subido: new Date().toISOString(),
        usuario: userData.id,
      };

      // scheduling fields
      if (modoProgramacion === 'única') {
        data.fecha_programada = fechaUnica; // strapi should have this field
      } else {
        data.fecha_inicio = fechaInicio; // strapi should have this field
        data.fecha_fin = fechaFin;       // strapi should have this field
      }

      if (archivoId) data.archivo = archivoId;

      const res = await fetch(`${STRAPI_URL}/api/ads`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error creando anuncio: ${res.status} ${txt}`);
      }

      setSuccess('Anuncio programado correctamente');
      // optional: navigate back to programados after a short delay
      setTimeout(() => navigate('/comunidad/anuncios-programados'), 900);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  // UI Layout
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card sx={{ maxWidth: 880, mx: 'auto', p: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h5" fontWeight="bold">Crear nuevo anuncio programado</Typography>
              <Typography variant="body2" color="text.secondary">Selecciona si será para una fecha única o para un periodo. Puedes subir imagen, audio o video (máx 60s).</Typography>
            </Box>
            <Chip label="Programado" color="secondary" />
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Tipo de anuncio */}
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={tipo} label="Tipo" onChange={(e) => setTipo(e.target.value)}>
              <MenuItem value="texto">Texto</MenuItem>
              <MenuItem value="imagen">Imagen</MenuItem>
              <MenuItem value="texto con imagen">Texto + Imagen</MenuItem>
              <MenuItem value="audio">Audio</MenuItem>
              <MenuItem value="video">Video (≤ 60s)</MenuItem>
            </Select>
          </FormControl>

          {/* Editor */}
          <Box sx={{ mt: 2 }}>
            <RichTextFallback value={cuerpo} onChange={setCuerpo} />
            <Tooltip title="Usa **negritas** y [texto](https://...) para links">
              <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>Puedes usar Markdown básico (negritas, links) — se verá en la previsualización.</Typography>
            </Tooltip>
          </Box>

          <TextField label="Link (opcional)" fullWidth sx={{ mt: 2 }} value={link} onChange={(e) => setLink(e.target.value)} />

          {/* Hora */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Hora de publicación" type="time" value={hora} onChange={(e) => setHora(e.target.value)} inputProps={{ step: 60 }} />

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Modo de programación</InputLabel>
              <Select value={modoProgramacion} label="Modo" onChange={(e) => setModoProgramacion(e.target.value)}>
                <MenuItem value="única">Fecha única</MenuItem>
                <MenuItem value="periodo">Periodo (varios días)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Fecha inputs */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            {modoProgramacion === 'única' ? (
              <TextField label="Fecha" type="date" value={fechaUnica} onChange={(e) => setFechaUnica(e.target.value)} InputLabelProps={{ shrink: true }} />
            ) : (
              <>
                <TextField label="Fecha inicio" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField label="Fecha fin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} InputLabelProps={{ shrink: true }} />
              </>
            )}
          </Box>

          {/* File upload */}
          {['imagen','texto con imagen','audio','video'].includes(tipo) && (
            <Box sx={{ mt: 2 }}>
              <input accept={tipo === 'imagen' ? 'image/*' : tipo === 'video' ? 'video/*' : tipo === 'audio' ? 'audio/*' : '*/*'} id="file-upload" type="file" hidden onChange={handleFileChange} />
              <label htmlFor="file-upload">
                <Button component="span" variant="contained" startIcon={<CloudUploadIcon />} sx={{ bgcolor: '#7b1fa2' }}>
                  Subir archivo
                </Button>
              </label>

              {file && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">Archivo: {file.name} ({Math.round(file.size/1024)} KB)</Typography>
                  {fileMeta.duration != null && <Typography variant="caption">Duración: {Math.round(fileMeta.duration)}s</Typography>}

                  {file.type.startsWith('image/') && filePreview && <Box component="img" src={filePreview} alt="preview" sx={{ mt:1, maxWidth: 360, borderRadius: 2 }} />}
                  {file.type.startsWith('video/') && filePreview && (
                    <Box sx={{ mt:1 }}>
                      <video ref={videoRef} src={filePreview} controls style={{ maxWidth: '100%', borderRadius:8 }} />
                    </Box>
                  )}
                  {file.type.startsWith('audio/') && filePreview && (
                    <Box sx={{ mt:1 }}>
                      <audio src={filePreview} controls />
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Preview bubble */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold">Previsualización (como lo verá el usuario)</Typography>
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-start' }}>
              <Box sx={{ bgcolor: '#f3e5f5', p: 2, borderRadius: 2, maxWidth: 640 }}>
                <Typography variant="caption" sx={{ color: '#6a1b9a' }}>🤖 Bot</Typography>
                <Box sx={{ mt: 1 }} dangerouslySetInnerHTML={{ __html: tinyMdToHtml(cuerpo || '**(Sin texto aún)**') }} />
                {file && <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>{file.name}</Typography>}
                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>{modeLabel(modoProgramacion, fechaUnica, fechaInicio, fechaFin)} • {hora}</Typography>
              </Box>
            </Box>
          </Box>

          {error && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <ErrorOutlineIcon color="error" />
              <Typography color="error">{error}</Typography>
            </Box>
          )}

          {success && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
              <CheckCircleIcon color="success" />
              <Typography color="success.main">{success}</Typography>
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button variant="contained" onClick={handleSubmit} disabled={saving} sx={{ bgcolor: '#6a1b9a' }}>
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Programar anuncio'}
            </Button>

            <Button variant="outlined" onClick={() => navigate(-1)}>Cancelar</Button>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// small helper for mode label
function modeLabel(mode, unica, inicio, fin) {
  if (mode === 'única') return `Fecha: ${unica}`;
  return `Periodo: ${inicio} → ${fin}`;
}
