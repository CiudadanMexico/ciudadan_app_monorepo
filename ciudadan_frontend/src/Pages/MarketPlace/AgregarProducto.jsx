import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, Button, Paper, Divider, Fade, Slide, Stepper, Step, StepLabel 
} from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import '../../styles/AgregarProducto.css';
import useProductos from '../../hooks/useProductos';
import { useVolumetrico } from '../../hooks/useVolumetrico';
import { textoValido, validarPaso1, validarPaso2 } from '../../utils/ValidacionesProducto';
import { GuardarProducto } from '../../utils/GuardarProducto';
import usePasoProducto from '../../hooks/usePasoProducto';
import Paso1 from '../../components/MarketPlace/AgregarProducto/Paso1'
import Paso2 from '../../components/MarketPlace/AgregarProducto/Paso2'
import Paso3 from '../../components/MarketPlace/AgregarProducto/Paso3'
import Paso4 from '../../components/MarketPlace/AgregarProducto/Paso4'

//función para crear el slug
/* const slugify = (str) =>
  str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
 */

const AgregarProducto = () => {
  const STRAPI_URL = process.env.REACT_APP_STRAPI_URL;
  const { user, isAuthenticated } = useAuth0();
  const [categorias, setCategorias] = useState([]);
  const [storeId, setStoreId] = useState(null);
  const [storeCP, setStoreCP] = useState(null);
  const [guardado, setGuardado] = useState(false);
  const [imagenPredeterminada, setImagenPredeterminada] = useState(null);
  const [previewImagenPredeterminada, setPreviewImagenPredeterminada] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const { getStoreByEmail } = useProductos();
  const [enviando, setEnviando] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    marca: '',
    categoria: '',
    stockEnabled: false,
    stock: '',
  });

  const {
    activeStep,
    formSubmitted,
    handleNext,
    handleBack,
    imagenError,
    setFormSubmitted,
  } = usePasoProducto(formData, imagenPredeterminada);

  const { volumetrico, pesoCobrado } = useVolumetrico({
    largo: parseFloat(formData.largo),
    ancho: parseFloat(formData.ancho),
    alto: parseFloat(formData.alto),
    peso: parseFloat(formData.peso),
  });

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const res = await axios.get(`${STRAPI_URL}/api/store-categories`);
        setCategorias(res.data.data);
      } catch (err) {
        console.error('Error al cargar categorías', err);
      }
    };
    fetchCategorias();
  }, []);

  useEffect(() => {
    const fetchStoreId = async () => {
      if (!user?.email) return;
      try {
        const res = await axios.get(`${STRAPI_URL}/api/stores?filters[email][$eq]=${user.email}`);
        if (res.data.data.length > 0) {
          setStoreId(res.data.data[0].id);
          setStoreCP(res.data.data[0].cp);
        }
      } catch (err) {
        console.error('Error al buscar tienda', err);
      }
    };
    if (isAuthenticated) fetchStoreId();
  }, [user, isAuthenticated]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
      await GuardarProducto({
        formData,
        imagenPredeterminada,
        imagenes,
        STRAPI_URL,
        storeId,
        userEmail: user.email,
        volumetrico,
        pesoCobrado,
        cp: cp,
      });

      setFormData({
        nombre: '', descripcion: '', precio: '', marca: '',
        categoria: '', stockEnabled: false, stock: ''
      });
      setImagenes([]);
      setPreviewImages([]);
      setImagenPredeterminada(null);
      setPreviewImagenPredeterminada(null);
      setGuardado(true);
    } catch (err) {
      setEnviando(false);
      console.error('Error al guardar producto:', err.response?.data || err);
      alert(`Error al guardar producto: ${err.response?.data?.error?.message || 'ver consola'}`);
    }
  };

  if (!isAuthenticated) return <p className="mensaje-sesion">Debes iniciar sesión para agregar productos.</p>;
  if (guardado) return <Fade in><p className="mensaje-exito">✅ Producto guardado con éxito.</p></Fade>;
  if (!storeId) return <p className="mensaje-sesion">No se encontró ninguna tienda asociada</p>;

  return (
    <Paper elevation={4} className="agregar-producto-container">
      <Typography variant="h5" fontWeight="bold" mb={2}>
        <span className="titulo">🛒 Agregar Producto</span>
      </Typography>

      <Divider sx={{ mb: 2 }} />

      <Stepper activeStep={activeStep} alternativeLabel>
        {['Datos Generales', 'Medidas', 'Imagen Principal', 'Galería', 'Finalizar'].map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <form onSubmit={handleSubmit} className="agregar-producto-form">
        <Slide direction="up" in mountOnEnter unmountOnExit>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>

            {/* Paso 1: Datos Generales */}
            {activeStep === 0 && (
              <>
                <Paso1
                  formData={formData}
                  handleChange={handleChange}
                  setFormData={setFormData}
                  formSubmitted={formSubmitted}
                  categorias={categorias}
                  textoValido={textoValido}
                />
              </>
            )}

            {/* Paso 2: Medidas */}
            {activeStep === 1 && (
              <>
                <Paso2
                  formData={formData}
                  handleChange={handleChange}
                  formSubmitted={formSubmitted}
                />
              </>
            )}

            {/* Paso 3: Imagen predeterminada */}
            {activeStep === 2 && (
            <Paso3
              handleImagenPredeterminada={handleImagenPredeterminada}
              eliminarImagenPredeterminada={eliminarImagenPredeterminada}
              previewImagenPredeterminada={previewImagenPredeterminada}
              imagenError={imagenError}
            />
            )}

            {/* Paso 4: Galería de imágenes */}
            {activeStep === 3 && (
            <Paso4
              handleImagenes={handleImagenes}
              eliminarImagen={eliminarImagen}
              previewImages={previewImages}
            />
            )}

            {/* Paso 5: Confirmar */}
            {activeStep === 4 && (
              <>
                <Typography variant="h6" gutterBottom>✅ Listo para guardar</Typography>
                <Typography>Revisa los datos antes de continuar.</Typography>
                <Button type="submit" variant="contained" color="primary" disabled={enviando}>
                  {enviando ? 'Guardando...' : 'Guardar Producto'}
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
              {activeStep < 4 && (
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
