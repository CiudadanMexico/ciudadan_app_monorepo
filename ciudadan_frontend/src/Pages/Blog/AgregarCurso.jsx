// src/pages/Cursos/AgregarCurso.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import {
  Box,
  Container,
  Paper,
  Grid,
  TextField,
  Button,
  Typography,
  MenuItem,
  InputLabel,
  Divider,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
} from '@mui/material';

import '../../quillConfig.js'; // registro de quill

import { useForm, Controller } from 'react-hook-form';
import dayjs from 'dayjs';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useCursos } from '../../hooks/useCursos.jsx';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import {
  colorBotonSecundario,
  colorBordeBotonSecundario,
  colorFondoBotonSecundario,
  colorBotonSecundarioHoover,
  colorFondoBotonSecundarioHoover,
  colorControlSecundario,
  colorControlSecundarioHoover,
  degradadoIconos,
  botonEditor,
  botonEditorBorde,
  botonEditorFondoHoover,
  botonEditorBordeHoover,
} from '../../styles/ColoresBotones.jsx';

const AgregarCurso = () => {
  console.log('💾 Iniciando AgregarCurso (component)');

  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const {
    categorias,
    crearCurso,
    subirMedia,
    loading: loadingHook,
    error: errorHook,
  } = useCursos();

  console.log('[AgregarCurso] useCursos -> categorias count:', categorias?.length, { loadingHook, errorHook });

  const {
    handleSubmit,
    register,
    control,
    reset,
    watch,
    setError,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm({
    defaultValues: {
      titulo: '',
      resumen: '',
      contenido: '',
      restringido: false,
      status: 'publicado',
      tags: '',
      categoria: '',
      modalidad: 'en linea grabaciones',
      de_pago: true,
      precio: '',
      enlace_reunion: '',
      linknotion: '',
    },
  });

  // Quill
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ font: [] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
      ['blockquote', 'code-block'],
      [{ direction: 'rtl' }],
      ['link', 'image', 'video'],
      ['clean'],
    ],
  }), []);
  const quillRefLibre = useRef(null);

  // archivos/medias
  const [portadaFiles, setPortadaFiles] = useState([]);
  const [galeriaFiles, setGaleriaFiles] = useState([]);
  const [videosFiles, setVideosFiles] = useState([]);

  const [portadaPreview, setPortadaPreview] = useState([]);
  const [galeriaPreview, setGaleriaPreview] = useState([]);
  const [videosPreview, setVideosPreview] = useState([]);

  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [htmlMode, setHtmlMode] = useState(false);

  // Métodos de cobro (mock)
  const paymentMethodsMock = [
    { id: 'stripe', nombre: 'Stripe' },
    { id: 'spei', nombre: 'SPEI' },
  ];
  const [metodosCobro] = useState(paymentMethodsMock);
  const [metodosSeleccionados, setMetodosSeleccionados] = useState([paymentMethodsMock[0].id]);

  // Calendario actividades
  const [calendario, setCalendario] = useState([]);

  // Enlaces públicos/privados
  const [enlacesPublicos, setEnlacesPublicos] = useState([]);
  const [enlacesPrivados, setEnlacesPrivados] = useState([]);

  // Observadores
  const modalidad = watch('modalidad');
  const dePago = watch('de_pago');

  // helper previews
  const crearPreviews = (files) =>
    Array.from(files).map((file) => ({ url: URL.createObjectURL(file), type: file.type }));

  // Handlers con logs
  const handlePortadaChange = (e) => {
    const files = e.target.files;
    console.log('[AgregarCurso] handlePortadaChange -> files:', files);
    setPortadaFiles(files);
    const p = crearPreviews(files);
    console.log('[AgregarCurso] handlePortadaChange -> previews:', p);
    setPortadaPreview(p);
    if (!files || files.length === 0) {
      setError('portada', { type: 'required', message: 'La portada es obligatoria' });
    } else {
      clearErrors('portada');
    }
  };

  const handleGaleriaChange = (e) => {
    const files = e.target.files;
    console.log('[AgregarCurso] handleGaleriaChange -> files count:', files?.length);
    setGaleriaFiles(files);
    const p = crearPreviews(files);
    setGaleriaPreview(p);
    console.log('[AgregarCurso] handleGaleriaChange -> previews:', p);
  };

  const handleVideosChange = (e) => {
    const files = e.target.files;
    console.log('[AgregarCurso] handleVideosChange -> files count:', files?.length);
    setVideosFiles(files);
    const p = crearPreviews(files);
    setVideosPreview(p);
    console.log('[AgregarCurso] handleVideosChange -> previews:', p);
  };

  const validarArchivos = () => {
    let valido = true;
    if (!portadaFiles || portadaFiles.length === 0) {
      setError('portada', { type: 'required', message: 'La portada es obligatoria' });
      valido = false;
    }
    clearErrors(['galeria', 'videos']);
    console.log('[AgregarCurso] validarArchivos -> valido:', valido);
    return valido;
  };

  // arrays dinámicos (logs dentro)
  const addCalendarioItem = () => {
    const item = { id: Date.now(), titulo: '', fecha: dayjs().toISOString() };
    setCalendario(prev => {
      const next = [...prev, item];
      console.log('[AgregarCurso] addCalendarioItem -> next:', next);
      return next;
    });
  };
  const updateCalendarioItem = (id, changes) => {
    setCalendario(prev => {
      const next = prev.map(it => (it.id === id ? { ...it, ...changes } : it));
      console.log('[AgregarCurso] updateCalendarioItem -> id,changes:', id, changes, 'next:', next);
      return next;
    });
  };
  const removeCalendarioItem = (id) => {
    setCalendario(prev => {
      const next = prev.filter(it => it.id !== id);
      console.log('[AgregarCurso] removeCalendarioItem -> id:', id, 'next:', next);
      return next;
    });
  };

  const addEnlacePublico = () => {
    const newItem = { id: Date.now(), titulo: '', url: '' };
    setEnlacesPublicos(prev => {
      const next = [...prev, newItem];
      console.log('[AgregarCurso] addEnlacePublico -> next:', next);
      return next;
    });
  };
  const updateEnlacePublico = (id, changes) => {
    setEnlacesPublicos(prev => {
      const next = prev.map(e => (e.id === id ? { ...e, ...changes } : e));
      console.log('[AgregarCurso] updateEnlacePublico -> id,changes:', id, changes, 'next:', next);
      return next;
    });
  };
  const removeEnlacePublico = (id) => {
    setEnlacesPublicos(prev => {
      const next = prev.filter(e => e.id !== id);
      console.log('[AgregarCurso] removeEnlacePublico -> id:', id, 'next:', next);
      return next;
    });
  };

  const addEnlacePrivado = () => {
    const newItem = { id: Date.now(), titulo: '', url: '' };
    setEnlacesPrivados(prev => {
      const next = [...prev, newItem];
      console.log('[AgregarCurso] addEnlacePrivado -> next:', next);
      return next;
    });
  };
  const updateEnlacePrivado = (id, changes) => {
    setEnlacesPrivados(prev => {
      const next = prev.map(e => (e.id === id ? { ...e, ...changes } : e));
      console.log('[AgregarCurso] updateEnlacePrivado -> id,changes:', id, changes, 'next:', next);
      return next;
    });
  };
  const removeEnlacePrivado = (id) => {
    setEnlacesPrivados(prev => {
      const next = prev.filter(e => e.id !== id);
      console.log('[AgregarCurso] removeEnlacePrivado -> id:', id, 'next:', next);
      return next;
    });
  };

  const toggleMetodoSeleccionado = (id) => {
    setMetodosSeleccionados(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      console.log('[AgregarCurso] toggleMetodoSeleccionado -> id:', id, 'next:', next);
      return next;
    });
  };

  const handleAgregarUbicacion = () => {
    enqueueSnackbar('Agregar ubicación (maquetado) — implementar después', { variant: 'info' });
    console.log('Agregar ubicación (maquetado) - placeholder');
  };

  // onSubmit con muchos logs
  const onSubmit = async (data) => {
    console.log('[AgregarCurso] onSubmit -> data (raw from form):', data);
    console.log('[AgregarCurso] onSubmit -> state previews:', { portadaPreview, galeriaPreview, videosPreview });
    console.log('[AgregarCurso] onSubmit -> arrays estado:', { calendario, enlacesPublicos, enlacesPrivados, metodosSeleccionados });

    setMensaje('');
    clearErrors();
    if (!validarArchivos()) {
      enqueueSnackbar('Por favor corrige los errores en los archivos', { variant: 'error' });
      return;
    }

    setSubiendo(true);
    try {
      const media = {};
      console.log('[AgregarCurso] onSubmit -> iniciando subida de media');

      if (portadaFiles.length) {
        console.log('[AgregarCurso] onSubmit -> subiendo portada, archivos:', portadaFiles);
        media.portada = await subirMedia(portadaFiles);
        console.log('[AgregarCurso] onSubmit -> portada subida ids:', media.portada);
      }
      if (galeriaFiles.length) {
        console.log('[AgregarCurso] onSubmit -> subiendo galeria, archivos count:', galeriaFiles.length);
        media.galeria = await subirMedia(galeriaFiles);
        console.log('[AgregarCurso] onSubmit -> galeria subida ids:', media.galeria);
      }
      if (videosFiles.length) {
        console.log('[AgregarCurso] onSubmit -> subiendo videos, archivos count:', videosFiles.length);
        media.videos = await subirMedia(videosFiles);
        console.log('[AgregarCurso] onSubmit -> videos subida ids:', media.videos);
      }

      console.log('[AgregarCurso] onSubmit -> media final a adjuntar:', media);

      // preparar payload
      const payload = {
        titulo: data.titulo,
        resumen: data.resumen,
        descripcion: data.contenido,
        restringido: data.restringido,
        status: data.status,
        tags: (data.tags || '')
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t),
        fecha_publicacion: new Date().toISOString(),
        categoria: data.categoria || null,
        modalidad: data.modalidad || null,
        de_pago: !!data.de_pago,
        precio: data.de_pago ? (data.precio ? Number(data.precio) : 0) : 0,
        enlace_reunion: data.enlace_reunion || '',
        linknotion: data.linknotion || '',
        calendario_actividades: calendario.length ? calendario.map(({ titulo, fecha }) => ({ titulo, fecha })) : null,
        metodos_cobro: metodosSeleccionados.map(id => {
          const m = metodosCobro.find(x => x.id === id);
          return m ? m.nombre : id;
        }),
        enlaces_publicos: enlacesPublicos.length ? enlacesPublicos.map(e => ({ titulo: e.titulo, url: e.url })) : null,
        enlaces_privados: enlacesPrivados.length ? enlacesPrivados.map(e => ({ titulo: e.titulo, url: e.url })) : null,
        ubicacion: data.ubicacion || null,
      };

      console.log('[AgregarCurso] onSubmit -> payload preparado (antes de crear):', payload);

      // Llamada al hook - envolver en try/catch y loguear todo lo que venga
      try {
        console.log('[AgregarCurso] onSubmit -> llamando crearCurso(payload, media)');
        const result = await crearCurso(payload, media);
        console.log('[AgregarCurso] onSubmit -> crearCurso resolved:', result);
      } catch (errCreate) {
        console.error('[AgregarCurso] onSubmit -> crearCurso lanzó error:', errCreate);
        // Re-throw para que el outer lo capture y muestre en UI
        throw errCreate;
      }

      setMensaje('Curso creado correctamente');
      enqueueSnackbar('Curso creado correctamente', { variant: 'success' });

      // reset
      reset({
        titulo: '',
        resumen: '',
        contenido: '',
        restringido: false,
        status: 'publicado',
        tags: '',
        categoria: '',
        modalidad: 'en linea videos',
        de_pago: true,
        precio: '',
        enlace_reunion: '',
        linknotion: '',
      });
      setPortadaFiles([]);
      setGaleriaFiles([]);
      setVideosFiles([]);
      setPortadaPreview([]);
      setGaleriaPreview([]);
      setVideosPreview([]);
      setCalendario([]);
      setEnlacesPublicos([]);
      setEnlacesPrivados([]);
      setMetodosSeleccionados([paymentMethodsMock[0].id]);

      console.log('[AgregarCurso] onSubmit -> limpieza completa realizada');
    } catch (err) {
      console.error('[AgregarCurso] onSubmit -> ERROR global:', err);
      enqueueSnackbar(`Error: ${err.message}`, { variant: 'error' });
      setMensaje(`Error: ${err.message}`);
    } finally {
      setSubiendo(false);
    }
  };

  // Inicializar categoría por defecto si existe (igual que en tu componente original)
  useEffect(() => {
    console.log('[AgregarCurso] useEffect categorias -> categorias:', categorias);
    if (categorias.length > 0) {
      const defaultCat = categorias.find(
        (cat) =>
          cat.slug?.toLowerCase() === 'no-clasificados' ||
          cat.nombre?.toLowerCase() === 'no clasificados'
      );
      if (defaultCat) {
        console.log('[AgregarCurso] useEffect -> estableciendo categoria por defecto:', defaultCat.id);
        setValue('categoria', defaultCat.id);
      }
    }
  }, [categorias, setValue]);

  // Observa cambios importantes y logéalos (útil durante debug)
  useEffect(() => {
    console.log('[AgregarCurso] watch -> modalidad:', modalidad, 'dePago:', dePago);
  }, [modalidad, dePago]);

  useEffect(() => {
    console.log('[AgregarCurso] estado arrays -> calendario, enlacesPublicos, enlacesPrivados, metodosSeleccionados:', {
      calendario, enlacesPublicos, enlacesPrivados, metodosSeleccionados,
    });
  }, [calendario, enlacesPublicos, enlacesPrivados, metodosSeleccionados]);

  {/* Modalidad */}
