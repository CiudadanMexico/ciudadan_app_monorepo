import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Container, Grid, Typography, Card, CardContent, CardMedia, Button, Divider, Chip, Alert, Paper } from '@mui/material';
import { FUNDADORES_CIERRE, FUNDADORES_PRECIO_PROMO, PRECIO_ORDINARIO } from '../../components/Prelanzamiento/datos';

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount);
};

const FundadoresPage = () => {
  const diasRestantes = Math.max(0, Math.ceil((FUNDADORES_CIERRE - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <Container maxWidth="xl" sx={{ py: 6 }}>
      {/* Hero Section */}
      <Box sx={{ textAlign: 'center', mb: 6, px: 2 }}>
        <Chip
          label={`Cierre de promoción: ${formatDate(FUNDADORES_CIERRE)}`}
          size="large"
          color="warning"
          variant="outlined"
          sx={{ mb: 3, fontWeight: 600 }}
        />
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 800, mb: 2 }}>
          Campaña Fundadores 2026
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph sx={{ maxWidth: 800, mx: 'auto' }}>
          Sé parte de los primeros conductores en unirte a Ciudadan Taxis.
          Disfruta el <strong>primer mes gratis</strong> y <strong>12 mensualidades a $300 MXN</strong>
          antes del precio ordinario de $500 MXN/mes.
        </Typography>
        {diasRestantes > 0 && (
          <Alert severity="info" sx={{ maxWidth: 500, mx: 'auto', mt: 3 }}>
            <strong>Quedan {diasRestantes} días</strong> para aprovechar la promoción de fundadores.
          </Alert>
        )}
      </Box>

      {/* Beneficios Principales */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
          Beneficios Exclusivos para Fundadores
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent>
                <Box sx={{ fontSize: 48, fontWeight: 800, color: 'primary.main', mb: 1 }}>
                  {'$'}0
                </Box>
                <Typography variant="h6" gutterBottom>Primer Mes Gratis</Typography>
                <Typography variant="body2" color="text.secondary">
                  Sin cobro en tu primer mes de membresía
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent>
                <Box sx={{ fontSize: 48, fontWeight: 800, color: 'success.main', mb: 1 }}>
                  {'$'}300
                </Box>
                <Typography variant="h6" gutterBottom>12 Meses a $300</Typography>
                <Typography variant="body2" color="text.secondary">
                  Precio promocional fijo por tu primer año
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent>
                <Box sx={{ fontSize: 48, fontWeight: 800, color: 'warning.main', mb: 1 }}>
                  5
                </Box>
                <Typography variant="h6" gutterBottom>Viajes Gratis</Typography>
                <Typography variant="body2" color="text.secondary">
                  Hasta $100 MXN c/u, 1 por cuenta (QR o 5 anuncios)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent>
                <Box sx={{ fontSize: 48, fontWeight: 800, color: 'info.main', mb: 1 }}>
                  12 MSI
                </Box>
                <Typography variant="h6" gutterBottom>Pago a Meses</Typography>
                <Typography variant="body2" color="text.secondary">
                  Hasta 12 meses sin intereses con Mercado Pago
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Detalles de la Oferta */}
      <Box sx={{ mb: 6 }}>
        <Paper elevation={1} sx={{ p: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
            ¿Qué incluye tu membresía de Fundador?
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>✅ Tu membresía incluye:</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body1">• El 100% de cada viaje es para ti — sin comisiones</Typography>
                <Typography variant="body1">• Primer mes <strong>gratis</strong> (sin cargo alguno)</Typography>
                <Typography variant="body1">• 12 mensualidades a <strong>{formatCurrency(FUNDADORES_PRECIO_PROMO)}/mes</strong> (precio ordinario: {formatCurrency(PRECIO_ORDINARIO)}/mes)</Typography>
                <Typography variant="body1">• Acceso prioritario a la app de conductores</Typography>
                <Typography variant="body1">• Soporte dedicado por WhatsApp</Typography>
                <Typography variant="body1">• Participación en decisiones de la cooperativa</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>🎁 Beneficios extra:</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography variant="body1">• <strong>5 viajes gratis</strong> (hasta $100 MXN cada uno)</Typography>
                <Typography variant="body1">  - Canjeables con tarjeta QR física o viendo 5 anuncios</Typography>
                <Typography variant="body1">  - 1 viaje gratis por cuenta</Typography>
                <Typography variant="body1">• Pago a <strong>12 MSI</strong> con Mercado Pago</Typography>
                <Typography variant="body1">• Kit de 5000 tarjetas QR por $500 + envío (opcional, para líderes)</Typography>
                <Typography variant="body1">• Comisión 10% por cada conductor referido (si te haces líder)</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Cómo funciona */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
          ¿Cómo funciona?
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardMedia
                component="div"
                sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.light', color: 'white', fontSize: 48 }}
              >
                1
              </CardMedia>
              <CardContent>
                <Typography variant="h6" gutterBottom>Regístrate</Typography>
                <Typography variant="body2" color="text.secondary">
                  Completa el formulario antes del 13 de diciembre de 2026
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardMedia
                component="div"
                sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.light', color: 'white', fontSize: 48 }}
              >
                2
              </CardMedia>
              <CardContent>
                <Typography variant="h6" gutterBottom>Activa tu membresía</Typography>
                <Typography variant="body2" color="text.secondary">
                  Elige: Pagar ahora ($0 primer mes) o Pagar después (5 viajes gratis + 100 tarjetas QR)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardMedia
                component="div"
                sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.light', color: 'white', fontSize: 48 }}
              >
                3
              </CardMedia>
              <CardContent>
                <Typography variant="h6" gutterBottom>Conduce y gana</Typography>
                <Typography variant="body2" color="text.secondary">
                  El 100% de tus viajes es tuyo. Invita conductores y gana 10% como líder
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Modalidades de activación */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
          Dos modalidades de activación
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%', border: '2px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Chip label="PAGAR AHORA" color="primary" size="large" />
                </Box>
                <Typography variant="h6" gutterBottom>Membresía inmediata</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                  <Typography variant="body1">✅ Primer mes <strong>gratis</strong></Typography>
                  <Typography variant="body1">✅ 12 meses a <strong>{formatCurrency(FUNDADORES_PRECIO_PROMO)}/mes</strong></Typography>
                  <Typography variant="body1">✅ Acceso inmediato a la app</Typography>
                  <Typography variant="body1">❌ Sin viajes gratis iniciales</Typography>
                  <Typography variant="body1">❌ Sin tarjetas QR físicas</Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  component={Link}
                  to="/activatumembresia?mode=pay_now"
                >
                  Activar con Pagar Ahora
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%', border: '2px solid', borderColor: 'success.main' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Chip label="PAGAR DESPUÉS" color="success" size="large" />
                </Box>
                <Typography variant="h6" gutterBottom>Membresía diferida + beneficios</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                  <Typography variant="body1">✅ Primer mes <strong>gratis</strong></Typography>
                  <Typography variant="body1">✅ 12 meses a <strong>{formatCurrency(FUNDADORES_PRECIO_PROMO)}/mes</strong></Typography>
                  <Typography variant="body1">✅ <strong>5 viajes gratis</strong> (hasta $100 c/u)</Typography>
                  <Typography variant="body1">✅ <strong>100 tarjetas QR físicas</strong> para repartir</Typography>
                  <Typography variant="body1">✅ Pago primera cuota a los 30 días</Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  color="success"
                  component={Link}
                  to="/activatumembresia?mode=pay_later"
                >
                  Activar con Pagar Después
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Preguntas Frecuentes */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
          Preguntas Frecuentes
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>¿Hasta cuándo puedo registrarme?</Typography>
                <Typography variant="body1" color="text.secondary">
                  La campaña de fundadores cierra el <strong>{formatDate(FUNDADORES_CIERRE)}</strong>
                  (hora Ciudad de México). Después, el precio será el ordinario de {formatCurrency(PRECIO_ORDINARIO)}/mes.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>¿Qué pasa después del primer año?</Typography>
                <Typography variant="body1" color="text.secondary">
                  A partir del mes 13, la membresía se renueva al precio ordinario vigente
                  (actualmente {formatCurrency(PRECIO_ORDINARIO)}/mes). Te notificaremos con 30 días de antelación.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>¿Cómo funcionan los 5 viajes gratis?</Typography>
                <Typography variant="body1" color="text.secondary">
                  Al elegir "Pagar después", recibes 5 códigos de viaje gratis (hasta $100 MXN cada uno).
                  Se canjean escaneando la tarjeta QR física o viendo 5 anuncios en la app.
                  Límite: 1 viaje gratis por cuenta de pasajero.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>¿Puedo ser líder verificador?</Typography>
                <Typography variant="body1" color="text.secondary">
                  Sí. Cualquier conductor activo puede postularse como líder.
                  Ganas 10% de comisión por cada conductor que se registre con tu código/QR.
                  Kit de 5000 tarjetas: {'$'}500 + envío. Periodo de prueba: 15 días para 10 referidos.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* CTA Final */}
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Divider sx={{ mb: 4 }} />
        <Typography variant="h5" gutterBottom>
          ¿Listo para ser Fundador?
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
          Aparta tu lugar antes del 13 de diciembre de 2026 y asegura el precio de {'$'}300 MXN/mes
          durante tu primer año con el primer mes gratis.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/activatumembresia?mode=pay_now"
            sx={{ minWidth: 280 }}
          >
            Quiero Pagar Ahora (Primer mes gratis)
          </Button>
          <Button
            variant="outlined"
            size="large"
            color="success"
            component={Link}
            to="/activatumembresia?mode=pay_later"
            sx={{ minWidth: 280 }}
          >
            Quiero Pagar Después (5 viajes + 100 QR)
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
          Sin cobros en el registro. La incorporación está sujeta a revisión.
        </Typography>
      </Box>
    </Container>
  );
};

export default FundadoresPage;