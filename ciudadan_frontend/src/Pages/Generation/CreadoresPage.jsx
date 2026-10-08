/**
 * CreadoresPage — /creadores (spec 9).
 * Creadores Fundadores: documentar la construcción, no publicar un anuncio.
 */
import { useEffect } from 'react';
import { Box, Chip, Grid, Stack, Typography } from '@mui/material';
import GenerationHero from '../../components/Generation/GenerationHero';
import SectionHeader from '../../components/Generation/SectionHeader';
import RegistrationCTA from '../../components/Generation/RegistrationCTA';
import { GEN_COLORS, GEN_FONTS, pageContainerSx, sectionSx } from '../../components/Generation/GenerationTheme';
import {
  CREADORES,
  GENERATION_ASSETS,
  GENERATION_ROUTES,
  GENERATION_SEO,
} from '../../config/generationFounderConfig';
import useSeo from '../../hooks/useSeo';
import { trackGenerationEvent, generationEvents } from '../../utils/generationAnalytics';

const CreadoresPage = () => {
  const seo = GENERATION_SEO.pages.creadores;

  useEffect(() => {
    window.scrollTo(0, 0);
    trackGenerationEvent(generationEvents.creadoresView, { page: 'creadores' });
  }, []);

  useSeo({
    title: seo.title,
    description: seo.description,
    ogImage: GENERATION_ASSETS[seo.ogImageKey]?.src,
    canonical: `${window.location.origin}${GENERATION_ROUTES.creadores}`,
  });

  return (
    <Box sx={pageContainerSx}>
      <GenerationHero
        asset={GENERATION_ASSETS.creadores}
        priority
        eyebrow="Comunicación y producción audiovisual"
        title={CREADORES.title}
        tagline={CREADORES.tagline}
        ctaPrimary={{ label: CREADORES.cta, href: `${GENERATION_ROUTES.registro}?via=creadores` }}
      />

      {/* PERFILES */}
      <Box component="section" sx={sectionSx}>
        <SectionHeader eyebrow="Perfiles" title="FORMATOS Y DISCIPLINAS" />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
          {CREADORES.profiles.map((profile) => (
            <Chip
              key={profile}
              label={profile}
              variant="outlined"
              sx={{
                borderColor: GEN_COLORS.borde,
                color: GEN_COLORS.texto,
                bgcolor: 'rgba(255,255,255,0.05)',
                fontSize: { xs: '0.85rem', md: '0.95rem' },
                px: 0.5,
              }}
            />
          ))}
        </Box>
      </Box>

      {/* EVALUACIÓN */}
      <Box component="section" sx={sectionSx}>
        <SectionHeader
          eyebrow="Evaluación"
          title="MÁS ALLÁ DE LOS SEGUIDORES"
          subtitle={CREADORES.evaluationIntro}
        />
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {CREADORES.metrics.map((metric) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={metric.label}>
              <Box
                sx={{
                  border: `1px solid ${GEN_COLORS.borde}`,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  p: { xs: 2.5, md: 3 },
                  height: '100%',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: GEN_FONTS.display,
                    fontWeight: 700,
                    fontSize: { xs: '1.8rem', md: '2.2rem' },
                    color: GEN_COLORS.verde,
                  }}
                >
                  {metric.value}
                </Typography>
                <Typography sx={{ mt: 0.75, color: GEN_COLORS.textoSecundario, fontSize: '0.95rem' }}>
                  {metric.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
      {/* CIT */}
      <Box component="section" sx={sectionSx}>
        <SectionHeader
          eyebrow="Reconocimiento"
          title="CIT · CREADORES FUNDADORES"
          subtitle={CREADORES.cit.pool}
        />
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                border: `1px solid ${GEN_COLORS.borde}`,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.03)',
                p: { xs: 2.5, md: 3 },
                height: '100%',
              }}
            >
              <Typography sx={{ color: GEN_COLORS.textoSecundario, lineHeight: 1.65 }}>
                El CIT es una unidad de participación dentro del proyecto. En esta vía se
                permiten <strong style={{ color: GEN_COLORS.verde }}>fracciones</strong> para
                reconocer aportaciones de distinto tamaño.
              </Typography>
              <Typography
                sx={{ mt: 2, fontFamily: GEN_FONTS.mono, fontSize: '0.85rem', color: GEN_COLORS.amarilloSuave }}
              >
                {CREADORES.cit.noAutoPayments}
              </Typography>
            </Box>
          </Grid>

          {/* Evolución del creador */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                border: `1px solid ${GEN_COLORS.borde}`,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.03)',
                p: { xs: 2.5, md: 3 },
                height: '100%',
              }}
            >
              <Typography
                component="h3"
                sx={{ fontFamily: GEN_FONTS.display, fontWeight: 700, fontSize: '1.05rem' }}
              >
                Después de crear contenido
              </Typography>
              <Typography sx={{ mt: 0.75, color: GEN_COLORS.textoSecundario, fontSize: '0.95rem' }}>
                Un creador puede evolucionar hacia:
              </Typography>
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {CREADORES.nextSteps.map((step) => (
                  <Stack key={step} direction="row" spacing={1} alignItems="center">
                    <Box
                      aria-hidden="true"
                      sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: GEN_COLORS.verde, flexShrink: 0 }}
                    />
                    <Typography sx={{ color: GEN_COLORS.textoSecundario, fontSize: '0.95rem' }}>{step}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* CTA FINAL */}
      <RegistrationCTA text="Documenta con nosotros la construcción de Ciudadan." buttonLabel={CREADORES.cta} via="creadores" />
    </Box>
  );
};

export default CreadoresPage;
