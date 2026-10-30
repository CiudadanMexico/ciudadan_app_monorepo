/**
 * /candidatos — postulación a socio.
 *
 * Identidad visual de la Generación Fundadora (verde sobre fondo oscuro) y
 * campos reutilizados de RegistrationField. El correo se toma de la cuenta
 * Auth0 cuando hay sesión; si no la hay, se puede escribir a mano (la ruta
 * POST /api/postulacion-socios es pública). El teléfono usa bandera de país.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid2 as Grid,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import LoginIcon from '@mui/icons-material/Login';

import RegistrationField from '../components/Generation/registro/RegistrationField';
import paises from '../assets/paises.json';
import { getAvailableRootAreas, getAgencias } from '../services/cowork/queryServices.js';
import { crearPostulacionSocio } from '../services/cowork/candidatosService.js';
import {
  GEN_COLORS,
  GEN_FONTS,
  ctaPrimarySx,
  ctaSecondarySx,
  pageContainerSx,
} from '../components/Generation/GenerationTheme';

const MAX_CV_BYTES = 10 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Extensiones de CV admitidas — las mismas que valida el backend
// (postulacion-socio → validarCv). Se repiten aquí para avisar al usuario
// antes de enviar, no para decidir la seguridad (eso es del servidor).
const CV_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp'];

// Config de campos (uno por tipo soportado por RegistrationField).
// `area` y `agencia` son catálogos del backend: si el catálogo está vacío
// el campo deja de ser obligatorio (ver `campos` más abajo).
const CAMPOS = [
  { name: 'email', label: 'Correo electrónico', type: 'email', required: true, half: true },
  { name: 'nombre', label: 'Nombre', type: 'text', required: true, half: true, validate: 'name' },
  { name: 'apellidos', label: 'Apellidos', type: 'text', required: true, half: true, validate: 'name' },
  { name: 'area', label: 'Área de interés', type: 'select', required: true, half: true },
  { name: 'agencia', label: 'Agencia a la que te postulas', type: 'select', required: true, half: true },
  { name: 'telefono', label: 'Teléfono / WhatsApp', type: 'tel', required: true },
  { name: 'descripcion', label: '¿Por qué quieres ser socio?', type: 'textarea', required: true },
  { name: 'cv', label: 'Subir CV', type: 'file', helperText: 'PDF, Word o imagen. Máx. 10 MB.' },
  {
    name: 'consentimiento',
    label: 'Acepto que Ciudadan use estos datos para evaluar mi postulación.',
    type: 'consent',
    required: true,
  },
];

const attr = (o, campo) => (o?.attributes?.[campo] ?? o?.[campo] ?? null);

export default function Candidatos() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, loginWithRedirect } = useAuth0();

  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [areas, setAreas] = useState([]);
  const [agencias, setAgencias] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [errorCatalogos, setErrorCatalogos] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [codigoPais, setCodigoPais] = useState('+52');

  const paisSel = useMemo(
    () => paises.find((p) => p.code === codigoPais) || paises[0],
    [codigoPais]
  );

  // Áreas y agencias son catálogos del backend: se inyectan como opciones.
  const campos = useMemo(
    () =>
      CAMPOS.map((campo) => {
        if (campo.name === 'area') {
          return {
            ...campo,
            options: areas,
            required: areas.length > 0,
            helperText:
              areas.length > 0
                ? undefined
                : 'Todavía no hay áreas publicadas. Cuéntanos tu perfil en la descripción.',
          };
        }
        if (campo.name === 'agencia') {
          return {
            ...campo,
            options: agencias,
            required: agencias.length > 0,
            helperText:
              agencias.length > 0
                ? undefined
                : 'Todavía no hay agencias publicadas. Revisaremos tu postulación manualmente.',
          };
        }
        return campo;
      }),
    [areas, agencias]
  );

  const cargarCatalogos = useCallback(async () => {
    setCargandoCatalogos(true);
    setErrorCatalogos('');
    try {
      const [jAreas, jAgencias] = await Promise.all([getAvailableRootAreas(), getAgencias()]);
      setAreas(
        (Array.isArray(jAreas?.data) ? jAreas.data : []).map((a) => ({
          value: String(a.id),
          label: attr(a, 'name') || `Área ${a.id}`,
        }))
      );
      setAgencias(
        (Array.isArray(jAgencias?.data) ? jAgencias.data : []).map((g) => ({
          value: String(g.id),
          label: attr(g, 'nombre') || `Agencia ${g.id}`,
        }))
      );
    } catch {
      setAreas([]);
      setAgencias([]);
      setErrorCatalogos(
        'No pudimos cargar las áreas y agencias. Reintenta para poder continuar con tu postulación.'
      );
    } finally {
      setCargandoCatalogos(false);
    }
  }, []);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  // Con sesión iniciada el correo viene de la cuenta (solo lectura).
  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    setValues((prev) => ({ ...prev, email: user.email }));
  }, [isAuthenticated, user]);

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    campos.forEach((campo) => {
      const valor = values[campo.name];

      if (campo.required && (valor === undefined || valor === '' || valor === null || valor === false)) {
        next[campo.name] = 'Este campo es obligatorio.';
        return;
      }

      if (campo.type === 'email' && valor && !EMAIL_RE.test(String(valor).trim())) {
        next.email = 'Escribe un correo electrónico válido.';
      }

      if (campo.validate === 'name' && valor) {
        const texto = String(valor).trim();
        if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ'’\- ]+$/.test(texto)) {
          next[campo.name] = 'Solo letras, espacios, guiones y apóstrofes.';
        } else if (texto.replace(/[\s'’\-]+/g, '').length < 2) {
          next[campo.name] = 'Escribe al menos 2 letras.';
        } else if (texto.length > 60) {
          next[campo.name] = 'Máximo 60 caracteres.';
        }
      }

      if (campo.name === 'telefono' && valor) {
        if (String(valor).replace(/\D/g, '').length < 8) {
          next.telefono = 'Escribe un teléfono válido.';
        }
      }

      // CV opcional, pero si se adjunta debe respetar tipo y límite anunciado.
      if (campo.name === 'cv' && valor) {
        if (valor.size > MAX_CV_BYTES) {
          next.cv = 'El CV supera 10 MB. Sube un archivo más ligero.';
        } else {
          const extension = `.${String(valor.name || '').split('.').pop()?.toLowerCase()}`;
          if (!CV_EXTENSIONS.includes(extension)) {
            next.cv = 'El CV debe ser PDF, Word o una imagen (JPG, PNG o WEBP).';
          }
        }
      }
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const tel = String(values.telefono || '').replace(/\D/g, '');
      // Contrato de crearPostulacionSocio: objeto plano; el servicio arma el
      // FormData (data + files.cv). No enviar un FormData crudo: el servicio
      // no sabe leerlo y la postulación llegaría vacía.
      // Sólo viajan datos del visitante: el estado, las fechas y el metadata
      // los fija el backend (no son negociables desde el cliente).
      await crearPostulacionSocio({
        nombre_completo: `${(values.nombre || '').trim()} ${(values.apellidos || '').trim()}`.trim(),
        email: (values.email || user?.email || '').trim(),
        codigo_pais: paisSel.code,
        telefono: tel,
        area: values.area || null,
        agencia: values.agencia || null,
        descripcion: (values.descripcion || '').trim(),
        consentimiento: values.consentimiento === true,
        cv: values.cv || null,
      });
      setEnviado(true);
    } catch (err) {
      setSubmitError(err?.message || 'No se pudo enviar la postulación. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const enviarOtra = () => {
    setValues(isAuthenticated && user?.email ? { email: user.email } : {});
    setErrors({});
    setSubmitError('');
    setEnviado(false);
  };

  if (isLoading) {
    return (
      <Box sx={{ ...pageContainerSx, display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (enviado) {
    return (
      <Box sx={{ ...pageContainerSx, px: { xs: 2, sm: 3 }, py: { xs: 4, md: 6 } }}>
        <Box sx={{ maxWidth: 720, mx: 'auto' }}>
          <Typography variant="h4" sx={{ fontFamily: GEN_FONTS.display, fontWeight: 700, mb: 1.5 }}>
            ¡Gracias por postularte!
          </Typography>
          <Typography sx={{ color: GEN_COLORS.textoSecundario, mb: 3, lineHeight: 1.6 }}>
            Recibimos tu postulación. El equipo de la agencia la revisará y te contactará.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="text"
              onClick={() => navigate('/')}
              startIcon={<ArrowBackIcon />}
              sx={ctaSecondarySx}
            >
              Volver al inicio
            </Button>
            <Button variant="contained" onClick={enviarOtra} sx={ctaPrimarySx}>
              Enviar otra postulación
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ ...pageContainerSx, px: { xs: 2, sm: 3 }, py: { xs: 4, md: 6 } }}>
      <Box sx={{ maxWidth: 760, mx: 'auto' }}>
        <Button
          variant="text"
          onClick={() => navigate(-1)}
          startIcon={<ArrowBackIcon />}
          sx={{ ...ctaSecondarySx, mb: 2, px: 2 }}
        >
          Volver
        </Button>

        <Typography variant="h4" sx={{ fontFamily: GEN_FONTS.display, fontWeight: 700 }}>
          Postularte a socio
        </Typography>
        <Typography sx={{ color: GEN_COLORS.textoSecundario, mt: 1, mb: 3, lineHeight: 1.6 }}>
          Únete a una agencia Ciudadan. Llena el formulario y revisaremos tu postulación.
        </Typography>

        {!isAuthenticated && (
          <Alert
            severity="info"
            icon={<LoginIcon />}
            sx={{ mb: 3, bgcolor: 'rgba(25,215,156,0.08)', color: GEN_COLORS.texto }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => loginWithRedirect({ appState: { target: '/candidatos' } })}
              >
                Iniciar sesión
              </Button>
            }
          >
            Puedes postularte sin cuenta, pero si inicias sesión rellenamos tu correo automáticamente.
          </Alert>
        )}

        {errorCatalogos && (
          <Alert
            severity="warning"
            sx={{ mb: 2, bgcolor: 'rgba(245,196,0,0.08)', color: GEN_COLORS.texto }}
            action={
              <Button color="inherit" size="small" onClick={cargarCatalogos}>
                Reintentar
              </Button>
            }
          >
            {errorCatalogos}
          </Alert>
        )}

        {!errorCatalogos && !cargandoCatalogos && areas.length === 0 && agencias.length === 0 && (
          <Alert
            severity="info"
            sx={{ mb: 2, bgcolor: 'rgba(25,215,156,0.08)', color: GEN_COLORS.texto }}
          >
            Todavía no hay áreas ni agencias publicadas: puedes enviar tu postulación
            sin seleccionarlas y la revisamos personalmente.
          </Alert>
        )}

        {submitError && (
          <Alert
            severity="error"
            sx={{ mb: 2, bgcolor: 'rgba(239,83,80,0.08)', color: GEN_COLORS.texto }}
          >
            {submitError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={{ xs: 2, md: 2.5 }}>
            {campos.map((campo) => (
              <Grid key={campo.name} size={{ xs: 12, sm: campo.half ? 6 : 12 }}>
                {campo.name === 'telefono' && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography
                      component="span"
                      sx={{
                        display: 'block',
                        color: GEN_COLORS.textoSecundario,
                        fontSize: '0.8rem',
                        mb: 0.5,
                      }}
                    >
                      País del teléfono: {paisSel.label} ({paisSel.code})
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {paises.map((pais) => (
                        <Button
                          key={pais.code}
                          size="small"
                          onClick={() => setCodigoPais(pais.code)}
                          aria-label={`País ${pais.label}`}
                          aria-pressed={codigoPais === pais.code}
                          title={pais.label}
                          sx={{
                            p: 0.5,
                            minWidth: 0,
                            border: `1px solid ${
                              codigoPais === pais.code ? GEN_COLORS.verde : 'transparent'
                            }`,
                            bgcolor:
                              codigoPais === pais.code ? 'rgba(255,255,255,0.16)' : 'transparent',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                          }}
                        >
                          <img
                            src={pais.flag}
                            alt=""
                            style={{ width: 18, height: 12, display: 'block' }}
                          />
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                )}

                <RegistrationField
                  field={campo}
                  value={values[campo.name] ?? ''}
                  error={errors[campo.name]}
                  disabled={
                    (campo.name === 'email' && isAuthenticated) || submitting
                  }
                  onChange={handleChange}
                />
              </Grid>
            ))}
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
            <Button
              type="button"
              variant="text"
              onClick={() => navigate(-1)}
              disabled={submitting}
              sx={ctaSecondarySx}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || cargandoCatalogos}
              startIcon={
                submitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />
              }
              sx={ctaPrimarySx}
            >
              {submitting ? 'Enviando…' : 'Enviar postulación'}
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