const MODALIDADES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'en línea tiempo real', label: 'En línea (tiempo real)' },
  { value: 'en línea grabaciones', label: 'En línea (grabaciones / videos)' },
  { value: 'híbrido', label: 'Híbrido' },
];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: degradadoIconos,
              color: '#000',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              mr: 1.5,
              transform: 'rotate(-6deg)',
            }}
          >
            📝
          </Box>
          Agregar Curso
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            {/* Título */}
            <Grid item xs={12}>
              <TextField
                label="Título"
                fullWidth
                {...register('titulo', { required: 'Ingresa un título' })}
                error={!!errors.titulo}
                helperText={errors.titulo?.message}
              />
            </Grid>

            {/* Resumen */}
            <Grid item xs={12}>
              <TextField label="Resumen" fullWidth multiline rows={2} {...register('resumen')} />
            </Grid>

            {/* Contenido (Quill / HTML) */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Contenido (HTML)</Typography>
              <Controller
                name="contenido"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Button
                        onClick={() => setHtmlMode(!htmlMode)}
                        variant="outlined"
                        size="small"
                        sx={{
                          color: botonEditor,
                          borderColor: botonEditorBorde,
                          '&:hover': {
                            backgroundColor: botonEditorFondoHoover,
                            borderColor: botonEditorBordeHoover,
                            color: botonEditorBordeHoover,
                          },
                        }}
                      >
                        {htmlMode ? 'Editor Visual' : 'Editor HTML'}
                      </Button>
                    </Box>

                    <Box sx={{
                      display: 'flex',
                      gap: 1,
                      mb: 1,
                      height: '100%',
                      marginBottom: '1rem',
                      border: '2px solid #6e862a',
                      borderRadius: 2,
                      color: '#2e2e2e',
                    }}>
                      {htmlMode ? (
                        <TextField
                          key="html"
                          multiline
                          minRows={8}
                          fullWidth
                          value={field.value}
                          onChange={e => field.onChange(e.target.value)}
                          variant="outlined"
                        />
                      ) : (
                        <ReactQuill
                          key="visual"
                          ref={quillRefLibre}
                          theme="snow"
                          value={field.value}
                          onChange={(content, delta, source, editor) => field.onChange(editor.getHTML())}
                          style={{ height: '200px', marginBottom: '1rem' }}
                          modules={quillModules}
                        />
                      )}
                    </Box>
                  </>
                )}
              />
            </Grid>

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Row: status y categoría */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Status"
                select
                fullWidth
                defaultValue="publicado"
                {...register('status')}
                sx={{ '& label': { color: colorControlSecundario } }}
              >
                <MenuItem value="borrador">Borrador</MenuItem>
                <MenuItem value="publicado">Publicado</MenuItem>
                <MenuItem value="archivado">Archivado</MenuItem>
                <MenuItem value="activo">Activo</MenuItem>
                <MenuItem value="ya_encurso">Ya en Curso</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Categoría"
                select
                fullWidth
                {...register('categoria', { required: 'Categoría obligatoria' })}
                error={!!errors.categoria}
                helperText={errors.categoria?.message}
              >
                {categorias.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.nombre}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
  <TextField label="Modalidad" select fullWidth {...register('modalidad')}>
    {MODALIDADES.map(m => (
      <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
    ))}
  </TextField>
