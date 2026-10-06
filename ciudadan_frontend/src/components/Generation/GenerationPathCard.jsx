/**
 * GenerationPathCard — tarjeta de una vía de participación.
 * Hover sutil con CSS (sin animaciones pesadas). El icono llega como prop
 * node para mantener la configuración libre de imports de componentes.
 */
import { Card, CardActionArea, CardContent, Typography, Box, Stack } from '@mui/material';
import { GEN_COLORS, GEN_FONTS } from './GenerationTheme';

const GenerationPathCard = ({ label, short, cta, icon, onOpen, priority = false }) => (
  <Card
    sx={{
      bgcolor: 'rgba(255,255,255,0.04)',
      border: `1px solid ${GEN_COLORS.borde}`,
      borderRadius: 3,
      backdropFilter: 'blur(6px)',
      height: '100%',
      transition: 'transform 0.2s ease, border-color 0.2s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        borderColor: GEN_COLORS.verde,
      },
    }}
  >
    <CardActionArea
      onClick={onOpen}
      sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: { xs: 2.5, md: 3 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
          {icon && (
            <Box
              aria-hidden="true"
              sx={{
                color: GEN_COLORS.verde,
                display: 'inline-flex',
                '& svg, & .MuiSvgIcon-root': { fontSize: { xs: 26, md: 30 } },
              }}
            >
              {icon}
            </Box>
          )}
          {priority && (
            <Typography
              component="span"
              sx={{
                fontFamily: GEN_FONTS.mono,
                fontSize: '0.62rem',
                letterSpacing: '0.18em',
                color: GEN_COLORS.amarilloSuave,
                border: `1px solid ${GEN_COLORS.amarillo}`,
                borderRadius: 999,
                px: 1,
                py: 0.25,
                textTransform: 'uppercase',
              }}
            >
              Campaña activa
            </Typography>
          )}
        </Stack>

        <Typography
          component="h3"
          sx={{
            fontFamily: GEN_FONTS.display,
            fontWeight: 700,
            fontSize: { xs: '1.25rem', md: '1.45rem' },
            color: GEN_COLORS.texto,
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>

        <Typography sx={{ mt: 1, color: GEN_COLORS.textoSecundario, lineHeight: 1.6, fontSize: { xs: '0.95rem', md: '1rem' } }}>
          {short}
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Typography
          sx={{
            mt: 2.5,
            color: GEN_COLORS.verde,
            fontWeight: 700,
            fontSize: { xs: '0.85rem', md: '0.9rem' },
            letterSpacing: '0.06em',
            textAlign: 'left',
          }}
        >
          {cta} →
        </Typography>
      </CardContent>
    </CardActionArea>
  </Card>
);

export default GenerationPathCard;
