import React from "react";
import { Grid2 as Grid, TextField, Typography } from "@mui/material";
import { useFormContext } from "react-hook-form";

const StepCuenta = ({ rules }) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Typography variant="h6" fontWeight={800}>
          Cuenta
        </Typography>
        <Typography variant="body2" sx={{ color: "#64748b", mb: 1 }}>
          Crea tu acceso para guardar y continuar el preregistro.
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Correo"
          {...register("email", rules.email)}
          error={Boolean(errors.email)}
          helperText={errors.email?.message || "Usaremos este correo para continuar tu avance."}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Contrasena"
          type="password"
          {...register("password", rules.password)}
          error={Boolean(errors.password)}
          helperText={errors.password?.message || "Minimo 8 caracteres."}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          fullWidth
          label="Telefono"
          inputMode="numeric"
          {...register("telefono", rules.telefono)}
          error={Boolean(errors.telefono)}
          helperText={errors.telefono?.message || "A 10 digitos."}
        />
      </Grid>
    </Grid>
  );
};

export default StepCuenta;
