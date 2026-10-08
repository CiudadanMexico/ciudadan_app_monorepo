/**
 * HackabotStage1 — fechas de Etapa 1 (spec 7.4) y lugares (spec 7.5).
 * Todos los números provienen de HACKABOT.stage1 / HACKABOT.stage1Spots.
 */
import { Box, Typography, Stack, Grid } from '@mui/material';
import SectionHeader from '../SectionHeader';
import Timeline from '../Timeline';
import { GEN_COLORS, GEN_FONTS, sectionSx } from '../GenerationTheme';
import { HACKABOT } from '../../../config/generationFounderConfig';

const HackabotStage1 = () => {
  const { stage1, stage1Spots, areas } = HACKABOT;

  return (
    <Box sx={sectionSx}>
      <SectionHeader
        eyebrow={stage1.title}
        title={stage1.subtitle}
        subtitle={`Duración: ${stage1.duracion}.`}
      />

      <Grid container spacing={{ xs: 4, md: 8 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Timeline
            steps={stage1.timeline.map((item) => ({
              date: item.label,
              label: item.value,
            }))}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              border: `1px solid ${GEN_COLORS.borde}`,
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.03)',
              p: { xs: 3, md: 4 },
              height: '100%',
            }}
          >
            <Typography
              component="h3"
              sx={{
                fontFamily: GEN_FONTS.display,
                fontWeight: 700,
                fontSize: { xs: '1.15rem', md: '1.3rem' },
                color: GEN_COLORS.texto,
              }}
            >
              Lugares · Etapa 1
            </Typography>
            <Typography sx={{ mt: 1, color: GEN_COLORS.textoSecundario, fontSize: '0.95rem', lineHeight: 1.6 }}>
              {stage1Spots.general} lugares generales ({stage1Spots.perArea} por área) +{' '}
              {stage1Spots.specializedProfilesCount} perfiles especializados (aprox.).
            </Typography>

            <Stack spacing={1} sx={{ mt: 2.5 }}>
              {areas.map((area) => (
                <Stack
                  key={area.id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 1 }}
                >
                  <Typography sx={{ color: GEN_COLORS.textoSecundario, fontSize: { xs: '0.92rem', md: '1rem' } }}>
                    {area.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: GEN_FONTS.mono,
                      color: GEN_COLORS.verde,
                      fontWeight: 700,
                      fontSize: { xs: '0.92rem', md: '1rem' },
                    }}
                  >
                    {area.spotsStage1}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Typography
              sx={{
                mt: 2.5,
                fontFamily: GEN_FONTS.mono,
                fontSize: '0.8rem',
                color: GEN_COLORS.amarilloSuave,
                lineHeight: 1.6,
              }}
            >
              {stage1Spots.specializedNote}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HackabotStage1;
