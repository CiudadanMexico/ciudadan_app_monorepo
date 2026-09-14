// src/Pages/Gana/LiderVerificadorRegistroPage.jsx
// /gana/lideresverificadores/registro — PLACEHOLDER mínimo.
//
// ⚠️ POR DISEÑO: aquí NO se crea candidatura, NO se agrega rol y NO se
// inician los 15 días. El registro real (formulario + candidatura +
// registered_since/closes_at) se implementará en una tarea posterior.
import React from 'react';
import { Box, Container, Typography } from '@mui/material';

export default function LiderVerificadorRegistroPage() {
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 700 }}
        >
          Registro de Líder de Conductores
        </Typography>
        <Typography sx={{ mt: 2 }} color="text.secondary">
          El proceso de registro estará disponible próximamente.
        </Typography>
      </Box>
    </Container>
  );
}