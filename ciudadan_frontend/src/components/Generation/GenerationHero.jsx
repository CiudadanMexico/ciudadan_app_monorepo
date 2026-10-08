/**
 * GenerationHero — ResponsiveHero + contenido estructurado (título, tagline,
 * intro y CTAs). Todo el texto vive en HTML sobre la imagen, nunca incrustado.
 */
import { Stack, Typography, Button, Box } from '@mui/material';
import ResponsiveHero from './ResponsiveHero';
import { GEN_COLORS, GEN_FONTS, ctaPrimarySx, ctaSecondarySx } from './GenerationTheme';

const GenerationHero = ({
  asset,
  priority = false,
  eyebrow,
  title,
  titleAccent,
  tagline,
  intro,
  ctaPrimary,
  ctaSecondary,
  overlay,
  minHeightSx,
}) => (
  <ResponsiveHero asset={asset} priority={priority} overlay={overlay} minHeightSx={minHeightSx}>
    <Stack spacing={{ xs: 2, md: 3 }}>
      {eyebrow && (
        <Typography
          component="p"
          sx={{
            fontFamily: GEN_FONTS.mono,
            fontSize: { xs: '0.72rem', md: '0.82rem' },
            letterSpacing: '0.24em',
            color: GEN_COLORS.verdeNeon,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </Typography>
      )}

      <Typography
        variant="h1"
        sx={{
          fontFamily: GEN_FONTS.display,
          fontWeight: 700,
          fontSize: { xs: '2.1rem', sm: '3rem', md: '4rem' },
          lineHeight: 1.05,
          color: GEN_COLORS.texto,
          textWrap: 'balance',
        }}
      >
        {title}
        {titleAccent && (
          <Box component="span" sx={{ color: GEN_COLORS.verde, display: 'block' }}>
            {titleAccent}
          </Box>
        )}
      </Typography>

      {tagline && (
        <Typography
          sx={{
            fontFamily: GEN_FONTS.display,
            fontWeight: 600,
            fontSize: { xs: '1.05rem', sm: '1.25rem', md: '1.5rem' },
            color: GEN_COLORS.amarilloSuave,
            lineHeight: 1.25,
            letterSpacing: '0.02em',
          }}
        >
          {tagline}
        </Typography>
      )}

      {intro && (
        <Typography
          sx={{
            color: GEN_COLORS.textoSecundario,
            fontSize: { xs: '1rem', md: '1.15rem' },
            lineHeight: 1.65,
            maxWidth: 620,
          }}
        >
          {intro}
        </Typography>
      )}

      {(ctaPrimary || ctaSecondary) && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.5, sm: 2 }}
          sx={{ pt: { xs: 1, md: 2 } }}
        >
          {ctaPrimary?.label && (
            <Button
              href={ctaPrimary.href}
              onClick={ctaPrimary.onClick}
              variant="contained"
              disableElevation
              sx={ctaPrimarySx}
            >
              {ctaPrimary.label}
            </Button>
          )}
          {ctaSecondary?.label && (
            <Button
              href={ctaSecondary.href}
              onClick={ctaSecondary.onClick}
              variant="text"
              sx={ctaSecondarySx}
            >
              {ctaSecondary.label}
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  </ResponsiveHero>
);

export default GenerationHero;
