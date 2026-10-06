/**
 * HackabotStage1Cit — CIT de Etapa 1 (spec 7.6) y consolidación (spec 7.7).
 * Los números provienen de HACKABOT.stage1Cit y CIT (config central).
 */
import { Box, Typography, Stack, Grid } from '@mui/material';
import SectionHeader from '../SectionHeader';
import ProgramStats from '../ProgramStats';
import CitExplanation from '../CitExplanation';
import { GEN_COLORS, GEN_FONTS, sectionSx } from '../GenerationTheme';
import { HACKABOT, CIT } from '../../../config/generationFounderConfig';

const HackabotStage1Cit = () => {
  const { stage1Cit, stage1Spots } = HACKABOT;

  const citStats = [
    { label: 'Pool total Etapa 1', value: `${stage1Cit.pool} CIT` },
    { label: 'Por cada área', value: `${stage1Cit.perAreaTotal} CIT` },
    { label: '5 áreas', value: `${stage1Cit.areasTotal} CIT` },
    { label: 'Perfiles especializados', value: `${stage1Cit.specializedTotal} CIT` },
  ];

  return (
    <Box sx={sectionSx}>
      <SectionHeader
        eyebrow="Reconocimiento"
        title="CIT · Etapa 1"
        subtitle={`Pool de ${stage1Cit.pool} CIT: ${stage1Cit.perAreaTotal} por área × 5 áreas, más perfiles especializados.`}
      />

      <ProgramStats stats={citStats} />

      {/* Premios por área */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: { xs: 3, md: 4 } }}>
        {HACKABOT.areas.map((area) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={area.id}>
            <Box
              sx={{
                border: `1px solid ${GEN_COLORS.borde}`,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.03)',
                p: { xs: 2.5, md: 3 },
              }}
            >
              <Typography
                sx={{ fontFamily: GEN_FONTS.display, fontWeight: 600, color: GEN_COLORS.texto, fontSize: '1rem' }}
              >
                {area.name}
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                {stage1Cit.areaPrizes.map((prize) => (
                  <Stack key={prize.place} direction="row" justifyContent="space-between">
                    <Typography sx={{ color: GEN_COLORS.textoSecundario, fontSize: '0.9rem' }}>
                      {prize.place}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: GEN_FONTS.mono,
                        color: GEN_COLORS.amarilloSuave,
                        fontWeight: 700,
                        fontSize: '0.9rem',
                      }}
                    >
                      {prize.cit} CIT
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Grid>
        ))}

        {/* Perfiles especializados (configurables) */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box
            sx={{
              border: `1px dashed ${GEN_COLORS.amarillo}`,
              borderRadius: 3,
              bgcolor: 'rgba(245,196,0,0.04)',
              p: { xs: 2.5, md: 3 },
              height: '100%',
            }}
          >
            <Typography
              sx={{ fontFamily: GEN_FONTS.display, fontWeight: 600, color: GEN_COLORS.texto, fontSize: '1rem' }}
            >
              Perfiles especializados
            </Typography>
            <Typography
              sx={{
                mt: 1.5,
                fontFamily: GEN_FONTS.mono,
                color: GEN_COLORS.amarilloSuave,
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              aprox. {stage1Spots.specializedProfilesCount} × {stage1Cit.specializedCitEach} CIT ={' '}
              {stage1Cit.specializedTotal} CIT
            </Typography>
            <Typography sx={{ mt: 1, color: GEN_COLORS.textoTenue, fontSize: '0.8rem', lineHeight: 1.5 }}>
              Configurables: se abren según las necesidades actuales del proyecto.
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Consolidación por tercios */}
      <Box sx={{ mt: { xs: 6, md: 9 } }}>
        <CitExplanation
          variant="full"
          intro={CIT.keyConceptDetail}
          rules={CIT.rules}
          vesting={CIT.vesting}
          example={CIT.example}
          pool={`Etapa 1: ${stage1Cit.pool} CIT`}
        />
      </Box>
    </Box>
  );
};

export default HackabotStage1Cit;
