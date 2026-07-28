import React from 'react';
import { Box, Typography, Grid, Card, CardContent, Button, Link, IconButton } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ShareIcon from '@mui/icons-material/Share';
import CampaignIcon from '@mui/icons-material/Campaign';
import { motion } from 'framer-motion';
import LocalPlayer from '../../components/utils/LocalPlayer.jsx';
import influencers from '../../assets/videos/influencers.mp4';
import influencerGif from '../../assets/influencer.gif';

const MotionBox = motion(Box);

export default function GeneraContenidos() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: { xs: 4, md: 2 },
        px: { xs: 3, md: 6 },
        background: 'linear-gradient(180deg,#030804 0%, #0a0f0a 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <MotionBox
        animate={{
          background: [
            'radial-gradient(circle at 20% 20%, rgba(166,255,0,0.08), transparent 60%)',
            'radial-gradient(circle at 80% 80%, rgba(194,96,255,0.08), transparent 60%)',
            'radial-gradient(circle at 50% 50%, rgba(0,255,209,0.06), transparent 60%)'
          ]
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: 'mirror' }}
        sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
      />

      <MotionBox
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        sx={{
          width: '100%',
          maxWidth: 1100,
          borderRadius: 4,
          p: { xs: 3, md: 5 },
          background: 'rgba(10,15,10,0.85)',
          border: '1px solid rgba(0,255,136,0.3)',
          boxShadow: '0 0 30px rgba(0,255,136,0.25)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={7}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                mb: 2,
                lineHeight: 1.05,
                background: 'linear-gradient(90deg,#C260FF,#A6FF00,#00FFD1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: { xs: '1.9rem', md: '2.8rem' },
                textShadow: '0 0 12px rgba(166,255,0,0.25)',
              }}
            >
              ¿Te gusta crear contenido o compartir conocimiento?
            </Typography>

            <Typography variant="h6" sx={{ mb: 1, color: '#C0FFC0', fontWeight: 700 }}>
              ¿Eres comunicativo, carismático o sociable?
            </Typography>

            <Typography variant="body1" sx={{ mb: 3, color: '#A6FF00', fontWeight: 500 }}>
              ¿Amas la cultura 4:20 y su difusión?
            </Typography>

            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                background: 'linear-gradient(180deg, rgba(194,96,255,0.1), rgba(166,255,0,0.05))',
                border: '1px solid rgba(166,255,0,0.25)',
                boxShadow: '0 0 20px rgba(194,96,255,0.2)'
              }}
            >
              <CardContent>
                <Typography variant="body1" sx={{ color: '#F2FFF2', mb: 1.5 }}>
                  Monetiza tu pasión con{' '}
                  <Link href="" underline="hover" sx={{ color: '#A6FF00', fontWeight: 700 }}>
                    ciudadan.org
                  </Link>{' '}
                  ganando de <strong>15 a 25 pesos mensuales</strong> por cada usuario que adquiera su membresía usando tu código de descuento.
                </Typography>

                <Typography variant="body2" sx={{ color: '#C260FF' }}>
                  Si además adquieres tu membresía tus ganancias son mayores. Solicita una entrevista e intégrate ya al equipo de Ciudadan.org
                </Typography>

                <Typography variant="caption" sx={{ color: '#00FFD1', display: 'block', mt: 2 }}>
                  Cultivando derechos — cosechando comunidad.
                </Typography>

                <Typography variant="body2" sx={{ color: '#F2FFF2', mt: 2 }}>
                  De acuerdo a su compromiso y calidad, la remuneración irá de <strong>15 a 25 pesos</strong>. Se realizará una entrevista para conocer su propuesta y portafolio.
                </Typography>

                <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <MotionBox whileHover={{ scale: 1.05 }}>
                    <Button
                      href="http://ciudadan.org"
                      target="_blank"
                      variant="contained"
                      size="large"
                      startIcon={<CampaignIcon />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 800,
                        background: 'linear-gradient(90deg,#A6FF00,#00FFD1)',
                        color: '#051322',
                        boxShadow: '0 0 20px rgba(166,255,0,0.4)',
                        '&:hover': {
                          boxShadow: '0 0 35px rgba(166,255,0,0.6)',
                          background: 'linear-gradient(90deg,#C260FF,#A6FF00)'
                        }
                      }}
                    >
                      Solicitar Entrevista
                    </Button>
                  </MotionBox>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <MotionBox
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              sx={{ display: 'grid', gap: 2 }}
            >
              <Card sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(90deg,#C260FF22,#A6FF0015)', border: '1px solid rgba(166,255,0,0.2)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: '#A6FF00', fontWeight: 700 }}>Influencer TOP</Typography>
                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 900 }}>Gana extra</Typography>
                    <Typography variant="caption" sx={{ color: '#C260FF' }}>Programa de referidos especial</Typography>
                  </Box>

                  {/* GIF más grande */}
                  <Box component="img" src={influencerGif} alt="influencer-gif" sx={{ width: { xs: 80, md: 112 }, height: { xs: 80, md: 112 }, objectFit: 'contain', ml: 2 }} />
                </Box>
              </Card>

              <Card sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(90deg,#A6FF00,#00FFD1)', color: '#051322', textAlign: 'center', fontWeight: 900 }}>
                <Typography variant="h4">15–25</Typography>
                <Typography variant="caption">pesos/mes</Typography>
              </Card>

              <Card sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(90deg,#C260FF,#00FFD1)', color: '#051322', textAlign: 'center', fontWeight: 900 }}>
                <EmojiEventsIcon sx={{ fontSize: 40 }} />
                <Typography variant="subtitle2">Beneficios especiales</Typography>
              </Card>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#A6FF00' }}>¿Listo para empezar?</Typography>
                <IconButton href="http://ciudadan.org" target="_blank" sx={{ background: 'linear-gradient(90deg,#A6FF00,#C260FF)', color: '#051322', boxShadow: '0 0 10px rgba(166,255,0,0.5)' }}>
                  <ShareIcon />
                </IconButton>
              </Box>
            </MotionBox>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <LocalPlayer
                src={influencers}
                poster={undefined}
                width={{ xs: '100%', md: '100%' }}
                sx={{ maxWidth: 900, maxHeight: 320 }}
              />
            </Box>
          </Grid>
        </Grid>
      </MotionBox>
    </Box>
  );
}
