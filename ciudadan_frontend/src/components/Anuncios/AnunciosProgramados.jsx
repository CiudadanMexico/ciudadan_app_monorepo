import React from 'react';
import { Box, Card, CardContent, Typography, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
//import Bitacora from '../Clubs/Bitacora';
import { useRoles } from '../../Contexts/RolesContext';

export default function AnunciosProgramados() {
  const navigate = useNavigate();
  const { userData } = useRoles();

  return (
    <Box sx={{ px: { xs: 1, md: 3 }, py: 2 }}>
      {/* HEADER */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h5" fontWeight="bold">
                📅 Anuncios programados
              </Typography>
              <Typography color="text.secondary">
                Estos son los mensajes que el bot enviará automáticamente según el día.
              </Typography>
            </Box>

            <Button
              onClick={() => navigate('/comunidad/nuevo-anuncio-programado')}
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                bgcolor: '#6a1b9a',
                ':hover': { bgcolor: '#5a1480' },
                borderRadius: 2,
                px: 3,
                py: 1,
              }}
            >
              Crear nuevo anuncio programado
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* CALENDARIO DE ANUNCIOS */}
     
    </Box>
  );
}
