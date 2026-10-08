import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';

const neonGreen = '#00ff99';
const darkGray = '#1a1a1a';

// docs/COWORK-VERIFICACION-CONDUCTORES-FASES.md: CoWork solo aporta el
// rol/acceso del auditor; el contenido real (lista de casos, checklist de
// auditoría, resultado) lo sirve el módulo de Taxis, igual que
// ConductoresAgencia.jsx delega en DriverVerificationPage.jsx. Este
// componente es intencionalmente un placeholder honesto hasta que exista
// el endpoint de Taxis para listar casos pendientes de auditar.
const Auditorias = () => (
  <Box sx={{ mt: 2 }}>
    <Typography variant="h6" sx={{ mb: 2, color: 'white', fontWeight: 600 }}>
      Auditorías
    </Typography>
    <Paper
      sx={{
        p: 3,
        bgcolor: darkGray,
        color: 'white',
        border: `1px solid ${neonGreen}`,
        borderRadius: 2,
        textAlign: 'center',
      }}
    >
      <FactCheckIcon sx={{ fontSize: 40, color: neonGreen, mb: 1 }} />
      <Typography sx={{ opacity: 0.8 }}>
        Esta vista está pendiente de integración con el módulo de Taxis (lista de
        verificaciones pendientes de auditar). Por ahora confirma que tu acceso
        como auditor funciona correctamente.
      </Typography>
    </Paper>
  </Box>
);

export default Auditorias;
