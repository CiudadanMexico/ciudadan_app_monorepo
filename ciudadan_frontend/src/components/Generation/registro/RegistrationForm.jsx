/**
 * RegistrationForm — único formulario dinámico de la Generación Fundadora.
 * Detecta ?via= (hackabot|vallecatnip|creadores|aliados|general) y agrega
 * los campos específicos de esa vía tras los comunes (spec 11).
 *
 * - Prellena nombre/email desde Auth0 si el visitante está autenticado
 *   (spec 11.1: no pedir información repetida) y los marca readOnly.
 * - Incluye tracking UTM persistido (spec 13) y analytics (spec 14).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Grid, Box, Button, Typography, Stack, Alert } from '@mui/material';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import RegistrationField from './RegistrationField';
import { REGISTRATION, GENERATION_ROUTES } from '../../../config/generationFounderConfig';
import { generationService } from '../../../services/generation/generationServices';
import {
  captureTrackingParams,
  readTrackingParams,
  clearTrackingParams,
  trackGenerationEvent,
  generationEvents,
} from '../../../utils/generationAnalytics';
import {
  ctaPrimarySx,
  ctaSecondarySx,
  GEN_COLORS,
  GEN_FONTS,
} from '../GenerationTheme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RegistrationForm = () => {
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0();

  const viaParam = searchParams.get('via');
  const via = useMemo(
    () => (REGISTRATION.validVias.includes(viaParam) ? viaParam : REGISTRATION.defaultVia),
    [viaParam]
  );

  const extraFields = REGISTRATION.extraFields[via] || [];
  const meta = REGISTRATION.viaMeta[via] || REGISTRATION.viaMeta.general;

  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const startedRef = useRef(false);

  // Tracking UTM de la URL actual → sessionStorage (sobrevive la navegación)
  useEffect(() => {
    captureTrackingParams();
  }, [via]);

  // Prefill desde Auth0: no pedir dos veces la misma información
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    setValues((prev) => ({
      ...prev,
      nombre: prev.nombre || user.name || user.nickname || '',
      email: prev.email || user.email || '',
    }));
  }, [isAuthenticated, user]);

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // registration_started: una sola vez, en la primera interacción real
  const handleFirstFocus = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackGenerationEvent(generationEvents.registrationStarted, { via });
  };

  const validate = () => {
    const next = {};
    [...REGISTRATION.commonFields, ...extraFields].forEach((field) => {
      const value = values[field.name];
      if (field.required && (value === undefined || value === '' || value === false)) {
        next[field.name] = 'Este campo es obligatorio.';
        return;
      }
      if (field.type === 'email' && value && !EMAIL_RE.test(value)) {
        next[field.name] = 'Escribe un correo electrónico válido.';
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const getAuthToken = async () => {
    if (!isAuthenticated) return null;
    try {
      return await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUDIENCE || 'https://api.ciudadan.org',
          scope: 'openid profile email offline_access',
        },
      });
    } catch {
      return null; // registro público: el token sólo vincula al usuario
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError('');

    if (!validate()) {
      setSubmitError('Revisa los campos marcados antes de continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const authToken = await getAuthToken();

      // Comunes → columnas del modelo; extra → answers JSON (spec 12)
      const common = {};
      const answers = {};
      [...REGISTRATION.commonFields, ...extraFields].forEach((field) => {
        const value = values[field.name] ?? '';
        if (REGISTRATION.commonFields.some((f) => f.name === field.name)) {
          common[field.name] = value;
        } else {
          answers[field.name] = value;
        }
      });

      await generationService.submitApplication({
        via,
        common,
        answers,
        tracking: readTrackingParams(via),
        authToken,
      });

      trackGenerationEvent(generationEvents.registrationCompleted, { via });
      clearTrackingParams();
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err?.message || 'No pudimos enviar tu registro. Inténtalo de nuevo en unos minutos.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Vista de éxito tras enviar el registro
  if (submitted) {
    return (
      <Box
        sx={{
          border: `1px solid ${GEN_COLORS.verde}`,
          borderRadius: 4,
          bgcolor: 'rgba(0,255,153,0.05)',
          px: { xs: 3, md: 6 },
          py: { xs: 5, md: 7 },
          textAlign: 'center',
        }}
      >
        <TaskAltRounded sx={{ fontSize: { xs: 48, md: 64 }, color: GEN_COLORS.verde }} />
        <Typography
          variant="h2"
          sx={{
            fontFamily: GEN_FONTS.display,
            fontWeight: 700,
            fontSize: { xs: '1.5rem', md: '2rem' },
            mt: 2,
            color: GEN_COLORS.texto,
          }}
        >
          ¡Registro enviado!
        </Typography>
        <Typography
          sx={{
            mt: 1.5,
            color: GEN_COLORS.textoSecundario,
            maxWidth: 520,
            mx: 'auto',
            lineHeight: 1.65,
          }}
        >
          Recibimos tu postulación a <strong>{meta.label}</strong>. Te contactaremos
          por correo{via === 'hackabot' ? ' y por Discord' : ''} para los siguientes
          pasos.
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="center"
          sx={{ mt: 4 }}
        >
          <Button href={meta.backTo.route} variant="contained" disableElevation sx={ctaPrimarySx}>
            {meta.backTo.label}
          </Button>
          <Button href={GENERATION_ROUTES.home} variant="text" sx={ctaSecondarySx}>
            Conoce las otras vías
          </Button>
        </Stack>
      </Box>
    );
  }

  const renderField = (field) => (
    <Grid size={{ xs: 12, sm: field.half ? 6 : 12 }} key={field.name}>
      <RegistrationField
        field={field}
        value={values[field.name]}
        error={errors[field.name]}
        disabled={isAuthenticated && (field.name === 'nombre' || field.name === 'email')}
        onChange={handleChange}
      />
    </Grid>
  );

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate onFocus={handleFirstFocus}>
      {/* Encabezado personalizado según la vía (spec 11) */}
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <Typography
          component="p"
          sx={{
            fontFamily: GEN_FONTS.mono,
            letterSpacing: '0.22em',
            color: GEN_COLORS.verde,
            fontSize: { xs: '0.68rem', md: '0.75rem' },
            textTransform: 'uppercase',
            mb: 1,
          }}
        >
          Generación Fundadora 2026
        </Typography>
        <Typography
          variant="h1"
          sx={{
            fontFamily: GEN_FONTS.display,
            fontWeight: 700,
            fontSize: { xs: '1.7rem', md: '2.3rem' },
            color: GEN_COLORS.texto,
            lineHeight: 1.15,
          }}
        >
          {meta.title}
        </Typography>
        <Typography sx={{ mt: 1, color: GEN_COLORS.textoSecundario, lineHeight: 1.6, maxWidth: 640 }}>
          {meta.subtitle}
        </Typography>
      </Box>

      {isAuthenticated && (
        <Alert
          severity="success"
          icon={false}
          sx={{
            mb: 3,
            bgcolor: 'rgba(25,215,156,0.08)',
            border: `1px solid ${GEN_COLORS.borde}`,
            color: GEN_COLORS.texto,
            '& .MuiAlert-message': { fontSize: '0.9rem' },
          }}
        >
          Estás usando tu cuenta Ciudadan (<strong>{user?.email}</strong>): nombre y
          correo ya están prellenados.
        </Alert>
      )}

      {/* Campos comunes (spec 11.1) */}
      <Grid container spacing={{ xs: 2, md: 2.5 }}>
        {REGISTRATION.commonFields.map(renderField)}
      </Grid>

      {/* Campos adicionales de la vía (spec 11.2–11.5) */}
      {extraFields.length > 0 && (
        <>
          <Typography
            variant="h2"
            sx={{
              fontFamily: GEN_FONTS.display,
              fontWeight: 700,
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              color: GEN_COLORS.amarilloSuave,
              mt: { xs: 4, md: 5 },
              mb: 2,
            }}
          >
            Sobre tu perfil · {meta.label}
          </Typography>
          <Grid container spacing={{ xs: 2, md: 2.5 }}>
            {extraFields.map(renderField)}
          </Grid>
        </>
      )}

      {submitError && (
        <Alert
          severity="error"
          sx={{ mt: 3, bgcolor: 'rgba(239,83,80,0.08)', color: GEN_COLORS.texto }}
        >
          {submitError}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
          disableElevation
          sx={ctaPrimarySx}
        >
          {submitting ? 'Enviando…' : 'Enviar registro'}
        </Button>
        <Button href={meta.backTo.route} variant="text" sx={ctaSecondarySx}>
          {meta.backTo.label}
        </Button>
      </Stack>
    </Box>
  );
};

export default RegistrationForm;
