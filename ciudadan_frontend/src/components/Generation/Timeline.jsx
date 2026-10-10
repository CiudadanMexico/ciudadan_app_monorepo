/**
 * Timeline — timeline vertical genérico para hitos con fecha
 * (usado en Etapa 1 de Hackabot y otros calendarios del programa).
 * Los pasos son accesibles: la fecha es texto, no color-dependiente.
 */
import { Box, Typography } from '@mui/material';
import { GEN_COLORS, GEN_FONTS } from './GenerationTheme';

const Timeline = ({ steps = [] }) => (
  <Box
    component="ol"
    sx={{
      listStyle: 'none',
      m: 0,
      p: 0,
      position: 'relative',
      maxWidth: 760,
      '&::before': {
        content: '""',
        position: 'absolute',
        left: { xs: 10, sm: 12 },
        top: 8,
        bottom: 8,
        width: '1px',
        bgcolor: 'rgba(25,215,156,0.35)',
      },
    }}
  >
    {(steps || []).map((step) => (
      <Box
        component="li"
        key={step.date + step.label}
        sx={{ position: 'relative', pl: { xs: 4, sm: 5 }, pb: { xs: 2.5, md: 3 }, '&:last-child': { pb: 0 } }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: { xs: 4, sm: 7 },
            top: 10,
            width: { xs: 13, sm: 13 },
            height: 13,
            borderRadius: '50%',
            bgcolor: GEN_COLORS.fondo,
            border: `2px solid ${GEN_COLORS.verde}`,
          }}
        />
        <Typography
          sx={{
            fontFamily: GEN_FONTS.mono,
            fontSize: { xs: '0.75rem', md: '0.8rem' },
            letterSpacing: '0.12em',
            color: GEN_COLORS.amarilloSuave,
            textTransform: 'uppercase',
          }}
        >
          {step.date}
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            fontFamily: GEN_FONTS.display,
            fontWeight: 600,
            fontSize: { xs: '1rem', md: '1.1rem' },
            color: GEN_COLORS.texto,
            lineHeight: 1.4,
          }}
        >
          {step.label}
        </Typography>
        {step.detail && (
          <Typography sx={{ mt: 0.5, color: GEN_COLORS.textoSecundario, fontSize: { xs: '0.9rem', md: '0.95rem' }, lineHeight: 1.55 }}>
            {step.detail}
          </Typography>
        )}
      </Box>
    ))}
  </Box>
);

export default Timeline;
