// src/pages/PromueveMembresias.jsx
import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import StarIcon from '@mui/icons-material/Star';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { useNavigate } from 'react-router-dom';
import promueveGif from '../../assets/promueve.gif';
import ShareButton from '../../components/ShareButton.jsx';

export default function PromueveMembresias() {
  const navigate = useNavigate();

  const beneficios = [
    {
      icon: <StarIcon fontSize="large" sx={{ color: '#00ff88' }} />,
      title: 'Recompensas Exclusivas',
      description:
        'Gana puntos y beneficios por cada referido que active su membresía. Canjea por descuentos y servicios premium.',
    },
    {
      icon: <MonetizationOnIcon fontSize="large" sx={{ color: '#00ffa6' }} />,
      title: 'Gana Dinero Recurrente',
      description:
        'Cada referido puede generar ingresos mes a mes: comisiones que se pagan mientras el referido mantenga su membresía.',
    },
    {
      icon: <ShareIcon fontSize="large" sx={{ color: '#00ffc3' }} />,
      title: 'Comparte con Facilidad',
      description:
        'Te damos un enlace y un QR único que puedes compartir por WhatsApp, redes o en tu local para convertir tráfico en comisiones.',
    },
  ];

  return (
    <Box
      sx={{
        p: { xs: 3, md: 6 },
        minHeight: '100vh',
        backgroundImage: `url(/fondo-cannabis.png)`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        // overlay gradient + blend for efecto similar al anterior
        backgroundBlendMode: 'overlay',
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        justifyContent: 'center',
        marginBottom: "-40px",
        alignItems: 'flex-start',
        '@keyframes neonBreath': {
          '0%': { boxShadow: '0 0 10px rgba(0,255,150,0.06)' },
          '50%': { boxShadow: '0 0 30px rgba(0,255,150,0.09)' },
          '100%': { boxShadow: '0 0 10px rgba(0,255,150,0.06)' },
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 1200,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(245,255,250,0.92))',
          borderRadius: 3,
          p: { xs: 3, md: 5 },
          mt: '-20px',
          boxShadow: '0 10px 40px rgba(0,255,150,0.12)',
          position: 'relative',
          zIndex: 10,
          overflow: 'visible',
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                mb: 1,
                background: 'linear-gradient(90deg,#00ffa6,#00ffdd)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Promueve las Membresías Ciudadan.org y cobra jugosas comisiones !!
            </Typography>

            <Typography variant="subtitle1" sx={{ mb: 2, color: '#004d26' }}>
              Convierte tu red en ingresos recurrentes: comparte tu Código Promocional, refiere amigos y gana cada mes mientras tus referidos conserven su membresía con un 10% de descuento.
            </Typography>

            <Box
              sx={{
                backgroundColor: 'rgba(230,255,240,0.98)',
                borderLeft: '6px solid #00ff88',
                p: 2,
                borderRadius: 1,
                mb: 3,
                color: '#003300',
                textAlign: 'justify',
              }}
            >
              <Typography variant="body1" sx={{ mb: 1 }}>
                📣 <b>¿Cómo funciona?</b> Te damos un <b>Código Promocional</b> para que lo compartas. Cada persona que se suscriba usando tu código será registrada como tu referido y te generará comisiones cada mes.
              </Typography>

              <Typography variant="body1" sx={{ mt: 1 }}>
                💸 <b>Sin membresía:</b> ganas <b>$5 a $10 MXN</b> por cada referido activo.  
                Estas comisiones son <b>recurrentes y mensuales</b>: mientras tu referido mantenga su suscripción, tú sigues cobrando cada mes.
              </Typography>

              <Typography variant="body1" sx={{ mt: 1 }}>
                🏆 <b>Con membresía:</b> multiplica tus ganancias: <b>$10 a $15 MXN</b> por referido activo, cada mes. Tener membresía te coloca en un escalón preferente (más ingresos, más beneficios).
              </Typography>

              <Typography variant="body2" sx={{ mt: 1, color: '#004d26' }}>
                Ejemplo: si refieres 10 personas con membresía y permanecen 3 meses, podrías haber cobrado entre <b>$300 y $450 MXN</b> acumulados en ese periodo (y seguir cobrando cada mes mientras sigan activos).
              </Typography>

              <Button
                variant="outlined"
                onClick={() => navigate('/membresias')}
                sx={{
                  borderColor: '#00ff88',
                  color: '#004d26',
                  fontWeight: 700,
                  px: 3,
                  py: 1.1,
                  '&:hover': {
                    backgroundColor: 'rgba(0,255,136,0.06)',
                    borderColor: '#00ff99',
                  },
                  mt: 3,
                }}
              >
                Adquiere tu membresía
              </Button>
            </Box>

            <Typography variant="h6" sx={{ mb: 2, color: '#006633', fontWeight: 700 }}>
              ¿Por qué conviene promoverlo?
            </Typography>

            <Typography variant="body1" sx={{ mb: 2, textAlign: 'justify' }}>
              - Es simple: comparte tu QR o enlace, recibe referidos y observa cómo tus ingresos se acumulan de forma pasiva.  
              - Es recurrente: cada referido activo aporta cada mes, por eso la primera fase de referir es la que construye el ingreso pasivo.  
              - Es legal y transparente: todas las comisiones y movimientos quedan registrados en tu panel; puedes descargar reportes y constancias.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<QrCode2Icon />}
                onClick={() => navigate('/referir')}
                sx={{
                  background: 'linear-gradient(90deg,#00ffa6,#00ffdd)',
                  color: '#000',
                  fontWeight: 800,
                  px: 3,
                  py: 1.2,
                  boxShadow: '0 10px 30px rgba(0,255,150,0.18)',
                  '&:hover': {
                    background: 'linear-gradient(90deg,#00ffcc,#00ffaa)',
                    boxShadow: '0 12px 40px rgba(0,255,150,0.28)',
                  },
                }}
              >
                Generar QR y Referir
              </Button>

              
            </Box>

            <Divider sx={{ my: 4 }} />

            <Grid container spacing={2}>
              {beneficios.map((b, idx) => (
                <Grid item xs={12} sm={4} key={idx}>
                  <Card
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(240,255,245,0.9))',
                      border: '1px solid rgba(0,255,150,0.06)',
                      boxShadow: '0 6px 18px rgba(0,255,150,0.04)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>{b.icon}</Box>
                    <CardContent sx={{ py: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#006633' }}>
                        {b.title}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {b.description}
                      </Typography>
                    </CardContent>
                    <Box sx={{ pt: 1, textAlign: 'center' }}>
                      <Button
                        variant="text"
                        onClick={() => navigate('/referir')}
                        sx={{
                          color: '#00ff88',
                          fontWeight: 700,
                        }}
                      >
                        Invitar ahora
                      </Button>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid
            item
            xs={12}
            md={5}
            sx={{
              display: 'flex',
              justifyContent: { xs: 'center', md: 'flex-end' },
              alignItems: 'flex-start',
            }}
          >
            <Box
              component="img"
              src={promueveGif}
              alt="Promueve Membresías"
              sx={{
                width: { xs: '72%', sm: '64%', md: 520 },
                maxWidth: { xs: '72%', sm: 480, md: 700 },
                borderRadius: 3,
                boxShadow: '0 20px 60px rgba(0,255,150,0.14)',
                transform: { xs: 'translateY(-6px)', md: 'none' },
              }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 5, color: '#004d26', textAlign: 'center' }}>
          <Typography variant="caption">
            * Las cantidades son orientativas y pueden variar según promociones, tipo de membresía y condiciones. Todas las comisiones aparecen detalladas en tu panel.
          </Typography>
        </Box>

        <ShareButton />
      </Box>
    </Box>
  );
}
