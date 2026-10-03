/**
 * CitExplanation — explicación oficial de CIT (requisito 16: componente único).
 * Props: pool, vesting, example, rules, variant.
 *  - variant="full":  definición + reglas + consolidación + pool.
 *  - variant="compact": definición + reglas esenciales.
 * Nunca presenta CIT como dinero líquido garantizado.
 */
import { Box, Typography, Grid, Stack } from '@mui/material';
import CitVestingTimeline from './CitVestingTimeline';
import { GEN_COLORS, GEN_FONTS } from './GenerationTheme';

const RuleItem = ({ rule }) => (
  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
    <Box
      aria-hidden="true"
      component="span"
      sx={{ color: GEN_COLORS.verde, fontFamily: GEN_FONTS.mono, fontWeight: 700, mt: '2px' }}
    >
      ▸
    </Box>
    <Typography sx={{ color: GEN_COLORS.textoSecundario, lineHeight: 1.65, fontSize: { xs: '0.95rem', md: '1rem' } }}>
      {rule}
    </Typography>
  </Box>
);

const CitExplanation = ({
  pool,
  vesting,
  example,
  rules = [],
  variant = 'full',
  intro,
}) => {
  const rulesList = rules.length ? rules : undefined;

  return (
    <Box>
      <Typography
        sx={{
          color: GEN_COLORS.textoSecundario,
          lineHeight: 1.7,
          fontSize: { xs: '1rem', md: '1.1rem' },
          maxWidth: 780,
        }}
      >
        {intro || CIT_INTRO_DEFAULT}
      </Typography>

      <Box
        sx={{
          mt: 3,
          border: `1px solid ${GEN_COLORS.verde}`,
          borderRadius: 3,
          bgcolor: 'rgba(0,255,153,0.05)',
          p: { xs: 2.5, md: 3.5 },
        }}
      >
        <Typography
          sx={{
            fontFamily: GEN_FONTS.mono,
            fontSize: { xs: '0.72rem', md: '0.8rem' },
            letterSpacing: '0.2em',
            color: GEN_COLORS.amarilloSuave,
            textTransform: 'uppercase',
          }}
        >
          Concepto central
        </Typography>
        <Typography
          sx={{
            mt: 1,
            fontFamily: GEN_FONTS.display,
            fontWeight: 700,
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
            color: GEN_COLORS.texto,
          }}
        >
          ASIGNADO <Box component="span" sx={{ color: GEN_COLORS.verde }}>≠</Box> CONSOLIDADO
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: 3 }}>
        {(rulesList || []).map((rule) => (
          <Grid size={{ xs: 12, md: 6 }} key={rule}>
            <RuleItem rule={rule} />
          </Grid>
        ))}
      </Grid>

      {variant === 'full' && (
        <Box sx={{ mt: { xs: 5, md: 6 } }}>
          <Typography
            component="h3"
            sx={{
              fontFamily: GEN_FONTS.display,
              fontWeight: 700,
              fontSize: { xs: '1.15rem', md: '1.35rem' },
              color: GEN_COLORS.texto,
              mb: 2.5,
            }}
          >
            Consolidación por tercios
          </Typography>
          <CitVestingTimeline vesting={vesting} example={example} />

          {pool && (
            <Stack
              direction="row"
              spacing={2}
              flexWrap="wrap"
              sx={{ mt: 4 }}
            >
              <Typography sx={{ color: GEN_COLORS.textoSecundario }}>
                Pool del programa:{" "}
                <Box component="span" sx={{ fontWeight: 700, color: GEN_COLORS.verde, fontFamily: GEN_FONTS.display, fontSize: '1.15rem' }}>
                  {pool}
                </Box>
              </Typography>
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
};

/** Texto de definición por defecto — vive aquí para no repetirlo por página. */
export const CIT_INTRO_DEFAULT =
  'CIT es una unidad de participación dentro del proyecto. Reconoce aportación, constancia e impacto dentro del ecosistema Ciudadan.';

export default CitExplanation;
