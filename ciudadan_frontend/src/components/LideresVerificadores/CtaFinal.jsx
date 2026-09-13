// src/components/LideresVerificadores/CtaFinal.jsx
// Cierre de la landing: CTA grande + nota de plazo + CTA secundario.
import React from 'react';
import { Box, Container, Stack, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import PurpleButton from '../common/PurpleButton.jsx';
import { LV_COLORS } from './LideresVerificadoresTheme.js';

export default function CtaFinal({ testingDays, requiredReferrals, whatsappGroupUrl, forwardRef }) {
  return (
    <Box component="section" aria-label="Acepta el reto" ref={forwardRef} sx={{ py: { xs: 3, md: 6 } }}>
      <Container maxWidth="md" sx={{ textAlign: 'center' }}>
        <Typography variant="h3" component="h2" sx={{ fontWeight: 800, color: LV_COLORS.texto }}>
          Tu primera red empieza con {requiredReferrals}.
        </Typography>
        <Typography sx={{ mt: 1, color: LV_COLORS.textoSuave, maxWidth: 620, mx: 'auto' }}>
          Tendrás {testingDays} días para demostrar que puedes construirla.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3, justifyContent: 'center' }}>
          <PurpleButton
            component={Link}
            to="/gana/lideresverificadores/registro"
            size="large"
            sx={{ px: 5, py: 1.8, boxShadow: '0 0 28px rgba(138,92,245,0.55)' }}
          >
            Aceptar el reto
          </PurpleButton>
          {whatsappGroupUrl ? (
            <Button
              component="a"
              href={whatsappGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="large"
              sx={{ borderRadius: 999, fontWeight: 700, color: LV_COLORS.texto, border: `1px solid ${LV_COLORS.borde}` }}
            >
              Primero quiero conocer al grupo
            </Button>
          ) : null}
        </Stack>

        <Typography variant="body2" sx={{ mt: 1.5, color: LV_COLORS.textoTenue }}>
          El plazo comienza únicamente después de completar tu registro.
        </Typography>
      </Container>
    </Box>
  );
}
