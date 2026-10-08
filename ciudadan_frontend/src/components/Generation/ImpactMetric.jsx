/**
 * ImpactMetric — métrica destacada (valor grande + etiqueta).
 */
import { Box, Typography } from '@mui/material';
import { GEN_COLORS, GEN_FONTS } from './GenerationTheme';

const ImpactMetric = ({ value, label, accentColor }) => (
  <Box
    sx={{
      border: `1px solid ${GEN_COLORS.borde}`,
      borderRadius: 3,
      bgcolor: 'rgba(255,255,255,0.03)',
      px: { xs: 2, md: 3 },
      py: { xs: 2.5, md: 3 },
      textAlign: 'center',
      height: '100%',
    }}
  >
    <Typography
      sx={{
        fontFamily: GEN_FONTS.display,
        fontWeight: 700,
        fontSize: { xs: '1.6rem', md: '2rem' },
        lineHeight: 1.1,
        color: accentColor || GEN_COLORS.verde,
      }}
    >
      {value}
    </Typography>
    <Typography
      sx={{
        mt: 1,
        color: GEN_COLORS.textoSecundario,
        fontSize: { xs: '0.85rem', md: '0.95rem' },
        lineHeight: 1.45,
      }}
    >
      {label}
    </Typography>
  </Box>
);

export default ImpactMetric;
