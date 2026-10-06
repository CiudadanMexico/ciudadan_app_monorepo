/**
 * HackabotActivity — compromiso de actividad (spec 7.8).
 * Mínimo 15 horas semanales; no se evalúa por estar conectado.
 */
import { Box, Typography, Grid } from '@mui/material';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SectionHeader from '../SectionHeader';
import { GEN_COLORS, GEN_FONTS, sectionSx } from '../GenerationTheme';
import { HACKABOT } from '../../../config/generationFounderConfig';

const HackabotActivity = () => {
  const { activity } = HACKABOT;

  return (
    <Box sx={sectionSx}>
      <SectionHeader eyebrow="Actividad" title="Cómo se trabaja y cómo se evalúa" />

      <Grid container spacing={{ xs: 3, md: 6 }} alignItems="stretch">
        <Grid size={{ xs: 12, md: 5 }}>
          <Box
            sx={{
              border: `1px solid ${GEN_COLORS.verde}`,
              borderRadius: 3,
              bgcolor: 'rgba(0,255,153,0.05)',
              p: { xs: 3, md: 4 },
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <ScheduleIcon sx={{ fontSize: 40, color: GEN_COLORS.verde, mb: 1.5 }} />
            <Typography
              sx={{
                fontFamily: GEN_FONTS.display,
                fontWeight: 700,
                fontSize: { xs: '1.6rem', md: '2rem' },
                color: GEN_COLORS.texto,
                lineHeight: 1.1,
              }}
            >
              Mínimo
            </Typography>
            <Typography
              sx={{
                fontFamily: GEN_FONTS.display,
                fontWeight: 700,
                fontSize: { xs: '2.2rem', md: '2.8rem' },
                color: GEN_COLORS.verde,
                lineHeight: 1.1,
              }}
            >
              {activity.weeklyHours} HORAS
            </Typography>
            <Typography
              sx={{
                fontFamily: GEN_FONTS.mono,
                fontSize: '0.85rem',
                letterSpacing: '0.14em',
                color: GEN_COLORS.textoSecundario,
                mt: 0.5,
              }}
            >
              SEMANALES
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Typography
            sx={{
              color: GEN_COLORS.texto,
              fontWeight: 600,
              fontSize: { xs: '1.05rem', md: '1.2rem' },
              lineHeight: 1.5,
            }}
          >
            {activity.evaluationIntro}
          </Typography>
          <Grid container spacing={1.5} sx={{ mt: 2 }}>
            {activity.criteria.map((criterio) => (
              <Grid size={{ xs: 6, sm: 4 }} key={criterio}>
                <Box
                  sx={{
                    border: '1px solid rgba(255,255,255,0.14)',
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    px: 1.5,
                    py: 1.25,
                    textAlign: 'center',
                  }}
                >
                  <Typography sx={{ color: GEN_COLORS.textoSecundario, fontWeight: 600, fontSize: { xs: '0.88rem', md: '0.95rem' } }}>
                    {criterio}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HackabotActivity;
