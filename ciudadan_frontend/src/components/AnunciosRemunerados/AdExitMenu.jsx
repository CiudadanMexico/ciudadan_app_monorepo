import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PurpleButton from '../common/PurpleButton.jsx';

/**
 * Menú ligero que aparece al intentar abandonar el flujo completo de
 * visualización. Ofrece:
 *  - Salir de visualización
 *  - Continuar viendo
 *  - Volver a mis anuncios
 *
 * Advertencia: anuncios incompletos no se contabilizan.
 */
export const AdExitMenu = ({ open, onClose, onSalir, onContinuar, onVolverGrid, hayPendientes }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LogoutIcon /> Salir de visualización
      </DialogTitle>
      <DialogContent>
        {hayPendientes ? (
          <Typography color="warning.main" paragraph>
            Tienes anuncios sin completar. <strong>No se contabilizarán</strong> las
            visualizaciones incompletas.
          </Typography>
        ) : (
          <Typography paragraph>
            Las visualizaciones no completadas no generan recompensa.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ flexDirection: 'column', gap: 1, pb: 2 }}>
        <PurpleButton fullWidth onClick={onContinuar}>
          Continuar viendo
        </PurpleButton>
        <PurpleButton outlined fullWidth onClick={onVolverGrid}>
          Volver a mis anuncios
        </PurpleButton>
        <PurpleButton outlined fullWidth onClick={onSalir} startIcon={<LogoutIcon />}>
          Salir de visualización
        </PurpleButton>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Pantalla mostrada al terminar la playlist (antes del refill auto).
 * Resume las recompensas obtenidas y permite seguir viendo o volver al grid.
 */
export const RewardScreen = ({ recompensaTotal, onRefill, onVolverGrid }) => {
  return (
    <Paper
      sx={{
        width: '100vw',
        height: '100vh',
        backgroundColor: 'black',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 3,
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          🎉 ¡Visualización completada!
        </Typography>
        <Typography variant="h5" color="success.main" fontWeight="bold">
          Has ganado {recompensaTotal} laborys
        </Typography>
      </Box>

      <Stack direction="row" spacing={2} sx={{ gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <PurpleButton size="large" onClick={onRefill}>
          Ver más anuncios
        </PurpleButton>
        <PurpleButton outlined size="large" onClick={onVolverGrid}>
          Volver a mis anuncios
        </PurpleButton>
      </Stack>
    </Paper>
  );
};
