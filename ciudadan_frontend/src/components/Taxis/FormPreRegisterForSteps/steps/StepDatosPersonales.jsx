import React from "react";
import { Grid2 as Grid, MenuItem, TextField, Typography } from "@mui/material";
import { useFormContext } from "react-hook-form";

const sexoOptions = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "X", label: "Otro / Prefiero no decirlo" },
];

const field = (name, label, register, rules, errors, extra = {}) => (
  <TextField
    fullWidth
    label={label}
    {...register(name, rules[name])}
    error={Boolean(errors?.[name])}
    helperText={errors?.[name]?.message || " "}
    {...extra}
  />
);

const StepDatosPersonales = ({ rules }) => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Typography variant="h6" fontWeight={800}>
          Datos personales
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>{field("nombre", "Nombre", register, rules, errors)}</Grid>
      <Grid size={{ xs: 12, md: 4 }}>{field("apellido_paterno", "Apellido paterno", register, rules, errors)}</Grid>
      <Grid size={{ xs: 12, md: 4 }}>{field("apellido_materno", "Apellido materno", register, rules, errors)}</Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        {field("fecha_nacimiento", "Fecha de nacimiento", register, rules, errors, {
          type: "date",
          InputLabelProps: { shrink: true },
        })}
      </Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        <TextField
          fullWidth
          select
          label="Sexo"
          {...register("sexo", rules.sexo)}
          error={Boolean(errors?.sexo)}
          helperText={errors?.sexo?.message || " "}
        >
          {sexoOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        {field("curp", "CURP", register, rules, errors, { inputProps: { maxLength: 18 } })}
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        {field("rfc", "RFC", register, rules, errors, { inputProps: { maxLength: 13 } })}
      </Grid>
      <Grid size={{ xs: 12, md: 2 }}>
        {field("telefono_emergencia", "Telefono de emergencia", register, rules, errors)}
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>{field("direccion", "Direccion", register, rules, errors)}</Grid>
      <Grid size={{ xs: 12, md: 2 }}>{field("codigo_postal", "Codigo postal", register, rules, errors)}</Grid>
      <Grid size={{ xs: 12, md: 4 }}>{field("estado", "Estado", register, rules, errors)}</Grid>
      <Grid size={{ xs: 12, md: 4 }}>{field("municipio", "Municipio", register, rules, errors)}</Grid>
      <Grid size={{ xs: 12, md: 4 }}>{field("ciudad", "Ciudad", register, rules, errors)}</Grid>
    </Grid>
  );
};

export default StepDatosPersonales;
