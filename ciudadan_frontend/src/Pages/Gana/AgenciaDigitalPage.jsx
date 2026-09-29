// src/Pages/Gana/AgenciaDigitalPage.jsx
// Página /gana/agencias — Agencia Digital IA (Ciudadan + Publia).
// Vista previa del modelo: sin formularios, alta ni checkout.
import React from 'react';
import { Box, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import heroAgencia from '../../assets/heroagencia.png';
import { MORADO, MORADO_OSCURO } from '../../components/common/PurpleButton.jsx';
import {
  AgenciaCapacidades,
  AgenciaCierre,
  AgenciaIaPersonas,
  AgenciaNoEmpiezasDeCero,
  AgenciaRedCooperativa,
  AgenciaRutaCrecimiento,
} from '../../components/AgenciaDigital/AgenciaSecciones.jsx';

export default function AgenciaDigitalPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            color: '#fff',
            background: `linear-gradient(135deg, ${MORADO} 0%, ${MORADO_OSCURO} 100%)`,
            boxShadow: '0 8px 28px rgba(138,92,245,0.35)',
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Chip
                label="CIUDADAN + PUBLIA"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.22)', color: '#fff', fontWeight: 800 }}
              />
              <Chip
                label="PRÓXIMAMENTE"
                size="small"
                sx={{ bgcolor: 'rgba(0,0,0,0.28)', color: '#fff', fontWeight: 800 }}
              />
            </Stack>
            <Typography
              variant="h3"
              component="h1"
              sx={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: { xs: '1.9rem', md: '2.7rem' } }}
            >
              AGENCIA DIGITAL IA
            </Typography>
            <Typography sx={{ mt: 1.5, fontWeight: 600, fontSize: { xs: '1.05rem', md: '1.2rem' } }}>
              Tecnología, inteligencia artificial, multimedia y marketing para ofrecer soluciones
              reales desde tu localidad.
            </Typography>
            <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.92)', lineHeight: 1.65 }}>
              La Agencia Digital IA es la puerta de entrada al modelo productivo de Ciudadan y
              Publia: aprendes, vendes, produces y terminas operando como nodo productivo de la red.
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
                src={heroAgencia}
                alt="Agencia Digital IA Ciudadan y Publia"
                loading="eager"
                sx={{ display: 'block', width: '100%', height: 'auto', maxWidth: '100%' }}
              />
            </Box>
          </CardContent>
        </Card>

        <AgenciaCapacidades />
        <AgenciaNoEmpiezasDeCero />
        <AgenciaRutaCrecimiento />
        <AgenciaIaPersonas />
        <AgenciaRedCooperativa />
        <AgenciaCierre />
      </Stack>
    </Container>
  );
}
