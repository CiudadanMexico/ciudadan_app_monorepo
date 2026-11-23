import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Container, Grid, Typography, TextField, Button, Alert, Card, CardContent, CardMedia, Divider, Stepper, Step, StepLabel, FormControl, InputLabel, Select, MenuItem, CircularProgress, Snackbar } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import { useSnackbar } from 'notistack';
import { useSubdomain } from '../../Contexts/SubdomainContext';

const estadosMexico = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Coahuila', 'Colima', 'Chiapas', 'Chihuahua', 'Ciudad de México',
  'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'México',
  'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
  'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora',
  'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

const LideresRegistro = () => {
  const { loginWithRedirect } = useAuth0();
  const { enqueueSnackbar } = useSnackbar();
  const { config } = useSubdomain();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    state: '',
    city: '',
    company_name: '',
    rfc: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const steps = ['Información Personal', 'Ubicación', 'Empresa', 'Confirmación'];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = () => {
    const newErrors = {};

    if (activeStep === 0) {
      if (!formData.full_name.trim()) newErrors.full_name = 'Nombre completo es requerido';
      if (!formData.email.trim()) newErrors.email = 'Email es requerido';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';
      if (!formData.phone.trim()) newErrors.phone = 'Teléfono es requerido';
      else if (!/^[\d\s\-\(\)\+]{10,}$/.test(formData.phone)) newErrors.phone = 'Teléfono inválido';
    } else if (activeStep === 1) {
      if (!formData.state) newErrors.state = 'Estado es requerido';
      if (!formData.city.trim()) newErrors.city = 'Ciudad es requerida';
    } else if (activeStep === 2) {
      if (!formData.company_name.trim()) newErrors.company_name = 'Nombre de empresa es requerido';
      if (!formData.rfc.trim()) newErrors.rfc = 'RFC es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    try {
      // Primero autenticar si no está logueado
      const response = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/leader/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // El token se maneja via Auth0 en cookies/headers
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error en el registro');
      }

      setSnackbarMessage('¡Postulación enviada! Revisa tu email para los siguientes pasos.');
      setSnackbarOpen(true);
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err) {
      enqueueSnackbar(err.message || 'Error al enviar postulación', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nombre Completo"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              error={!!errors.full_name}
              helperText={errors.full_name}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              required
            />
            <TextField
              fullWidth
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              error={!!errors.phone}
              helperText={errors.phone}
              placeholder="+52 55 1234 5678"
              required
            />
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth error={!!errors.state}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={formData.state}
                label="Estado"
                onChange={(e) => handleChange('state', e.target.value)}
              >
                {estadosMexico.map(estado => (
                  <MenuItem key={estado} value={estado}>{estado}</MenuItem>
                ))}
              </Select>
              {errors.state && <div style={{ color: 'red', fontSize: '0.75rem', marginTop: 4 }}>{errors.state}</div>}
            </FormControl>
            <TextField
              fullWidth
              label="Ciudad"
              value={formData.city}
              onChange={(e) => handleChange('city', e.target.value)}
              error={!!errors.city}
              helperText={errors.city}
              required
            />
          </Box>
        );
      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nombre de la Empresa / Organización"
              value={formData.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              error={!!errors.company_name}
              helperText={errors.company_name}
              required
            />
            <TextField
              fullWidth
              label="RFC"
              value={formData.rfc}
              onChange={(e) => handleChange('rfc', e.target.value)}
              error={!!errors.rfc}
              helperText={errors.rfc}
              placeholder="ABC123456XYZ"
              required
            />
          </Box>
        );
      case 3:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>Confirmar Información</Typography>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography><strong>Nombre:</strong> {formData.full_name}</Typography>
                  <Typography><strong>Email:</strong> {formData.email}</Typography>
                  <Typography><strong>Teléfono:</strong> {formData.phone}</Typography>
                  <Typography><strong>Estado:</strong> {formData.state}</Typography>
                  <Typography><strong>Ciudad:</strong> {formData.city}</Typography>
                  <Typography><strong>Empresa:</strong> {formData.company_name}</Typography>
                  <Typography><strong>RFC:</strong> {formData.rfc}</Typography>
                </Box>
              </CardContent>
            </Card>
            <Alert severity="info">
              Al enviar, crearás tu candidatura como Líder Verificador. Tendrás 15 días para incorporar 10 conductores
              y activar tu liderazgo. Recibirás 10% de comisión sobre las membresías de tus conductores referidos.
            </Alert>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {config.title}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {config.description}
        </Typography>
      </Box>

      <Card elevation={3}>
        <CardContent sx={{ px: 4, py: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
                variant="outlined"
              >
                Atrás
              </Button>
              <Box>
                {activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    startIcon={loading && <CircularProgress size={20} color="inherit" />}
                  >
                    {loading ? 'Enviando...' : 'Enviar Postulación'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleNext}
                  >
                    Siguiente
                  </Button>
                )}
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          ¿Ya tienes cuenta? <Link to="/callback" component={({ children, ...props }) => <button {...props} onClick={() => loginWithRedirect({ appState: { returnTo: '/dashboard' } })}>{children}</button>}>Iniciar sesión</Link>
        </Typography>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default LideresRegistro;