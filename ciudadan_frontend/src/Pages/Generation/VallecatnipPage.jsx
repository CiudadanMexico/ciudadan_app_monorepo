/**
 * VallecatnipPage — /vallecatnip (spec 8).
 * Ecoaldea piloto: construcción, cultivo, fabricación y trabajo real.
 */
import { useEffect } from 'react';
import { Box, Chip, Grid, Stack, Typography } from '@mui/material';
import GenerationHero from '../../components/Generation/GenerationHero';
import SectionHeader from '../../components/Generation/SectionHeader';
import ProgramStats from '../../components/Generation/ProgramStats';
import CitExplanation from '../../components/Generation/CitExplanation';
import RegistrationCTA from '../../components/Generation/RegistrationCTA';
import { GEN_COLORS, GEN_FONTS, pageContainerSx, sectionSx } from '../../components/Generation/GenerationTheme';
import {
  VALLECATNIP,
  GENERATION_ASSETS,
  GENERATION_ROUTES,
  CIT,
  GENERATION_SEO,
} from '../../config/generationFounderConfig';
import useSeo from '../../hooks/useSeo';
import { trackGenerationEvent, generationEvents } from '../../utils/generationAnalytics';

const VallecatnipPage = () => {
  const seo = GENERATION_SEO.pages.vallecatnip;

  useEffect(() => {
    window.scrollTo(0, 0);
    trackGenerationEvent(generationEvents.vallecatnipView, { page: 'vallecatnip' });
  }, []);

  useSeo({
    title: seo.title,
    description: seo.description,
    ogImage: GENERATION_ASSETS[seo.ogImageKey]?.src,
    canonical: `${window.location.origin}${GENERATION_ROUTES.vallecatnip}`,
  });

  const groupStats = [
    { label: 'Primer grupo objetivo', value: VALLECATNIP.firstGroup.target },
    { label: 'Promedio por participante', value: `${VALLECATNIP.firstGroup.averageCit} CIT` },
    { label: 'Pool estimado', value: VALLECATNIP.firstGroup.pool },
  ];

  return (
    <Box sx={pageContainerSx}>
      <GenerationHero
        asset={GENERATION_ASSETS.vallecatnip}
        priority
        eyebrow="Ecoaldea piloto"
        title={VALLECATNIP.title}
        tagline={VALLECATNIP.tagline}
        intro={VALLECATNIP.intro}
        ctaPrimary={{ label: VALLECATNIP.cta, href: `${GENERATION_ROUTES.registro}?via=vallecatnip` }}
      />

      {/* PERFILES */}
      <Box component="section" sx={sectionSx}>
        <SectionHeader
          eyebrow="Perfiles"
          title="LO QUE SE CONSTRUYE SOBRE EL TERRENO"
          subtitle={VALLECATNIP.noTitleNeeded}
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
          {VALLECATNIP.profiles.map((profile) => (
            <Chip
              key={profile}
              label={profile}
              sx={{
                borderColor: GEN_COLORS.borde,
                color: GEN_COLORS.texto,
                bgcolor: 'rgba(255,255,255,0.05)',
                fontSize: { xs: '0.85rem', md: '0.95rem' },
                px: 0.5,
              }}
              variant="outlined"
            />
          ))}
        </Box>
      </Box>

      {/* PRIMER GRUPO */}
      <Box component="section" sx={sectionSx}>
        <SectionHeader
          eyebrow="Primer grupo"
          title="TRES NIVELES ORIENTATIVOS"
          subtitle="Misma consolidación que todo el ecosistema: por tercios a los 2, 6 y 12 meses."
        />
        <ProgramStats stats={groupStats} />

        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: { xs: 3, md: 4 } }}>
          {VALLECATNIP.firstGroup.levels.map((level) => (
            <Grid size={{ xs: 12, sm: 4 }} key={level.name}>
              <Box
                sx={{
                  border: `1px solid ${GEN_COLORS.borde}`,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  p: { xs: 2.5, md: 3 },
                  textAlign: 'center',
                  height: '100%',
                }}
              >
                <Typography
                  component="h3"
                  sx={{ fontFamily: GEN_FONTS.display, fontWeight: 600, fontSize: { xs: '1rem', md: '1.1rem' } }}
                >
                  {level.name}
                </Typography>
                <Typography
                  sx={{
                    mt: 1,
                    fontFamily: GEN_FONTS.mono,
                    fontWeight: 700,
                    fontSize: { xs: '1.5rem', md: '1.8rem' },
                    color: GEN_COLORS.amarilloSuave,
                  }}
                >
                  {level.cit} CIT
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: { xs: 6, md: 9 } }}>
          <CitExplanation
            variant="compact"
            intro={CIT.keyConceptDetail}
            rules={CIT.rules}
            vesting={CIT.vesting}
            example={CIT.example}
          />
        </Box>
      </Box>

      <RegistrationCTA
        text="Si sabes hacerlo, ven a construirlo."
        buttonLabel={VALLECATNIP.cta}
        via="vallecatnip"
      />
    </Box>
  );
};

export default VallecatnipPage;
