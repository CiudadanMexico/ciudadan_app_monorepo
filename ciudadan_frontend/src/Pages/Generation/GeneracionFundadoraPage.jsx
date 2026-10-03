/**
 * GeneracionFundadoraPage — /generacion-fundadora (landing principal, spec 6).
 * Hero con el texto en el área oscura de la imagen (HTML/CSS, nunca incrustado).
 */
import { useEffect } from 'react';
import { Box, Grid, Stack, Typography } from '@mui/material';
import SmartToyRounded from '@mui/icons-material/SmartToyRounded';
import AgricultureRounded from '@mui/icons-material/AgricultureRounded';
import MovieCreationRounded from '@mui/icons-material/MovieCreationRounded';
import HandshakeRounded from '@mui/icons-material/HandshakeRounded';
import HubRounded from '@mui/icons-material/HubRounded';
import StorefrontRounded from '@mui/icons-material/StorefrontRounded';
import ParkRounded from '@mui/icons-material/ParkRounded';
import GenerationHero from '../../components/Generation/GenerationHero';
import SectionHeader from '../../components/Generation/SectionHeader';
import FounderPathSelector from '../../components/Generation/FounderPathSelector';
import HowTimeline from '../../components/Generation/HowTimeline';
import CitExplanation from '../../components/Generation/CitExplanation';
import FAQAccordion from '../../components/Generation/FAQAccordion';
import RegistrationCTA from '../../components/Generation/RegistrationCTA';
import { GEN_COLORS, GEN_FONTS, pageContainerSx, sectionSx } from '../../components/Generation/GenerationTheme';
import {
  GENERATION_HOME,
  GENERATION_ASSETS,
  GENERATION_ROUTES,
  GENERATION_PATHS,
  GENERATION_FAQ,
  CIT,
  GENERATION_SEO,
} from '../../config/generationFounderConfig';
import useSeo from '../../hooks/useSeo';
import { trackGenerationEvent, generationEvents } from '../../utils/generationAnalytics';

const pathIcons = {
  hackabot: <SmartToyRounded />,
  vallecatnip: <AgricultureRounded />,
  creadores: <MovieCreationRounded />,
  aliados: <HandshakeRounded />,
};

const buildingIcons = {
  CIUDADAN: <HubRounded />,
  'CÁÑAMO VALLEY': <StorefrontRounded />,
  VALLECATNIP: <ParkRounded />,
};

const GeneracionFundadoraPage = () => {
  const seo = GENERATION_SEO.pages.home;

  useEffect(() => {
    window.scrollTo(0, 0);
    trackGenerationEvent(generationEvents.generationView, { page: 'home' });
  }, []);

  useSeo({
    title: seo.title,
    description: seo.description,
    ogImage: GENERATION_ASSETS[seo.ogImageKey]?.src,
    canonical: `${window.location.origin}${GENERATION_ROUTES.home}`,
  });

  return (
    <Box sx={pageContainerSx}>
      <GenerationHero
        asset={GENERATION_ASSETS.home}
        priority
        eyebrow="Ciudadan 2026"
        title={GENERATION_HOME.title}
        titleAccent={GENERATION_HOME.subtitle}
        intro={GENERATION_HOME.intro}
        ctaPrimary={{ label: GENERATION_HOME.ctaPrimary, href: GENERATION_ROUTES.registro }}
        ctaSecondary={{ label: GENERATION_HOME.ctaSecondary, href: '#vias' }}
      />

      {/* QUÉ ESTAMOS CONSTRUYENDO */}
      <Box component="section" sx={sectionSx}>
        <SectionHeader eyebrow="El proyecto" title={GENERATION_HOME.buildingTitle} />
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {GENERATION_HOME.buildingBlocks.map((block) => (
            <Grid size={{ xs: 12, md: 4 }} key={block.name}>
              <Box
                sx={{
                  border: `1px solid ${GEN_COLORS.borde}`,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.04)',
                  p: { xs: 3, md: 4 },
                  height: '100%',
                }}
              >
                <Box aria-hidden="true" sx={{ color: GEN_COLORS.verde, mb: 1.5, '& svg': { fontSize: 32 } }}>
                  {buildingIcons[block.name]}
                </Box>
                <Typography
                  component="h3"
                  sx={{ fontFamily: GEN_FONTS.display, fontWeight: 700, fontSize: { xs: '1.2rem', md: '1.35rem' } }}
                >
                  {block.name}
                </Typography>
                <Typography sx={{ mt: 1, color: GEN_COLORS.textoSecundario, lineHeight: 1.65 }}>
                  {block.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ELIGE CÓMO PARTICIPAR */}
      <Box component="section" id="vias" sx={{ ...sectionSx, scrollMarginTop: 90 }}>
        <SectionHeader eyebrow="Vías de incorporación" title={GENERATION_HOME.pathsTitle} />
        <FounderPathSelector paths={GENERATION_PATHS} icons={pathIcons} />
      </Box>

      {/* CÓMO FUNCIONA */}
      <Box component="section" sx={sectionSx}>
        <SectionHeader eyebrow="El camino" title={GENERATION_HOME.howTitle} />
        <HowTimeline steps={GENERATION_HOME.howFlow} />
      </Box>

      {/* CIT */}
      <Box component="section" sx={sectionSx}>
        <CitExplanation
          variant="full"
          intro={CIT.keyConceptDetail}
          rules={CIT.rules}
          vesting={CIT.vesting}
          example={CIT.example}
        />
      </Box>

      {/* FAQ */}
      <Box component="section" sx={sectionSx}>
        <SectionHeader eyebrow="Dudas frecuentes" title="Preguntas frecuentes" />
        <FAQAccordion items={GENERATION_FAQ} />
      </Box>

      {/* CTA FINAL */}
      <RegistrationCTA
        text={GENERATION_HOME.finalCtaText}
        buttonLabel={GENERATION_HOME.finalCtaButton}
        href="#vias"
      />
    </Box>
  );
};

export default GeneracionFundadoraPage;
