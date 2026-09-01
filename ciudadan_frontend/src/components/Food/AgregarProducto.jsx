import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Divider, Fade, Slide, Stepper, Step, StepLabel,
  useTheme,
  useMediaQuery,
  CircularProgress
} from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import '../../styles/AgregarProducto.css';
import { textoValido } from '../../utils/ValidacionesProducto';
import { useFoodCategories } from '../../hooks/food/useFoodCategories';
import useProductsRestaurant from '../../hooks/food/useProductsRestaurant';

import ProductoDatosGenerales from './ProductoDatosGenerales';
import ProductoInformacion from './ProductoInformacion';
import ProductoCaracteristicas from './ProductoCaracteristicas';
import ProductoIngredientes from './ProductoIngredientes';
import ProductoAlergenos from './ProductoAlergenos';
import ProductoModificadores from './ProductoModificadores';
import ProductoImageUploadField from './ProductoImageUploadField';
import ProductoResumen from './ProductoResumen';
import ProductoVarianteFormDialog from './ProductoVarianteFormDialog';

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

// const Steps = ['Datos Generales', 'Información', 'Características', 'Ingredientes', 'Alergenos', 'Imagen Principal', 'Galería', 'Finalizar'];
const Steps = [
  {
    label: 'Datos generales',
    shortLabel: 'Datos',
  },
  {
    label: 'Información',
    shortLabel: 'Información',
  },
  {
    label: 'Características',
    shortLabel: 'Características',
  },
  {
    label: 'Ingredientes',
    shortLabel: 'Ingredientes',
  },
  {
    label: 'Alérgenos',
    shortLabel: 'Alérgenos',
  },
  {
    label: 'Imagen predeterminada',
    shortLabel: 'Imagen',
  },
  {
    label: 'Imágenes',
    shortLabel: 'Imágenes',
  },
  {
    label: 'Resumen',
    shortLabel: 'Resumen',
  },
  {
    label: 'Modificadores',
    shortLabel: 'Modificadores',
  },
];

