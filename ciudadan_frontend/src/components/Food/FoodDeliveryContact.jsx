import React from 'react';
import { Box, TextField, Typography, Paper } from '@mui/material';

import { MdPerson, MdPhone, MdNotes } from 'react-icons/md';

const FoodDeliveryContact = ({ nombre = '', telefono = '', notas = '', onChange, }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        Datos de entrega
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Indica quién recibirá el pedido y cómo podemos contactarlo.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, }}>
        <TextField
          fullWidth
          label="Nombre de quien recibe"
          value={nombre}
          onChange={(e) => onChange('nombre', e.target.value)}
          helperText="Lo utilizaremos para referenciar a quien recibe el pedido."
          required
          InputProps={{
            startAdornment: (<MdPerson style={{ marginRight: 10, }} />),
          }}
        />

        <TextField
          fullWidth
          label="Número de teléfono"
          value={telefono}
          onChange={(e) => onChange('telefono', e.target.value)}
          required
          type="tel"
          placeholder="+52 231 123 4567"
          helperText="Lo utilizaremos para contactar a quien recibe el pedido."
          InputProps={{
            startAdornment: (<MdPhone style={{ marginRight: 10, }} />),
          }}
        />

        <TextField
          fullWidth
          label="Notas de entrega"
          value={notas}
          onChange={(e) => onChange('notas', e.target.value)}
          multiline
          minRows={3}
          placeholder="Ej. Entregar en portón blanco, tocar el timbre..."
          helperText="Opcional"
          InputProps={{
            startAdornment: (<MdNotes style={{ marginRight: 10, marginTop: 4, }} />),
          }}
        />
      </Box>
    </Paper>
  );
};

export default FoodDeliveryContact;