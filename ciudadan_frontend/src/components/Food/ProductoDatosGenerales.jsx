import React from 'react';
import { textoValido } from '../../utils/ValidacionesProducto';
import { Box, Checkbox, FormControlLabel, ListItemText, MenuItem, Switch, TextField, Typography } from '@mui/material';

function ProductoDatosGenerales({
  formSubmitted = false,
  formData,
  handleChange,
  setFormData,
  categories = [],
  isMobileDevice = false,
}) {
  return (
    <>
      {/** Nombre */}
      <TextField
        className="input-text"
        label="Nombre"
        name="nombre"
        value={formData?.nombre ?? ''}
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
        value={formData?.descripcion ?? ''}
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
        value={formData?.precio_base ?? 0}
        onChange={handleChange}
        required
        fullWidth
        InputProps={{ startAdornment: <span style={{ marginRight: 8 }}>$</span>, }}
        inputProps={{ min: 0 }}
        error={formSubmitted && (formData?.precio_base === '' || parseFloat(formData?.precio_base) <= 0)
        }
        helperText={
          formSubmitted &&
          (formData.precio_base === '' ? 'Este campo es obligatorio' : parseFloat(formData.precio_base) <= 0 ? 'El precio debe ser mayor a cero' : '')
        }
      />
      {/* Categorías */}
      <TextField
        className="input-text"
        select
        label="Categorías"
        name="food_categories"
        value={formData?.food_categories ?? []}
        onChange={handleChange}
        required
        fullWidth
        error={
          formSubmitted && (!formData.food_categories || formData.food_categories.length === 0)
        }
        helperText={
          formSubmitted && (!formData.food_categories || formData.food_categories.length === 0) ? "Selecciona al menos una categoría" : ""
        }
        SelectProps={{
          multiple: true,
          renderValue: (selected) => categories.filter((cat) => selected.includes(cat.id)).map((cat) => cat.attributes.nombre).join(", ")
        }}
      >
        {categories.map((cat) => (
          <MenuItem key={cat.id} value={cat.id}>
            <Checkbox checked={formData.food_categories.includes(cat.id)} />
            <ListItemText primary={cat.attributes.nombre} />
          </MenuItem>
        ))}
      </TextField>
      {/* Habilitar stock */}
      <FormControlLabel
        control={
          <Switch
            checked={formData.stockEnable}
            onChange={() =>
              setFormData(prev => ({
                ...prev,
                stockEnable: !prev.stockEnable,
                stock: !prev.stockEnable ? 0 : '',
              }))
            }
          />
        }
        label="Habilitar control de stock"
      />
      {
        formData.stockEnable && (
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
        )
      }
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
                value={formData.horario_disponibilidad?.inicio ?? ''}
                onChange={(e) => {
                  setFormData(({ horario_disponibilidad, ...rest }) => ({
                    ...rest,
                    horario_disponibilidad: { ...horario_disponibilidad, inicio: e.target.value }
                  }))
                }}
                InputLabelProps={{ shrink: true }}
                error={
                  formSubmitted &&
                  (!formData.horario_disponibilidad?.inicio)
                }
                helperText={
                  formSubmitted &&
                  (!formData.horario_disponibilidad?.inicio
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
                value={formData.horario_disponibilidad?.fin ?? ''}
                onChange={(e) => {
                  setFormData(({ horario_disponibilidad, ...rest }) => ({
                    ...rest,
                    horario_disponibilidad: { ...horario_disponibilidad, fin: e.target.value }
                  }))
                }}
                InputLabelProps={{ shrink: true }}
                error={
                  formSubmitted &&
                  (!formData.horario_disponibilidad?.fin)
                }
                helperText={
                  formSubmitted &&
                  (!formData.horario_disponibilidad?.fin
                    ? 'Este campo es obligatorio'
                    : '')
                }
                fullWidth
              />
            </Box>
          </>
        )
      }
    </>
  )
}

export default ProductoDatosGenerales