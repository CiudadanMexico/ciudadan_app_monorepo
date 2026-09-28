import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';

/**
 * Placeholder reutilizable para cuando un usuario todavía no puede administrar
 * TodoToken porque no cumple las DOS condiciones del modelo:
 *   1) pertenecer a una Agencia Ciudadan
 *   2) tener el rol de publicador (socio)
 *
 * Está aislado a propósito: cuando exista el onboarding de agencias, se
 * reemplaza este componente (o su contenido) sin tocar la pantalla que lo usa.
 *
 * NO implementa creación de agencias: sólo comunica el estado.
 */
const AbreTuAgencia = ({
  titulo = 'Abre tu Agencia Ciudadan',
  mensaje = 'Crea o intégrate a una Agencia Ciudadan para publicar y gestionar tareas con TodoToken.',
  nota = 'Próximamente.',
  detalle = null,
}) => (
  <Paper
    elevation={3}
    sx={{
      p: { xs: 3, sm: 4 },
      borderRadius: 3,
      bgcolor: '#01280a',
      border: '1px solid rgba(0, 255, 153, 0.25)',
      color: 'white',
      textAlign: 'center',
      maxWidth: 620,
      mx: 'auto',
    }}
  >
    <Box
      sx={{
        width: 64,
        height: 64,
        mx: 'auto',
        mb: 2,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(0, 255, 153, 0.12)',
        border: '1px solid rgba(0, 255, 153, 0.35)',
      }}
    >
      <GroupsIcon sx={{ fontSize: 34, color: '#00ff99' }} />
    </Box>

    <Typography
      variant="h5"
      sx={{ fontWeight: 700, mb: 1.5, fontSize: { xs: '1.2rem', sm: '1.45rem' } }}
    >
      {titulo}
    </Typography>

    <Typography sx={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, mb: nota ? 1.5 : 0 }}>
      {mensaje}
    </Typography>

    {detalle && (
      <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', mb: nota ? 1.5 : 0 }}>
        {detalle}
      </Typography>
    )}

    {nota && (
      <Typography
        sx={{
          display: 'inline-block',
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          bgcolor: 'rgba(0, 255, 153, 0.12)',
          color: '#00ff99',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {nota}
      </Typography>
    )}
  </Paper>
);

export default AbreTuAgencia;
