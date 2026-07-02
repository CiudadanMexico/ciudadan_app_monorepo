import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/system';
import { motion } from 'framer-motion';
import { useEventos } from '../../hooks/useEventos.jsx';
import { useSnackbar } from 'notistack';
import UbicacionEvento from '../../components/Eventos/UbicacionEvento.jsx';

const Contenedor = styled(Box)({
  background: '#c2f0d3',
  color: '#1a1a1a',
  padding: '2rem',
  borderRadius: '20px',
  border: '2px solid #b8ff57',
  boxShadow: '0 0 25px #86ff81aa',
  maxWidth: 800,
  margin: 'auto',
});

export default function CrearEvento() {
  const { crearEvento, eventos } = useEventos();
  const { enqueueSnackbar } = useSnackbar();

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    fecha_inicio: '',
    hora_inicio: '',
    fecha_fin: '',
    hora_fin: '',
    de_pago: false,
    precio: '',
    modalidad: '',
    url: '',
    direccion: '',
    ciudad: '',
    estado: '',
    cp: '',
  });
  const [fechasExtras, setFechasExtras] = useState([{ fecha: '', hora: '' }]);
  const [portada, setPortada] = useState(null);
  const [portadaPreview, setPortadaPreview] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [imagenesPreview, setImagenesPreview] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const handleInput = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePortadaSelect = (e) => {
    const file = e.target.files[0] || null;
    setPortada(file);
    setPortadaPreview(file ? URL.createObjectURL(file) : null);
  };
  const handleImagenesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImagenes(prev => [...prev, ...files]);
    setImagenesPreview(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const handleExtraChange = (i, key, val) => {
    const copy = [...fechasExtras];
    copy[i][key] = val;
    setFechasExtras(copy);
  };
  const agregarFecha = () => setFechasExtras(p => [...p, { fecha: '', hora: '' }]);
  const eliminarFecha = (i) => setFechasExtras(p => p.filter((_, idx) => idx !== i));

  const slugify = (str) =>
    str
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');

  const validate = () => {
    const errs = [];

    // título
    if (!form.titulo.trim()) {
      errs.push('¡Ey, escribe un título para tu megaevento!');
    } else {
      if (form.titulo.trim().length < 3) {
        errs.push('¡Viajate más! El título debe tener al menos 3 caracteres.');
      }
      const tituloSlug = slugify(form.titulo);
      if (eventos.some(ev => ev.slug === tituloSlug)) {
        errs.push('¡Ups! Ese nombre de evento ya existe. 🚫');
      }
    }

    // descripción
    if (!form.descripcion.trim()) {
      errs.push('Sin descripción, ¿qué cuento le damos al público?');
    } else if (form.descripcion.trim().length < 10) {
      errs.push('¡Uy, la descripción está chafa! Debe tener al menos 10 caracteres.');
    }

    // fechas de inicio
    if (!form.fecha_inicio) {
      errs.push('Ponle fecha de inicio, no vaya a ser un fantasma. 👻');
    }
    if (!form.hora_inicio) {
      errs.push('Sin hora de inicio, ¡no podemos despegar sin hora! 🚀');
    }
    if (form.fecha_inicio && form.hora_inicio) {
      const dt = new Date(`${form.fecha_inicio}T${form.hora_inicio}`);
      if (dt <= new Date()) {
        errs.push('¿Viajas en el tiempo? ¡Saca cohete! La fecha debe ser en el futuro.');
      }
    }

    // fecha y hora fin
    if (form.fecha_fin || form.hora_fin) {
      if (!form.fecha_fin) {
        errs.push('Ponle fecha fin o déjalo en blanco si es un solo día.');
      }
      if (!form.hora_fin) {
        errs.push('Ponle hora fin o déjalo en blanco si es un solo día.');
      }
      if (form.fecha_fin && form.hora_fin) {
        const dtFin = new Date(`${form.fecha_fin}T${form.hora_fin}`);
        if (dtFin <= new Date()) {
          errs.push('¿Viajas en el tiempo? ¡Saca cohete! La fecha debe ser en el futuro.');
        }
        // fin posterior a inicio
        if (form.fecha_inicio && form.hora_inicio) {
          const dtIni = new Date(`${form.fecha_inicio}T${form.hora_inicio}`);
          if (dtFin <= dtIni) {
            errs.push('¿El evento va para atrás en el tiempo? La fecha y hora de fin tienen que ser después que las de inicio. ⏳');
          }
        }
      }
    }

    // portada
    if (!portada) {
      errs.push('La portada sin imagen es como un libro sin portada. 📚');
    }

    // modalidad
    if (!form.modalidad) {
      errs.push('¿Qué? ¿no va a haber evento? Ponle modalidad 🤷');
    }
    if (['presencial', 'híbrido'].includes(form.modalidad)) {
      if (!form.direccion || !form.ciudad || !form.estado || !form.cp) {
        errs.push('¿Y así quieres banda en tu evento? Ingresa una ubicación válida 📍');
      }
    }
    if (form.modalidad === 'híbrido') {
      if (!form.url) {
        errs.push('Virtual sin enlace… ¿evento invisible? 👻');
      }
    }

    // pago
    if (form.de_pago) {
      const num = parseFloat(form.precio);
      if (isNaN(num) || num < 0) {
        errs.push('¿Así quieres vender? Ingresa un precio válido (si quieres hasta con centavos) 💰');
      }
    }

    // URL
    if (form.url) {
      try {
        new URL(form.url);
      } catch {
        errs.push('Esa URL no cuadra… usa algo como https://ejemplo.com');
      }
    }
    if (form.modalidad === 'en línea' && !form.url) {
      errs.push('Virtual sin enlace… ¿evento invisible? 👻');
    }

    // fechas adicionales
    fechasExtras.forEach((f, i) => {
      if (f.fecha || f.hora) {
        if (!f.fecha) {
          errs.push(`La fecha extra #${i + 1} está incompleta.`);
        }
        if (!f.hora) {
          errs.push(`La hora extra #${i + 1} está incompleta.`);
        }
        if (f.fecha && f.hora) {
          const dtEx = new Date(`${f.fecha}T${f.hora}`);
          if (dtEx <= new Date()) {
            errs.push(`La fecha adicional #${i + 1} debe ser en el futuro. 🚀`);
          }
        }
      }
    });

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length) {
      errs.forEach(msg =>
        enqueueSnackbar(msg, { variant: 'error', autoHideDuration: 4000 })
      );
      return;
    }
    setEnviando(true);
    try {
      const media = {};
      if (portada) media.portada = portada;
      if (imagenes.length) media.imagenes = imagenes;

      await crearEvento({ ...form, fechas_horarios_adicionales: fechasExtras }, media);
      enqueueSnackbar('🎉 ¡Listo, tu evento está al aire!', { variant: 'success' });
      // reset
      setForm({
        titulo: '',
        descripcion: '',
        fecha_inicio: '',
        hora_inicio: '',
        fecha_fin: '',
        hora_fin: '',
        de_pago: false,
        precio: '',
        modalidad: '',
        url: '',
        direccion: '',
        ciudad: '',
        estado: '',
        cp: '',
      });
      setFechasExtras([{ fecha: '', hora: '' }]);
      setPortada(null);
      setPortadaPreview(null);
      setImagenes([]);
      setImagenesPreview([]);
    } catch (err) {
      if (err.message.includes('This attribute must be unique')) {
        enqueueSnackbar('¡Sé más original! El título del evento ya existe y tiene que ser único. 🤔', { variant: 'error' });
      } else {
        enqueueSnackbar('😢 Uf, algo salió mal. Intenta de nuevo, ¡no te rindas!', { variant: 'error' });
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <Contenedor>
        <Typography variant="h4" gutterBottom>
          Crear nuevo evento
        </Typography>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          {/* Título & Descripción */}
          <TextField label="Título *" name="titulo" value={form.titulo} onChange={handleInput} fullWidth sx={{ my: 2 }} />
          <TextField
            label="Descripción *"
            name="descripcion"
            value={form.descripcion}
            onChange={handleInput}
            fullWidth
            multiline
            rows={4}
            sx={{ my: 2 }}
          />

          {/* Modalidad */}
          <FormControl component="fieldset" sx={{ my: 2 }}>
            <FormLabel>Modalidad *</FormLabel>
            <RadioGroup row name="modalidad" value={form.modalidad} onChange={handleInput}>
              <FormControlLabel value="presencial" control={<Radio />} label="Presencial" />
              <FormControlLabel value="híbrido" control={<Radio />} label="Híbrido" />
              <FormControlLabel value="en línea" control={<Radio />} label="Virtual" />
            </RadioGroup>
          </FormControl>

          {/* Ubicación / URL */}
          {form.modalidad === 'en línea' ? (
            <TextField
              label="URL del evento *"
              name="url"
              value={form.url}
              onChange={handleInput}
              fullWidth
              sx={{ my: 2 }}
            />
          ) : form.modalidad ? (
            <>
              <UbicacionEvento
                onLocationChange={({ direccion, ciudad, estado, cp, lat, lng }) => {
                  setForm(f => ({ ...f, direccion, ciudad, estado, cp, lat, lng }));
                }}
              />
              <TextField
                label="URL del evento (opcional)"
                name="url"
                value={form.url}
                onChange={handleInput}
                fullWidth
                sx={{ my: 2 }}
              />
            </>
          ) : null}

          {/* Fecha & Hora Inicio */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField type="date" label="Fecha inicio *" name="fecha_inicio" value={form.fecha_inicio} onChange={handleInput} InputLabelProps={{ shrink: true }} sx={{ my: 2, flex: 1 }} />
            <TextField type="time" label="Hora inicio *" name="hora_inicio" value={form.hora_inicio} onChange={handleInput} InputLabelProps={{ shrink: true }} sx={{ my: 2, flex: 1 }} />
          </Box>

          {/* Fecha & Hora Fin */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField type="date" label="Fecha fin" name="fecha_fin" value={form.fecha_fin} onChange={handleInput} InputLabelProps={{ shrink: true }} sx={{ my: 2, flex: 1 }} />
            <TextField type="time" label="Hora fin" name="hora_fin" value={form.hora_fin} onChange={handleInput} InputLabelProps={{ shrink: true }} sx={{ my: 2, flex: 1 }} />
          </Box>

          {/* ¿Es de pago? */}
          <FormControlLabel
            control={<Checkbox checked={form.de_pago} onChange={handleInput} name="de_pago" />}
            label="¿Es de pago?"
          />
          {form.de_pago && (
            <TextField
              label="Precio (MXN) *"
              name="precio"
              type="number"
              value={form.precio}
              onChange={handleInput}
              fullWidth
              sx={{ my: 2 }}
            />
          )}

          {/* Fechas adicionales */}
          <Typography variant="h6" mt={3}>Fechas adicionales</Typography>
          {fechasExtras.map((f, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, my: 1 }}>
              <TextField type="date" value={f.fecha} onChange={e => handleExtraChange(i, 'fecha', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField type="time" value={f.hora} onChange={e => handleExtraChange(i, 'hora', e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
              <IconButton onClick={() => eliminarFecha(i)}>
                <span className="material-icons" style={{ color: 'red' }}>remove_circle</span>
              </IconButton>
            </Box>
          ))}
          <Button onClick={agregarFecha} startIcon={<span className="material-icons">add</span>} sx={{ mb: 2, textTransform: 'none' }}>
            Agregar fecha
          </Button>

          {/* Portada */}
          <Box my={2}>
            <Typography>Portada *</Typography>
            <input id="portada-input" type="file" accept="image/*" hidden onChange={handlePortadaSelect} />
            <label htmlFor="portada-input">
              <Button variant="contained" component="span" startIcon={<span className="material-icons">cloud_upload</span>}>
                Subir portada
              </Button>
            </label>
            {portadaPreview && (
              <Box mt={1} sx={{ border: '2px solid #b8ff57', p: 1, borderRadius: 2 }}>
                <img src={portadaPreview} alt="Preview portada" style={{ maxHeight: 120 }} />
              </Box>
            )}
          </Box>

          {/* Imágenes adicionales */}
          <Box my={2}>
            <Typography>Imágenes adicionales</Typography>
            <input id="imgs-input" type="file" accept="image/*" multiple hidden onChange={handleImagenesSelect} />
            <label htmlFor="imgs-input">
              <Button variant="contained" component="span" startIcon={<span className="material-icons">cloud_upload</span>}>
                Subir imágenes
              </Button>
            </label>
            <Box mt={1} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {imagenesPreview.map((url, idx) => (
                <Box key={idx} sx={{ border: '2px solid #b8ff57', p: 0.5, borderRadius: 2 }}>
                  <img src={url} alt={`Preview ${idx}`} style={{ maxHeight: 80 }} />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Crear evento */}
          <Button
            type="submit"
            variant="contained"
            disabled={enviando}
            sx={{
              mt: 3,
              background: '#91ff49',
              color: '#1a1a1a',
              fontWeight: 'bold',
              boxShadow: '0 0 10px #91ff49',
            }}
          >
            {enviando ? '¡Dándole candela!' : 'Crear evento'}
          </Button>
        </form>
      </Contenedor>
    </motion.div>
  );
}
