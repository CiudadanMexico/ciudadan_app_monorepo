// src/Pages/Gana/ReciclandoPage.jsx
// Página /gana/reciclando — economía circular productiva (vista previa).
// Composición mobile-first con MUI v6, mismo patrón que RentaUniversalPage.
import React from 'react';
import { Box, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import heroReciclando from '../../assets/heroreciclando.png';
import {
  ReciclandoCadena,
  ReciclandoElCiclo,
  ReciclandoFuturo,
  ReciclandoRecompensas,
  ReciclandoSistema,
  ReciclandoTalleres,
  VERDE,
  VERDE_OSCURO,
} from '../../components/Reciclando/ReciclandoSecciones.jsx';

export default function ReciclandoPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            color: '#fff',
            background: `linear-gradient(135deg, ${VERDE} 0%, ${VERDE_OSCURO} 100%)`,
            boxShadow: '0 8px 28px rgba(15,123,82,0.35)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Chip
              label="PRÓXIMAMENTE"
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.22)', color: '#fff', fontWeight: 800, mb: 2 }}
            />
            <Typography
              variant="h3"
              component="h1"
              sx={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: { xs: '2rem', md: '2.8rem' } }}
            >
              RECICLANDO
            </Typography>
            <Typography sx={{ mt: 1.5, fontWeight: 600, fontSize: { xs: '1.05rem', md: '1.2rem' } }}>
              Convierte residuos, objetos y materiales en recursos para tu comunidad.
            </Typography>
            <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.92)', lineHeight: 1.65 }}>
              Reciclando es la economía circular productiva de Ciudadan: no es una campaña para
              juntar PET, es un ecosistema para recuperar valor y producir localmente.
            </Typography>

            <Box
              sx={{
                mt: 2.5,
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.35)',
                bgcolor: 'rgba(0,0,0,0.15)',
              }}
            >
              <Box
                component="img"
                src={heroReciclando}
                alt="Economía circular y reciclaje productivo Ciudadan"
                loading="eager"
                sx={{ display: 'block', width: '100%', height: 'auto', maxWidth: '100%' }}
              />
            </Box>
          </CardContent>
        </Card>

        <ReciclandoCadena />
        <ReciclandoElCiclo />
        <ReciclandoSistema />
        <ReciclandoRecompensas />
        <ReciclandoTalleres />
        <ReciclandoFuturo />
      </Stack>
    </Container>
  );
}
