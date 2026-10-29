import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Grid, Container } from '@mui/material';
import { useTheme, useMediaQuery } from '@mui/material';
import Anuncios from './Anuncios/Anuncios';
import { useRoles } from '../Contexts/RolesContext';
import { getPublicConfig } from '../services/driverVerifierService';
import comunidadImg from '../assets/anunciate.png'; // asegúrate del path

/**
 * FALLBACK EXPLÍCITO Y VISIBLE (no silencioso) de la URL del grupo de WhatsApp.
 *
 * Fuente de verdad = CONFIGURACIÓN PÚBLICA (cambiable sin redesplegar):
 *   GET {REACT_APP_STRAPI_URL}/api/driver-verifier/public-config
 *   → site-setting.verifier_candidates_whatsapp_group_url
 *
 * Este valor sólo se usa si la configuración pública NO devuelve una URL válida
 * (https://) o si el endpoint falla. Es la misma URL que estaba hardcodeada en
 * este archivo antes de la tarea 1028 y se conserva aquí, a la vista y
 * documentada, para que el CTA no quede roto si el backend no responde.
 * NO es un segundo hardcode silencioso: está documentado en
 * docs/WHATSAPP-CONFIG-2026-10-28.md. El operador debe fijar la URL oficial
 * en Strapi → Site Setting → verifier_candidates_whatsapp_group_url
 * (o en seed/site-settings.js) y no editar este literal.
 */
const WHATSAPP_COMUNIDAD_FALLBACK = 'https://chat.whatsapp.com/H5GM7PJPIjE5z2Rkh4p95k';

const ComunidadPage = () => {
  const { isActivaMembresia } = useRoles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [whatsappUrl, setWhatsappUrl] = useState(WHATSAPP_COMUNIDAD_FALLBACK);

  useEffect(() => {
    let vigente = true;
    getPublicConfig()
      .then(config => {
        if (!vigente) return;
        setWhatsappUrl(config?.whatsappGroupUrl || WHATSAPP_COMUNIDAD_FALLBACK);
      })
      .catch(() => {
        if (vigente) setWhatsappUrl(WHATSAPP_COMUNIDAD_FALLBACK);
      });
    return () => { vigente = false; };
  }, []);

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
                href={whatsappUrl}
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
