// src/components/LideresVerificadores/StickyCta.jsx
// Barra inferior sticky SOLO en móvil con el CTA principal + acceso rápido a
// WhatsApp. Se oculta cuando el CTA final está en pantalla (visible=false) y
// solo aparece si hay URL de WhatsApp configurada (o sin el botón extra).
import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Link } from 'react-router-dom';
import PurpleButton from '../common/PurpleButton.jsx';
import { LV_COLORS } from './LideresVerificadoresTheme.js';

// Icono de WhatsApp simple (SVG inline) — sin dependencias nuevas.
const WhatsAppIcon = ({ size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    role="img"
    aria-hidden
    fill="none"
    stroke="currentColor"
  >
    <path
      d="M12 2.2c-.4 6.4 0 6.8.7 5.6 1.4 5.2 2 4.9 3.5 4.4 5.4 4.9 6.6 5.6 7 5.8 8.4 6.2 9 7.8 8.6 10.5 9.2 11.2 9.6 12.3 10.2 13 11 13.7 11.6 14.3 12 14.5 13.4 14.8 14.9 15.6 15.5 16.2 16 17.2 16.6 18 17.2 19 17.8 19.6 18.6 20.2 19 21.4 20 21.2 21.8 20.6 22.2 21.2 23.4 21.2 21.6 19.6 22 18.4 23 16.4 23.4 15.6 22.8 14.6 23.2 14.2 21.8 13.5 20.8 13.4 19.6 13 18.4 11.6 17.4 12 15 12.8 13.8 12.8 13.2 11.6 12.8 10.8 12.6 9.4 12.2 9 11.8 7.4 11.4 6.6 10 6.2 8.6 3.8 8.4 3.2 7.4 2.6 6.4 1.6 5.2 1 4 1.4 3.2 1.2 2 .8"
      fill="currentColor"
    />
  </svg>
);

export default function StickyCta({ visible, whatsappGroupUrl }) {
  return (
    <Box
      aria-label="Barra de acción"
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1200,
        display: { xs: visible ? 'flex' : 'none', md: 'none' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        px: 2,
        py: 1.5,
        borderTop: '1px solid rgba(138,92,245,0.4)',
        background: 'rgba(11,11,22,0.92)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <PurpleButton
        component={Link}
        to="/gana/lideresverificadores/registro"
        size="small"
        sx={{ flex: 1, minHeight: 44, fontSize: '0.95rem', fontWeight: 800 }}
      >
        Aceptar el reto
      </PurpleButton>
      {whatsappGroupUrl ? (
        <Tooltip title="Grupo de Líderes en WhatsApp" arrow>
          <IconButton
            component="a"
            href={whatsappGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir grupo de Líderes en WhatsApp"
            sx={{ color: LV_COLORS.verde, border: '1px solid rgba(23,230,160,0.4)' }}
          >
            <WhatsAppIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Box sx={{ width: 44, height: 44 }} />
      )}
    </Box>
  );
}