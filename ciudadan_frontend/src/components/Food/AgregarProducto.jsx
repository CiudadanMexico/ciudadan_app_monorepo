import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Divider, Fade, Slide, Stepper, Step, StepLabel,
  FormControlLabel,
  TextField,
  MenuItem,
  useTheme,
  useMediaQuery,
  Switch,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardMedia,
  Chip,
  CardContent,
  Checkbox,
  ListItemText
} from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import '../../styles/AgregarProducto.css';
import useProductos from '../../hooks/useProductos';
import { getInvalidChars, textoValido } from '../../utils/ValidacionesProducto';
import { useFoodCategories } from '../../hooks/food/useFoodCategories';
import useProductsRestaurant from '../../hooks/food/useProductsRestaurant';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const Temperaturas = [
  { value: 'ambiente', label: 'Ambiente' },
  { value: 'caliente', label: 'Caliente' },
  { value: 'frio', label: 'Frío' },
];

const NivelesPicante = [
  { value: 'ninguno', label: 'Ninguno' },
  { value: 'leve', label: 'Leve' },
  { value: 'medio', label: 'Medio' },
  { value: 'alto', label: 'Alto' },
  { value: 'extremo', label: 'Extremo' },
];

const Steps = ['Datos Generales', 'Información', 'Características', 'Ingredientes', 'Alergenos', 'Imagen Principal', 'Galería', 'Finalizar'];

const FOOD_UNITS = [
  { value: "unidad", label: "Unidad" },
  { value: "pieza", label: "Pieza" },
  { value: "rebanada", label: "Rebanada" },
  { value: "porcion", label: "Porción" },
  { value: "gramo", label: "Gramos (g)" },
  { value: "kilogramo", label: "Kilogramos (kg)" },
  { value: "mililitro", label: "Mililitros (ml)" },
  { value: "litro", label: "Litros (L)" },
  { value: "taza", label: "Taza" },
  { value: "cucharada", label: "Cucharada" },
  { value: "cucharadita", label: "Cucharadita" },
  { value: "pizca", label: "Pizca" },
  { value: "diente", label: "Diente" },
  { value: "rama", label: "Rama" },
  { value: "hoja", label: "Hoja" },
  { value: "rodaja", label: "Rodaja" },
  { value: "cubo", label: "Cubo" },
  { value: "manojo", label: "Manojo" },
  { value: "paquete", label: "Paquete" },
  { value: "lata", label: "Lata" },
  { value: "botella", label: "Botella" }
];

const defaultFormData = {
  nombre: '',
  descripcion: '',
  precio_base: '',
  calorias: '',
  food_categories: [],
  stockEnable: false,
  stock: '',
  disponible: true,
  manejar_horario_disponibilidad: false,
  horario_disponibilidad: { inicio: null, fin: null },
  tiempo_preparacion: '',
  calorias: '',
  peso: '',
  porciones: '',
  temperatura: '',
  orden_minima: '',
  es_picante: false,
  nivel_picante: '',
  vegetariano: false,
  vegano: false,
  sin_gluten: false,
  contiene_lacteos: false,
  contiene_mariscos: false,
  contiene_cerdo: false,
  permite_programar: false,
};

const defaultIngredientes = [{ nombre: '', cantidad: null, unidad: '' }];
const defaultAlergenos = [''];

