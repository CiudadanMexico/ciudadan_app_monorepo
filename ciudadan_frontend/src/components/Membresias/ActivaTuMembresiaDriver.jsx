import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fmtMxn } from '../../utils/currency';
import { FUNDADORES_CIERRE, FUNDADORES_PRECIO_PROMO, FUNDADORES_MESES_PROMO, PRECIO_ORDINARIO } from '../../components/Prelanzamiento/datos';

const PLANES = [
  {
    id: 'normal',
    nombre: 'Normal',
    precio: 500,
    descripcion: 'Membresía estándar para conductores',
    requierePromo: false,
  },
  {
    id: 'promo',
    nombre: 'Fundadores',
    precio: 300,
    descripcion: 'Precio promocional por 12 meses + primer mes gratis',
    requierePromo: true,
    badge: 'Solo fundadores elegibles',
    promoInfo: 'Después del año promocional, la membresía pasa a $500 MXN/mes.',
  },
];

const MODOS_ACTIVACION = [
  {
    id: 'pay_now',
    titulo: 'Pagar ahora',
    descripcion: 'Activas tu membresía hoy mismo',
    beneficios: [
      'Membresía activa inmediatamente',
      'Próximo cobro en 1 mes',
      'Sin viajes gratis incluidos',
    ],
    icon: '💳',
  },
  {
    id: 'pay_later',
    titulo: 'Pagar después (en 1 mes)',
    descripcion: 'Empiezas a conducir hoy, pagas al mes',
    beneficios: [
      'Membresía en estado "pendiente" por 1 mes',
      'Primer cobro en 30 días',
      '5 viajes gratis (hasta $100 c/u) + 100 tarjetas QR físicas',
    ],
    icon: '🎁',
    recomendado: true,
  },
];

