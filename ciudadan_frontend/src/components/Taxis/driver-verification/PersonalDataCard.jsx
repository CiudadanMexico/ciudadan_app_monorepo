import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Grid2 as Grid, Paper, Typography } from '@mui/material';

const Field = ({ label, value, mono = false }) => (
  <>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{ fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit' }}
    >
      {value || '—'}
    </Typography>
  </>
);

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('D MMM YYYY') : '—';
};

const PersonalDataRow = ({ label, value }) => (
  <Grid size={{ xs: 12, sm: 6 }}>
    <Field label={label} value={value} />
  </Grid>
);

const PersonalDataCard = ({ driver }) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Grid container spacing={2}>
      <PersonalDataRow label="Nombre completo" value={driver?.name} />
      <PersonalDataRow
        label="Fecha de nacimiento"
        value={formatDate(driver?.personal?.birthdate)}
      />
      <PersonalDataRow label="CURP" value={driver?.personal?.curp} />
      <PersonalDataRow label="RFC" value={driver?.personal?.rfc} />
      <PersonalDataRow label="Correo" value={driver?.contact?.email} />
      <PersonalDataRow label="Teléfono" value={driver?.contact?.phone} />
      <PersonalDataRow label="Teléfono de emergencia" value={driver?.contact?.emergencyPhone} />
      <PersonalDataRow label="Código postal" value={driver?.contact?.zipCode} />
      <PersonalDataRow label="Dirección" value={driver?.contact?.address} />
      <PersonalDataRow label="Estado" value={driver?.contact?.state} />
      <PersonalDataRow label="Municipio" value={driver?.contact?.municipality} />
    </Grid>
  </Paper>
);

Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  mono: PropTypes.bool,
};

PersonalDataRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
};

PersonalDataCard.propTypes = {
  driver: PropTypes.shape({
    name: PropTypes.string,
    personal: PropTypes.shape({
      birthdate: PropTypes.string,
      curp: PropTypes.string,
      rfc: PropTypes.string,
    }),
    contact: PropTypes.shape({
      email: PropTypes.string,
      phone: PropTypes.string,
      emergencyPhone: PropTypes.string,
      address: PropTypes.string,
      zipCode: PropTypes.string,
      state: PropTypes.string,
      municipality: PropTypes.string,
    }),
  }),
};

export default PersonalDataCard;
