import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DocumentoCarga from './DocumentoCarga.jsx';

const STRAPI_URL = (process.env.REACT_APP_STRAPI_URL || '').replace(/\/$/, '');

/**
 * Estatus del expediente del vehículo (espejo del enum del backend).
 */
export const VEHICLE_STATUS = {
  preregistrado: { label: 'Pre-registrado', color: 'info' },
  documento_completo: { label: 'Documentación completa', color: 'primary' },
  en_revision: { label: 'En revisión', color: 'warning' },
  aprobado: { label: 'Aprobado', color: 'success' },
  suspenso: { label: 'Suspendido', color: 'error' },
  reevaluacion: { label: 'Re-evaluación', color: 'warning' },
};

const toMediaList = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field.filter(Boolean);
  return [field];
};

const toMediaUrl = (media) => {
  if (!media) return null;
  if (typeof media === 'string') return media;
  if (media.url) return `${STRAPI_URL}${media.url}`;
  return null;
};

/**
 * TarjetaCirculacion
 *
 * Sección del expediente del conductor dedicada a la tarjeta de circulación
 * del vehículo: frente y reverso, más el seguro y la referencia de concesión.
 *
 * Flujo previsto:
 *  1. El conductor sube los documentos (DocumentoCarga → /api/upload);
 *  2. el `onFieldChange` persiste los ids en el `vehicle` (PATCH /api/vehicles/:id);
 *  3. el lifecycle del backend marca `documento_completo` cuando no falta nada.
 *
 * El componente es controlado: recibe `vehicle` y notifica cambios.
 */
const TarjetaCirculacion = ({ vehicle, onFieldChange, readOnly = false }) => {
  const [feedback, setFeedback] = useState(null);

  const cardImages = toMediaList(vehicle?.registration_card);
  const insuranceDocs = toMediaList(vehicle?.insurance_document);
  const statusInfo = VEHICLE_STATUS[vehicle?.status] || VEHICLE_STATUS.preregistrado;

  const handleCardUpload = useCallback(
    async (mediaId) => {
      if (!onFieldChange) return;
      try {
        await onFieldChange('registration_card', mediaId);
        setFeedback({ severity: 'success', message: 'Tarjeta de circulación guardada.' });
      } catch (err) {
        setFeedback({
          severity: 'error',
          message: err.message || 'No se pudo guardar la tarjeta de circulación.',
        });
      }
    },
    [onFieldChange],
  );

  const handleInsuranceUpload = useCallback(
    async (mediaId) => {
      if (!onFieldChange) return;
      try {
        await onFieldChange('insurance_document', mediaId);
        setFeedback({ severity: 'success', message: 'Seguro guardado.' });
      } catch (err) {
        setFeedback({
          severity: 'error',
          message: err.message || 'No se pudo guardar el seguro.',
        });
      }
    },
    [onFieldChange],
  );

  const frontImage = cardImages[0] ? toMediaUrl(cardImages[0]) : null;
  const backImage = cardImages[1] ? toMediaUrl(cardImages[1]) : null;

  return (
    <Paper
      variant='outlined'
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        bgcolor: '#ffffff',
        border: '1px solid rgba(15, 23, 42, 0.10)',
      }}
    >
      <Stack direction='row' spacing={1.5} alignItems='center' sx={{ mb: 1 }}>
        <CreditCardOutlinedIcon color='primary' />
        <Typography variant='h6' sx={{ fontWeight: 700 }}>
          Mi tarjeta de circulación
        </Typography>
      </Stack>

      <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
        Sube el frente y reverso de la tarjeta de circulación del vehículo. El
        servidor valida que la documentación esté completa antes de pasar tu
        expediente a revisión.
      </Typography>

      {vehicle?.status && (
        <Alert severity={statusInfo.color === 'success' ? 'success' : 'info'} sx={{ mb: 2 }}>
          Estado del expediente: <strong>{statusInfo.label}</strong>
        </Alert>
      )}

      {feedback && (
        <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}


      <Stack spacing={2}>
        <Box>
          <Typography variant='subtitle2' sx={{ mb: 1 }}>
            Frente de la tarjeta
          </Typography>
          <DocumentoCarga
            label='Frente'
            hint='Foto nítida, sin reflejos, que se lea el folio y las placas.'
            required
            disabled={readOnly}
            currentMedia={frontImage}
            onUploaded={handleCardUpload}
          />
          {frontImage && (
            <Box
              component='img'
              src={frontImage}
              alt='Frente de la tarjeta de circulación'
              sx={{
                mt: 1.5,
                width: '100%',
                maxHeight: 220,
                objectFit: 'contain',
                borderRadius: 1,
                border: '1px solid rgba(15,23,42,0.10)',
              }}
            />
          )}
        </Box>

        <Box>
          <Typography variant='subtitle2' sx={{ mb: 1 }}>
            Reverso de la tarjeta
          </Typography>
          <DocumentoCarga
            label='Reverso'
            hint='Debe verse la vigencia y, si aplica, el gravamen.'
            required
            disabled={readOnly}
            currentMedia={backImage}
            onUploaded={handleCardUpload}
          />
          {backImage && (
            <Box
              component='img'
              src={backImage}
              alt='Reverso de la tarjeta de circulación'
              sx={{
                mt: 1.5,
                width: '100%',
                maxHeight: 220,
                objectFit: 'contain',
                borderRadius: 1,
                border: '1px solid rgba(15,23,42,0.10)',
              }}
            />
          )}
        </Box>

        <Divider />

        <Box>
          <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
            <DescriptionOutlinedIcon fontSize='small' color='action' />
            <Typography variant='subtitle2'>Póliza de seguro</Typography>
          </Stack>
          <DocumentoCarga
            label='Seguro'
            hint='PDF o foto de la póliza vigente.'
            accept='image/*,.pdf'
            multiple
            disabled={readOnly}
            existingCount={insuranceDocs.length}
            onUploaded={handleInsuranceUpload}
          />
        </Box>


        {vehicle?.concession_reference && (
          <Box>
            <Typography variant='caption' color='text.secondary'>
              Referencia de concesión
            </Typography>
            <Typography variant='body2'>{vehicle.concession_reference}</Typography>
          </Box>
        )}

        {readOnly && (
          <Typography variant='caption' color='text.secondary'>
            Estás viendo el expediente en modo solo lectura.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

TarjetaCirculacion.propTypes = {
  vehicle: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    status: PropTypes.string,
    registration_card: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.object,
      PropTypes.string,
    ]),
    insurance_document: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.object,
      PropTypes.string,
    ]),
    concession_reference: PropTypes.string,
  }),
  onFieldChange: PropTypes.func,
  readOnly: PropTypes.bool,
};

TarjetaCirculacion.defaultProps = {
  vehicle: null,
  onFieldChange: null,
  readOnly: false,
};

export default TarjetaCirculacion;

