import React from 'react';
import { Box, Typography, Button, Grid, Container } from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import Anuncios from './Anuncios/Anuncios';
import { useRoles } from '../Contexts/RolesContext';
import comunidadImg from '../assets/anunciate.png'; // asegúrate del path

const ComunidadPage = () => {
  const { isActivaMembresia } = useRoles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ backgroundColor: '#0d1f1a', color: 'white', py: 6, px: 2, overflowX: 'hidden' }}>
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          {/* Imagen */}
          <Grid item xs={12} md={6} order={{ xs: 1, md: 2 }}>
            <Box
              component="img"
              src={comunidadImg}
              alt="Comunidad 4:20"
              sx={{
                width: '100%',
                height: 'auto',
                borderRadius: 2,
                boxShadow: 3
              }}
            />
          </Grid>

          {/* Texto */}
          <Grid item xs={12} md={6} order={{ xs: 2, md: 1 }}>
            <Typography variant="h4" gutterBottom sx={{ color: '#fff200' }}>
              PUBLICA EN LA COMUNIDAD 4:20
            </Typography>

            <Typography variant="h6" sx={{ mt: 2, mb: 1, color: '#fff200' }}>
              🌼 CON TU MEMBRESÍA:
            </Typography>
            <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
              <li>Puedes hacer hasta 3 publicaciones diarias (anuncios, videos, promociones, etc.)</li>
              <li>Hasta 10 GB mensuales de contenido</li>
              <li>Publica enlaces o contenidos externos fácilmente</li>
              <li>
                Tus publicaciones son reenviadas manualmente varias veces al día en el grupo de WhatsApp
              </li>
              <li>
                Envía tus contenidos por WhatsApp a nuestro chatbot o súbelos desde esta app
              </li>
            </ul>

            <Typography variant="h6" sx={{ mt: 4, mb: 1, color: '#ff9900' }}>
              🍁 USUARIOS GRATUITOS DEL GRUPO DE WHATSAPP:
            </Typography>
            <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
              <li>Pueden ver todas las publicaciones compartidas por miembros con membresía</li>
              <li>Reciben actualizaciones y contenido a lo largo del día</li>
            </ul>

            <Box mt={4}>
              <Button
                variant="contained"
                href="https://chat.whatsapp.com/H5GM7PJPIjE5z2Rkh4p95k"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  backgroundColor: '#25D366',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  '&:hover': {
                    backgroundColor: '#1ebe5d'
                  }
                }}
              >
                Únete al Grupo de WhatsApp
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ComunidadPage;
