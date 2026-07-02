// ProductFormFields.jsx
import React from 'react';
import { TextField, MenuItem, FormControlLabel, Switch } from '@mui/material';

const Paso1 = ({
  formData,
  handleChange,
  setFormData,
  formSubmitted,
  categorias,
  textoValido,
}) => {
  return (
    <>
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

      <TextField
        className="input-text"
        label="Precio"
        name="precio"
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

      <TextField
        className="input-text"
        label="Marca (opcional)"
        name="marca"
        value={formData.marca}
        onChange={handleChange}
        fullWidth
      />

      <TextField
        className="input-text"
        select
        label="Categoría"
        name="categoria"
        value={formData.categoria}
        onChange={handleChange}
        required
        fullWidth
        error={formSubmitted && !formData.categoria}
        helperText={formSubmitted && !formData.categoria ? 'Selecciona una categoría' : ''}
      >
        {categorias.map(cat => (
          <MenuItem key={cat.id} value={cat.id}>
            {cat.attributes.nombre}
          </MenuItem>
        ))}
      </TextField>

      <FormControlLabel
        control={
          <Switch
            checked={formData.stockEnabled}
            onChange={() =>
              setFormData(prev => ({
                ...prev,
                stockEnabled: !prev.stockEnabled,
                stock: !prev.stockEnabled ? '' : -1,
              }))
            }
          />
        }
        label="Habilitar control de stock"
      />

      {formData.stockEnabled && (
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
  );
};

export default Paso1;
