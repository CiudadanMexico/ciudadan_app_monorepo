import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import {
  ASIGNADOS,
  ESTADOS,
  normalizarTelefono,
  validarFormulario,
} from '../Prelanzamiento/datos';
import { registrarPrelanzamiento, WHATSAPP_COMUNIDAD } from '../../services/prelanzamientoService';
import { getPublicConfig } from '../../services/driverVerifierService';
import AvisoPrivacidad from '../Prelanzamiento/AvisoPrivacidad';
import { getStatusLabel } from '../GeoNetworkMap/geoTheme';

const NODO_OPCIONES = [
  { value: 'si', label: 'Sí, cuento con los tres' },
  { value: 'parcial', label: 'Cuento con algunos' },
  { value: 'no', label: 'Todavía no' },
];

const CONFIRMACION_SOCIO =
  'Registramos tu solicitud de socio estatal. Nuestro equipo revisará la disponibilidad del estado y se pondrá en contacto contigo para continuar el proceso.';

/**
 * SocioEstatalForm — Formulario real de postulación como Socio Estatal.
 *
 * Reutiliza la validación y el endpoint probados del prelanzamiento
 * (tipo socio-estatal) en lugar de crear un POST nuevo. El estado solicitado
 * viene fijado por la página de detalle. No solicita cifras de negocio
 * (conductores, aportaciones o ingresos) para no inventar datos.
 */
