/**
 * DiscordSection — sección "LA OFICINA SIGUE ABIERTA DE NOCHE".
 * La URL oficial de Discord se toma de la config central; si no existe
 * aún (PENDING en config), se muestra la sección sin botón de invitación
 * y sin inventar enlaces.
 */
import { Box, Typography, Grid, Button } from '@mui/material';
import { GEN_COLORS, GEN_FONTS } from './GenerationTheme';

const DiscordSection = ({ title, intro, features = [], inviteUrl, note, icon }) => (
  <Box
    sx={{
      border: `1px solid ${GEN_COLORS.borde}`,
      borderRadius: 4,
      bgcolor: 'rgba(88,101,242,0.06)',
      p: { xs: 3, md: 6 },
    }}
  >
    <Grid container spacing={{ xs: 3, md: 5 }} alignItems="center">
      <Grid size={{ xs: 12, md: 5 }}>
        {icon && (
          <Box
            aria-hidden="true"
            sx={{
              color: '#5865F2',
              mb: 2,
              '& svg, & .MuiSvgIcon-root': { fontSize: { xs: 40, md: 52 } },
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          variant="h2"
          sx={{
            fontFamily: GEN_FONTS.display,
            fontWeight: 700,
            fontSize: { xs: '1.5rem', sm: '1.9rem', md: '2.2rem' },
            lineHeight: 1.15,
            color: GEN_COLORS.texto,
          }}
        >
          {title}
        </Typography>
        {intro && (
          <Typography sx={{ mt: 2, color: GEN_COLORS.textoSecundario, lineHeight: 1.7, fontSize: { xs: '0.98rem', md: '1.05rem' } }}>
            {intro}
          </Typography>
        )}
        {note && (
          <Typography
            sx={{
              mt: 2.5,
              fontFamily: GEN_FONTS.mono,
              fontSize: '0.78rem',
              letterSpacing: '0.06em',
              color: GEN_COLORS.textoTenue,
            }}
          >
            {note}
          </Typography>
        )}
        {inviteUrl && (
          <Button
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            disableElevation
            sx={{
              mt: 3,
              bgcolor: '#5865F2',
              color: '#fff',
              fontWeight: 700,
              px: 3,
              py: 1.2,
              borderRadius: 999,
              fontSize: '0.9rem',
              '&:hover': { bgcolor: '#4752c4' },
            }}
          >
            Unirse al Discord
          </Button>
        )}
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <Grid container spacing={{ xs: 1.2, md: 1.8 }}>
          {features.map((feature) => (
            <Grid size={{ xs: 6, sm: 4 }} key={feature}>
              <Box
                sx={{
                  border: '1px solid rgba(88,101,242,0.35)',
                  borderRadius: 2,
                  bgcolor: 'rgba(88,101,242,0.08)',
                  px: 1.4,
                  py: 1.1,
                  color: GEN_COLORS.textoSecundario,
                  fontSize: { xs: '0.8rem', sm: '0.88rem' },
                  textAlign: 'center',
                  lineHeight: 1.35,
                }}
              >
                {feature}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  </Box>
);

export default DiscordSection;