export default function ActivaTuMembresiaDriver() {
  const { user, isAuthenticated, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedPlan, setSelectedPlan] = useState('promo');
  const [selectedMode, setSelectedMode] = useState('pay_later');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [membershipCreated, setMembershipCreated] = useState(null);
  const [promoEligible, setPromoEligible] = useState(null);
  const [checkingPromo, setCheckingPromo] = useState(true);
  const [driverData, setDriverData] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  const [leaderId, setLeaderId] = useState(null);

  const strapiUrl = (process.env.REACT_APP_STRAPI_URL || '').replace(/\/$/, '');

  // Leer parámetros de referido de la URL (desde QR de líder)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    const leader = params.get('leader');
    if (ref) setReferralCode(ref);
    if (leader) setLeaderId(leader);
  }, [location.search]);

  // Verificar elegibilidad promo del conductor
  const checkPromoEligibility = useCallback(async () => {
    if (!user?.email || !strapiUrl) {
      setPromoEligible(false);
      setCheckingPromo(false);
      return;
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      const response = await fetch(`${strapiUrl}/api/drivers?filters[email][$eq]=${encodeURIComponent(user.email)}&populate=*`, { headers });
      if (!response.ok) throw new Error('No se pudo verificar elegibilidad');

      const data = await response.json();
      const drivers = data?.data || data || [];
      const driver = Array.isArray(drivers) ? drivers[0] : drivers;

      if (driver) {
        setDriverData(driver);
        setPromoEligible(driver.promo_eligible === true);
      } else {
        setPromoEligible(false);
      }
    } catch (err) {
      console.warn('Error verificando elegibilidad promo:', err);
      setPromoEligible(false);
    } finally {
      setCheckingPromo(false);
    }
  }, [user?.email, strapiUrl]);

  useEffect(() => {
    checkPromoEligibility();
  }, [checkPromoEligibility]);

  const planSeleccionado = PLANES.find(p => p.id === selectedPlan);
  const modoSeleccionado = MODOS_ACTIVACION.find(m => m.id === selectedMode);
  const esPromoValida = planSeleccionado?.id === 'promo' && promoEligible === true;
  const precioFinal = planSeleccionado?.precio || 0;
  const yaCerrado = Date.now() >= FUNDADORES_CIERRE;

  const handleCreateMembership = async () => {
    if (!isAuthenticated || !user?.email) {
      loginWithRedirect({ appState: { returnTo: location.pathname + location.search + location.hash } });
      return;
    }

    if (planSeleccionado?.id === 'promo' && !esPromoValida) {
      setError('No eres elegible para el plan Fundadores. Selecciona el plan Normal.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch(`${strapiUrl}/api/driver-membership/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plan: selectedPlan,
          activationMode: selectedMode,
          referralCode: referralCode,
          leaderId: leaderId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || data?.message || 'Error creando membresía');
      }

      const membership = data?.data?.membership;
      setMembershipCreated(membership);
      setSuccess(true);

      // Redirigir a Mercado Pago para pagar
      if (membership) {
        await redirectToMercadoPago(membership.id, token);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error al crear la membresía. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const redirectToMercadoPago = async (membershipId, token) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const response = await fetch(`${strapiUrl}/api/driver-membership/preference`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          membershipId,
          backUrl: window.location.origin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || data?.message || 'Error creando preferencia de pago');
      }

      const initPoint = data?.data?.initPoint || data?.data?.sandboxInitPoint;
      if (initPoint) {
        // Guardar referencia para webhook
        try {
          sessionStorage.setItem('mp_driver_membership_id', membershipId);
        } catch {}
        window.location.href = initPoint;
      } else {
        throw new Error('Mercado Pago no devolvió URL de pago');
      }
    } catch (err) {
      console.error('Error redirigiendo a MP:', err);
      setError('Membresía creada pero error al redirigir a pago: ' + err.message);
    }
  };

  if (checkingPromo) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 4, px: { xs: 2, md: 4 }, background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)', color: '#fff' }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4, pt: 2 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, background: 'linear-gradient(90deg, #fff200, #ffd500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Activa tu Membresía
          </Typography>
          <Typography variant="h6" sx={{ color: '#aaa', fontWeight: 400 }}>
            El 100% de tus viajes son para ti. Sin comisiones.
          </Typography>
        </Box>

        {/* Alertas */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(124, 29, 40, 0.4)', color: '#FFDAD6' }}>
            {error}
          </Alert>
        )}

        {success && membershipCreated && (
          <Alert severity="success" sx={{ mb: 3, bgcolor: 'rgba(76, 175, 80, 0.2)', color: '#A5D6A7' }}>
            ¡Membresía creada! Redirigiendo a Mercado Pago para completar el pago...
          </Alert>
        )}

        {/* Selector de Plan */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>1. Elige tu plan</Typography>
          <Grid container spacing={3}>
            {PLANES.map((plan) => (
              <Grid item xs={12} md={6} key={plan.id}>
                <Card
                  sx={{
                    height: '100%',
                    border: selectedPlan === plan.id ? '2px solid #fff200' : '1px solid rgba(255,255,255,0.1)',
                    background: selectedPlan === plan.id ? 'rgba(255,242,0,0.08)' : 'rgba(255,255,255,0.03)',
                    boxShadow: selectedPlan === plan.id ? '0 0 20px rgba(255,242,0,0.15)' : 'none',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (plan.id === 'promo' && !promoEligible && !yaCerrado) return;
                    setSelectedPlan(plan.id);
                    setError(null);
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                      <Box sx={{
                        width: 56, height: 56, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: selectedPlan === plan.id ? 'linear-gradient(135deg, #fff200, #ffd500)' : 'rgba(255,255,255,0.05)',
                        color: selectedPlan === plan.id ? '#000' : '#fff200',
                        fontWeight: 900, fontSize: '1.5rem',
                      }}>
                        {plan.id === 'promo' ? '★' : '◆'}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff' }}>
                            {plan.nombre}
                          </Typography>
                          {plan.badge && (
                            <Chip label={plan.badge} size="small" variant="outlined" sx={{ borderColor: '#fff200', color: '#fff200' }} />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ color: '#aaa' }}>{plan.descripcion}</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: 'center', py: 2, mb: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                      <Typography variant="h2" sx={{ fontWeight: 900, color: '#fff200' }}>
                        ${fmtMxn(plan.precio)} <Typography variant="body2" sx={{ color: '#888', fontWeight: 400 }}>MXN/mes</Typography>
                      </Typography>
                    </Box>

                    {plan.promoInfo && (
                      <Typography variant="caption" sx={{ color: '#888', display: 'block', textAlign: 'center' }}>
                        {plan.promoInfo}
                      </Typography>
                    )}

                    {plan.id === 'promo' && !promoEligible && !yaCerrado && (
                      <Alert severity="info" sx={{ mt: 2, bgcolor: 'rgba(255,242,0,0.15)', color: '#fff200' }}>
                        Requiere elegibilidad de fundador (registro antes del 13 dic 2026)
                      </Alert>
                    )}

                    {plan.id === 'promo' && yaCerrado && (
                      <Alert severity="warning" sx={{ mt: 2, bgcolor: 'rgba(255,152,0,0.15)', color: '#FFB74D' }}>
                        Campaña de fundadores finalizada (13 dic 2026)
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ mb: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

        {/* Selector de Modo de Activación */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>2. Elige cómo activar</Typography>
          <Grid container spacing={3}>
            {MODOS_ACTIVACION.map((modo) => (
              <Grid item xs={12} md={6} key={modo.id}>
                <Card
                  sx={{
                    height: '100%',
                    border: selectedMode === modo.id ? '2px solid #fff200' : '1px solid rgba(255,255,255,0.1)',
                    background: selectedMode === modo.id ? 'rgba(255,242,0,0.08)' : 'rgba(255,255,255,0.03)',
                    boxShadow: selectedMode === modo.id ? '0 0 20px rgba(255,242,0,0.15)' : 'none',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                  onClick={() => { setSelectedMode(modo.id); setError(null); }}
                >
                  {modo.recomendado && (
                    <Chip
                      label="RECOMENDADO"
                      size="small"
                      color="secondary"
                      sx={{
                        position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                        background: '#fff200', color: '#000', fontWeight: 800, zIndex: 1,
                      }}
                    />
                  )}
                  <CardContent sx={{ p: 3, pt: modo.recomendado ? 4 : 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                      <Typography variant="h1" sx={{ lineHeight: 1 }}>{modo.icon}</Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', mb: 0.5 }}>
                          {modo.titulo}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#aaa' }}>{modo.descripcion}</Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      {modo.beneficios.map((beneficio, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#ddd' }}>
                          <Box sx={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #fff200', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: '#fff200', fontWeight: 800 }}>✓</Typography>
                          </Box>
                          <Typography variant="body2">{beneficio}</Typography>
                        </Box>
                      ))}
                    </Box>

                    <RadioGroup value={selectedMode} onChange={(e) => { setSelectedMode(e.target.value); setError(null); }}>
                      <FormControlLabel
                        value={modo.id}
                        control={<Radio color="warning" sx={{ '&.Mui-checked': { color: '#fff200' }}} />}
                        label="Seleccionar"
                        labelPlacement="end"
                        disabled={loading}
                      />
                    </RadioGroup>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ mb: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

        {/* Resumen y Botón de Acción */}
        <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,242,0,0.3)' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, textAlign: 'center', color: '#fff200' }}>
              Resumen de tu selección
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#888' }}>Plan</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
                  {planSeleccionado?.nombre} — ${fmtMxn(precioFinal)}/mes
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#888' }}>Modo de activación</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
                  {modoSeleccionado?.titulo}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#888' }}>Estado inicial</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: selectedMode === 'pay_now' ? '#4CAF50' : '#FFB74D' }}>
                  {selectedMode === 'pay_now' ? 'Activa ✓' : 'Pendiente (se activa al pagar en 30 días)'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#888' }}>Viajes gratis</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: selectedMode === 'pay_later' ? '#4CAF50' : '#fff' }}>
                  {selectedMode === 'pay_later' ? '5 viajes (hasta $100 c/u) + 100 tarjetas QR' : 'Ninguno'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#888' }}>Primer cobro</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>
                  {selectedMode === 'pay_now' ? 'Hoy' : 'En 30 días'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" sx={{ color: '#888' }}>Promo fundadores</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: esPromoValida ? '#4CAF50' : '#FFB74D' }}>
                  {esPromoValida ? `Sí (${FUNDADORES_MESES_PROMO} meses a $${FUNDADORES_PRECIO_PROMO} + 1er mes gratis)` : 'No aplica'}
                </Typography>
              </Grid>
            </Grid>

            {modoSeleccionado?.id === 'pay_later' && (
              <Accordion sx={{ mb: 3, border: '1px solid rgba(255,242,0,0.3)', borderRadius: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon color="#fff200" />} sx={{ background: 'rgba(255,242,0,0.05)' }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: '#fff200' }}>
                    ¿Cómo funcionan los 5 viajes gratis + 100 tarjetas QR?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      • Al elegir "Pagar después", tu membresía queda en estado <strong>pendiente</strong> por 30 días.
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      • Recibes <strong>5 viajes gratis</strong> (descuento de hasta $100 MXN cada uno, 1 por cuenta).
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      • Te enviamos <strong>100 tarjetas QR físicas</strong> a tu domicilio (envío incluido) para que tus pasajeros canjeen viajes gratis.
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      • Cada tarjeta QR tiene validez de 30 días y se canjea escaneando o en <code>/viaje-gratis</code>.
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      • El primer cobro de tu membresía ($${precioFinal} MXN) se procesa automáticamente a los 30 días vía Mercado Pago.
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      • Si el pago falla, la membresía pasa a <strong>past_due</strong> y tienes 3 reintentos antes de cancelarse.
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}

            <Button
              fullWidth
              size="large"
              variant="contained"
              sx={{
                py: 2, fontSize: '1.1rem', fontWeight: 800,
                background: 'linear-gradient(135deg, #fff200 0%, #ffd500 100%)',
                color: '#000', '&:hover': { background: 'linear-gradient(135deg, #ffea00 0%, #ffe000 100%)' },
                boxShadow: '0 8px 30px rgba(255,242,0,0.3)',
                borderRadius: 3,
              }}
              onClick={handleCreateMembership}
              disabled={loading || (planSeleccionado?.id === 'promo' && !esPromoValida && !yaCerrado)}
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1.5, color: '#000' }} />
                  Creando membresía...
                </>
              ) : (
                `Crear membresía y pagar ${selectedMode === 'pay_now' ? 'ahora' : 'en 30 días'} · ${fmtMxn(precioFinal)} MXN/mes`
              )}
            </Button>

            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: '#888', lineHeight: 1.6 }}>
              Te redirigiremos a <strong>Mercado Pago</strong> para completar el pago de forma segura.
              Puedes pagar con tarjeta, efectivo en tiendas (OXXO, 7-Eleven), SPEI o saldo MP.
              {'\n'}Al terminar, volverás automáticamente a Ciudadan.
            </Typography>
          </CardContent>
        </Card>

        {/* Info adicional */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#666' }}>
            ¿Preguntas? Escríbenos a
            <a href="mailto:soporte@ciudadan.org" sx={{ color: '#fff200', textDecoration: 'none', fontWeight: 600 }}>soporte@ciudadan.org</a>
            {' '}o únete a nuestra
            <a href="https://chat.whatsapp.com" target="_blank" rel="noopener" sx={{ color: '#fff200', textDecoration: 'none', fontWeight: 600, ml: 1 }}>comunidad de WhatsApp</a>
          </Typography>
        </Box>

      </Box>
    </Box>
  );
}