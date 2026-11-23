import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Container, Card, CardContent, CardHeader, Typography, Button, Alert, CircularProgress, Grid, Divider, Chip, IconButton } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useSubdomain } from '../../Contexts/SubdomainContext';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import QrCodeIcon from '@mui/icons-material/QrCode';

const LideresQR = () => {
  const { getAccessTokenSilently, user } = useAuth0();
  const { enqueueSnackbar } = useSnackbar();
  const { config } = useSubdomain();

  const [leader, setLeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderQR();
  }, []);

  const fetchLeaderQR = async () => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      const response = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/leader/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/registro';
          return;
        }
        throw new Error('Error al cargar información del líder');
      }

      const data = await response.json();
      if (data.data?.leader) {
        setLeader(data.data.leader);
      } else {
        throw new Error('No se encontró información del líder');
      }
    } catch (err) {
      setError(err.message);
      enqueueSnackbar(err.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      enqueueSnackbar(`${label} copiado al portapapeles`, { variant: 'success' });
    }).catch(() => {
      enqueueSnackbar(`Error al copiar ${label}`, { variant: 'error' });
    });
  };

  const downloadQR = () => {
    if (!leader?.qr_image) return;
    const link = document.createElement('a');
    link.href = leader.qr_image;
    link.download = `qr-lider-${leader.referral_code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Descargando QR...', { variant: 'info' });
  };

  const shareQR = async () => {
    if (!leader?.qr_code) return;

    const shareData = {
      title: 'Mi código de referido - Ciudadan',
      text: `Únete a Ciudadan con mi código de referido: ${leader.referral_code}`,
      url: leader.qr_code,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        enqueueSnackbar('Compartido correctamente', { variant: 'success' });
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard(leader.qr_code, 'Enlace QR');
        }
      }
    } else {
      copyToClipboard(leader.qr_code, 'Enlace QR');
    }
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

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={fetchLeaderQR} variant="contained">Reintentar</Button>
      </Container>
    );
  }

  if (!leader) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>No hay información de líder</Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          No se pudo cargar la información de tu QR.
        </Typography>
        <Button variant="contained" onClick={fetchLeaderQR}>
          Reintentar
        </Button>
      </Container>
    );
  }

  const qrUrl = leader.qr_code;
  const qrImage = leader.qr_image;
  const referralCode = leader.referral_code;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          {config.title}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Tu código QR personalizado para reclutar conductores
        </Typography>
      </Box>

      {/* Código de Referido */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Código de Referido" />
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <Typography variant="h4" sx={{ fontFamily: 'monospace', letterSpacing: 2, fontWeight: 700 }}>
              {referralCode}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={() => copyToClipboard(referralCode, 'Código de referido')}
            >
              Copiar Código
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Comparte este código con conductores para que se registren bajo tu referencia.
            Ganas 10% de comisión sobre sus membresías activadas.
          </Typography>
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Código QR Personalizado" />
        <CardContent>
          {qrImage && (
            <Box sx={{ textAlign: 'center', my: 3 }}>
              <img
                src={qrImage}
                alt={`QR Código ${referralCode}`}
                style={{ width: 280, height: 280, borderRadius: 2 }}
              />
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadQR}
              disabled={!qrImage}
            >
              Descargar QR
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={shareQR}
            >
              Compartir
            </Button>
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={() => copyToClipboard(qrUrl, 'Enlace QR')}
            >
              Copiar Enlace
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Los conductores escanean este QR y son dirigidos directamente a la activación de membresía con tu código de referido.
          </Typography>
        </CardContent>
      </Card>

      {/* Enlace directo */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Enlace Directo" />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'stretch' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ flex: 1, textAlign: 'left', px: 1, py: 1, background: 'rgba(0,0,0,0.04)', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {qrUrl}
              </Box>
              <IconButton
                size="small"
                onClick={() => copyToClipboard(qrUrl, 'Enlace QR')}
                aria-label="Copiar enlace"
              >
                <ContentCopyIcon />
              </IconButton>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Este enlace lleva directamente a la página de activación de membresía con tu código de referido aplicado.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card>
        <CardHeader title="Cómo funciona" />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Chip label="1" color="primary" size="small" variant="outlined" sx={{ flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" fontWeight={600}>Comparte tu código o QR</Typography>
                <Typography variant="body2" color="text.secondary">
                  Envía tu código {referralCode} o comparte el QR por WhatsApp, redes sociales o imprímelo.
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Chip label="2" color="primary" size="small" variant="outlined" sx={{ flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" fontWeight={600}>El conductor escanea o entra al enlace</Typography>
                <Typography variant="body2" color="text.secondary">
                  Al escanear el QR o entrar al enlace, el conductor llega a la página de activación de membresía con tu código ya aplicado.
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Chip label="3" color="primary" size="small" variant="outlined" sx={{ flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" fontWeight={600}>El conductor activa su membresía</Typography>
                <Typography variant="body2" color="text.secondary">
                  El conductor elige su plan y modo de activación. Su registro queda vinculado a ti automáticamente.
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Chip label="4" color="primary" size="small" variant="outlined" sx={{ flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" fontWeight={600}>Ganas 10% de comisión</Typography>
                <Typography variant="body2" color="text.secondary">
                  Cuando el conductor paga su membresía, recibes el 10% del monto como comisión.
                  Se acumula en tu dashboard y se paga mensualmente.
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default LideresQR;