import React from 'react';
import { Grid2 as Grid, MenuItem, TextField, Typography } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { format } from 'date-fns';

const StepCitaPresencial = ({ rules, agencies = [] }) => {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext();

  const selected = watch('fecha');

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Typography variant="h6" fontWeight={800}>
          Cita presencial
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Agenda una cita para validar tus documentos originales.
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          type="datetime-local"
          label="Fecha y hora"
          InputLabelProps={{ shrink: true }}
          {...register('fecha', rules.fecha)}
          error={Boolean(errors.fecha)}
          helperText={
            errors.fecha?.message ||
            (selected ? `Seleccionada: ${format(new Date(selected), 'dd/MM/yyyy HH:mm')}` : ' ')
          }
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          select
          label="Sede"
          defaultValue=""
          {...register('sede', rules.sede)}
          error={Boolean(errors.sede)}
          helperText={errors.sede?.message || 'Selecciona la agencia donde asistirás.'}
        >
          {agencies.map((agency) => (
            <MenuItem key={agency.id} value={agency.id}>
              {agency.nombre}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    </Grid>
  );
};

export default StepCitaPresencial;
