/**
 * SectionHeader — eyebrow + título + subtítulo reutilizable.
 * Headings correctos: el título llega como <h2> (el <h1> vive en el hero).
 */
import { Box, Typography } from '@mui/material';
import { GEN_COLORS, GEN_FONTS } from './GenerationTheme';

const SectionHeader = ({ eyebrow, title, subtitle, align = 'left', sx }) => (
  <Box
    sx={{
      mb: { xs: 4, md: 6 },
      textAlign: align,
      ...(align === 'center' ? { mx: 'auto', maxWidth: 760 } : {}),
      ...sx,
    }}
  >
    {eyebrow && (
      <Typography
        component="p"
        sx={{
          fontFamily: GEN_FONTS.mono,
          fontSize: { xs: '0.7rem', md: '0.78rem' },
          letterSpacing: '0.22em',
          color: GEN_COLORS.verde,
          textTransform: 'uppercase',
          mb: 1.5,
        }}
      >
        {eyebrow}
      </Typography>
    )}
    <Typography
      variant="h2"
      sx={{
        fontFamily: GEN_FONTS.display,
        fontWeight: 700,
        fontSize: { xs: '1.6rem', sm: '2.1rem', md: '2.6rem' },
        lineHeight: 1.15,
        color: GEN_COLORS.texto,
      }}
    >
      {title}
    </Typography>
    {subtitle && (
      <Typography
        sx={{
          mt: 1.5,
          color: GEN_COLORS.textoSecundario,
          fontSize: { xs: '1rem', md: '1.1rem' },
          lineHeight: 1.6,
          maxWidth: 720,
          ...(align === 'center' ? { mx: 'auto' } : {}),
        }}
      >
        {subtitle}
      </Typography>
    )}
  </Box>
);

export default SectionHeader;
