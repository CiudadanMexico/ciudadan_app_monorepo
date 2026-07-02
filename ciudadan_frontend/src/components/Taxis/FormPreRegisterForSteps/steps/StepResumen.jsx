import React from 'react';
import { Alert, Box, Button, Grid2 as Grid, Paper, Stack, Typography } from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { format } from 'date-fns';
import { FaCheckCircle } from 'react-icons/fa';

const pretty = (value) => {
  if (!value && value !== 0) return '—';
  if (Array.isArray(value)) return `${value.length} archivo(s)`;
  if (value?.name) return value.name;
  if (typeof value === 'string' && value.includes('T')) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return format(d, 'dd/MM/yyyy HH:mm');
  }
  return String(value);
};

const blocks = [
  { title: 'Cuenta', fields: ['email', 'telefono'] },
  {
    title: 'Personales',
    fields: ['nombre', 'apellido_paterno', 'curp', 'rfc', 'ciudad', 'estado'],
  },
  { title: 'Licencia', fields: ['numero_licencia', 'tipo_licencia', 'vigencia_licencia'] },
  { title: 'Vehiculo', fields: ['marca', 'modelo', 'anio', 'placas', 'numero_serie_vin'] },
  { title: 'Cita', fields: ['fecha', 'sede'] },
];

const StepResumen = ({ onEditStep }) => {
  const { getValues } = useFormContext();
  const values = getValues();
  console.log('values', values);
  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Revisa la información antes de confirmar. Puedes regresar y editar cualquier paso.
      </Alert>
      <Grid container spacing={2}>
        {blocks.map((block) => (
          <Grid size={{ xs: 12, md: 6 }} key={block.title}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Typography fontWeight={800} sx={{ mb: 1 }}>
                {block.title}
              </Typography>
              <Stack spacing={0.5}>
                {block.fields.map((field) => (
                  <Stack key={field} direction="row" spacing={0.8} alignItems="center">
                    <Typography variant="body2" sx={{ color: '#334155' }}>
                      <strong>{field}:</strong> {pretty(values[field])}
                    </Typography>
                    {field === 'telefono' && values.phoneVerified ? (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 0.9,
                          py: 0.2,
                          borderRadius: 99,
                          bgcolor: 'rgba(27,179,88,0.12)',
                          color: '#0F6E56',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        <FaCheckCircle size={10} />
                        Verificado
                      </Box>
                    ) : null}
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Stack direction="row" gap={1} useFlexGap flexWrap="wrap">
        <Button size="small" variant="text" onClick={() => onEditStep('personales')}>
          Editar personales
        </Button>
        <Button size="small" variant="text" onClick={() => onEditStep('documentos')}>
          Editar documentos
        </Button>
        <Button size="small" variant="text" onClick={() => onEditStep('cita')}>
          Editar cita
        </Button>
      </Stack>
    </Stack>
  );
};

export default StepResumen;
