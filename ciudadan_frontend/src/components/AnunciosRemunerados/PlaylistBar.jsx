import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Stack,
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

/**
 * Barra fixed inferior que muestra la playlist (anuncios seleccionados)
 * y el botón "Empezar a visualizar".
 */
export const PlaylistBar = ({ playlist, ads, iniciarVision, recompensaTotal = 0 }) => {
  const seleccionados = ads.filter((a) => playlist.includes(a.id));

  const label =
    seleccionados.length === 0
      ? 'Aleatorio (elige tú o deja que el backend seleccione)'
      : `${seleccionados.length} anuncio${seleccionados.length > 1 ? 's' : ''} seleccionado${seleccionados.length > 1 ? 's' : ''}`;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        p: 2,
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        zIndex: 1100,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            🎬 Playlist
          </Typography>
          <Chip label={label} color={seleccionados.length === 0 ? 'default' : 'primary'} size="small" />
          {recompensaTotal > 0 && (
            <Chip label={`🏆 ${recompensaTotal} laborys`} color="success" size="small" />
          )}
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<PlayCircleOutlineIcon />}
          onClick={iniciarVision}
          disabled={false} // si playlist está vacío el backend elige aleatorios
        >
          Empezar a visualizar
        </Button>
      </Stack>
    </Paper>
  );
};
