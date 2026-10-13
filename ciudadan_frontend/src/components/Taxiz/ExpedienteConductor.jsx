import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import TarjetaCirculacion, { VEHICLE_STATUS } from './TarjetaCirculacion.jsx';

const STRAPI_URL = (process.env.REACT_APP_STRAPI_URL || '').replace(/\/$/, '');

/**
 * Requisitos del expediente. `field` apunta a los atributos media del
 * modelo `vehicle` en Strapi; `section` los agrupa en la UI.
 */
export const EXPEDIENTE_REQUISITOS = [
  { id: 'registration_card', label: 'Tarjeta de circulación (frente y reverso)', section: 'vehiculo', required: true },
  { id: 'insurance_document', label: 'Póliza de seguro vigente', section: 'vehiculo', required: true },
  { id: 'vehicle_front_photo', label: 'Foto frontal del vehículo', section: 'fotos', required: true },
  { id: 'vehicle_side_photo', label: 'Foto lateral del vehículo', section: 'fotos', required: true },
  { id: 'vehicle_back_photo', label: 'Foto trasera del vehículo', section: 'fotos', required: true },
  { id: 'vehicle_interior_photo', label: 'Foto interior del vehículo', section: 'fotos', required: true },
];

const hasMedia = (field) => {
  if (!field) return false;
  if (Array.isArray(field)) return field.length > 0;
  return true;
};

/**
 * ExpedienteConductor
 *
 * Sección "Mi expediente" para el conductor. Muestra:
 *  - el estado global del expediente y el avance documental;
 *  - el desglose de requisitos (tarjeta, seguro, fotos);
 *  - la tarjeta de circulación (subida de documentos).
 *
 * Datos: `GET /api/vehicles` (recortado al usuario/agency en el backend) y
 * `PATCH /api/vehicles/:id` para persistir cada documento. El cambio de
 * estado `preregistrado → documento_completo` lo resuelve el servidor.
 */
