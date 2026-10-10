/**
 * FounderPathSelector — grid con las 4 vías de la Generación Fundadora.
 * Al abrir una vía navega a su landing y emite generation_path_selected.
 */
import { Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GenerationPathCard from './GenerationPathCard';
import { GENERATION_PATHS } from '../../config/generationFounderConfig';
import { trackGenerationEvent, generationEvents } from '../../utils/generationAnalytics';

const FounderPathSelector = ({ paths = GENERATION_PATHS, icons = {} }) => {
  const navigate = useNavigate();

  const openPath = (path) => {
    trackGenerationEvent(generationEvents.pathSelected, { via: path.id });
    navigate(path.route);
  };

  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      {paths.map((path) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={path.id}>
          <GenerationPathCard
            label={path.label}
            short={path.short}
            cta={path.cta}
            icon={icons[path.id]}
            priority={path.priority}
            onOpen={() => openPath(path)}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default FounderPathSelector;
