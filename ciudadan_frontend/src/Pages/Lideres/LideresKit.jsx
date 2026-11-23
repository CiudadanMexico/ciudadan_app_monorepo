import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Container, Card, CardContent, CardHeader, Typography, Button, Alert, Divider, Grid, TextField, CircularProgress, Stepper, Step, StepLabel, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useSubdomain } from '../../Contexts/SubdomainContext';

const LideresKit = () => {
  const { getAccessTokenSilently, user } = useAuth0();
  const { enqueueSnackbar } = useSnackbar();
  const { config } = useSubdomain();
  const navigate = useNavigate();

  const [leader, setLeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState({
    street: '',
    number: '',
    colony: '',
    city: '',
    state: '',
    zip_code: '',
    address: '', // Para compatibilidad con backend
    address_number: '',
  });
  const [preference, setPreference] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState(null);

  const steps = ['Dirección de Envío', 'Pago', 'Confirmación'];

  useEffect(() => {
    fetchLeader();
  }, []);

  const fetchLeader = async () => {
    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/leader/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/registro');
          return;
        }
        throw new Error('Error al cargar datos del líder');
      }

      const data = await response.json();
      if (data.data?.isLeader) {
        setLeader(data.data.leader);
        // Pre-llenar dirección si existe
        if (data.data.leader.address) {
          setAddress(prev => ({
            ...prev,
            street: data.data.leader.address || '',
            number: data.data.leader.address_number || '',
            colony: data.data.leader.colony || '',
            city: data.data.leader.city || '',
            state: data.data.leader.state || '',
            zip_code: data.data.leader.zip_code || '',
          }));
        }
      } else {
        navigate('/registro');
      }
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const validateAddress = () => {
    const required = ['street', 'number', 'colony', 'city', 'state', 'zip_code'];
    const missing = required.filter(field => !address[field]);
    if (missing.length > 0) {
      setError(`Completa todos los campos: ${missing.join(', ')}`);
      return false;
    }
    setError(null);
    return true;
  };

  const createPreference = async () => {
    if (!validateAddress()) return;

    setPaymentLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/leader/kit/preference`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: {
            street: address.street,
            number: address.number,
            colony: address.colony,
            city: address.city,
            state: address.state,
            zip_code: address.zip_code,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al crear preferencia de pago');
      }

      setPreference(data.data);
      setStep(1);
    } catch (err) {
      setError(err.message);
      enqueueSnackbar(err.message, { variant: 'error' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // El usuario regresa de Mercado Pago
    // Verificar si el pago se completó
    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/leader/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.data?.leader?.kit_purchased) {
        setStep(2);
        enqueueSnackbar('¡Kit comprado exitosamente! Se enviará a tu dirección.', { variant: 'success' });
      } else {
        // El pago puede estar pendiente, mostrar mensaje
        enqueueSnackbar('Pago procesado. Verificando estado...', { variant: 'info' });
        setTimeout(() => window.location.reload(), 3000);
      }
    } catch (err) {
      enqueueSnackbar('Error verificando pago', { variant: 'error' });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!leader) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>No eres Líder Verificador</Typography>
        <Button variant="contained" component={Link} to="/registro">
          Postularme como Líder
        </Button>
      </Container>
    );
  }

  if (leader.kit_purchased) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="h6">¡Kit ya comprado!</Typography>
              <Typography>Tu kit de 5000 tarjetas QR fue comprado el {new Date(leader.kit_purchase_date).toLocaleDateString('es-MX')}.</Typography>
            </Alert>
            <Grid container spacing={2} justifyContent="center">
              <Grid item>
                <Typography variant="h5">{leader.kit_cards_received?.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">Tarjetas recibidas</Typography>
              </Grid>
              <Grid item>
                <Typography variant="h5">{leader.cards_distributed?.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">Distribuidas</Typography>
              </Grid>
              <Grid item>
                <Typography variant="h5" color="success.main">{(leader.kit_cards_received - leader.cards_distributed)?.toLocaleString()}</Typography>
                <Typography variant="body2" color="text.secondary">Disponibles</Typography>
              </Grid>
            </Grid>
            <Button variant="outlined" component={Link} to="/dashboard" sx={{ mt: 3 }}>
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Dirección de Envío</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              El kit se enviará a esta dirección. Asegúrate de que sea correcta.
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Calle"
                  value={address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Número"
                  value={address.number}
                  onChange={(e) => handleAddressChange('number', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Colonia"
                  value={address.colony}
                  onChange={(e) => handleAddressChange('colony', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Código Postal"
                  value={address.zip_code}
                  onChange={(e) => handleAddressChange('zip_code', e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={address.state}
                    label="Estado"
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                  >
                    {['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Coahuila', 'Colima', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'].map(e => (
                      <MenuItem key={e} value={e}>{e}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ciudad"
                  value={address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  required
                />
              </Grid>
            </Grid>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={createPreference}
                disabled={paymentLoading}
                startIcon={paymentLoading && <CircularProgress size={20} color="inherit" />}
              >
                {paymentLoading ? 'Creando preferencia...' : 'Continuar al Pago'}
              </Button>
            </Box>
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Pago con Mercado Pago</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Serás redirigido a Mercado Pago para completar el pago de forma segura.
            </Typography>
            <Divider sx={{ mb: 3 }} />
            {preference && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Resumen del Pedido</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography>Kit 5000 Tarjetas QR</Typography>
                      <Typography variant="h6" color="primary.main">{formatCurrency(preference.amount)}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography>Incluye envío</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {preference && (
                <Button
                  variant="contained"
                  size="large"
                  href={preference.initPoint}
                  target="_blank"
                  rel="noopener"
                  sx={{ flex: 1, minWidth: 200 }}
                >
                  Pagar con Mercado Pago ({formatCurrency(preference.amount)})
                </Button>
              )}
              <Button
                variant="outlined"
                size="large"
                onClick={() => setStep(0)}
                sx={{ flex: 1, minWidth: 200 }}
              >
                Cambiar Dirección
              </Button>
            </Box>
            <Alert severity="info" sx={{ mt: 3 }}>
              Después de completar el pago en Mercado Pago, serás redirigido automáticamente
              a la página de confirmación. Si no redirige, haz clic en "Verificar Pago" abajo.
            </Alert>
            <Button
              variant="outlined"
              size="large"
              onClick={handlePaymentSuccess}
              startIcon={<i className="material-icons">refresh</i>}
              sx={{ mt: 2 }}
            >
              Verificar Pago
            </Button>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="success">
              <Typography variant="h5" gutterBottom>¡Compra Confirmada!</Typography>
              <Typography>Tu kit de 5000 tarjetas QR ha sido comprado exitosamente.</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Se enviará a: {address.street} {address.number}, {address.colony}, {address.city}, {address.state} {address.zip_code}
              </Typography>
            </Alert>
            <Button variant="contained" size="large" component={Link} to="/dashboard" sx={{ mt: 3 }}>
              Ir al Dashboard
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {config.title} - Kit de Tarjetas
        </Typography>
      </Box>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card>
        <CardContent sx={{ px: 4, py: 3 }}>
          {renderStepContent()}
        </CardContent>
      </Card>
    </Container>
  );
};

export default LideresKit;