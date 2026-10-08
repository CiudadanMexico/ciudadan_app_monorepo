/**
 * ProgramStats — fila de métricas del programa (grid de ImpactMetric).
 */
import { Grid } from '@mui/material';
import ImpactMetric from './ImpactMetric';

const ProgramStats = ({ stats, accentColor }) => (
  <Grid container spacing={{ xs: 1.5, md: 2.5 }}>
    {(stats || []).map((stat) => (
      <Grid size={{ xs: 6, md: 3 }} key={stat.label}>
        <ImpactMetric value={stat.value} label={stat.label} accentColor={accentColor} />
      </Grid>
    ))}
  </Grid>
);

export default ProgramStats;
