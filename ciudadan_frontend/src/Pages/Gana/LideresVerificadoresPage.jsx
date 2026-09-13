// src/Pages/Gana/LideresVerificadoresPage.jsx
// Landing /gana/lideresverificadores — programa de Líderes Verificadores de
// Conductores de Ciudadan.
//
// Comportamiento según autenticación/roles (TODO dinámico, sin flash):
//   - Invitado / usuario normal        → ve la landing completa.
//   - Autenticado cargando roles        → skeleton discreto (nada de flash).
//   - driver-verifier-candidate         → redirect a /coowork/socio.
//   - driver-verifier                   → redirect a /coowork/socio.
import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import { Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useRoles } from '../../Contexts/RolesContext';
import {
  getPublicConfig,
  DRIVER_VERIFIER_DEFAULTS,
} from '../../services/driverVerifierService';
import Hero from '../../components/LideresVerificadores/Hero.jsx';
import QueEsCiudadan from '../../components/LideresVerificadores/QueEsCiudadan.jsx';
import QueGanaUnLider from '../../components/LideresVerificadores/QueGanaUnLider.jsx';
import RetoLider from '../../components/LideresVerificadores/RetoLider.jsx';
import RedSection from '../../components/LideresVerificadores/RedSection.jsx';
import Indecisos from '../../components/LideresVerificadores/Indecisos.jsx';
import CtaFinal from '../../components/LideresVerificadores/CtaFinal.jsx';
import StickyCta from '../../components/LideresVerificadores/StickyCta.jsx';
import { LV_COLORS } from '../../components/LideresVerificadores/LideresVerificadoresTheme.js';

const SkeletonLanding = () => (
  <Box
    aria-busy
    role="status"
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 1.5,
      bgcolor: LV_COLORS.fondo,
      color: LV_COLORS.texto,
    }}
  >
    <CircularProgress sx={{ color: LV_COLORS.morado }} />
    <Typography sx={{ color: LV_COLORS.textoSuave }}>Cargando programa…</Typography>
  </Box>
);

export default function LideresVerificadoresPage() {
  const { isAuthenticated, isLoading: auth0Loading } = useAuth0();
  const { roles, userData } = useRoles();

  const [config, setConfig] = useState({ ...DRIVER_VERIFIER_DEFAULTS });
  const [ctaFinalVisible, setCtaFinalVisible] = useState(false);
  const ctaFinalRef = useRef(null);

  useEffect(() => {
    getPublicConfig().then(setConfig);
  }, []);

  // La barra sticky se oculta cuando el CTA final entra en viewport.
  useEffect(() => {
    const el = ctaFinalRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setCtaFinalVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // --- Control de roles (sin flash de landing) ---
  const rolesResolved = !isAuthenticated || userData !== null;
  const isCandidate = roles.includes('driver-verifier-candidate');
  const isVerifier = roles.includes('driver-verifier');

  if (isCandidate || isVerifier) {
    return <Navigate replace to="/coowork/socio" />;
  }

  // Mientras Auth0 y/o los roles resuelven, NO mostrar la landing todavía.
  if (auth0Loading || (isAuthenticated && !rolesResolved)) {
    return <SkeletonLanding />;
  }

  const { testingDays, requiredReferrals, whatsappGroupUrl } = config;

  return (
    <Box
      // Fondo oscuro CON estilo inline (a prueba de cualquier tema/estilo global)
      // y marcador rojo temporal para diagnóstico visual.
      style={{
        minHeight: '100vh',
        backgroundColor: '#0B0B16',
        color: '#F4F4F8',
      }}
      sx={{
        pb: { xs: 8, md: 4 }, // espacio para la barra sticky en móvil
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, md: 3 } }}>
        <Hero
          testingDays={testingDays}
          requiredReferrals={requiredReferrals}
          whatsappGroupUrl={whatsappGroupUrl}
        />
        <QueEsCiudadan />
        <QueGanaUnLider />
        <RetoLider testingDays={testingDays} requiredReferrals={requiredReferrals} />
        <RedSection />
        <Indecisos whatsappGroupUrl={whatsappGroupUrl} />
        <CtaFinal
          testingDays={testingDays}
          requiredReferrals={requiredReferrals}
          whatsappGroupUrl={whatsappGroupUrl}
          forwardRef={ctaFinalRef}
        />
      </Container>

      <StickyCta visible={!ctaFinalVisible} whatsappGroupUrl={whatsappGroupUrl} />
    </Box>
  );
}