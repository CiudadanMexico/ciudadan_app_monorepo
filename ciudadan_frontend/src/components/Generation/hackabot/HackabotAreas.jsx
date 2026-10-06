/**
 * HackabotAreas — las 5 áreas generales de Hackabot (spec 7.3)
 * con sus 3 lugares por área en Etapa 1 (spec 7.5).
 */
import { Box, Grid } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import HandshakeIcon from '@mui/icons-material/Handshake';
import SectionHeader from '../SectionHeader';
import ProgramAreaCard from '../ProgramAreaCard';
import { sectionSx } from '../GenerationTheme';
import { HACKABOT } from '../../../config/generationFounderConfig';

const AREA_ICONS = {
  software: <CodeIcon />,
  tecnica: <BuildIcon />,
  administracion: <AdminPanelSettingsIcon />,
  multimedia: <MovieFilterIcon />,
  'comercial-humanidades': <HandshakeIcon />,
};

const HackabotAreas = () => (
  <Box sx={sectionSx}>
    <SectionHeader
      eyebrow="Áreas generales"
      title="Cinco maneras de construir"
      subtitle={`${HACKABOT.stage1Spots.perArea} lugares por área en Etapa 1. Elige la tuya.`}
    />
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {HACKABOT.areas.map((area) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={area.id}>
          <ProgramAreaCard
            name={area.name}
            description={area.description}
            spots={area.spotsStage1}
            icon={AREA_ICONS[area.id]}
          />
        </Grid>
      ))}
    </Grid>
  </Box>
);

export default HackabotAreas;
