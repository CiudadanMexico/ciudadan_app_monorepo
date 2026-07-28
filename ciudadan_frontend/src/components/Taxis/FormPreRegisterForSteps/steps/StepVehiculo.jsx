import React from 'react';
import { Grid2 as Grid, MenuItem, TextField, Typography } from '@mui/material';
import { useFormContext } from 'react-hook-form';

const tipoVehiculoOptions = [
  { value: 'taxi', label: 'Taxi' },
  { value: 'bus', label: 'Bus' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'camion', label: 'Camion' },
  { value: 'moto', label: 'Moto' },
  { value: 'bicicleta', label: 'Bicicleta' },
];

const StepVehiculo = ({ rules }) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Typography variant="h6" fontWeight={800}>
          Datos del vehiculo
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <TextField
          fullWidth
          label="Marca"
          {...register('marca', rules.marca)}
          error={Boolean(errors.marca)}
          helperText={errors.marca?.message || ' '}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <TextField
          fullWidth
          label="Modelo"
          {...register('modelo', rules.modelo)}
          error={Boolean(errors.modelo)}
          helperText={errors.modelo?.message || ' '}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        <TextField
          fullWidth
          label="Año"
          {...register('anio', rules.anio)}
          error={Boolean(errors.anio)}
          helperText={errors.anio?.message || ' '}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        <TextField
          fullWidth
          label="Color"
          {...register('color', rules.color)}
          error={Boolean(errors.color)}
          helperText={errors.color?.message || ' '}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        <TextField
          fullWidth
          label="Capacidad"
          {...register('capacidad_pasajeros', rules.capacidad_pasajeros)}
          error={Boolean(errors.capacidad_pasajeros)}
          helperText={errors.capacidad_pasajeros?.message || ' '}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Placas"
          {...register('placas', rules.placas)}
          error={Boolean(errors.placas)}
          helperText={errors.placas?.message || ' '}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="VIN / numero de serie"
          {...register('numero_serie_vin', rules.numero_serie_vin)}
          error={Boolean(errors.numero_serie_vin)}
          helperText={errors.numero_serie_vin?.message || ' '}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          select
          label="Tipo de vehiculo"
          {...register('tipo_vehiculo', rules.tipo_vehiculo)}
          error={Boolean(errors.tipo_vehiculo)}
          helperText={errors.tipo_vehiculo?.message || ' '}
        >
          {tipoVehiculoOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    </Grid>
  );
};

export default StepVehiculo;
