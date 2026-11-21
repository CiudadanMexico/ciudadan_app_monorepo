import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Container, Card, CardContent, CardHeader, Typography, Button, Alert, Divider, Grid, Stepper, Step, StepLabel, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useSubdomain } from '../../Contexts/SubdomainContext';

const SociosPagoCuota = () => {
  const { getAccessTokenSilently } = useAuth0();
  const { enqueueSnackbar } = useSnackbar();
  const { config } = useSubdomain();
  const navigate = useNavigate();

  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [preference, setPreference] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState(null);

  const steps = ['Detalles de Cuota', 'Pago', 'Confirmación'];

  useEffect(() => {
    fetchPartner();
  }, []);

  const fetchPartner = async () => {
    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/state-partner/me`, {
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
        throw new Error('Error al cargar datos del socio');
      }

      const data = await response.json();
      if (data.data?.isStatePartner) {
        setPartner(data.data.partner);
        if (data.data.partner.status === 'active') {
          setStep(2); // Ya pagado
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

  const createPreference = async () => {
    setPaymentLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/state-partner/entry-fee/preference`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partnerId: partner.id,
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
    try {
      const token = await getAccessTokenSilently();

      const response = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/state-partner/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.data?.partner?.status === 'active') {
        setStep(2);
        setPartner(data.data.partner);
        enqueueSnackbar('¡Cuota pagada exitosamente! Tu estado ha sido activado.', { variant: 'success' });
      } else {
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

  if (!partner) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>No eres Socio Estatal</Typography>
        <Button variant="contained" component={Link} to="/registro">
          Postularme como Socio Estatal
        </Button>
      </Container>
    );
  }

  if (partner.status === 'active') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>¡Estado Activado!</Typography>
              <Typography>Tu cuota de ingreso de {formatCurrency(partner.entry_fee_mxn)} fue pagada el {new Date(partner.entry_fee_paid_at).toLocaleDateString('es-MX')}.</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Método: {partner.entry_fee_payment_method} | MSI: {partner.entry_fee_msi_months > 0 ? partner.entry_fee_msi_months + ' meses' : 'Pago único'}
              </Typography>
            </Alert>
            <Button variant="contained" size="large" component={Link} to="/dashboard" sx={{ mt: 2 }}>
              Ir al Dashboard
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
            <Typography variant="h6" gutterBottom>Detalles de la Cuota de Ingreso</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Para activar tu estado como Socio Estatal, debes completar el pago de la cuota de ingreso.
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography color="text.secondary">Estado</Typography>
                    <Typography variant="h6">{partner.state}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography color="text.secondary">Empresa</Typography>
                    <Typography variant="h6">{partner.company_name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography color="text.secondary">Cuota de Ingreso</Typography>
                    <Typography variant="h5" color="primary.main">{formatCurrency(partner.entry_fee_mxn)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography color="text.secondary">Meses Sin Intereses</Typography>
                    <Typography variant="h6">{partner.entry_fee_msi_months > 0 ? partner.entry_fee_msi_months + ' meses' : 'Pago único'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography color="text.secondary">Comisión sobre membresías</Typography>
                    <Typography variant="h6">{partner.commission_pct}%</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={createPreference}
                disabled={paymentLoading}
                startIcon={paymentLoading && <CircularProgress size={20} color="inherit" />}
              >
                {paymentLoading ? 'Creando preferencia...' : 'Proceder al Pago'}
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
                  <Typography variant="h6" gutterBottom>Resumen del Pago</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography>Cuota de Ingreso - Socio Estatal {partner.state}</Typography>
                      <Typography variant="h6" color="primary.main">{formatCurrency(partner.entry_fee_mxn)}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography>MSI: {partner.entry_fee_msi_months > 0 ? partner.entry_fee_msi_months + ' meses' : 'Pago único'}</Typography>
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
                  Pagar con Mercado Pago ({formatCurrency(partner.entry_fee_mxn)})
                </Button>
              )}
              <Button
                variant="outlined"
                size="large"
                onClick={() => setStep(0)}
                sx={{ flex: 1, minWidth: 200 }}
              >
                Volver
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
              <Typography variant="h5" gutterBottom>¡Pago Confirmado!</Typography>
              <Typography>Tu cuota de ingreso ha sido pagada exitosamente.</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Tu estado {partner.state} ha sido activado como Socio Estatal.
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
          {config.title} - Pago de Cuota
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

export default SociosPagoCuota;