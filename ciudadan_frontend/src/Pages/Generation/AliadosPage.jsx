/**
 * AliadosPage — /aliados (spec 10).
 * Aliados Fundadores: construir juntos, no sólo patrocinar.
 */
import { useEffect } from 'react';
import { Box, Chip, Grid, Typography } from '@mui/material';
import SchoolRounded from '@mui/icons-material/SchoolRounded';
import FactoryRounded from '@mui/icons-material/FactoryRounded';
import TerrainRounded from '@mui/icons-material/TerrainRounded';
import MemoryRounded from '@mui/icons-material/MemoryRounded';
import CampaignRounded from '@mui/icons-material/CampaignRounded';
import GenerationHero from '../../components/Generation/GenerationHero';
import SectionHeader from '../../components/Generation/SectionHeader';
import ProgramStats from '../../components/Generation/ProgramStats';
import RegistrationCTA from '../../components/Generation/RegistrationCTA';
import { GEN_COLORS, GEN_FONTS, pageContainerSx, sectionSx } from '../../components/Generation/GenerationTheme';
import {
  ALIADOS,
  GENERATION_ASSETS,
  GENERATION_ROUTES,
  GENERATION_SEO,
} from '../../config/generationFounderConfig';
import useSeo from '../../hooks/useSeo';
import { trackGenerationEvent, generationEvents } from '../../utils/generationAnalytics';

const typeIcons = {
  academicas: <SchoolRounded />,
  productivas: <FactoryRounded />,
  territoriales: <TerrainRounded />,
  tecnologicas: <MemoryRounded />,
  difusion: <CampaignRounded />,
};

const AliadosPage = () => {
  const seo = GENERATION_SEO.pages.aliados;

  useEffect(() => {
    window.scrollTo(0, 0);
    trackGenerationEvent(generationEvents.aliadosView, { page: 'aliados' });
  }, []);

  useSeo({
    title: seo.title,
    description: seo.description,
    ogImage: GENERATION_ASSETS[seo.ogImageKey]?.src,
    canonical: `${window.location.origin}${GENERATION_ROUTES.aliados}`,
  });

  const citStats = [
    { label: 'Pool inicial orientativo', value: ALIADOS.cit.initialPool },
    { label: 'Microalianza', value: '1–3 CIT' },
    { label: 'Operativa', value: '3–9 CIT' },
    { label: 'Estratégica', value: '9–20 CIT' },
  ];

  return (
    <Box sx={pageContainerSx}>
      <GenerationHero
        asset={GENERATION_ASSETS.aliados}
        priority
        eyebrow="Universidades · Cooperativas · Organizaciones · Tecnología"
        title={ALIADOS.title}
        tagline={ALIADOS.tagline}
        ctaPrimary={{ label: ALIADOS.cta, href: `${GENERATION_ROUTES.registro}?via=aliados` }}
      />

      {/* TIPOS DE ALIANZA */}
      <Box component="section" sx={sectionSx}>
        <SectionHeader
          eyebrow="Tipos de alianza"
          title="CINCO FORMAS DE CONSTRUIR JUNTOS"
          subtitle="Universidades, cooperativas, empresas, colectivos y organizaciones de todo tipo."
        />
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {ALIADOS.allianceTypes.map((type) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={type.id}>
              <Box
                sx={{
                  border: `1px solid ${GEN_COLORS.borde}`,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.04)',
                  p: { xs: 2.5, md: 3 },
                  height: '100%',
                  transition: 'border-color 0.2s ease',
                  '&:hover': { borderColor: GEN_COLORS.verde },
                }}
              >
                <Box
                  aria-hidden="true"
                  sx={{ color: GEN_COLORS.verde, mb: 1.5, '& svg, & .MuiSvgIcon-root': { fontSize: { xs: 26, md: 30 } } }}
                >
                  {typeIcons[type.id]}
                </Box>
                <Typography
                  component="h3"
                  sx={{
                    fontFamily: GEN_FONTS.display,
                    fontWeight: 700,
                    fontSize: { xs: '1.1rem', md: '1.2rem' },
                    textTransform: 'uppercase',
                  }}
                >
                  {type.name}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                  {type.items.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      variant="outlined"
                      sx={{
                        borderColor: GEN_COLORS.borde,
                        color: GEN_COLORS.textoSecundario,
                        bgcolor: 'rgba(255,255,255,0.05)',
                        fontSize: { xs: '0.8rem', md: '0.85rem' },
                        px: 0.5,
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
      {/* CIT ALIANZAS */}
      <Box component="section" sx={sectionSx}>
        <SectionHeader
          eyebrow="Reconocimiento"
          title="CIT POR RESULTADO VERIFICABLE"
          subtitle={ALIADOS.cit.intro}
        />
        <ProgramStats stats={citStats} />

        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: { xs: 3, md: 4 } }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Box
              sx={{
                border: `1px solid ${GEN_COLORS.amarillo}`,
                borderRadius: 3,
                bgcolor: 'rgba(245,196,0,0.04)',
                p: { xs: 2.5, md: 3 },
                height: '100%',
              }}
            >
              <Typography sx={{ fontFamily: GEN_FONTS.display, fontWeight: 700, fontSize: '1.05rem' }}>
                Estructural
              </Typography>
              <Typography
                sx={{
                  mt: 0.75,
                  fontFamily: GEN_FONTS.mono,
                  fontWeight: 700,
                  fontSize: { xs: '1.4rem', md: '1.6rem' },
                  color: GEN_COLORS.amarilloSuave,
                }}
              >
                20–40 CIT
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 8 }}>
            <Box
              sx={{
                border: `1px dashed ${GEN_COLORS.borde}`,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.03)',
                p: { xs: 2.5, md: 3 },
                height: '100%',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography
                sx={{
                  color: GEN_COLORS.textoSecundario,
                  fontFamily: GEN_FONTS.mono,
                  fontSize: { xs: '0.85rem', md: '0.95rem' },
                  lineHeight: 1.7,
                }}
              >
                {ALIADOS.cit.bigAssignmentsNote} El CIT no es dinero líquido garantizado: se
                consolida por tercios a los 2, 6 y 12 meses, sujeto a permanencia y a que la
                aportación de la alianza sea real y verificable.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* CTA FINAL */}
      <RegistrationCTA text="Buscamos construir juntos." buttonLabel={ALIADOS.cta} via="aliados" />
    </Box>
  );
};

export default AliadosPage;
