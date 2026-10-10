/**
 * HackabotWhatIs — qué es Hackabot (spec 7.2).
 * Texto compacto + destacados. Sin duplicar números del programa.
 */
import { Box, Typography } from '@mui/material';
import SectionHeader from '../SectionHeader';
import ProgramHighlights from '../ProgramHighlights';
import { GEN_COLORS, GEN_FONTS, sectionSx } from '../GenerationTheme';
import { HACKABOT } from '../../../config/generationFounderConfig';

const HackabotWhatIs = () => (
  <Box sx={sectionSx}>
    <SectionHeader eyebrow="Qué es Hackabot" title="Una cantera permanente de talento" />
    <Typography
      sx={{
        color: GEN_COLORS.textoSecundario,
        fontSize: { xs: '1.05rem', md: '1.25rem' },
        lineHeight: 1.7,
        maxWidth: 820,
      }}
    >
      {HACKABOT.whatIsIt}
    </Typography>
    <Box sx={{ mt: 3.5 }}>
      <Typography
        component="p"
        sx={{
          fontFamily: GEN_FONTS.mono,
          fontSize: { xs: '0.72rem', md: '0.78rem' },
          letterSpacing: '0.2em',
          color: GEN_COLORS.textoTenue,
          textTransform: 'uppercase',
          mb: 1.5,
        }}
      >
        Para quién es
      </Typography>
      <ProgramHighlights items={HACKABOT.highlights} />
    </Box>
  </Box>
);

export default HackabotWhatIs;
