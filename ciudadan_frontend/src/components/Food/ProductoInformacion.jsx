import { MenuItem, TextField } from '@mui/material'
import React from 'react'

function ProductoInformacion({
  formData,
  handleChange,
  formSubmitted = false,
  temperaturas = []
}) {
  return (
    <>
      {/* Tiempo preparación */}
      <TextField
        className="input-text"
        label="Tiempo preparación (minutos)"
        name="tiempo_preparacion"
        type="number"
        value={formData?.tiempo_preparacion ?? ''}
        inputProps={{ min: 0 }}
        onChange={handleChange}
        required
        fullWidth
        error={formSubmitted && !formData.tiempo_preparacion}
        helperText={formSubmitted && !formData.tiempo_preparacion ? 'Este campo es obligatorio' : ''}
      />
      {/* Calorías */}
      <TextField
        className="input-text"
        label="Calorías"
        name="calorias"
        type="number"
        value={formData?.calorias ?? 0}
        onChange={handleChange}
        inputProps={{ min: 0 }}
        required
        fullWidth
        error={formSubmitted && !formData?.calorias}
        helperText={formSubmitted && !formData?.calorias ? 'Este campo es obligatorio' : ''}
      />
      {/* Peso */}
      <TextField
        className="input-text"
        label="Peso (kg)"
        name="peso"
        type="number"
        value={formData?.peso ?? 0}
        inputProps={{ min: 0 }}
        onChange={handleChange}
        required
        fullWidth
        error={formSubmitted && !formData?.peso}
        helperText={formSubmitted && !formData?.peso ? 'Este campo es obligatorio' : ''}
      />
      {/* Porciones */}
      <TextField
        className="input-text"
        label="Porciones"
        name="porciones"
        type="number"
        value={formData?.porciones ?? 0}
        inputProps={{ min: 0 }}
        onChange={handleChange}
        required
        fullWidth
        error={formSubmitted && !formData.porciones}
        helperText={formSubmitted && !formData.porciones ? 'Este campo es obligatorio' : ''}
      />
      {/* Orden mínima */}
      <TextField
        className="input-text"
        label="Orden mínima"
        name="orden_minima"
        type="number"
        value={formData?.orden_minima ?? 0}
        onChange={handleChange}
        fullWidth
        error={formSubmitted && !formData.orden_minima}
        helperText={formSubmitted && !formData.orden_minima ? 'Este campo es obligatorio' : ''}
      />
      {/* Temperatura */}
      <TextField
        className="input-text"
        label="Temperatura"
        name="temperatura"
        select
        value={formData?.temperatura ?? ''}
        onChange={handleChange}
        fullWidth
      >
        {
          temperaturas.map((tmp, idx) => (
            <MenuItem key={`temperatura-item-${idx}`} value={tmp.value}>
              {tmp.label}
            </MenuItem>
          ))
        }
      </TextField>
    </>
  )
}

export default ProductoInformacion