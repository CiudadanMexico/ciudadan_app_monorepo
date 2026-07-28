import React from 'react';
import { InputLabel, Button, Typography } from '@mui/material';
import {
  colorBotonSecundario,
  colorBordeBotonSecundario,
  colorFondoBotonSecundario,
  colorBotonSecundarioHoover,
  colorFondoBotonSecundarioHoover,
} from '../styles/ColoresBotones';
import { CrearPreviews } from '../utils/CrearPreviews';

/**
 * Uploader para archivos únicos (portada)
 * Props:
 * - files: FileList
 * - previews: array de previews
 * - onChange: handler de input
 * - error: objeto error de react-hook-form
 */
export const PortadaUploader = ({ files, previews, onChange, error }) => (
  <>
    <InputLabel required>Portada (imagen o video)</InputLabel>
    <input
      id="portada-input"
      type="file"
      accept="image/*,video/*"
      onChange={onChange}
      style={{ display: 'none' }}
    />
    <label htmlFor="portada-input">
      <Button
        variant="outlined"
        component="span"
        sx={{
          color: colorBotonSecundario,
          borderColor: colorBordeBotonSecundario,
          backgroundColor: colorFondoBotonSecundario,
          '&:hover': {
            backgroundColor: colorFondoBotonSecundarioHoover,
            borderColor: colorBotonSecundarioHoover,
            color: colorBotonSecundarioHoover,
          },
          mt: 1,
          mb: 1,
        }}
      >
        Seleccionar archivo
      </Button>
    </label>
    {error && <Typography color="error" variant="body2">{error.message}</Typography>}
    <CrearPreviews previews={previews} maxHeight={150} />
  </>
);

/**
 * Uploader genérico para colecciones múltiples (galerías)
 * Props:
 * - id: string, id de input
 * - label: string
 * - previews: array de previews
 * - onChange: handler de input
 * - error: objeto error
 */
const GaleriaUploader = ({ id, label, previews, onChange, error }) => (
  <>
    <InputLabel>{label}</InputLabel>
    <input
      id={id}
      type="file"
      accept="image/*,video/*"
      multiple
      onChange={onChange}
      style={{ display: 'none' }}
    />
    <label htmlFor={id}>
      <Button
        variant="outlined"
        component="span"
        sx={{
          color: colorBotonSecundario,
          borderColor: colorBordeBotonSecundario,
          backgroundColor: colorFondoBotonSecundario,
          '&:hover': {
            backgroundColor: colorFondoBotonSecundarioHoover,
            borderColor: colorBotonSecundarioHoover,
            color: colorBotonSecundarioHoover,
          },
        }}
      >
        Subir archivos
      </Button>
    </label>
    {error && <Typography color="error" variant="body2">{error.message}</Typography>}
    <CrearPreviews previews={previews} maxHeight={100} />
  </>
);

/**
 * Galería libre (multiples archivos)
 */
export const GaleriaLibreUploader = (props) => (
  <GaleriaUploader
    id="galeria-libre-input"
    label="Galería libre (imágenes/videos)"
    {...props}
  />
);

/**
 * Galería restringida (multiples archivos)
 */
export const GaleriaRestringidaUploader = (props) => (
  <GaleriaUploader
    id="galeria-restringida-input"
    label="Galería restringida (imágenes/videos)"
    {...props}
  />
);
