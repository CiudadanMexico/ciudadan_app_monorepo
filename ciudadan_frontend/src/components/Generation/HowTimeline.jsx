/**
 * HowTimeline — flujo CÓMO FUNCIONA (ELIGE TU VÍA → … → INCORPÓRATE A CIUDADAN).
 * Vertical con línea conectora; en desktop se distribuye en 3 columnas
 * manteniendo el orden visual por número.
 */
import { Box, Typography, Grid } from '@mui/material';
import { GEN_COLORS, GEN_FONTS } from './GenerationTheme';

const Step = ({ label, index }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
    <Box
      aria-hidden="true"
      sx={{
        flexShrink: 0,
        width: 34,
        height: 34,
        borderRadius: '50%',
        border: `1px solid ${GEN_COLORS.verde}`,
        color: GEN_COLORS.verde,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: GEN_FONTS.mono,
        fontSize: '0.9rem',
        bgcolor: 'rgba(0,255,153,0.08)',
      }}
    >
      {String(index + 1).padStart(2, '0')}
    </Box>
    <Typography
      sx={{
        pt: 0.4,
        fontFamily: GEN_FONTS.display,
        fontWeight: 600,
        fontSize: { xs: '0.95rem', md: '1.05rem' },
        color: GEN_COLORS.texto,
        lineHeight: 1.4,
        letterSpacing: '0.02em',
      }}
    >
      {label}
    </Typography>
  </Box>
);

const HowTimeline = ({ steps }) => (
  <Grid container spacing={{ xs: 2.5, md: 5 }} alignItems="stretch">
    {(steps || []).map((label, i) => (
      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={label} sx={{ display: 'flex' }}>
        <Box sx={{ width: '100%' }}>
          <Step label={label} index={i} />
        </Box>
      </Grid>
    ))}
  </Grid>
);

export default HowTimeline;