const AgregarProducto = ({ restaurante }) => {
  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
  const { user, isAuthenticated } = useAuth0();
  const { getCategories } = useFoodCategories();
  const { loading, saveProduct } = useProductsRestaurant();
  const theme = useTheme();
  const isMobileDevice = useMediaQuery(theme.breakpoints.down('sm'));

  const [categories, setCategories] = useState([]);
  const [storeId, setStoreId] = useState(restaurante?.id);
  const [storeCP, setStoreCP] = useState(restaurante?.attributes?.cp);
  const [guardado, setGuardado] = useState(false);
  const [imagenPredeterminada, setImagenPredeterminada] = useState(null);
  const [previewImagenPredeterminada, setPreviewImagenPredeterminada] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const { getStoreByEmail } = useProductos();
  const [enviando, setEnviando] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [ingredientes, setIngredientes] = useState(defaultIngredientes);
  const [alergenos, setAlergenos] = useState(defaultAlergenos);
  const [variants, setVariants] = useState([]);

  // paso producto
  const [activeStep, setActiveStep] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [imagenError, setImagenError] = useState(false);

  const validarPaso1 = (data) => {
    const nombre = data?.nombre?.trim() ?? '';
    const descripcion = data?.descripcion?.trim() ?? '';
    const precio = parseFloat(data?.precio_base ?? 0);
    const categorias = data?.food_categories ?? [];
    const stock = parseInt(data?.stock);

    if (
      nombre.length < 5 || !textoValido.test(nombre) ||
      descripcion.length < 20 || !textoValido.test(descripcion) ||
      !categorias || isNaN(precio) || precio <= 0 ||
      (data.stockEnable && (isNaN(stock) || stock < 0))
    ) {
      if (!textoValido.test(nombre)) {
        console.log("-".repeat(20));
        console.log("Caracter raro en nombre:");
        getInvalidChars(nombre);
        console.log("-".repeat(20));
      }
      if (!textoValido.test(descripcion)) {
        console.log("-".repeat(20));
        console.log("Caracter raro en nombre:");
        getInvalidChars(descripcion);
        console.log("-".repeat(20));
      }
      return false;
    }
    return true;
  };

  const validarPaso2 = ({ tiempo_preparacion, calorias, peso, porciones, temperatura, orden_minima }) => {
    if (
      isNaN(tiempo_preparacion) || tiempo_preparacion <= 0 ||
      isNaN(calorias) || calorias <= 0 ||
      isNaN(peso) || peso <= 0 ||
      isNaN(porciones) || porciones <= 0 ||
      isNaN(orden_minima) || orden_minima <= 0 ||
      !temperatura || !Temperaturas.map(i => i.value).includes(temperatura)
    ) {
      return false;
    }
    return true;
  };

  const validarPaso3 = ({ es_picante, nivel_picante }) => {
    if (es_picante && (!nivel_picante || !NivelesPicante.map(i => i.value).includes(nivel_picante)))
      return false;
    return true;
  };

  const validarPaso4 = (ingredientesData = []) => {
    if (ingredientesData.length <= 0 || ingredientesData.some(i => (!i.nombre || !i.cantidad))) {
      return false;
    }
    return true;
  };

  const validarPaso5 = (alergenosData = ['']) => {
    if (alergenosData.length <= 0 || alergenosData.some(a => !a))
      return false;
    return true;
  };

  const handleNext = () => {
    setFormSubmitted(true);

    let hayErrores = false;

    if (activeStep === 0) {
      hayErrores = !validarPaso1(formData);
    } else if (activeStep === 1) {
      hayErrores = !validarPaso2(formData);
    } else if (activeStep == 2) {
      hayErrores = !validarPaso3(formData);
    } else if (activeStep == 3) {
      hayErrores = !validarPaso4(ingredientes);
    } else if (activeStep == 4) {
      hayErrores = !validarPaso5(alergenos);
    } else if (activeStep === 5) {
      if (!imagenPredeterminada) {
        setImagenError(true);
        hayErrores = true;
      } else {
        setImagenError(false);
      }
    }

    if (!hayErrores) {
      setActiveStep((prev) => prev + 1);
      setFormSubmitted(false);
    }
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);
  const initializeStep = () => setActiveStep(0);

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const cat = await getCategories();
        setCategories(cat);
      } catch (err) {
        console.error('Error al cargar categorías', err);
        setCategories([]);
      }
    };
    fetchCategorias();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleChangeIngrediente = (field = 'nombre', value, index = 0) => {
    setIngredientes(prev => {
      const newIngredientes = prev.map((item, indx) => indx !== index ? item : (field == 'nombre' ? { ...item, nombre: value } : (field == 'cantidad' ? { ...item, cantidad: value } : { ...item, unidad: value })))
      return newIngredientes;
    })
  };

  const handleChangeAlergenos = (value = '', index = 0) => {
    setAlergenos(prev => {
      const newAlergenos = prev.map((item, i) => i != index ? item : value);
      return newAlergenos;
    });
  };

  const handleAddIngrediente = () => setIngredientes((prev) => [...prev, { nombre: '', cantidad: '', unidad: '' }]);
  const handleDeleteIngrediente = (idx) => {
    setIngredientes(prev => {
      const newIngredientes = prev.map((item, index) => { if (index != idx) return item }).filter(i => i != undefined);
      return newIngredientes;
    })
  };
  const handleAddAlergeno = () => setAlergenos(prev => [...prev, '']);
  const handleDeleteAlergeno = (idx) => {
    setAlergenos(prev => {
      const newAlergenos = prev.map((item, index) => { if (index != idx) return item }).filter(i => i != undefined);
      return newAlergenos;
    });
  };

  const handleImagenPredeterminada = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagenPredeterminada(file);
    setPreviewImagenPredeterminada(URL.createObjectURL(file));
  };

  const handleImagenes = (e) => {
    const files = Array.from(e.target.files);
    setImagenes(prev => [...prev, ...files]);
    setPreviewImages(prev => [
      ...prev,
      ...files.map(file => URL.createObjectURL(file)),
    ]);
  };

  const eliminarImagen = (index) => {
    setImagenes(prev => prev.filter((_, i) => i !== index));
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
  };

  const eliminarImagenPredeterminada = () => {
    setImagenPredeterminada(null);
    setPreviewImagenPredeterminada(null);
  };

  const handleSubmit = async (e) => {
    let cp = '11560';
    e.preventDefault();
    if (!storeId) return alert('No se ha vinculado tienda para este usuario.');
    setEnviando(true);

    try {
      cp = '11560';
      await saveProduct({
        ...formData,
        imagenes,
        ingredientes,
        alergenos,
        fecha_creacion: new Date().toISOString(),
        food_restaurant: restaurante?.id,
        imagen_predeterminada: imagenPredeterminada,
      })

      setImagenes([]);
      setPreviewImages([]);
      setIngredientes(defaultIngredientes);
      setAlergenos(defaultAlergenos);
      setImagenPredeterminada(null);
      setPreviewImagenPredeterminada(null);
      setGuardado(true);
      setTimeout(() => handleClearForm(), 4300);
    } catch (err) {
      setEnviando(false);
      console.error('Error al guardar producto:', err.response?.data || err);
      alert(`Error al guardar producto: ${err.response?.data?.error?.message || 'ver consola'}`);
    } finally {
      setEnviando(false);
    }
  };

  const handleClearForm = () => {
    setFormData(defaultFormData);
    eliminarImagenPredeterminada();
    eliminarImagen();
    setEnviando(false);
    initializeStep();
    setGuardado(false);
  };

  useEffect(() => {
    if (restaurante?.id) return;
    setStoreId(restaurante?.id)
  }, [restaurante])


  if (!isAuthenticated) return <p className="mensaje-sesion">Debes iniciar sesión para agregar platillos.</p>;
  if (guardado) return <Fade in><p className="mensaje-exito">✅ Platillo guardado con éxito.</p></Fade>;
  if (!storeId) return <p className="mensaje-sesion">No se encontró ningún restaurante asociado</p>;

  return (
    <Paper elevation={4} className="agregar-producto-container">
      {
        !isMobileDevice ? (
          <Typography variant="h5" fontWeight="bold" mb={2}>
            <span>🛒 Agregar platillo</span>
          </Typography>
        ) : (
          <Typography variant='h5' fontWeight="bold" mb={2}>
            🛒 Agregar platillo
          </Typography>
        )
      }

      <Divider sx={{ mb: 2 }} />

      <Stepper activeStep={activeStep} alternativeLabel s>
        {Steps.map((label) => (
          <Step key={label}>
            <StepLabel>{isMobileDevice ? '' : label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <form onSubmit={handleSubmit} className="agregar-producto-form">
        <Slide direction="up" in mountOnEnter unmountOnExit>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>

            {/* Paso 1: Datos Generales */}
            {activeStep === 0 && (
              <>
                {/** Nombre */}
                <TextField
                  className="input-text"
                  label="Nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  fullWidth
                  error={
                    formSubmitted &&
                    (
                      !formData.nombre.trim() ||
                      formData.nombre.trim().length < 5 ||
                      !textoValido.test(formData.nombre.trim())
                    )
                  }
                  helperText={
                    formSubmitted && (
                      !formData.nombre.trim()
                        ? 'Este campo es obligatorio'
                        : formData.nombre.trim().length < 5
                          ? 'Debe tener al menos 5 caracteres'
                          : !textoValido.test(formData.nombre.trim())
                            ? 'Contiene caracteres no permitidos'
                            : ''
                    )
                  }
                />
                {/* Descripción */}
                <TextField
                  className="input-text"
                  label="Descripción"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  multiline
                  rows={3}
                  required
                  fullWidth
                  error={
                    formSubmitted &&
                    (
                      !formData.descripcion.trim() ||
                      formData.descripcion.trim().length < 20 ||
                      !textoValido.test(formData.descripcion.trim())
                    )
                  }
                  helperText={
                    formSubmitted && (
                      !formData.descripcion.trim()
                        ? 'Este campo es obligatorio'
                        : formData.descripcion.trim().length < 20
                          ? 'Debe tener al menos 20 caracteres'
                          : !textoValido.test(formData.descripcion.trim())
                            ? 'Contiene caracteres no permitidos'
                            : ''
                    )
                  }
                />
                {/* Precio */}
                <TextField
                  className="input-text"
                  label="Precio"
                  name="precio_base"
                  type="number"
                  value={formData.precio}
                  onChange={handleChange}
                  required
                  fullWidth
                  InputProps={{
                    startAdornment: <span style={{ marginRight: 8 }}>$</span>,
                  }}
                  error={
                    formSubmitted &&
                    (formData.precio === '' || parseFloat(formData.precio) <= 0)
                  }
                  helperText={
                    formSubmitted &&
                    (formData.precio === ''
                      ? 'Este campo es obligatorio'
                      : parseFloat(formData.precio) <= 0
                        ? 'El precio debe ser mayor a cero'
                        : '')
                  }
                />
                {/* Categorías */}
                <TextField
                  className="input-text"
                  select
                  label="Categorías"
                  name="food_categories"
                  value={formData.food_categories || []}
                  onChange={handleChange}
                  required
                  fullWidth
                  error={
                    formSubmitted &&
                    (!formData.food_categories || formData.food_categories.length === 0)
                  }
                  helperText={
                    formSubmitted &&
                      (!formData.food_categories || formData.food_categories.length === 0)
                      ? "Selecciona al menos una categoría"
                      : ""
                  }
                  SelectProps={{
                    multiple: true,
                    renderValue: (selected) =>
                      categories
                        .filter((cat) => selected.includes(cat.id))
                        .map((cat) => cat.attributes.nombre)
                        .join(", ")
                  }}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      <Checkbox
                        checked={formData.food_categories.includes(cat.id)}
                      />
                      <ListItemText primary={cat.attributes.nombre} />
                    </MenuItem>
                  ))}
                </TextField>
                {/* Habilitar horario disponibilidad */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.manejar_horario_disponibilidad}
                      onChange={() =>
                        setFormData(prev => ({
                          ...prev,
                          manejar_horario_disponibilidad: !prev.manejar_horario_disponibilidad,
                        }))
                      }
                    />
                  }
                  label="Habilitar horario de disponibilidad"
                />
                {/* Horario disponibilidad */}
                {
                  formData.manejar_horario_disponibilidad && (
                    <>
                      <Typography my={1}>Horario disponibilidad</Typography>
                      <Box display='flex' justifyContent='space-between' alignItems='center' gap={1} flexDirection={isMobileDevice ? 'column' : 'row'}>
                        <TextField
                          className="input-text"
                          label="Inicio"
                          name="horario_disponibilidad_inicio"
                          type="time"
                          value={formData.horario_disponibilidad.inicio}
                          onChange={(e) => {
                            setFormData(({ horario_disponibilidad, ...rest }) => ({
                              ...rest,
                              horario_disponibilidad: { ...horario_disponibilidad, inicio: e.target.value }
                            }))
                          }}
                          required
                          error={
                            formSubmitted &&
                            (formData.horario_disponibilidad.inicio === '')
                          }
                          helperText={
                            formSubmitted &&
                            (formData.horario_disponibilidad.inicio === ''
                              ? 'Este campo es obligatorio'
                              : '')
                          }
                          fullWidth
                        />
                        <TextField
                          className="input-text"
                          label="Fin"
                          name="horario_disponibilidad_fin"
                          type="time"
                          value={formData.horario_disponibilidad.fin}
                          onChange={(e) => {
                            setFormData(({ horario_disponibilidad, ...rest }) => ({
                              ...rest,
                              horario_disponibilidad: { ...horario_disponibilidad, fin: e.target.value }
                            }))
                          }}
                          required
                          error={
                            formSubmitted &&
                            (formData.horario_disponibilidad.fin === '')
                          }
                          helperText={
                            formSubmitted &&
                            (formData.horario_disponibilidad.fin === ''
                              ? 'Este campo es obligatorio'
                              : '')
                          }
                          fullWidth
                        />
                      </Box>
                    </>
                  )
                }
                {/* Habilitar stock */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.stockEnable}
                      onChange={() =>
                        setFormData(prev => ({
                          ...prev,
                          stockEnable: !prev.stockEnable,
                          stock: !prev.stockEnable ? '' : 0,
                        }))
                      }
                    />
                  }
                  label="Habilitar control de stock"
                />
                {formData.stockEnable && (
                  <TextField
                    className="input-text"
                    label="Stock"
                    name="stock"
                    type="number"
                    value={formData.stock}
                    onChange={handleChange}
                    fullWidth
                    inputProps={{ min: 0 }}
                    error={formSubmitted && parseInt(formData.stock) < 0}
                    helperText={
                      formSubmitted && parseInt(formData.stock) < 0
                        ? 'El stock no puede ser negativo'
                        : ''
                    }
                  />
                )}

              </>
            )}

            {/* Paso 2: Medidas */}
            {activeStep === 1 && (
              <>
                {/* Tiempo preparación */}
                <TextField
                  className="input-text"
                  label="Tiempo preparación (minutos)"
                  name="tiempo_preparacion"
                  type="number"
                  value={formData.tiempo_preparacion}
                  min={0}
                  onChange={handleChange}
                  required
                  fullWidth
                  error={formSubmitted && !formData.tiempo_preparacion}
                  helperText={formSubmitted && !formData.tiempo_preparacion ? 'Este campo es obligatorio' : ''}
                />
                {/* Calorias */}
                <TextField
                  className="input-text"
                  label="Calorias"
                  name="calorias"
                  type="number"
                  value={formData.calorias}
                  onChange={handleChange}
                  required
                  fullWidth
                  error={formSubmitted && !formData.calorias}
                  helperText={formSubmitted && !formData.calorias ? 'Este campo es obligatorio' : ''}
                />
                {/* Peso */}
                <TextField
                  className="input-text"
                  label="Peso (kg)"
                  name="peso"
                  type="number"
                  value={formData.peso}
                  onChange={handleChange}
                  required
                  fullWidth
                  error={formSubmitted && !formData.peso}
                  helperText={formSubmitted && !formData.peso ? 'Este campo es obligatorio' : ''}
                />
                <TextField
                  className="input-text"
                  label="Porciones"
                  name="porciones"
                  type="number"
                  value={formData.porciones}
                  onChange={handleChange}
                  required
                  fullWidth
                  error={formSubmitted && !formData.porciones}
                  helperText={formSubmitted && !formData.porciones ? 'Este campo es obligatorio' : ''}
                />
                <TextField
                  className="input-text"
                  label="Orden mínima"
                  name="orden_minima"
                  type="number"
                  value={formData.orden_minima}
                  onChange={handleChange}
                  fullWidth
                  error={formSubmitted && !formData.orden_minima}
                  helperText={formSubmitted && !formData.orden_minima ? 'Este campo es obligatorio' : ''}
                />
                <TextField
                  className="input-text"
                  label="Temperatura"
                  name="temperatura"
                  select
                  value={formData.temperatura}
                  onChange={handleChange}
                  fullWidth
                >
                  {Temperaturas.map((tmp, idx) => (
                    <MenuItem key={`temperatura-item-${idx}`} value={tmp.value}>
                      {tmp.label}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}
            {/** Paso 3: Especificaciones */}
            {
              activeStep === 2 && (
                <>
                  {/* ¿Es picante? */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.es_picante}
                        onChange={() =>
                          setFormData(prev => ({
                            ...prev,
                            es_picante: !prev.es_picante,
                            nivel_picante: '',
                          }))
                        }
                      />
                    }
                    label="¿Es picante?"
                  />
                  {formData.es_picante && (
                    <TextField
                      className="input-text"
                      label="Nivel de picante"
                      name="nivel_picante"
                      select
                      value={formData.nivel_picante}
                      onChange={handleChange}
                      error={formSubmitted && !formData.nivel_picante}
                      helperText={formSubmitted && !formData.nivel_picante ? 'Selecciona un nivel de picante' : ''}
                      fullWidth
                    >
                      {NivelesPicante.map((np, idx) => (
                        <MenuItem key={`nivel-picante-item-${idx}`} value={np.value}>
                          {np.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                  {/* ¿Es vegetariano? */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.vegetariano}
                        onChange={() =>
                          setFormData(prev => ({
                            ...prev,
                            vegetariano: !prev.vegetariano,
                          }))
                        }
                      />
                    }
                    label="¿Es vegetariano?"
                  />
                  {/* ¿Es vegano? */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.vegano}
                        onChange={() =>
                          setFormData(prev => ({
                            ...prev,
                            vegano: !prev.vegano,
                          }))
                        }
                      />
                    }
                    label="¿Es vegano?"
                  />
                  {/* ¿Sin gluten? */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.sin_gluten}
                        onChange={() =>
                          setFormData(prev => ({
                            ...prev,
                            sin_gluten: !prev.sin_gluten,
                          }))
                        }
                      />
                    }
                    label="¿Contiene gluten?"
                  />
                  {/* ¿Lácteos? */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.contiene_lacteos}
                        onChange={() =>
                          setFormData(prev => ({
                            ...prev,
                            contiene_lacteos: !prev.contiene_lacteos,
                          }))
                        }
                      />
                    }
                    label="¿Contiene lácteos?"
                  />
                  {/* ¿Mariscos? */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.contiene_mariscos}
                        onChange={() =>
                          setFormData(prev => ({
                            ...prev,
                            contiene_mariscos: !prev.contiene_mariscos,
                          }))
                        }
                      />
                    }
                    label="¿Contiene mariscos?"
                  />
                  {/* ¿Cerdo? */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.contiene_cerdo}
                        onChange={() =>
                          setFormData(prev => ({
                            ...prev,
                            contiene_cerdo: !prev.contiene_cerdo,
                          }))
                        }
                      />
                    }
                    label="¿Contiene cerdo?"
                  />
                  {/* ¿Permite programar? */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.permite_programar}
                        onChange={() =>
                          setFormData(prev => ({
                            ...prev,
                            permite_programar: !prev.permite_programar,
                          }))
                        }
                      />
                    }
                    label="¿Permite programar?"
                  />
                </>
              )
            }
            {/** Paso 4: Ingredientes */}
            {
              activeStep === 3 && (
                <>
                  <Typography>Ingredientes</Typography>
                  {ingredientes.map((ingrediente, index) => (
                    <Box
                      key={`ingrediente-list-item-${index}`}
                      display="flex"
                      gap={1}
                      flexWrap="wrap"
                      alignItems="center"
                      mb={2}
                    >
                      <TextField
                        className="input-text"
                        label="Nombre"
                        value={ingrediente.nombre}
                        onChange={(e) =>
                          handleChangeIngrediente("nombre", e.target.value, index)
                        }
                        sx={{
                          width: {
                            xs: "100%",
                            md: "42%"
                          }
                        }}
                      />

                      <TextField
                        className="input-text"
                        label="Cantidad"
                        type="number"
                        value={ingrediente.cantidad}
                        onChange={(e) =>
                          handleChangeIngrediente("cantidad", e.target.value, index)
                        }
                        sx={{
                          width: {
                            xs: "48%",
                            md: "18%"
                          }
                        }}
                      />

                      <FormControl
                        sx={{
                          width: {
                            xs: "48%",
                            md: "25%"
                          }
                        }}
                      >
                        <InputLabel>Unidad</InputLabel>

                        <Select
                          value={ingrediente.unidad || "unidad"}
                          label="Unidad"
                          onChange={(e) =>
                            handleChangeIngrediente("unidad", e.target.value, index)
                          }
                        >
                          {FOOD_UNITS.map((item) => (
                            <MenuItem key={item.value} value={item.value}>
                              {item.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleDeleteIngrediente(index)}
                        sx={{
                          width: {
                            xs: "100%",
                            md: "10%"
                          },
                          height: 56
                        }}
                      >
                        <DeleteIcon />
                      </Button>
                    </Box>
                  ))}
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddIngrediente()}
                  >
                    <Typography sx={{ textTransform: 'capitalize' }}>
                      Agregar
                    </Typography>
                  </Button>
                </>
              )
            }
            {/** Paso 5: Alergenos */}
            {
              activeStep === 4 && (
                <>
                  <Typography>Registra alergenos</Typography>
                  {
                    alergenos.map((alergeno, index) => (
                      <Box key={`alergeno-list-item-${index}`} display='flex' alignItems='center' gap={1} flexWrap='wrap'>
                        <TextField
                          className="input-text"
                          label="Nombre"
                          name="name"
                          value={alergeno}
                          onChange={(e) => handleChangeAlergenos(e.target.value, index)}
                          sx={{ width: isMobileDevice ? '100%' : '80%' }}
                        />
                        <Button
                          variant="contained"
                          color='error'
                          onClick={() => handleDeleteAlergeno(index)}
                          sx={{ width: isMobileDevice ? '100%' : '10%' }}
                        >
                          <DeleteIcon />
                        </Button>
                      </Box>
                    ))
                  }
                  <Button
                    variant="contained"
                    onClick={() => handleAddAlergeno()}
                  >
                    <AddIcon />
                    <Typography sx={{ textTransform: 'capitalize' }}>
                      Agregar
                    </Typography>
                  </Button>
                </>
              )
            }

            {/* Paso 6: Imagen predeterminada */}
            {activeStep === 5 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Imagen principal
                </Typography>
                <Button
                  variant="contained"
                  component="label"
                  color="primary"
                  sx={{ mt: 1, mb: 2 }}
                >
                  Subir Imagen Principal
                  <input
                    hidden
                    accept="image/*"
                    type="file"
                    onChange={handleImagenPredeterminada}
                  />
                </Button>

                {imagenError && (
                  <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    Debes subir una imagen predeterminada
                  </Typography>
                )}

                {previewImagenPredeterminada && (
                  <Box
                    mt={2}
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={2}
                  >
                    <Box
                      component="img"
                      src={previewImagenPredeterminada}
                      alt="Imagen Principal"
                      sx={{
                        width: 120,
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 2,
                        border: '2px solid #6d6e71',
                        boxShadow: 2,
                      }}
                    />
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={eliminarImagenPredeterminada}
                    >
                      Eliminar
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Paso 7: Galería de imágenes */}
            {activeStep === 6 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Galería de Imágenes
                </Typography>

                <Button
                  variant="contained"
                  component="label"
                  color="primary"
                  sx={{ mt: 1, mb: 2 }}
                >
                  Subir Imágenes
                  <input
                    hidden
                    multiple
                    accept="image/*"
                    type="file"
                    onChange={handleImagenes}
                  />
                </Button>

                {previewImages.length > 0 && (
                  <Box
                    mt={2}
                    display="flex"
                    flexWrap="wrap"
                    gap={2}
                    justifyContent="center"
                  >
                    {previewImages.map((src, index) => (
                      <Box
                        key={index}
                        position="relative"
                        sx={{
                          width: 120,
                          height: 120,
                          borderRadius: 2,
                          overflow: 'hidden',
                          border: '2px solid #6d6e71',
                          boxShadow: 2,
                        }}
                      >
                        <img
                          src={src}
                          alt={`preview-${index}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={() => eliminarImagen(index)}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            minWidth: 'unset',
                            width: 24,
                            height: 24,
                            padding: 0,
                            fontSize: 12,
                          }}
                        >
                          ✕
                        </Button>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* Paso 8: Confirmar */}
            {activeStep === 7 && (
              <>
                <Typography variant="h6" gutterBottom>✅ Listo para guardar</Typography>
                <Typography>Revisa los datos antes de continuar.</Typography>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: 2,
                    boxShadow: 4,
                    overflow: 'hidden',
                    cursor: 'default',
                  }}
                >
                  <Box>
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        image={previewImagenPredeterminada}
                        alt={formData.nombre || 'Platillo'}
                        unselectable='off'
                        sx={{ height: { xs: 180, sm: 180 }, objectFit: 'cover', width: '100%' }}
                      />

                      {/* Badge de stock / agotado */}
                      {formData.stockEnable && typeof formData.stock === 'number' && (
                        <Chip
                          label={formData.stock === 0 ? 'Agotado' : `Disponibles: ${formData.stock}`}
                          color={formData.stock === 0 ? 'error' : 'default'}
                          size="small"
                          sx={{ position: 'absolute', left: 10, top: 10, bgcolor: formData.stock === 0 ? '#ffebee' : 'rgba(255,255,255,0.9)', fontWeight: 700 }}
                        />
                      )}
                    </Box>

                    <CardContent sx={{ pt: 2 }}>
                      <Typography variant="subtitle1" component="div" fontWeight={700} noWrap sx={{ mb: 0.5 }}>
                        {formData.nombre || 'Sin título'}
                      </Typography>

                      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="h6" fontWeight={800}>
                          {formData.precio_base}
                        </Typography>
                      </Box>
                      {/* Tiempo preparación / peso */}
                      <Box display="flex" justifyContent="space-between" gap={1} flexWrap='wrap'>
                        <Typography variant="caption" color="text.secondary">Tiempo preparación: {formData.tiempo_preparacion ?? 0}</Typography>
                        <Typography variant="caption" color="text.secondary">Peso: {formData.peso ?? 0}</Typography>
                      </Box>
                      {/* Calorias / porciones */}
                      <Box display="flex" justifyContent="space-between" gap={1} flexWrap='wrap'>
                        <Typography variant="caption" color="text.secondary">Calorias: {formData.calorias ?? 0}</Typography>
                        <Typography variant="caption" color="text.secondary">Porciones: {formData.porciones ?? 0}</Typography>
                      </Box>
                      {/* Picante / Temperatura */}
                      <Box display="flex" justifyContent="space-between" gap={1} flexWrap='wrap'>
                        <Typography variant="caption" color="text.secondary">Picante: {formData.nivel_picante ?? 'ninguno'}</Typography>
                        <Typography variant="caption" color="text.secondary">Temperatura: {formData.temperatura ?? ''}</Typography>
                      </Box>
                      {/* descripción corta */}
                      {formData.descripcion && (
                        <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {formData.descripcion}
                        </Typography>
                      )}
                      {/* Categorias */}
                      <Typography variant="caption" color="primary" mt={1}>Categorias:</Typography>
                      <Box display="flex" alignItems="center" gap={1} flexWrap='wrap' mb={1}>
                        {
                          (categories.filter((cat) => formData.food_categories.includes(cat.id))).map(({ id: categoryId, attributes }) => (
                            <Typography key={`category-${categoryId}}`} variant="caption" color="text.secondary">• {attributes?.nombre ?? ''}</Typography>
                          ))
                        }
                      </Box>
                      {/* Ingredientes */}
                      <Box display="flex" flexDirection="column" justifyContent="center" flexWrap='wrap'>
                        <Typography variant="caption" color="primary">Ingredientes:</Typography>
                        {
                          ingredientes.map((ingrediente, index) => (
                            <Typography key={`ingrediente-${index}-product`} variant="caption" color="text.secondary" pl={1}>• {ingrediente?.nombre ?? ''}</Typography>
                          ))
                        }
                      </Box>
                      {/* Alergenos */}
                      <Box display="flex" flexDirection="column" justifyContent="center" flexWrap='wrap'>
                        <Typography variant="caption" color="primary">Alergenos</Typography>
                        {
                          alergenos.map((alergeno, index) => (
                            <Typography key={`alergeno-${index}-product`} variant="caption" color="text.secondary" pl={1}>• {alergeno ?? ''}</Typography>
                          ))
                        }
                      </Box>
                      {/* Flags */}
                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={2}>
                        {formData.vegetariano && (<Chip label="Vegetariano" color="success" size="small" sx={{ fontWeight: 700 }} />)}
                        {formData.vegano && (<Chip label="Vegano" color="success" size="small" sx={{ fontWeight: 700 }} />)}
                        {formData.sin_gluten && (<Chip label="Sin gluten" color="default" size="small" sx={{ fontWeight: 700 }} />)}
                        {formData.contiene_lacteos && (<Chip label="Contiene lacteos" color="info" size="small" sx={{ fontWeight: 700 }} />)}
                        {formData.contiene_mariscos && (<Chip label="Contiene mariscos" color="error" size="small" sx={{ fontWeight: 700 }} />)}
                        {formData.contiene_cerdo && (<Chip label="Contiene cerdo" color="secondary" size="small" sx={{ fontWeight: 700 }} />)}
                      </Box>
                    </CardContent>
                  </Box>
                </Card>
                <Button type="submit" variant="contained" color="primary" disabled={enviando}>
                  {enviando ? 'Guardando...' : 'Guardar platillo'}
                </Button>
              </>
            )}

            {/* Navegación entre pasos */}
            <Box mt={2} display="flex" justifyContent="space-between">
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
              >
                Anterior
              </Button>
              {activeStep < 7 && (
                <Button
                  onClick={handleNext}
                >
                  Siguiente
                </Button>
              )}
            </Box>
          </Box>
        </Slide>
      </form>
    </Paper>
  );
};
export default AgregarProducto;
