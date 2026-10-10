import React, { useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const STRAPI_URL = (process.env.REACT_APP_STRAPI_URL || '').replace(/\/$/, '');

/**
 * DocumentoCarga
 *
 * Caja reutilizable para subir un documento del expediente del conductor
 * (tarjeta de circulación, seguro, fotos de la unidad…).
 *
 * Responsabilidades:
 *  - subir el archivo a `POST /api/upload` (Strapi) con `credentials: include`;
 *  - devolver el `id` del media recién creado vía `onUploaded`;
 *  - mostrar el documento actual con vista previa cuando ya existe.
 *
 * El componente NO decide el estado del expediente: eso lo resuelve el
 * servidor en el lifecycle del vehículo.
 */
const DocumentoCarga = ({
  label,
  hint,
  accept = 'image/*,.pdf',
  currentMedia = null,
  onUploaded,
  disabled = false,
  required = false,
  multiple = false,
  existingCount = 0,
}) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const strapiJwt = process.env.REACT_APP_STRAPI_TOKEN || '';

  const uploadSingle = useCallback(
    async (file) => {
      const formData = new FormData();
      formData.append('files', file);

      const headers = {};
      if (strapiJwt) headers.Authorization = `Bearer ${strapiJwt}`;

      const res = await fetch(`${STRAPI_URL}/api/upload`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: formData,
      });

      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || 'No se pudo subir el archivo.');
      }

      const json = JSON.parse(text);
      return json?.[0]?.id ?? null;
    },
    [strapiJwt],
  );

  const handleFiles = useCallback(
    async (fileList) => {
      if (!fileList || fileList.length === 0) return;

      setError('');
      setSuccess('');
      setUploading(true);

      try {
        const ids = [];
        for (const file of Array.from(fileList)) {
          const id = await uploadSingle(file);
          if (id) ids.push(id);
        }

        if (ids.length > 0) {
          const payload = multiple ? ids : ids[0];
          if (onUploaded) await onUploaded(payload);
          setSuccess(
            ids.length === 1
              ? 'Documento subido correctamente.'
              : `${ids.length} documentos subidos correctamente.`,
          );
        }
      } catch (err) {
        setError(err.message || 'No se pudo subir el documento.');
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [multiple, onUploaded, uploadSingle],
  );

  const handleInputChange = (event) => {
    handleFiles(event.target.files);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    if (disabled || uploading) return;
    handleFiles(event.dataTransfer.files);
  };

  const hasCurrent = Boolean(currentMedia);
  const currentUrl =
    hasCurrent &&
    (typeof currentMedia === 'string'
      ? currentMedia
      : currentMedia?.url
        ? `${STRAPI_URL}${currentMedia.url}`
        : null);


  return (
    <Box
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      sx={{
        border: '1px dashed',
        borderColor: error ? 'error.main' : 'rgba(15, 23, 42, 0.25)',
        borderRadius: 2,
        p: 2,
        bgcolor: 'grey.50',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Stack direction='row' spacing={2} alignItems='center'>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: 1,
            overflow: 'hidden',
            bgcolor: 'grey.200',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          {currentUrl ? (
            <Box
              component='img'
              src={currentUrl}
              alt={label}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <UploadFileOutlinedIcon color='action' />
          )}
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction='row' spacing={1} alignItems='center'>
            <Typography variant='subtitle2'>{label}</Typography>
            {required && (
              <Typography variant='caption' color='error'>
                *
              </Typography>
            )}
            {hasCurrent && (
              <CheckCircleOutlineIcon color='success' fontSize='small' />
            )}
          </Stack>

          {hint && (
            <Typography variant='caption' color='text.secondary'>
              {hint}
            </Typography>
          )}

          {existingCount > 0 && (
            <Typography variant='caption' color='text.secondary'>
              {existingCount} archivo(s) adjunto(s)
            </Typography>
          )}

          <Button
            size='small'
            variant='outlined'
            component='label'
            startIcon={
              uploading ? <CircularProgress size={14} /> : <UploadFileOutlinedIcon />
            }
            disabled={disabled || uploading}
            sx={{ mt: 1, textTransform: 'none' }}
          >
            {uploading
              ? 'Subiendo…'
              : hasCurrent
                ? 'Reemplazar'
                : 'Seleccionar archivo'}
            <input
              ref={inputRef}
              type='file'
              hidden
              accept={accept}
              multiple={multiple}
              onChange={handleInputChange}
            />
          </Button>
        </Box>
      </Stack>

      {error && (
        <Alert severity='error' sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity='success' sx={{ mt: 1.5 }}>
          {success}
        </Alert>
      )}
    </Box>
  );
};

DocumentoCarga.propTypes = {
  label: PropTypes.string.isRequired,
  hint: PropTypes.string,
  accept: PropTypes.string,
  currentMedia: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      url: PropTypes.string,
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
  ]),
  onUploaded: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  multiple: PropTypes.bool,
  existingCount: PropTypes.number,
};

export default DocumentoCarga;
