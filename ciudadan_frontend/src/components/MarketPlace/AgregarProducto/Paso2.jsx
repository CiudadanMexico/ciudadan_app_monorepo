import React from 'react';
import { TextField } from '@mui/material';

const Paso2 = ({ formData, handleChange, formSubmitted }) => {
  return (
    <>
      <TextField
        className="input-text"
        label="Alto (cm)"
        name="alto"
        type="number"
        value={formData.alto}
        onChange={handleChange}
        required
        fullWidth
        error={formSubmitted && !formData.alto}
        helperText={formSubmitted && !formData.alto ? 'Este campo es obligatorio' : ''}
      />
      <TextField
        className="input-text"
        label="Ancho (cm)"
        name="ancho"
        type="number"
        value={formData.ancho}
        onChange={handleChange}
        required
        fullWidth
        error={formSubmitted && !formData.ancho}
        helperText={formSubmitted && !formData.ancho ? 'Este campo es obligatorio' : ''}
      />
      <TextField
        className="input-text"
        label="Largo (cm)"
        name="largo"
        type="number"
        value={formData.largo}
        onChange={handleChange}
        required
        fullWidth
        error={formSubmitted && !formData.largo}
        helperText={formSubmitted && !formData.largo ? 'Este campo es obligatorio' : ''}
      />
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
    </>
  );
};

export default Paso2;
