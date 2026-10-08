/**
 * CitVestingTimeline — timeline visual de consolidación por tercios
 * (2 meses → 1/3, 6 meses → 1/3, 12 meses → 1/3) con ejemplo desglosado.
 * Los datos provienen de CIT.vesting / CIT.example en la config central.
 */
import { Box, Typography, Stack, Grid } from '@mui/material';
import { GEN_COLORS, GEN_FONTS } from './GenerationTheme';

const CitVestingTimeline = ({ vesting = [], example }) => (
  <Box>
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {(vesting || []).map((step, i) => (
        <Grid size={{ xs: 12, sm: 4 }} key={step.label}>
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
              sx={{ fontFamily: GEN_FONTS.mono, fontSize: '0.7rem', letterSpacing: '0.2em', color: GEN_COLORS.textoTenue, textTransform: 'uppercase' }}
            >
              {step.at}
            </Typography>
            <Typography
              sx={{
                mt: 1,
                fontFamily: GEN_FONTS.display,
                fontWeight: 700,
                fontSize: { xs: '2rem', md: '2.4rem' },
                color: GEN_COLORS.amarilloSuave,
                lineHeight: 1,
              }}
            >
              {step.fraction}
            </Typography>
            <Typography sx={{ mt: 1, color: GEN_COLORS.textoSecundario, fontSize: '0.9rem' }}>
              {step.label}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>

    {example && (
      <Stack
        direction="row"
        spacing={{ xs: 1.5, sm: 2 }}
        justifyContent="center"
        alignItems="center"
        flexWrap="wrap"
        sx={{ mt: { xs: 3, md: 4 } }}
      >
        <Typography
          sx={{
            fontFamily: GEN_FONTS.display,
            fontWeight: 700,
            fontSize: { xs: '1.3rem', md: '1.6rem' },
            color: GEN_COLORS.verde,
          }}
        >
          {example.amount} CIT
        </Typography>
        <Typography sx={{ color: GEN_COLORS.textoSecundario, fontSize: { xs: '1.1rem', md: '1.3rem' } }}>=</Typography>
        {example.parts.map((part, i) => (
          <Stack key={i} direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="center">
            <Box
              sx={{
                border: `1px solid ${GEN_COLORS.verde}`,
                borderRadius: 2,
                px: { xs: 1.6, md: 2 },
                py: { xs: 0.8, md: 1 },
                color: GEN_COLORS.texto,
                fontFamily: GEN_FONTS.mono,
                fontSize: { xs: '1rem', md: '1.2rem' },
              }}
            >
              {part}
            </Box>
            {i < example.parts.length - 1 && (
              <Typography sx={{ color: GEN_COLORS.textoSecundario }}>+</Typography>
            )}
          </Stack>
        ))}
        <Typography sx={{ color: GEN_COLORS.textoTenue, fontSize: '0.85rem', width: '100%', textAlign: 'center', mt: 1 }}>
          {example.note}
        </Typography>
      </Stack>
    )}
  </Box>
);

export default CitVestingTimeline;
