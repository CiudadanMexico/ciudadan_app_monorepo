import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

/**
 * Campo reutilizable para subir 1 o varias imágenes.
 *
 * El estado real de los File vive en el componente padre (formData del
 * producto o de la variante); este componente solo se encarga de:
 *  - mostrar el botón de subida
 *  - generar y limpiar los object URLs de preview
 *  - notificar altas/bajas hacia el padre
 *
 * Props:
 *  - files: File[] (siempre arreglo, aunque multiple sea false: 0 o 1 elementos)
 *  - multiple: boolean
 *  - onAdd(files: File[])
 *  - onRemove(index: number)
 */
const ProductoImageUploadField = ({
  label,
  multiple = false,
  files = [],
  onAdd,
  onRemove,
  error = false,
  helperText = '',
  buttonLabel,
}) => {
  const [previews, setPreviews] = useState([]);

  // Clave estable derivada del contenido de los File, para regenerar
  // previews solo cuando realmente cambian los archivos.
  const filesKey = (files || [])
    .map((f) => `${f?.name}-${f?.size}-${f?.lastModified}`)
    .join('|');

  useEffect(() => {
    const urls = (files || []).map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesKey]);

  const handleInputChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    onAdd(multiple ? selected : [selected[0]]);
    // permite volver a seleccionar el mismo archivo si se elimina y se vuelve a subir
    e.target.value = '';
  };

  return (
    <Box>
      {label && (
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          {label}
        </Typography>
      )}

      <Button
        variant="contained"
        component="label"
        color="primary"
        startIcon={<CloudUploadIcon />}
        sx={{ mb: 1 }}
      >
        {buttonLabel || (multiple ? 'Subir imágenes' : 'Subir imagen')}
        <input
          hidden
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleInputChange}
        />
      </Button>

      {error && (
        <Typography color="error" variant="body2" sx={{ mt: 0.5 }}>
          {helperText}
        </Typography>
      )}

      {previews.length > 0 && (
        <Box mt={1.5} display="flex" flexWrap="wrap" gap={2}>
          {previews.map((src, index) => (
            <Box
              key={`${src}-${index}`}
              position="relative"
              sx={{
                width: 110,
                height: 110,
                borderRadius: 2,
                overflow: 'hidden',
                border: '2px solid #6d6e71',
                boxShadow: 2,
              }}
            >
              <Box
                component="img"
                src={src}
                alt={`preview-${index}`}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <IconButton
                size="small"
                onClick={() => onRemove(index)}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  bgcolor: 'rgba(255,255,255,0.85)',
                  '&:hover': { bgcolor: '#fff' },
                  width: 24,
                  height: 24,
                }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} color="error" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ProductoImageUploadField;