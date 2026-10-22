import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Grid2 as Grid, Typography,
} from '@mui/material';
import repartidorService from '../../../services/Repartidor/repartidorService';
import { TarjetaPaso, ETIQUETAS_SLOT, SLOTS_POR_TIPO } from '../helpers';

const SlotEvidencia = ({ slot, vehicleId, adjuntado, token, onAdjuntado, toast }) => {
  const [cargando, setCargando] = useState(false);
  const esVideo = slot === 'video_presentation';

  const subir = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCargando(true);
    try {
      await repartidorService.subirEvidencia(token, { slot, file, vehicle_id: vehicleId });
      onAdjuntado();
      toast?.success(`Evidencia lista: ${ETIQUETAS_SLOT[slot]}`);
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setCargando(false);
      event.target.value = '';
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: adjuntado ? 'rgba(76,175,80,0.6)' : 'rgba(255,255,255,0.15)',
        bgcolor: adjuntado ? 'rgba(76,175,80,0.08)' : 'transparent',
      }}
    >
      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
        {adjuntado ? '✅' : '📷'} {ETIQUETAS_SLOT[slot]}
      </Typography>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', display: 'block', mb: 1 }}>
        {esVideo ? 'Video MP4/MOV/WebM, máx. 150 MB, 15–30 segundos.' : 'JPG/PNG/WebP, máx. 15 MB, legible y sin ediciones.'}
      </Typography>
      <Button
        variant="outlined"
        component="label"
        size="small"
        disabled={cargando}
        sx={{ color: '#fff', borderColor: 'rgba(138,92,245,0.5)' }}
      >
        {cargando ? <CircularProgress size={18} sx={{ color: '#8A5CF5' }} /> : adjuntado ? 'Reemplazar' : 'Subir archivo'}
        <input type="file" hidden accept={esVideo ? 'video/mp4,video/quicktime,video/webm' : 'image/jpeg,image/png,image/webp'} onChange={subir} />
      </Button>
    </Box>
  );
};

/**
 * Paso 4 (spec §6.6-6.7): evidencias por slot — identidad + las que exige el
 * tipo de vehículo. La subida va por /api/upload (Auth0) y el backend valida
 * MIME/tamaño, calcula SHA-256 y adjunta con unicidad. Nunca se expone URL.
 */
const StepEvidencias = ({ token, me, recargar, siguiente, toast }) => {
  const d = me?.data || {};
  const vehicle = d.vehicle || null;
  const slotsPerfil = d.identity?.slots || {};

  const slotsVehiculo = useMemo(() => {
    if (!vehicle) return [];
    return SLOTS_POR_TIPO[vehicle.type] || [];
  }, [vehicle]);

  if (!vehicle) {
    return <Alert severity="warning">Registra primero tu vehículo en el paso anterior.</Alert>;
  }

  return (
    <TarjetaPaso titulo="4. Evidencias">
      <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.8)' }}>
        Tus archivos quedan protegidos: solo tú y el revisor autorizado de tu agencia pueden
        verlos, mediante descarga autenticada (sin enlaces públicos).
      </Typography>

      <Typography variant="subtitle2" sx={{ color: '#8A5CF5', mb: 1 }}>Identidad</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {['id_front', 'id_back', 'selfie'].map((slot) => (
          <Grid key={slot} size={{ xs: 12, sm: 4 }}>
            <SlotEvidencia
              slot={slot}
              adjuntado={Boolean(slotsPerfil[slot])}
              token={token}
              toast={toast}
              onAdjuntado={recargar}
            />
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle2" sx={{ color: '#8A5CF5', mb: 1 }}>
        Vehículo ({vehicle.type === 'motocicleta' ? 'motocicleta' : vehicle.type === 'bicicleta_electrica' ? 'bicicleta eléctrica' : 'bicicleta'})
      </Typography>
      <Grid container spacing={2}>
        {slotsVehiculo.map((slot) => (
          <Grid key={slot} size={{ xs: 12, sm: 6, md: 4 }}>
            <SlotEvidencia
              slot={slot}
              vehicleId={vehicle.id}
              adjuntado={Boolean(vehicle.slots?.[slot])}
              token={token}
              toast={toast}
              onAdjuntado={recargar}
            />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={() => siguiente(4)}
          sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' }, fontWeight: 700 }}
        >
          Continuar con CLABE y términos
        </Button>
      </Box>
    </TarjetaPaso>
  );
};

export default StepEvidencias;