const ExpedienteConductor = ({ onVehicleChange }) => {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);

  const strapiJwt = process.env.REACT_APP_STRAPI_TOKEN || '';

  const buildHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (strapiJwt) headers.Authorization = `Bearer ${strapiJwt}`;
    return headers;
  }, [strapiJwt]);

  const loadVehicle = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${STRAPI_URL}/api/vehicles?populate=*&pagination[pageSize]=1`,
        { credentials: 'include', headers: buildHeaders() },
      );
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || 'No se pudo cargar tu expediente.');
      }
      const json = JSON.parse(text);
      const first = Array.isArray(json?.data) ? json.data[0] : json?.data || null;
      setVehicle(first);
    } catch (err) {
      setError(err.message || 'No se pudo cargar tu expediente.');
    } finally {
      setLoading(false);
    }
  }, [buildHeaders]);

  useEffect(() => {
    loadVehicle();
  }, [loadVehicle]);

  const handleFieldChange = useCallback(
    async (field, value) => {
      if (!vehicle?.id) {
        throw new Error('Aún no existe un expediente de vehículo para tu cuenta.');
      }

      setSaving(true);
      try {
        const res = await fetch(`${STRAPI_URL}/api/vehicles/${vehicle.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: buildHeaders(),
          body: JSON.stringify({ data: { [field]: value } }),
        });
        const text = await res.text();
        if (!res.ok) {
          throw new Error(text || 'No se pudo guardar el documento.');
        }
        const json = JSON.parse(text);
        const updated = json?.data || json;
        setVehicle((prev) => ({ ...prev, ...updated }));
        if (onVehicleChange) onVehicleChange(updated);
        return updated;
      } finally {
        setSaving(false);
      }
    },
    [buildHeaders, onVehicleChange, vehicle?.id],
  );

  /** Avance documental: requisitos cumplidos / total. */
  const progress = useMemo(() => {
    const total = EXPEDIENTE_REQUISITOS.length;
    const done = EXPEDIENTE_REQUISITOS.filter((req) => hasMedia(vehicle?.[req.id])).length;
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  }, [vehicle]);

  const statusInfo = VEHICLE_STATUS[vehicle?.status] || VEHICLE_STATUS.preregistrado;

  const sections = useMemo(() => {
    const grouped = {};
    EXPEDIENTE_REQUISITOS.forEach((req) => {
      if (!grouped[req.section]) grouped[req.section] = [];
      grouped[req.section].push({ ...req, done: hasMedia(vehicle?.[req.id]) });
    });
    return grouped;
  }, [vehicle]);

  const SECTION_LABELS = {
    vehiculo: 'Documentación del vehículo',
    fotos: 'Fotografías de la unidad',
  };

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress />
        <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
          Cargando tu expediente…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity='error'
        action={
          <Button color='inherit' size='small' onClick={loadVehicle}>
            Reintentar
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Paper
        variant='outlined'
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          border: '1px solid rgba(15, 23, 42, 0.10)',
          mb: 2,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent='space-between'
        >
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <FolderSharedOutlinedIcon color='primary' />
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 700 }}>
                Mi expediente de conductor
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {vehicle?.plates
                  ? `Unidad ${vehicle.plates}`
                  : 'Aún no tienes una unidad vinculada'}
              </Typography>
            </Box>
          </Stack>

          <Stack direction='row' spacing={1} alignItems='center'>
            <Chip
              label={statusInfo.label}
              color={statusInfo.color}
              size='small'
              variant='outlined'
            />
            <Button
              size='small'
              startIcon={<RefreshOutlinedIcon />}
              onClick={loadVehicle}
              disabled={loading || saving}
              sx={{ textTransform: 'none' }}
            >
              Actualizar
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ mt: 2.5 }}>
          <Stack direction='row' justifyContent='space-between' sx={{ mb: 0.5 }}>
            <Typography variant='body2'>Avance documental</Typography>
            <Typography variant='body2' color='text.secondary'>
              {progress.done}/{progress.total} · {progress.percent}%
            </Typography>
          </Stack>
          <LinearProgress
            variant='determinate'
            value={progress.percent}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Paper>


      <Stack spacing={2}>
        {feedback && (
          <Alert severity={feedback.severity} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        )}

        {Object.entries(sections).map(([sectionKey, items]) => (
          <Paper
            key={sectionKey}
            variant='outlined'
            sx={{
              p: 2,
              borderRadius: 3,
              border: '1px solid rgba(15, 23, 42, 0.10)',
            }}
          >
            <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 1.5 }}>
              {SECTION_LABELS[sectionKey] || sectionKey}
            </Typography>

            <Stack spacing={1}>
              {items.map((item) => (
                <Stack
                  key={item.id}
                  direction='row'
                  spacing={1.5}
                  alignItems='center'
                  justifyContent='space-between'
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    bgcolor: item.done ? 'rgba(29, 158, 117, 0.06)' : 'grey.50',
                  }}
                >
                  <Typography variant='body2'>{item.label}</Typography>
                  <Chip
                    size='small'
                    label={item.done ? 'Listo' : 'Pendiente'}
                    color={item.done ? 'success' : 'default'}
                    variant={item.done ? 'filled' : 'outlined'}
                  />
                </Stack>
              ))}
            </Stack>
          </Paper>
        ))}

        {!vehicle && (
          <Alert severity='info'>
            Cuando completes tu pre-registro se creará tu expediente de vehículo
            y podrás subir la tarjeta de circulación aquí.
          </Alert>
        )}

        {vehicle && (
          <TarjetaCirculacion
            vehicle={vehicle}
            onFieldChange={handleFieldChange}
            readOnly={saving}
          />
        )}
      </Stack>
    </Box>
  );
};

ExpedienteConductor.propTypes = {
  onVehicleChange: PropTypes.func,
};

ExpedienteConductor.defaultProps = {
  onVehicleChange: null,
};

export default ExpedienteConductor;

