/**
 * HackabotStage2 — ETAPA 2 · LIGA ABIERTA (spec 7.10 + 7.11).
 * La imagen hackabot-etapa2.webp se usa como banner interno con overlay
 * oscuro; TODO el texto (fechas, meta, mecánica, pool) es HTML encima.
 * Incluye la elegibilidad con sus dos ejemplos acumulables.
 */
import { Box, Typography, Grid, Stack } from '@mui/material';
import ResponsiveHero from '../ResponsiveHero';
import SectionHeader from '../SectionHeader';
import ProgramStats from '../ProgramStats';
import { GEN_COLORS, GEN_FONTS, sectionSx } from '../GenerationTheme';
import { HACKABOT, GENERATION_ASSETS } from '../../../config/generationFounderConfig';

const EligibilityCard = ({ example, index }) => (
  <Box
    sx={{
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 3,
      bgcolor: 'rgba(255,255,255,0.03)',
      p: { xs: 2.5, md: 3 },
    }}
  >
    <Typography
      sx={{ fontFamily: GEN_FONTS.mono, fontSize: '0.7rem', letterSpacing: '0.18em', color: GEN_COLORS.textoTenue, mb: 1.5 }}
    >
      EJEMPLO {index + 1}
    </Typography>
    <Stack spacing={1}>
      {example.steps.map((step, i) => (
        <Box key={step} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: GEN_COLORS.verde, fontFamily: GEN_FONTS.mono, fontWeight: 700, fontSize: '0.9rem' }}>
            {i + 1}
          </Typography>
          <Typography sx={{ color: GEN_COLORS.textoSecundario, fontSize: '0.95rem' }}>{step}</Typography>
        </Box>
      ))}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
        <Typography sx={{ color: GEN_COLORS.amarilloSuave, fontWeight: 700 }}>=</Typography>
        <Typography sx={{ color: GEN_COLORS.texto, fontWeight: 700, fontSize: '0.95rem' }}>
          {example.result}
        </Typography>
      </Box>
    </Stack>
  </Box>
);

const HackabotStage2 = () => {
  const { stage2, stage2Eligibility } = HACKABOT;

  return (
    <Box component="section">
      {/* Banner interno con imagen de ambientación — texto en HTML */}
      <ResponsiveHero
        asset={GENERATION_ASSETS.hackabotEtapa2}
        overlay={0.68}
        minHeightSx={{ xs: '60svh', sm: '55vh', md: '72vh' }}
        contentSx={{ maxWidth: 900 }}
      >
        <Stack spacing={{ xs: 1.5, md: 2 }}>
          <Typography
            component="p"
            sx={{ fontFamily: GEN_FONTS.mono, fontSize: '0.75rem', letterSpacing: '0.24em', color: GEN_COLORS.verdeNeon, textTransform: 'uppercase' }}
          >
            {stage2.title}
          </Typography>
          <Typography
            variant="h2"
            sx={{ fontFamily: GEN_FONTS.display, fontWeight: 700, fontSize: { xs: '2rem', sm: '2.8rem', md: '3.6rem' }, lineHeight: 1.05, color: GEN_COLORS.texto }}
          >
            {stage2.subtitle}
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 0.5, sm: 3 }}
            divider={<Box component="span" aria-hidden="true" sx={{ display: { xs: 'none', sm: 'block' }, color: GEN_COLORS.verde }}>·</Box>}
            sx={{ flexWrap: 'wrap' }}
          >
            <Typography sx={{ color: GEN_COLORS.textoSecundario, fontSize: { xs: '0.95rem', md: '1.05rem' } }}>
              Inicio: <strong style={{ color: GEN_COLORS.texto }}>{stage2.inicio}</strong>
            </Typography>
            <Typography sx={{ color: GEN_COLORS.textoSecundario, fontSize: { xs: '0.95rem', md: '1.05rem' } }}>
              Duración: <strong style={{ color: GEN_COLORS.texto }}>{stage2.duracion}</strong>
            </Typography>
            <Typography sx={{ color: GEN_COLORS.textoSecundario, fontSize: { xs: '0.95rem', md: '1.05rem' } }}>
              Meta: <strong style={{ color: GEN_COLORS.texto }}>{stage2.metaColaboradores}</strong>
            </Typography>
          </Stack>
          <Typography sx={{ color: GEN_COLORS.textoSecundario, fontSize: { xs: '0.95rem', md: '1.05rem' }, maxWidth: 620 }}>
            Mecánica: {stage2.citPorJornada}. Pool objetivo anual: {stage2.poolAnual}.
          </Typography>
        </Stack>
      </ResponsiveHero>

      {/* Elegibilidad */}
      <Box sx={sectionSx}>
        <SectionHeader eyebrow="Elegibilidad" title="CÓMO ENTRAR A LA LIGA ABIERTA" subtitle={stage2Eligibility.intro} />
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {stage2Eligibility.requirements.map((req) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={req}>
              <Box
                sx={{
                  border: `1px solid ${GEN_COLORS.borde}`,
                  borderRadius: 2,
                  bgcolor: 'rgba(0,255,153,0.04)',
                  px: 2,
                  py: 1.5,
                  color: GEN_COLORS.textoSecundario,
                  fontSize: { xs: '0.92rem', md: '0.98rem' },
                }}
              >
                {req}
              </Box>
            </Grid>
          ))}
        </Grid>

        <Typography sx={{ mt: 3, color: GEN_COLORS.texto, fontWeight: 600, fontSize: { xs: '0.98rem', md: '1.05rem' } }}>
          {stage2Eligibility.note}
        </Typography>

        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: 2 }}>
          {stage2Eligibility.examples.map((example, i) => (
            <Grid size={{ xs: 12, md: 6 }} key={i}>
              <EligibilityCard example={example} index={i} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default HackabotStage2;
