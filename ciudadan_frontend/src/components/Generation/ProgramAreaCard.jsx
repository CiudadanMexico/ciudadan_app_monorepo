/**
 * ProgramAreaCard — tarjeta de área general de Hackabot
 * (Software, Técnica, Administración, Multimedia, Comercial/Humanidades).
 */
import { Box, Typography } from '@mui/material';
import { GEN_COLORS, GEN_FONTS } from './GenerationTheme';

const ProgramAreaCard = ({ name, description, spots, icon }) => (
  <Box
    sx={{
      bgcolor: 'rgba(255,255,255,0.04)',
      border: `1px solid ${GEN_COLORS.borde}`,
      borderRadius: 3,
      p: { xs: 2.5, md: 3 },
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 0.2s ease',
      '&:hover': { borderColor: GEN_COLORS.verde },
    }}
  >
    <Box
      aria-hidden="true"
      sx={{ color: GEN_COLORS.verde, mb: 1.5, '& svg, & .MuiSvgIcon-root': { fontSize: { xs: 26, md: 30 } } }}
    >
      {icon}
    </Box>
    <Typography
      component="h3"
      sx={{
        fontFamily: GEN_FONTS.display,
        fontWeight: 700,
        fontSize: { xs: '1.1rem', md: '1.2rem' },
        color: GEN_COLORS.texto,
      }}
    >
      {name}
    </Typography>
    <Typography sx={{ mt: 1, color: GEN_COLORS.textoSecundario, lineHeight: 1.6, fontSize: { xs: '0.92rem', md: '0.98rem' } }}>
      {description}
    </Typography>
    <Box sx={{ flexGrow: 1 }} />
    {spots ? (
      <Typography
        sx={{
          mt: 2,
          fontFamily: GEN_FONTS.mono,
          fontSize: '0.75rem',
          letterSpacing: '0.08em',
          color: GEN_COLORS.amarilloSuave,
        }}
      >
        {spots} lugares · Etapa 1
      </Typography>
    ) : null}
  </Box>
);

export default ProgramAreaCard;
