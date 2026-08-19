import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControlLabel,
  Switch,
  Grid,
  Divider,
} from '@mui/material';
import ProductoIngredientes from './ProductoIngredientes';
import ProductoAlergenos from './ProductoAlergenos';
import ProductoImageUploadField from './ProductoImageUploadField';

const emptyLocalState = {
  nombre: '',
  descripcion: '',
  precio: '',
  peso: '',
  calorias: '',
  porciones: '',
  usaStock: false,
  stock: '',
};

/**
 * Formulario de una variante de producto.
 *
 * - Si `editingVariant` viene definido, precarga esos datos (modo edición).
 * - Si no, precarga los campos compartidos de `productoBase` (nombre,
 *   descripción, precio, peso, calorías, porciones, usa_stock, stock,
 *   ingredientes y alergenos), tal como lo pidió el flujo: el usuario
 *   puede modificarlos libremente y solo debe aportar imagen
 *   predeterminada + galería propias de la variante.
 *
 * El resultado que entrega en `onSave` coincide 1:1 con lo que espera
 * `saveProductVariant` del hook useProductsRestaurant (usaStock en
 * camelCase incluido).
 */
const ProductoVarianteFormDialog = ({
  open,
  onClose,
  onSave,
  productoBase,
  editingVariant,
  unidades = [],
  orden = 0,
  ingredientesBase = [],
  alergenosBase = [],
  imagenPredeterminadaBase,
  imagenesBase,
  isMobilDevice = false,
}) => {
  const [datos, setDatos] = useState(emptyLocalState);
  const [ingredientes, setIngredientes] = useState([{ nombre: '', cantidad: '', unidad: '' }]);
  const [alergenos, setAlergenos] = useState(['']);
  const [imagenPredeterminada, setImagenPredeterminada] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [mostrarErrores, setMostrarErrores] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editingVariant) {
      setDatos({
        nombre: editingVariant.nombre || '',
        descripcion: editingVariant.descripcion || '',
        precio: editingVariant.precio ?? '',
        peso: editingVariant.peso ?? '',
        calorias: editingVariant.calorias ?? '',
        porciones: editingVariant.porciones ?? '',
        usaStock: editingVariant.usaStock ?? false,
        stock: editingVariant.stock ?? '',
      });
      setIngredientes(ingredientesBase?.length ? ingredientesBase : [{ nombre: '', cantidad: '', unidad: '' }]);
      setAlergenos(alergenosBase?.length ? alergenosBase : ['']);
      setImagenPredeterminada(imagenPredeterminadaBase ?? null);
      setImagenes(imagenesBase ?? []);
    } else {
      setDatos({
        nombre: productoBase?.nombre || '',
        descripcion: productoBase?.descripcion || '',
        precio: productoBase?.precio_base ?? '',
        peso: productoBase?.peso ?? '',
        calorias: productoBase?.calorias ?? '',
        porciones: productoBase?.porciones ?? '',
        usaStock: productoBase?.stockEnable ?? false,
        stock: productoBase?.stock ?? '',
      });
      setIngredientes(ingredientesBase?.length ? ingredientesBase : [{ nombre: '', cantidad: '', unidad: '' }]);
      setAlergenos(alergenosBase?.length ? alergenosBase : ['']);
      setImagenPredeterminada(null);
      setImagenes([]);
    }
    setMostrarErrores(false);
  }, [open, editingVariant, productoBase]);

  const handleField = (e) => {
    const { name, value } = e.target;
    setDatos((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeIngrediente = (field = 'nombre', value, index = 0) => {
    setIngredientes((prev) =>
      prev.map((item, i) => (i !== index ? item : { ...item, [field]: value }))
    );
  };
  const handleAddIngrediente = () =>
    setIngredientes((prev) => [...prev, { nombre: '', cantidad: '', unidad: '' }]);
  const handleDeleteIngrediente = (idx) =>
    setIngredientes((prev) => prev.filter((_, i) => i !== idx));

  const handleChangeAlergenos = (value = '', index = 0) => {
    setAlergenos((prev) => prev.map((item, i) => (i !== index ? item : value)));
  };
  const handleAddAlergeno = () => setAlergenos((prev) => [...prev, '']);
  const handleDeleteAlergeno = (idx) => setAlergenos((prev) => prev.filter((_, i) => i !== idx));

  const nombreValido = datos.nombre.trim().length >= 3;
  const precioValido = parseFloat(datos.precio) > 0;

  const handleGuardar = () => {
    if (!nombreValido || !precioValido) {
      setMostrarErrores(true);
      return;
    }

    onSave({
      tempId: editingVariant?.tempId ?? crypto.randomUUID(),
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion,
      precio: parseFloat(datos.precio) || 0,
      peso: parseFloat(datos.peso) || 0,
      calorias: parseInt(datos.calorias, 10) || 0,
      porciones: parseFloat(datos.porciones) || 0,
      usaStock: datos.usaStock,
      stock: datos.usaStock ? parseInt(datos.stock, 10) || 0 : 0,
      orden: editingVariant?.orden ?? orden,
      ingredientes,
      alergenos,
      imagen_predeterminada: imagenPredeterminada,
      imagenes,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingVariant ? 'Editar variante' : 'Agregar variante'}</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Nombre"
            name="nombre"
            value={datos.nombre}
            onChange={handleField}
            error={mostrarErrores && !nombreValido}
            helperText={mostrarErrores && !nombreValido ? 'Nombre requerido (mín. 3 caracteres)' : ''}
            fullWidth
          />
          <TextField
            label="Descripción"
            name="descripcion"
            value={datos.descripcion}
            onChange={handleField}
            multiline
            rows={2}
            fullWidth
          />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Precio"
                name="precio"
                type="number"
                value={datos.precio}
                inputProps={{ min: 0 }}
                onChange={handleField}
                error={mostrarErrores && !precioValido}
                helperText={mostrarErrores && !precioValido ? 'Precio debe ser mayor a 0' : ''}
                fullWidth
                InputProps={{ startAdornment: <span style={{ marginRight: 8 }}>$</span> }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Peso"
                name="peso"
                type="number"
                value={datos.peso}
                inputProps={{ min: 0, step: 0.1 }}
                onChange={handleField}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Calorías"
                name="calorias"
                type="number"
                value={datos.calorias}
                inputProps={{ min: 0 }}
                onChange={handleField}
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Porciones"
                name="porciones"
                type="number"
                value={datos.porciones}
                inputProps={{ min: 0 }}
                onChange={handleField}
                fullWidth
              />
            </Grid>
          </Grid>

          <FormControlLabel
            control={
              <Switch
                checked={datos.usaStock}
                onChange={() =>
                  setDatos((prev) => ({
                    ...prev,
                    usaStock: !prev.usaStock,
                    stock: !prev.usaStock ? prev.stock : '',
                  }))
                }
              />
            }
            label="Controlar stock de esta variante"
          />
          {datos.usaStock && (
            <TextField
              label="Stock"
              name="stock"
              type="number"
              value={datos.stock}
              onChange={handleField}
              inputProps={{ min: 0 }}
              fullWidth
            />
          )}

          <Divider />
          <ProductoIngredientes
            unidades={unidades}
            ingredientes={ingredientes}
            handleAddIngrediente={handleAddIngrediente}
            handleChangeIngrediente={handleChangeIngrediente}
            handleDeleteIngrediente={handleDeleteIngrediente}
            isMobileDevice={isMobilDevice}
          />

          <Divider />
          <ProductoAlergenos
            alergenos={alergenos}
            handleAddAlergeno={handleAddAlergeno}
            handleChangeAlergenos={handleChangeAlergenos}
            handleDeleteAlergeno={handleDeleteAlergeno}
            isMobileDevice={isMobilDevice}
          />

          <Divider />
          <ProductoImageUploadField
            label="Imagen predeterminada de la variante"
            files={imagenPredeterminada ? [imagenPredeterminada] : []}
            onAdd={(files) => setImagenPredeterminada(files[0])}
            onRemove={() => setImagenPredeterminada(null)}
          />

          <ProductoImageUploadField
            label="Galería de la variante"
            multiple
            files={imagenes}
            onAdd={(files) => setImagenes((prev) => [...prev, ...files])}
            onRemove={(idx) => setImagenes((prev) => prev.filter((_, i) => i !== idx))}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={handleGuardar}>
          {editingVariant ? 'Guardar cambios' : 'Agregar variante'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductoVarianteFormDialog;