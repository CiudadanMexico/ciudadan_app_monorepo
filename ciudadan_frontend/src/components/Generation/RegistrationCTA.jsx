/**
 * RegistrationCTA — cierre de página: texto + botón hacia el registro
 * de la vía correspondiente. Conserva los UTMs en la navegación.
 */
import { Box, Button, Typography, Stack } from '@mui/material';
import { buildRegistroUrl } from '../../config/generationFounderConfig';
import { ctaPrimarySx, GEN_COLORS, GEN_FONTS } from './GenerationTheme';

const RegistrationCTA = ({
  text,
  buttonLabel,
  via = 'general',
  secondary,
  sx,
}) => (
  <Box
    sx={{
      maxWidth: 1120,
      mx: 'auto',
      px: { xs: 2, sm: 3, md: 4 },
      py: { xs: 6, md: 10 },
      ...sx,
    }}
  >
    <Box
      sx={{
        border: `1px solid ${GEN_COLORS.verde}`,
        borderRadius: 4,
        bgcolor: 'rgba(0,255,153,0.05)',
        px: { xs: 3, md: 8 },
        py: { xs: 5, md: 7 },
        textAlign: 'center',
        boxShadow: '0 0 40px rgba(25,215,156,0.12) inset',
      }}
    >
      {text && (
        <Typography
          variant="h2"
          sx={{
            fontFamily: GEN_FONTS.display,
            fontWeight: 700,
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            color: GEN_COLORS.texto,
            lineHeight: 1.2,
            mb: 3,
          }}
        >
          {text}
        </Typography>
      )}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 2 }}
        justifyContent="center"
      >
        <Button href={buildRegistroUrl(via)} variant="contained" disableElevation sx={ctaPrimarySx}>
          {buttonLabel}
        </Button>
        {secondary?.label && (
          <Button href={secondary.href} variant="text" sx={{ ...ctaPrimarySx, bgcolor: 'transparent', color: GEN_COLORS.texto, boxShadow: 'none', border: `1px solid ${GEN_COLORS.borde}`, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
            {secondary.label}
          </Button>
        )}
      </Stack>
    </Box>
  </Box>
);

export default RegistrationCTA;
