/**
 * RegistroGeneracionPage — /generacion-fundadora/registro
 * Único formulario dinámico de la Generación Fundadora. La vía llega por
 * ?via=hackabot|vallecatnip|creadores|aliados|general (default general).
 * El SEO se adapta a la vía (spec 21).
 */
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Container, Typography } from '@mui/material';
import RegistrationForm from '../../components/Generation/registro/RegistrationForm';
import {
  REGISTRATION,
  GENERATION_SEO,
  GENERATION_ROUTES,
  GENERATION_ASSETS,
} from '../../config/generationFounderConfig';
import useSeo from '../../hooks/useSeo';
import { pageContainerSx, GEN_COLORS, GEN_FONTS } from '../../components/Generation/GenerationTheme';

const RegistroGeneracionPage = () => {
  const [searchParams] = useSearchParams();
  const viaParam = searchParams.get('via');
  const via = useMemo(
    () => (REGISTRATION.validVias.includes(viaParam) ? viaParam : REGISTRATION.defaultVia),
    [viaParam]
  );
  const meta = REGISTRATION.viaMeta[via] || REGISTRATION.viaMeta.general;

  // SEO dinámico: título con la vía + base común del registro
  const seoBase = GENERATION_SEO.pages.registro;
  const seoTitle = `${meta.title} | ${GENERATION_SEO.baseSiteName}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [via]);

  useSeo({
    title: seoTitle,
    description: `${meta.subtitle} ${seoBase.description}`,
    ogImage: GENERATION_ASSETS[seoBase.ogImageKey]?.src,
    canonical: `${window.location.origin}${GENERATION_ROUTES.registro}`,
  });

  return (
    <Box sx={pageContainerSx}>
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
        {/* Migas de contexto (la vía activa también es accesible por texto) */}
        <Typography
          component="p"
          aria-live="polite"
          sx={{
            fontFamily: GEN_FONTS.mono,
            fontSize: { xs: '0.68rem', md: '0.74rem' },
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: GEN_COLORS.amarilloSuave,
            mb: 3,
          }}
        >
          Vía activa: {meta.label}
        </Typography>

        <RegistrationForm />
      </Container>
    </Box>
  );
};

export default RegistroGeneracionPage;
