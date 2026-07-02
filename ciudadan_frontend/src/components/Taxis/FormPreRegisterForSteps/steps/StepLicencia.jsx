import React from "react";
import { Grid2 as Grid, MenuItem, TextField, Typography } from "@mui/material";
import { useFormContext } from "react-hook-form";

const tipoLicenciaOptions = [
  { value: "el", label: "EL" },
  { value: "a", label: "A" },
];

const StepLicencia = ({ rules }) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Typography variant="h6" fontWeight={800}>
          Datos de licencia
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          label="Numero de licencia"
          {...register("numero_licencia", rules.numero_licencia)}
          error={Boolean(errors.numero_licencia)}
          helperText={errors.numero_licencia?.message || " "}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        <TextField
          fullWidth
          select
          label="Tipo de licencia"
          {...register("tipo_licencia", rules.tipo_licencia)}
          error={Boolean(errors.tipo_licencia)}
          helperText={errors.tipo_licencia?.message || " "}
        >
          {tipoLicenciaOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          fullWidth
          type="date"
          label="Vigencia"
          InputLabelProps={{ shrink: true }}
          {...register("vigencia_licencia", rules.vigencia_licencia)}
          error={Boolean(errors.vigencia_licencia)}
          helperText={errors.vigencia_licencia?.message || " "}
        />
      </Grid>
    </Grid>
  );
};

export default StepLicencia;
