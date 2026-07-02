import React from 'react';
import PropTypes from 'prop-types';
import { Grid2 as Grid, Paper, Typography } from '@mui/material';

const Field = ({ label, value, mono = false }) => (
  <>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit' }}>
      {value || '—'}
    </Typography>
  </>
);

const VehicleDataCard = ({ vehicle }) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Field label="Marca" value={vehicle?.brand} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Field label="Modelo" value={vehicle?.model} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Field label="Año" value={vehicle?.year} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Field label="Placas" value={vehicle?.plates} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Field label="Color" value={vehicle?.color} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Field label="VIN" value={vehicle?.vin} mono />
      </Grid>
    </Grid>
  </Paper>
);

Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  mono: PropTypes.bool,
};

VehicleDataCard.propTypes = {
  vehicle: PropTypes.shape({
    brand: PropTypes.string,
    model: PropTypes.string,
    year: PropTypes.string,
    plates: PropTypes.string,
    color: PropTypes.string,
    vin: PropTypes.string,
  }),
};

export default VehicleDataCard;
