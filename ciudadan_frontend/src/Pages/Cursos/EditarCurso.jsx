import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BotonEliminar from '../../components/Blog/BotonEliminar.jsx';
import {
    colorBotonSecundario,
    colorBordeBotonSecundario,
    colorFondoBotonSecundario,
    colorBotonSecundarioHoover,
    colorFondoBotonSecundarioHoover,
    colorBordeBotonSecundarioHoover,
    colorControlSecundario,
    degradadoIconos,
} from '../../styles/ColoresBotones.jsx';
import {
  Box,
  Container,
  Paper,
  Grid,
  TextField,
  Button,
  Typography,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { useForm, Controller } from 'react-hook-form';
import dayjs from 'dayjs';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useCursos } from '../../hooks/useCursos.jsx';
import { useSnackbar } from 'notistack';
import '../../quillConfig.js'; // registro de módulos personalizados

const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;

const EditarCurso = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const {
        cursos,
        categorias,
        loading: loadingHook,
        editarCurso,
        subirMedia,
    } = useCursos();

    const [cargando, setCargando] = useState(true);
    const [maestroEmail, setMaestroEmail] = useState(true);
    const [initialMediaUrls, setInitialMediaUrls] = useState({});

    const {
        handleSubmit,
        control,
        reset,
        watch,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
        titulo: '',
        resumen: '',
        contenido: '',
        //contenido_restringido: '',
        restringido: false,
        status: 'borrador',
        tags: '',
        fecha_publicacion: dayjs(),
        categoria: '',
        },
    });

    const quillModules = useMemo(() => ({
        toolbar: [
        [{ header: [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
        ],
    }), []);

    const quillRefLibre = useRef();
    const quillRefRestringido = useRef();

    // archivos nuevos
    const [files, setFiles] = useState({
        portada: null,
        galeria: [],
        //galeria_restringida: [],
        videos: [],
        //videos_restringidos: [],
    });

    const handleDelete = () => {
        navigate(`/cursos/eliminar/${slug}`);
    };

    useEffect(() => {
        console.log('[EditarCurso] useEffect:', loadingHook, cursos);
        if (!loadingHook && cursos.length) {
        const dato = cursos.find(c => c.slug === slug);
        console.log('[EditarCurso] dato encontrado:', dato);
        if (!dato) {
            enqueueSnackbar('Curso no encontrado', { variant: 'error' });
            navigate('/cursos');
            return;
        }
        reset({
            titulo: dato.titulo || '',
            maestro_email: dato.maestro_email || '',
            resumen: dato.resumen || '',
            contenido: dato.contenido || '',
            //contenido_restringido: dato.contenido_restringido || '',
            restringido: !!dato.restringido,
            status: dato.status || 'borrador',
            tags: (dato.tags || []).join(', '),
            fecha_publicacion: dayjs(dato.fecha_publicacion),
            categoria: String(dato.categoria?.id || ''),
        });
            setMaestroEmail('dato.maestro_email');
            // Reemplázalo por esto:
            const portadaPath = dato.portada?.url || dato.portada || null;
            setInitialMediaUrls({
                portada: portadaPath ? `${STRAPI_URL}${portadaPath}` : null,
                galeria: dato.galeria?.map((m) => {
                    const path = m.url || m;
                    return `${STRAPI_URL}${path}`;
                }) || [],
                
                videos: dato.videos?.map((m) => {
                    const path = m.url || m;
                    return `${STRAPI_URL}${path}`;
                }) || [],
            });
            console.log('[EditarCurso] initialMediaUrls ajustado:', {
                portada: portadaPath,
                galeria: dato.galeria,
                //galeria_restringida: dato.galeria_restringida,
                videos: dato.videos,
                //videos_restringidos: dato.videos_restringidos,
            });
            console.log('[EditarCurso] initialMediaUrls:', {
            portada: dato.portada?.url,
            galeria: dato.galeria,
            //galeria_restringida: dato.galeria_restringida,
            videos: dato.videos,
            //videos_restringidos: dato.videos_restringidos,//
        });
        setCargando(false);
        console.log('[EditarCurso] formulario inicializado');
        }
    }, [loadingHook, cursos, slug, reset, enqueueSnackbar, navigate]);

    const handleFileChange = (e) => {
        const { name, files: f } = e.target;
        console.log('[EditarCurso] archivo cambiado:', name, f);

        if (name === 'portada') {
            // portada se mantiene como FileList único
            setFiles((prev) => ({ ...prev, [name]: f }));
        } else {
            // galerías y vídeos: append al array existente
            const nuevos = Array.from(f);
            setFiles((prev) => ({
            ...prev,
            [name]: prev[name]
                ? [...prev[name], ...nuevos]
                : nuevos
            }));
        }
    };

    const onSubmit = async data => {
        console.warn('///////////////////');
        console.error('*************');
        console.log('[EditarCurso] onSubmit data:', data);
        console.log('[EditarCurso] onSubmit files:', files);
        console.warn('///////////////////');
        console.warn('*************');
        console.log('[EditarCurso] onSubmit → form values:', data);
        console.log('[EditarCurso] onSubmit → files state:', files);
        const id = cursos.find(c => c.slug === slug)?.id;
        console.log('[EditarCurso] onSubmit id:', id);
        try {
        const mediaPayload = {};
        for (const key of Object.keys(files)) {
            if (files[key]?.length) {
            console.log('[EditarCurso] subiendo media:', key);
            const up = await subirMedia(files[key]);
            console.log('[EditarCurso] media subida:', key, up);
            mediaPayload[key] = up;
            }
        }
        const payload = {
            ...data,
            tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
            fecha_publicacion: data.fecha_publicacion.toISOString(),
            categoria: Number(data.categoria) || null,
        };
        console.warn('==================');
        console.error('============');
        console.log('[EditarContenido] payload final:', payload);
        console.log('[EditarContenido] onSubmit → mediaPayload:', mediaPayload);
        console.log('[EditarContenido] onSubmit → final payload:', payload);
        const res = await editarCurso(id, payload, mediaPayload);
        console.log('[EditarCurso] editarCurso res:', res);
        enqueueSnackbar('Curso actualizado con éxito', { variant: 'success' });
        navigate(`/curso/${slug}`);
        } catch (err) {
        console.error('[EditarCurso] error onSubmit:', err);
        enqueueSnackbar(`Error: ${err.message}`, { variant: 'error' });
        }
    };

    if (cargando) {
        return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress />
        </Box>
        );
    }

    const restringido = watch('restringido');

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom>
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
                                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                                        mr: 1.5,
                                        transform: 'rotate(-6deg)',
                                    }}
                                >
                            🪶
                        </Box>
                         Editar Curso
                    </Typography>
                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <Grid container spacing={2}>
                    {/* Título */}
                    <Grid item xs={12}>
                    <Controller
                        name="titulo"
                        control={control}
                        rules={{ required: 'El título es obligatorio' }}
                        render={({ field }) => (
                        <TextField
                            {...field}
                            label="Título"
                            fullWidth
                            error={!!errors.titulo}
                            helperText={errors.titulo?.message}
                        />
                        )}
                    />
                    </Grid>
                    {/* Resumen */}
                    <Grid item xs={12}>
                    <Controller
                        name="resumen"
                        control={control}
                        render={({ field }) => (
                        <TextField
                            {...field}
                            label="Resumen"
                            fullWidth
                            multiline
                            rows={2}
                        />
                        )}
                    />
                    </Grid>
                    {/* Contenido Libre */}
                    <Grid item xs={12}>
                    <Typography variant="subtitle1">Contenido</Typography>
                    <Controller
                        name="contenido"
                        control={control}
                        render={({ field }) => (
                            <ReactQuill
                                ref={quillRefLibre}
                                theme="snow"
                                value={field.value}
                                onChange={html => field.onChange(html)}
                                modules={quillModules}
                                style={{ height: 200, marginBottom: 16 }}
                            />
                        )}
                    />
                    </Grid>
                    {/* Contenido Restringido */}
                   
                    {/* Chequeo restringido */}
                    <Grid item xs={12}>
                    <Controller
                        name="restringido"
                        control={control}
                        render={({ field }) => (
                        <FormControlLabel
                            control={<Checkbox
                                 {...field}
                                 checked={field.value}
                                 sx={{
                                        color: colorControlSecundario,
                                        '&.Mui-checked': {
                                        color: colorControlSecundario,
                                        },
                                    }}
                                 />}
                            label="¿Contenido restringido?"
                        />
                        )}
                    />
                    </Grid>
                    {/* Tags */}
                    <Grid item xs={12}>
                    <Controller
                        name="tags"
                        control={control}
                        render={({ field }) => (
                        <TextField
                            {...field}
                            label="Tags (separados por coma)"
                            fullWidth
                        />
                        )}
                    />
                    </Grid>
                    {/* Fecha y status */}
                    <Grid item xs={6}>
                    <Controller
                        name="fecha_publicacion"
                        control={control}
                        render={({ field }) => (
                        <DatePicker
                            label="Fecha de publicación"
                            value={field.value}
                            onChange={val => field.onChange(val)}
                            renderInput={params => <TextField fullWidth {...params} />}
                        />
                        )}
                    />
                    </Grid>
                    <Grid item xs={6}>
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                        <TextField
                            {...field}
                            select
                            label="Status"
                            fullWidth
                        >
                            <MenuItem value="borrador">Borrador</MenuItem>
                            <MenuItem value="publicado">Publicado</MenuItem>
                        </TextField>
                        )}
                    />
                    </Grid>
                    {/* Categoría */}
                    <Grid item xs={12}>
                    <Controller
                        name="categoria"
                        control={control}
                        rules={{ required: 'Selecciona una categoría' }}
                        render={({ field }) => (
                        <TextField
                            {...field}
                            select
                            label="Categoría"
                            fullWidth
                            error={!!errors.categoria}
                            helperText={errors.categoria?.message}
                        >
                            {categorias.map(cat => (
                            <MenuItem key={cat.id} value={String(cat.id)}>
                                {cat.nombre}
                            </MenuItem>
                            ))}
                        </TextField>
                        )}
                    />
                    </Grid>
                    {/* Media: Portada */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1">Portada existente:</Typography>

                        {/* 1. Imagen actual (si aún no se ha seleccionado nueva) */}
                        {!files.portada && initialMediaUrls.portada && (
                            <Box sx={{ my: 2 }}>
                                <Box
                                    component="img"
                                    src={initialMediaUrls.portada}
                                    alt="Portada actual"
                                    sx={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 2 }}
                                />
                            </Box>
                        )}

                        {/* 2. Previsualización de la nueva portada */}
                        {files.portada && files.portada[0] && (
                            <Box sx={{ my: 2 }}>
                                <Box
                                    component="img"
                                    src={URL.createObjectURL(files.portada[0])}
                                    alt="Nueva portada"
                                    sx={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 2 }}
                                />
                            </Box>
                        )}

                        {/* 3. Botón y input oculto */}
                        <Button 
                            variant="contained"
                            component="label"
                            sx={{
                                color: colorBotonSecundario,
                                borderColor: colorBordeBotonSecundario,
                                backgroundColor: colorFondoBotonSecundario,
                                '&:hover': {
                                backgroundColor: colorFondoBotonSecundarioHoover,
                                borderColor: colorBotonSecundarioHoover,
                                color: colorBotonSecundarioHoover,
                                },
                                mt: 1, mb: 1
                            }}
                        >
                            Cambiar portada
                            <input
                                type="file"
                                hidden
                                name="portada"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </Button>
                    </Grid>
                    {/* Galerías y videos */}
                    {['galeria'].map(name => (
                    <Grid item xs={12} key={name}>
                        <Typography variant="subtitle1">{name.replace('_', ' ')} existente:</Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        {initialMediaUrls[name]?.map((url, i) => (
                            /\.(mp4|webm)$/.test(url)
                            ? <video key={i} src={url} width={120} controls style={{ borderRadius: 8 }} />
                            : <Box component="img" key={i} src={url} width={120} sx={{ borderRadius: 1 }} />
                        ))}
                        </Box>
                        {files[name] && files[name].length > 0 && (
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                {Array.from(files[name]).map((file, idx) => (
                                /\.(mp4|webm)$/.test(file.name)
                                    ? <video key={idx} src={URL.createObjectURL(file)} width={120} controls style={{ borderRadius: 8 }} />
                                    : <Box component="img" key={idx} src={URL.createObjectURL(file)} width={120} sx={{ borderRadius: 1 }} />
                                ))}
                            </Box>
                        )}
                        <Button 
                            variant="outlined" 
                            component="label"
                            sx={{
                                color: colorBotonSecundario,
                                borderColor: colorBordeBotonSecundario,
                                backgroundColor: colorFondoBotonSecundario,
                                '&:hover': {
                                    backgroundColor: colorFondoBotonSecundarioHoover,
                                    borderColor: colorBordeBotonSecundarioHoover,
                                    color: colorBotonSecundarioHoover,
                                },
                                transition: 'all 0.3s ease',
                            }}
                        >
                            Subir nuevos {name.replace('_', ' ')}
                            <input
                                type="file"
                                hidden
                                multiple
                                name={name}
                                accept={name.startsWith('videos') ? 'video/*' : 'image/*'}
                                onChange={handleFileChange}
                            />
                        </Button>
                    </Grid>
                    ))}
                    {/* Botones */}
                    <Grid item xs={12} sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button
                                type="button"
                                variant="contained"
                                disabled={isSubmitting}
                                sx={{
                                    bgcolor: '#6e862ae0',
                                    '&:hover': {
                                        bgcolor: '#8CC701',
                                    },
                                    transition: 'all 0.3s ease',
                                }}
                                startIcon={
                                    isSubmitting ? (
                                        <span className="material-icons">hourglass_top</span>
                                    ) : (
                                        <span className="material-icons">save</span>
                                    )
                                }
                                onClick={e => {
                                    console.group('🔘 BOTÓN Guardar Click');
                                    console.log(' getValues():', getValues());
                                    console.log(' files state:', files);
                                    console.log(' errors actuales:', errors);
                                    console.log(' isSubmitting:', isSubmitting);
                                    console.log('> Ahora llamando a handleSubmit(onSubmit)…');
                                    handleSubmit(onSubmit)(e);
                                    console.groupEnd();
                                }}
                            >
                                {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
                        </Button>

                        <Button
                            variant="outlined"
                            onClick={() => navigate(-1)}
                            sx={{
                                color: '#666', // texto gris oscuro
                                borderColor: '#999', // borde gris medio
                                backgroundColor: 'transparent',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    backgroundColor: '#f0f0f0',
                                    borderColor: '#666',
                                    color: '#333',
                                },
                                mr: 2, // margen derecho
                            }}
                        >
                            <span className="material-icons" style={{ marginRight: 6 }}>close</span>
                            Cancelar
                        </Button>

                        <Button
                            variant="outlined"
                            color="error"
                            onClick={() => handleDelete(maestroEmail)}
                            sx={{
                                color: '#d32f2f', // rojo MUI error
                                borderColor: '#d32f2f',
                                backgroundColor: 'transparent',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    backgroundColor: '#ffebee',
                                    borderColor: '#b71c1c',
                                    color: '#b71c1c',
                                },
                            }}
                        >
                            <span className="material-icons" style={{ marginRight: 6 }}>delete</span>
                            Eliminar
                        </Button>
                    </Grid>
                </Grid>
                </Box>
            </Paper>
        </Container>
    );
};
export default EditarCurso;
