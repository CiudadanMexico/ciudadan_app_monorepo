/**
 * /hackabot — HACKABOT UNIVERSITARIO (página prioritaria de campaña).
 * Estructura (spec 7): hero → qué es → áreas → Etapa 1 → CIT Etapa 1 →
 * actividad → Discord → Etapa 2 → carreras → FAQ → CTA final.
 * Todos los textos y números provienen de la config central.
 */
import { useEffect } from 'react';
import { Box } from '@mui/material';
import GenerationHero from '../../components/Generation/GenerationHero';
import SectionHeader from '../../components/Generation/SectionHeader';
import FAQAccordion from '../../components/Generation/FAQAccordion';
import DiscordSection from '../../components/Generation/DiscordSection';
import RegistrationCTA from '../../components/Generation/RegistrationCTA';
import HackabotWhatIs from '../../components/Generation/hackabot/HackabotWhatIs';
import HackabotAreas from '../../components/Generation/hackabot/HackabotAreas';
import HackabotStage1 from '../../components/Generation/hackabot/HackabotStage1';
import HackabotStage1Cit from '../../components/Generation/hackabot/HackabotStage1Cit';
import HackabotActivity from '../../components/Generation/hackabot/HackabotActivity';
import HackabotStage2 from '../../components/Generation/hackabot/HackabotStage2';
import HackabotCareers from '../../components/Generation/hackabot/HackabotCareers';
import { pageContainerSx, sectionSx } from '../../components/Generation/GenerationTheme';
import {
  HACKABOT,
  GENERATION_ASSETS,
  GENERATION_FAQ,
  GENERATION_SEO,
  buildRegistroUrl,
} from '../../config/generationFounderConfig';
import {
  captureTrackingParams,
  trackGenerationEvent,
  generationEvents,
} from '../../utils/generationAnalytics';
import useSeo from '../../hooks/useSeo';

const HackabotPage = () => {
  const seo = GENERATION_SEO.pages.hackabot;

  useEffect(() => {
    captureTrackingParams();
    trackGenerationEvent(generationEvents.hackabotView, { via: 'hackabot' });
  }, []);

  useSeo({
    title: seo.title,
    description: seo.description,
    ogImage: GENERATION_ASSETS.hackabot.src,
    canonical: `${window.location.origin}/hackabot`,
  });

  return (
    <Box sx={pageContainerSx}>
      <GenerationHero
        asset={GENERATION_ASSETS.hackabot}
        priority
        eyebrow={HACKABOT.title}
        title="HACKABOT"
        titleAccent="UNIVERSITARIO"
        tagline={HACKABOT.tagline}
        intro={HACKABOT.intro}
        ctaPrimary={{
          label: 'REGÍSTRATE EN HACKABOT',
          href: buildRegistroUrl('hackabot'),
        }}
        ctaSecondary={{
          label: 'CONOCE CÓMO FUNCIONA',
          href: '#como-funciona',
        }}
      />

      <Box id="como-funciona">
        <HackabotWhatIs />
        <HackabotAreas />
        <HackabotStage1 />
        <HackabotStage1Cit />
        <HackabotActivity />
      </Box>

      <Box sx={sectionSx}>
        <DiscordSection
          title={HACKABOT.discord.title}
          intro={HACKABOT.discord.intro}
          features={HACKABOT.discord.features}
          inviteUrl={HACKABOT.discord.url}
          icon={(
            <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" aria-hidden="true">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
          )}
        />
      </Box>

      <HackabotStage2 />
      <HackabotCareers />

      <Box sx={sectionSx}>
        <SectionHeader
          eyebrow="Preguntas frecuentes"
          title="Lo que suelen preguntarnos"
        />
        <FAQAccordion items={GENERATION_FAQ} />
      </Box>

      <RegistrationCTA
        text={HACKABOT.finalCta.text}
        buttonLabel={HACKABOT.finalCta.button}
        via="hackabot"
      />
    </Box>
  );
};

export default HackabotPage;
