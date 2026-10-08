/**
 * HackabotCareers — carreras y diversidad disciplinaria (spec 7.12)
 * + cierre del primer año e incorporaciones extraordinarias (spec 7.13).
 * IMPORTANTE: CIT ganado ≠ incorporación extraordinaria; no se regalan CIT
 * por votación.
 */
import { Box, Typography, Grid, Stack } from '@mui/material';
import SectionHeader from '../SectionHeader';
import ImpactMetric from '../ImpactMetric';
import { GEN_COLORS, GEN_FONTS, sectionSx } from '../GenerationTheme';
import { HACKABOT } from '../../../config/generationFounderConfig';

const HackabotCareers = () => {
  const { careers, endOfFirstYear } = HACKABOT;

  return (
    <Box sx={sectionSx}>
      <SectionHeader eyebrow="Carreras" title={careers.message} subtitle={careers.detail} />

      <Grid container spacing={{ xs: 1.5, md: 2.5 }} sx={{ mb: { xs: 3, md: 4 } }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ImpactMetric
            value={`${careers.familyFamiliesTarget}+`}
            label="Grandes familias profesionales buscadas a lo largo de la Etapa 2"
            accentColor={GEN_COLORS.amarilloSuave}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <ImpactMetric
            value="1 · 2 · 3+"
            label="Colaboradores posibles por disciplina, según talento y necesidad"
          />
        </Grid>
      </Grid>

      <Typography sx={{ color: GEN_COLORS.textoSecundario, lineHeight: 1.7, fontSize: { xs: '0.98rem', md: '1.05rem' }, maxWidth: 780 }}>
        {careers.goalIntro} buscamos alrededor de {careers.familyFamiliesTarget} grandes familias profesionales durante la Etapa 2.
        {' '}{careers.perDisciplineNote}
      </Typography>

      <Box
        sx={{
          mt: { xs: 5, md: 7 },
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 3,
          bgcolor: 'rgba(255,255,255,0.03)',
          p: { xs: 2.5, md: 4 },
        }}
      >
        <Typography
          component="h3"
          sx={{ fontFamily: GEN_FONTS.display, fontWeight: 700, fontSize: { xs: '1.15rem', md: '1.3rem' }, color: GEN_COLORS.texto, mb: 1.5 }}
        >
          Fin del primer año
        </Typography>
        <Typography sx={{ color: GEN_COLORS.textoSecundario, lineHeight: 1.7, fontSize: { xs: '0.95rem', md: '1rem' } }}>
          {endOfFirstYear.intro}
        </Typography>
        <Stack spacing={1} sx={{ mt: 2.5 }}>
          {endOfFirstYear.warning.map((warn) => (
            <Box
              key={warn}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                border: `1px solid ${GEN_COLORS.amarillo}`,
                borderRadius: 2,
                bgcolor: 'rgba(245,196,0,0.06)',
                px: 2,
                py: 1.25,
              }}
            >
              <Box component="span" aria-hidden="true" sx={{ color: GEN_COLORS.amarilloSuave, fontWeight: 700 }}>
                ⚠
              </Box>
              <Typography sx={{ color: GEN_COLORS.texto, fontWeight: 600, fontSize: { xs: '0.92rem', md: '0.98rem' } }}>
                {warn}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default HackabotCareers;