export default function SocioEstatalForm({
  estadoSolicitado = '',
  regionId = '',
  status = 'available',
  estadoNombre = '',
}) {
  const [values, setValues] = useState({
    nombre: '',
    telefono: '',
    estado: '',
    municipio: '',
    experiencia: '',
    nodo: '',
    consentimiento: false,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(null);
  const [whatsapp, setWhatsapp] = useState(null);
  const lock = useRef(false);
  const formRef = useRef(null);
  const resultRef = useRef(null);

  const estadoLabel = estadoNombre || estadoSolicitado || regionId;

  useEffect(() => {
    getPublicConfig()
      .then((config) => setWhatsapp(config?.whatsappGroupUrl || WHATSAPP_COMUNIDAD))
      .catch(() => setWhatsapp(WHATSAPP_COMUNIDAD));
  }, []);

  useEffect(() => {
    if (success && resultRef.current) resultRef.current.focus();
  }, [success]);

  const change = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const field = (key, label, options, extra = {}) => (
    <TextField
      key={key}
      id={`se-${key}`}
      name={key}
      label={label}
      {...extra}
      value={values[key]}
      onChange={(event) => change(key, event.target.value)}
      fullWidth
      select={!!options}
      error={!!errors[key]}
      helperText={errors[key] || extra.helperText}
      inputProps={{
        maxLength: key === 'experiencia' ? 2000 : key === 'telefono' ? 25 : 160,
      }}
    >
      {options?.map((option) => {
        const item = typeof option === 'string' ? { value: option, label: option } : option;
        return (
          <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </MenuItem>
        );
      })}
    </TextField>
  );

  const estadosResidencia = ESTADOS.map((value) => ({
    value,
    // El backend rechaza CDMX y Estado de México como residencia de un socio estatal
    // (ya están asignados), así que se marcan como no seleccionables.
    label: ASIGNADOS.includes(value) ? `${value} — asignado` : value,
    disabled: ASIGNADOS.includes(value),
  }));

  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    const payloadCheck = {
      ...values,
      estado: values.estado || 'Pendiente de captura',
      estadoSolicitado,
      tipo: 'socio-estatal',
    };
    const validation = validarFormulario(payloadCheck, 'socio-estatal');
    if (validation.estadoSolicitado === 'Completa este campo.') delete validation.estadoSolicitado;
    setErrors(validation);
    setError('');
    if (Object.keys(validation).length) {
      setTimeout(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    lock.current = true;
    setSending(true);
    try {
      const result = await registrarPrelanzamiento({
        ...values,
        tipo: 'socio-estatal',
        estadoSolicitado,
        telefono: normalizarTelefono(values.telefono),
        origen: window.location.href,
        utm: {},
      });
      if (!result?.data?.recibido) {
        throw new Error('No recibimos confirmación del registro. Inténtalo de nuevo.');
      }
      setSuccess(result.data.tipo || 'socio-estatal');
    } catch (err) {
      setError(err?.message || 'No pudimos guardar tu solicitud.');
    } finally {
      lock.current = false;
      setSending(false);
    }
  }

  if (success) {
    return (
      <Card
        ref={resultRef}
        tabIndex={-1}
        sx={{
          bgcolor: 'rgba(11, 29, 23, 0.92)',
          borderRadius: 3.5,
          border: '1px solid rgba(25, 215, 156, 0.5)',
          boxShadow: '0 0 24px rgba(25, 215, 156, 0.25)',
          color: '#ffffff',
          p: { xs: 2.5, sm: 3 },
          textAlign: 'center',
        }}
      >
        <CheckCircleRoundedIcon sx={{ color: '#19d79c', fontSize: '3rem', mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffffff', mb: 1 }}>
          ¡Tu postulación fue recibida!
        </Typography>
        <Typography variant="body1" sx={{ color: '#a2c4b9', maxWidth: 640, mx: 'auto', mb: 1 }}>
          {CONFIRMACION_SOCIO}
        </Typography>
        <Typography variant="body2" sx={{ color: '#a2c4b9', mb: 2 }}>
          No se realizó ningún cobro. La asignación del estado <strong>{estadoLabel}</strong> está
          sujeta al proceso de revisión del equipo.
        </Typography>
        {whatsapp ? (
          <Button
            variant="contained"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ bgcolor: '#19d79c', color: '#07120f', fontWeight: 800, borderRadius: 999, px: 3 }}
          >
            UNIRME AL GRUPO DE WHATSAPP
          </Button>
        ) : (
          <Typography variant="body2" sx={{ color: '#a2c4b9' }}>
            El equipo te compartirá por WhatsApp el acceso al grupo oficial.
          </Typography>
        )}
      </Card>
    );
  }

  return (
    <Card
      sx={{
        bgcolor: 'rgba(11, 29, 23, 0.92)',
        borderRadius: 3.5,
        border: '1px solid rgba(46, 230, 200, 0.28)',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.55)',
        color: '#ffffff',
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffffff', mb: 0.5 }}>
          Postúlate como Socio Estatal de {estadoLabel}
        </Typography>
        <Typography variant="body2" sx={{ color: '#a2c4b9', mb: 2.5 }}>
          Completa tus datos y el equipo revisará la disponibilidad del estado. Todos los campos son obligatorios.
        </Typography>

        {error && (
          <Alert severity="error" role="alert" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" ref={formRef} onSubmit={submit} noValidate aria-busy={sending}>
          <input type="hidden" name="modalidad" value="socio-estatal" />
          <input type="hidden" name="estadoSolicitado" value={estadoSolicitado} />

          <Stack spacing={2} sx={{ mb: 2 }}>
            {field('nombre', 'Nombre completo', null, { helperText: 'Como aparece en tu identificación.' })}
            {field('telefono', 'WhatsApp (10 dígitos)', null, { inputMode: 'tel', helperText: 'Con o sin +52.' })}
            {field('estado', 'Estado donde vives actualmente', estadosResidencia)}
            {field('municipio', 'Municipio / Alcaldía', null)}
            {field('nodo', '¿Tienes espacio, Internet estable y respaldo eléctrico?', NODO_OPCIONES)}
            <Box>{field('experiencia', 'Experiencia relevante', null, { multiline: true, minRows: 3 })}</Box>
          </Stack>

          <FormControlLabel
            control={(
              <Checkbox
                name="consentimiento"
                checked={values.consentimiento}
                onChange={(event) => change('consentimiento', event.target.checked)}
                sx={{ color: '#2ee6c8' }}
              />
            )}
            label={(
              <Typography variant="body2" sx={{ color: '#d7e6e0' }}>
                He leído el aviso de privacidad y autorizo que Ciudadan me contacte por WhatsApp.
              </Typography>
            )}
            sx={{ mb: 2, alignItems: 'flex-start' }}
          />
          {errors.consentimiento && (
            <Typography variant="body2" color="error" sx={{ mt: -1.5, mb: 1.5 }}>
              {errors.consentimiento}
            </Typography>
          )}

          <AvisoPrivacidad />

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={sending}
            endIcon={<SendRoundedIcon />}
            sx={{
              mt: 2.5,
              borderRadius: 999,
              fontWeight: 900,
              py: 1.6,
              bgcolor: '#19d79c',
              color: '#07120f',
              '&:hover': { bgcolor: '#15c98f' },
              '&:disabled': { bgcolor: '#35534a', color: '#8fa8a0' },
            }}
          >
            {sending ? 'Enviando…' : `Enviar postulación — ${estadoLabel}`}
          </Button>

          <Typography variant="caption" sx={{ color: '#638479', display: 'block', textAlign: 'center', mt: 1.5 }}>
            {getStatusLabel(status)} · Sin cobro al registrarte · Sujeto a revisión del equipo
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

SocioEstatalForm.propTypes = {
  estadoSolicitado: PropTypes.string,
  regionId: PropTypes.string,
  status: PropTypes.string,
  estadoNombre: PropTypes.string,
};