const LAST_STEP = Steps.length - 1;

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
  stock: 0,
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
  nivel_picante: 'ninguno',
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
  const { isAuthenticated } = useAuth0();
  const { getCategories } = useFoodCategories();
  const { saveProduct } = useProductsRestaurant();
  const theme = useTheme();
  const isMobileDevice = useMediaQuery(theme.breakpoints.down('sm'));

  const [categories, setCategories] = useState([]);
  const [storeId, setStoreId] = useState(restaurante?.id);
  const [guardado, setGuardado] = useState(false);

  const [imagenPredeterminada, setImagenPredeterminadaState] = useState(null);
  const [previewImagenPredeterminada, setPreviewImagenPredeterminada] = useState(null);
  const [imagenes, setImagenes] = useState([]);

  const [enviando, setEnviando] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);
  const [ingredientes, setIngredientes] = useState(defaultIngredientes);
  const [alergenos, setAlergenos] = useState(defaultAlergenos);

  // Variantes agregadas en esta sesión (aún no guardadas en Strapi).
  // Se envían junto con el producto en el submit final: el hook crea
  // primero el food-product, obtiene su id, y luego crea cada variante.

  const [variants, setVariants] = useState([]);
  const [varianteDialogOpen, setVarianteDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);

  const [modifierGroups, setModifierGroups] = useState([]);
  const [selectedModifiers, setSelectedModifiers] = useState([]);

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
      !categorias || categorias.length === 0 ||
      isNaN(precio) || precio <= 0 ||
      (data.stockEnable && (isNaN(stock) || stock < 0)) ||
      (data.manejar_horario_disponibilidad && (!data.horario_disponibilidad?.inicio || !data.horario_disponibilidad?.fin))
    ) {
      // if (!textoValido.test(nombre)) {
      //   console.log("-".repeat(20));
      //   console.log("Caracter raro en nombre:");
      //   getInvalidChars(nombre);
      //   console.log("-".repeat(20));
      // }
      // if (!textoValido.test(descripcion)) {
      //   console.log("-".repeat(20));
      //   console.log("Caracter raro en descripción:");
      //   getInvalidChars(descripcion);
      //   console.log("-".repeat(20));
      // }
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
    if (es_picante && (!nivel_picante || !NivelesPicante.map(i => i.value).includes(nivel_picante))) {
      return false;
    }
    return true;
  };

  const validarPaso4 = (ingredientesData = []) => {
    if (ingredientesData.length <= 0 || ingredientesData.some(i => (!i.nombre || !i.cantidad))) {
      return false;
    }
    return true;
  };

  const validarPaso5 = (alergenosData = ['']) => {
    if (alergenosData.length > 0 && alergenosData.some(a => !a))
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
    } else if (activeStep === 2) {
      hayErrores = !validarPaso3(formData);
    } else if (activeStep === 3) {
      hayErrores = !validarPaso4(ingredientes);
    } else if (activeStep === 4) {
      hayErrores = !validarPaso5(alergenos);
    } else if (activeStep === 5) {
      if (!imagenPredeterminada) {
        setImagenError(true);
        hayErrores = true;
      } else {
        setImagenError(false);
      }
    }
    // Paso 6 (Galería), 7 (Resumen/variantes) y 8 (Modificadores) son opcionales,
    // no requieren validación para avanzar.

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Grupos de modificadores disponibles para este restaurante.
   * NOTA: el proyecto no traía un hook dedicado para esto (a diferencia de
   * useFoodCategories). Si ya existe uno (p. ej. useFoodModifierGroups),
   * reemplaza este fetch por esa llamada; se dejó de forma defensiva
   * (nunca rompe la pantalla, solo deja vacíos los modificadores)
   */

  useEffect(() => {
    const fetchModifierGroups = async () => {
      if (!storeId) return;

      try {
        const res = await fetch(`${STRAPI_URL}/api/food-modifier-groups?filters[food_restaurant][id][$eq]=${storeId}&populate=food_modifiers`);
        const json = await res.json();
        const groups = (json?.data ?? []).map(({ id, attributes }) => ({
          id,
          nombre: attributes?.nombre,
          descripcion: attributes?.descripcion,
          food_modifiers: (attributes?.food_modifiers?.data || []).map((m) => ({
            id: m.id,
            ...m.attributes,
          })),
        }));
        setModifierGroups(groups);
      } catch (err) {
        console.error('Error al cargar grupos de modificadores:', err);
        setModifierGroups([]);
      }
    };
    fetchModifierGroups();
  }, [storeId, STRAPI_URL]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleChangeIngrediente = (field = 'nombre', value, index = 0) => {
    setIngredientes(prev =>
      prev.map((item, i) => (i !== index ? item : { ...item, [field]: value }))
    );
  };

  const handleChangeAlergenos = (value = '', index = 0) => {
    setAlergenos(prev => prev.map((item, i) => (i !== index ? item : value)));
  };

  const handleAddIngrediente = () => setIngredientes((prev) => [...prev, { nombre: '', cantidad: '', unidad: '' }]);
  const handleDeleteIngrediente = (idx) => setIngredientes(prev => prev.filter((_, i) => i !== idx));
  const handleAddAlergeno = () => setAlergenos(prev => [...prev, '']);
  const handleDeleteAlergeno = (idx) => setAlergenos(prev => prev.filter((_, i) => i !== idx));

  const setImagenPredeterminada = (file) => {
    setImagenPredeterminadaState(file);
    setPreviewImagenPredeterminada(file ? URL.createObjectURL(file) : null);
  };
  const eliminarImagenPredeterminada = () => setImagenPredeterminada(null);

  // ---------------- Variantes ----------------
  const handleAbrirNuevaVariante = () => {
    setEditingVariant(null);
    setVarianteDialogOpen(true);
  };

  const handleAbrirEditarVariante = (variant) => {
    setEditingVariant(variant);
    setVarianteDialogOpen(true);
  };

  const handleGuardarVariante = (variantData) => {
    setVariants(prev => {
      const idx = prev.findIndex(v => v.tempId === variantData.tempId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = variantData;
        return copy;
      }
      return [...prev, { ...variantData, orden: prev.length }];
    });
    setVarianteDialogOpen(false);
  };

  const handleEliminarVariante = (tempId) => {
    setVariants(prev => prev.filter(v => v.tempId !== tempId));
  };

  // ---------------- Envío final ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!storeId) return alert('No se ha vinculado un restaurante para este usuario.');
    setEnviando(true);

    try {
      // El hook crea primero el food-product (obtiene su id) y, con ese id,
      // registra cada una de las variantes acumuladas en `variants`.
      await saveProduct({
        ...formData,
        imagenes,
        ingredientes,
        alergenos,
        fecha_creacion: new Date().toISOString(),
        food_restaurant: restaurante?.id,
        imagen_predeterminada: imagenPredeterminada,
        food_products_variants: variants,
        food_modifiers: selectedModifiers,
      });

      setGuardado(true);
      setTimeout(() => handleClearForm(), 4300);
    } catch (err) {
      console.error('Error al guardar producto:', err.response?.data || err);
      alert(`Error al guardar producto: ${err.response?.data?.error?.message || 'ver consola'}`);
    } finally {
      setEnviando(false);
    }
  };

  const handleClearForm = () => {
    setFormData(defaultFormData);
    setImagenPredeterminada(null);
    setImagenes([]);
    setIngredientes(defaultIngredientes);
    setAlergenos(defaultAlergenos);
    setVariants([]);
    setSelectedModifiers([]);
    setEnviando(false);
    initializeStep();
    setGuardado(false);
  };

  useEffect(() => {
    if (restaurante?.id) setStoreId(restaurante.id);
  }, [restaurante]);

  if (!isAuthenticated) return <p className="mensaje-sesion">Debes iniciar sesión para agregar platillos.</p>;
  if (guardado) return <Fade in><p className="mensaje-exito">✅ Platillo guardado con éxito.</p></Fade>;
  if (!storeId) return <p className="mensaje-sesion">No se encontró ningún restaurante asociado</p>;

  return (
    <Paper elevation={4} className="agregar-producto-container">
      <Typography variant="h5" fontWeight="bold" mb={2} alignItems="center">
        <span>🥗 Agregar platillo 🥗</span>
      </Typography>

      <Divider sx={{ mb: 2 }} />

      <Box
        sx={{
          width: '100%',
          overflowX: 'auto',
          pb: 1,
        }}
      >
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            minWidth: {
              xs: '100%',
              sm: '720px',
              md: '780px',
            },

            '& .MuiStepLabel-label': {
              fontSize: {
                xs: '0.70rem',
                sm: '0.75rem',
                md: '0.78rem',
              },
              lineHeight: 1.2,
              mt: 0.75,
              minHeight: '32px',
              textAlign: 'center',
            },

            '& .MuiStepIcon-root': {
              fontSize: {
                xs: 22,
                md: 25,
              },
            },

            '& .MuiStepIcon-root.Mui-active': {
              transform: 'scale(1.08)',
            },

            '& .MuiStepConnector-line': {
              borderTopWidth: 2,
            },
          }}
        >
          {Steps.map((step) => (
            <Step key={step.label}>
              <StepLabel>
                <Box
                  component="span"
                  sx={{
                    display: {
                      xs: 'none',
                      md: 'inline',
                    },
                  }}
                >
                  {step.label}
                </Box>

                <Box
                  component="span"
                  sx={{
                    display: {
                      xs: 'inline',
                      md: 'none',
                    },
                  }}
                >
                  {step.shortLabel}
                </Box>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <form onSubmit={handleSubmit} className="agregar-producto-form">
        <Slide direction="up" in mountOnEnter unmountOnExit key={activeStep}>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>

            {/* Paso 1: Datos Generales */}
            {activeStep === 0 && (
              <ProductoDatosGenerales
                formData={formData}
                categories={categories}
                formSubmitted={formSubmitted}
                handleChange={handleChange}
                setFormData={setFormData}
                isMobileDevice={isMobileDevice}
              />
            )}

            {/* Paso 2: Información */}
            {activeStep === 1 && (
              <ProductoInformacion
                formData={formData}
                handleChange={handleChange}
                formSubmitted={formSubmitted}
                temperaturas={Temperaturas}
              />
            )}

            {/* Paso 3: Características */}
            {activeStep === 2 && (
              <ProductoCaracteristicas
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
                formSubmitted={formSubmitted}
                nivelesPicante={NivelesPicante}
              />
            )}

            {/* Paso 4: Ingredientes */}
            {activeStep === 3 && (
              <ProductoIngredientes
                unidades={FOOD_UNITS}
                handleAddIngrediente={handleAddIngrediente}
                handleChangeIngrediente={handleChangeIngrediente}
                handleDeleteIngrediente={handleDeleteIngrediente}
                ingredientes={ingredientes}
                isMobileDevice={isMobileDevice}
              />
            )}

            {/* Paso 5: Alergenos */}
            {activeStep === 4 && (
              <ProductoAlergenos
                alergenos={alergenos}
                handleAddAlergeno={handleAddAlergeno}
                handleChangeAlergenos={handleChangeAlergenos}
                handleDeleteAlergeno={handleDeleteAlergeno}
                isMobileDevice={isMobileDevice}
              />
            )}

            {/* Paso 6: Imagen predeterminada */}
            {activeStep === 5 && (
              <ProductoImageUploadField
                label="Imagen principal"
                files={imagenPredeterminada ? [imagenPredeterminada] : []}
                onAdd={(files) => setImagenPredeterminada(files[0])}
                onRemove={eliminarImagenPredeterminada}
                error={imagenError}
                helperText="Debes subir una imagen predeterminada"
                buttonLabel="Subir imagen principal"
              />
            )}

            {/* Paso 7: Galería de imágenes */}
            {activeStep === 6 && (
              <ProductoImageUploadField
                label="Galería de imágenes"
                multiple
                files={imagenes}
                onAdd={(files) => setImagenes(prev => [...prev, ...files])}
                onRemove={(idx) => setImagenes(prev => prev.filter((_, i) => i !== idx))}
                buttonLabel="Subir imágenes"
              />
            )}

            {/* Paso 8: Resumen y variantes */}
            {activeStep === 7 && (
              <ProductoResumen
                formData={formData}
                categories={categories}
                ingredientes={ingredientes}
                alergenos={alergenos}
                previewImagenPredeterminada={previewImagenPredeterminada}
                variants={variants}
                onAddVariant={handleAbrirNuevaVariante}
                onEditVariant={handleAbrirEditarVariante}
                onRemoveVariant={handleEliminarVariante}
              />
            )}

            {/* Paso 9: Modificadores (final) */}
            {activeStep === 8 && (
              <ProductoModificadores
                modifierGroups={modifierGroups}
                selectedModifiers={selectedModifiers}
                setSelectedModifiers={setSelectedModifiers}
              />
            )}

            {/* Navegación entre pasos */}
            <Box mt={2} display="flex" justifyContent="space-between">
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
              >
                Anterior
              </Button>

              {activeStep < LAST_STEP ? (
                <Button variant="contained" onClick={handleNext}>
                  Siguiente
                </Button>
              ) : (
                <Button type="submit" variant="contained" color="primary" disabled={enviando}>
                  {enviando ? <CircularProgress size={20} color="inherit" /> : 'Guardar platillo'}
                </Button>
              )}
            </Box>
          </Box>
        </Slide>
      </form>

      <ProductoVarianteFormDialog
        open={varianteDialogOpen}
        onClose={() => setVarianteDialogOpen(false)}
        onSave={handleGuardarVariante}
        productoBase={formData}
        editingVariant={editingVariant}
        unidades={FOOD_UNITS}
        orden={variants.length}
        imagenPredeterminadaBase={imagenPredeterminada}
        imagenesBase={imagenes}
        ingredientesBase={ingredientes}
        alergenosBase={alergenos}
        isMobilDevice={isMobileDevice}
      />
    </Paper>
  );
};
export default AgregarProducto;
