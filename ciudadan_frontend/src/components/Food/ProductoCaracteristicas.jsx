import { FormControlLabel, MenuItem, Switch, TextField } from '@mui/material'
import React from 'react'

function ProductoCaracteristicas({
  formData,
  handleChange,
  setFormData,
  formSubmitted = false,
  nivelesPicante = [],
}) {
  return (
    <>
      {/* ¿Es picante? */}
      <FormControlLabel
        control={
          <Switch
            checked={formData?.es_picante ?? false}
            onChange={() =>
              setFormData(prev => ({
                ...prev,
                es_picante: !prev.es_picante,
                nivel_picante: !prev.es_picante ? 'ninguno' : '',
              }))
            }
          />
        }
        label="¿Es picante?"
      />
      {
        formData?.es_picante && (
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
            {
              nivelesPicante.map((np, idx) => (
                <MenuItem key={`nivel-picante-item-${idx}`} value={np.value}>
                  {np.label}
                </MenuItem>
              ))}
          </TextField>
        )
      }
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

export default ProductoCaracteristicas