</Grid>

            {/* Maestro - maquetado */}
            <Grid item xs={12} sm={6}>
              <TextField label="Maestro (relación - pendiente)" fullWidth disabled placeholder="Vinculado en siguiente paso" />
            </Grid>

            {/* De pago toggle y Precio */}
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    {...register('de_pago')}
                    defaultChecked
                    checked={!!dePago}
                    onChange={(e) => setValue('de_pago', e.target.checked)}
                  />
                }
                label="Con costo"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Precio (MXN)"
                fullWidth
                type="number"
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                {...register('precio')}
                disabled={!dePago}
                helperText={!dePago ? 'Deshabilitado porque el curso es gratuito' : ''}
              />
            </Grid>

            {/* Métodos de cobro */}
            <Grid item xs={12}>
              <InputLabel>Metodos de cobro</InputLabel>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
                {metodosCobro.map(m => (
                  <Chip
                    key={m.id}
                    label={m.nombre}
                    clickable
                    onClick={() => toggleMetodoSeleccionado(m.id)}
                    variant={metodosSeleccionados.includes(m.id) ? 'filled' : 'outlined'}
                    sx={{ mr: 1 }}
                  />
                ))}

                <Button variant="outlined" size="small" onClick={() => navigate('/metodos-cobro')}>
                  Agregar otro método de cobro
                </Button>
              </Box>
            </Grid>

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Calendario */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Calendario de actividades (opcional)</Typography>
                <Button startIcon={<AddIcon />} onClick={addCalendarioItem}>Agregar actividad</Button>
              </Box>

              <Box sx={{ mt: 1 }}>
                <AnimatePresence>
                  {calendario.map((item) => (
                    <motion.div key={item.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} style={{ marginBottom: 12 }}>
                      <Paper sx={{ p: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={5}>
                            <TextField label="Título actividad" fullWidth value={item.titulo} onChange={(e) => updateCalendarioItem(item.id, { titulo: e.target.value })} />
                          </Grid>
                          <Grid item xs={12} sm={5}>
                            <DateTimePicker
                              label="Fecha y hora"
                              value={dayjs(item.fecha)}
                              onChange={(newVal) => updateCalendarioItem(item.id, { fecha: newVal ? dayjs(newVal).toISOString() : null })}
                              renderInput={(params) => <TextField fullWidth {...params} />}
                            />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <IconButton color="error" onClick={() => removeCalendarioItem(item.id)}><DeleteIcon /></IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </Box>
            </Grid>

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Enlace reunión */}
            <Grid item xs={12} sm={6}>
              <TextField label="Enlace de la sesión (Zoom / Meet...)" fullWidth {...register('enlace_reunion')} />
            </Grid>

            {/* Link Notion */}
            <Grid item xs={12} sm={6} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField label="Wiki del Curso (linknotion)" fullWidth {...register('linknotion')} />
              <Button variant="outlined" startIcon={<OpenInNewIcon />} onClick={() => window.open('https://example.com', '_blank')} sx={{ whiteSpace: 'nowrap' }}>
                Crear
              </Button>
            </Grid>

            {/* Enlaces públicos */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">Enlaces públicos</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addEnlacePublico}>Agregar</Button>
              </Box>

              <Box sx={{ mt: 1 }}>
                <AnimatePresence>
                  {enlacesPublicos.map(en => (
                    <motion.div key={en.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Paper sx={{ p: 1, my: 1 }}>
                        <Grid container spacing={1} alignItems="center">
                          <Grid item xs={12} sm={4}>
                            <TextField label="Título" fullWidth value={en.titulo} onChange={(e) => updateEnlacePublico(en.id, { titulo: e.target.value })} />
                          </Grid>
                          <Grid item xs={12} sm={7}>
                            <TextField label="URL" fullWidth value={en.url} onChange={(e) => updateEnlacePublico(en.id, { url: e.target.value })} />
                          </Grid>
                          <Grid item xs={12} sm={1}>
                            <IconButton color="error" onClick={() => removeEnlacePublico(en.id)}><DeleteIcon /></IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </Box>
            </Grid>

            {/* Enlaces privados */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">Enlaces privados</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addEnlacePrivado}>Agregar</Button>
              </Box>

              <Box sx={{ mt: 1 }}>
                <AnimatePresence>
                  {enlacesPrivados.map(en => (
                    <motion.div key={en.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Paper sx={{ p: 1, my: 1 }}>
                        <Grid container spacing={1} alignItems="center">
                          <Grid item xs={12} sm={4}>
                            <TextField label="Título" fullWidth value={en.titulo} onChange={(e) => updateEnlacePrivado(en.id, { titulo: e.target.value })} />
                          </Grid>
                          <Grid item xs={12} sm={7}>
                            <TextField label="URL" fullWidth value={en.url} onChange={(e) => updateEnlacePrivado(en.id, { url: e.target.value })} />
                          </Grid>
                          <Grid item xs={12} sm={1}>
                            <IconButton color="error" onClick={() => removeEnlacePrivado(en.id)}><DeleteIcon /></IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </Box>
            </Grid>

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Portada */}
            <Grid item xs={12}>
              <InputLabel required>Portada (imagen o video)</InputLabel>
              <input id="portada-input" type="file" accept="image/*,video/*" onChange={handlePortadaChange} multiple={false} style={{ display: 'none' }} />
              <label htmlFor="portada-input">
                <Button variant="outlined" component="span" sx={{
                  color: colorBotonSecundario,
                  borderColor: colorBordeBotonSecundario,
                  backgroundColor: colorFondoBotonSecundario,
                  '&:hover': { backgroundColor: colorFondoBotonSecundarioHoover, borderColor: colorBotonSecundarioHoover, color: colorBotonSecundarioHoover },
                  mt: 1, mb: 1
                }}>
                  Seleccionar archivo
                </Button>
              </label>

              {errors.portada && <Typography color="error">{errors.portada.message}</Typography>}

              {portadaPreview.length > 0 && portadaPreview.map((file, i) => (
                file.type.startsWith('image/') ? (
                  <img key={i} src={file.url} alt={`Portada ${i}`} style={{ maxHeight: 150, marginRight: 10 }} />
                ) : (
                  <video key={i} src={file.url} controls style={{ maxHeight: 150, marginRight: 10 }} />
                )
              ))}
            </Grid>

            <Grid item xs={12}>
              <InputLabel>Galería libre</InputLabel>
              <input id="galeria-libre-input" type="file" accept="image/*,video/*" onChange={handleGaleriaChange} multiple style={{ display: 'none' }} />
              <label htmlFor="galeria-libre-input">
                <Button variant="outlined" component="span" sx={{
                  color: colorBotonSecundario,
                  borderColor: colorBordeBotonSecundario,
                  backgroundColor: colorFondoBotonSecundario,
                  '&:hover': { backgroundColor: colorFondoBotonSecundarioHoover, borderColor: colorBotonSecundarioHoover, color: colorBotonSecundarioHoover },
                }}>
                  Subir archivos
                </Button>
              </label>

              {galeriaPreview.length > 0 && galeriaPreview.map((file, i) => (
                file.type.startsWith('image/') ? (
                  <img key={i} src={file.url} alt={`Galeria ${i}`} style={{ maxHeight: 100, marginRight: 10 }} />
                ) : (
                  <video key={i} src={file.url} controls style={{ maxHeight: 100, marginRight: 10 }} />
                )
              ))}
            </Grid>

            <Grid item xs={12}>
              <InputLabel>Videos (opcional)</InputLabel>
              <input id="videos-input" type="file" accept="video/*" onChange={handleVideosChange} multiple style={{ display: 'none' }} />
              <label htmlFor="videos-input">
                <Button variant="outlined" component="span">Subir videos</Button>
              </label>

              {videosPreview.length > 0 && videosPreview.map((file, i) => (
                <video key={i} src={file.url} controls style={{ maxHeight: 100, marginRight: 10 }} />
              ))}
            </Grid>

            {/* Ubicación si presencial */}
            {modalidad === 'presencial' && (
              <Grid item xs={12}>
                <Button variant="outlined" onClick={handleAgregarUbicacion}>Agregar ubicación (maquetado)</Button>
              </Grid>
            )}

            {/* Guardar */}
            <Grid item xs={12}>
              <Button variant="contained" type="submit" disabled={subiendo || loadingHook}
                startIcon={subiendo || loadingHook ? <span className="material-icons">hourglass_top</span> : <span className="material-icons">save</span>}
                sx={{ bgcolor: '#6e862ae0', '&:hover': { bgcolor: '#8CC701' }, transition: 'all 0.3s ease' }}>
                {subiendo || loadingHook ? 'Subiendo...' : 'Guardar curso'}
              </Button>
            </Grid>

            {/* Mensaje */}
            {mensaje && (
              <Grid item xs={12}>
                <Typography variant="body1" color={mensaje.toLowerCase().includes('error') ? 'error' : 'primary'}>
                  {mensaje}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default AgregarCurso;
