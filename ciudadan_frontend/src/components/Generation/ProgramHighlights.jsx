/**
 * ProgramHighlights — lista compacta de destacados (chips con borde).
 * Usada en "Qué es Hackabot", elegibilidad, etc.
 */
import { Box, Typography } from '@mui/material';
import { GEN_COLORS } from './GenerationTheme';

const ProgramHighlights = ({ items = [], color }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2 }}>
    {items.map((item) => (
      <Typography
        key={item}
        component="span"
        sx={{
          border: `1px solid ${color || GEN_COLORS.borde}`,
          borderRadius: 999,
          px: { xs: 1.6, md: 2 },
          py: { xs: 0.6, md: 0.75 },
          color: GEN_COLORS.textoSecundario,
          bgcolor: 'rgba(255,255,255,0.03)',
          fontSize: { xs: '0.82rem', md: '0.9rem' },
          lineHeight: 1.4,
        }}
      >
        {item}
      </Typography>
    ))}
  </Box>
);

export default ProgramHighlights;
