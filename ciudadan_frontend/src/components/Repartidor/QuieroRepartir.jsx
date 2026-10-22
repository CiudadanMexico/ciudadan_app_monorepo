import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Box, Button, CircularProgress, Container, Paper, Stepper, Step, StepLabel, Typography, Alert,
} from '@mui/material';
import { useNotifications } from '../../Contexts/NotificationsContext';
import repartidorService from '../../services/Repartidor/repartidorService';
import { ChipEstado } from './helpers';
import StepCobertura from './steps/StepCobertura';
import StepIdentidad from './steps/StepIdentidad';
import StepVehiculo from './steps/StepVehiculo';
import StepEvidencias from './steps/StepEvidencias';
import StepPago from './steps/StepPago';
import StepCapacitacion from './steps/StepCapacitacion';
import StepResumen from './steps/StepResumen';

const audience = process.env.REACT_APP_AUTH0_AUDIENCE ?? 'https://api.ciudadan.org';

const PASOS = [
  'Ciudad y agencia',
  'Identidad',
  'Vehículo',
  'Evidencias',
  'CLABE y términos',
  'Capacitación',
  'Enviar',
];

/**
 * «Quiero repartir» (spec §6): wizard del MVP de repartidores.
 *  - Autoguardado: el backend es la fuente de verdad (GET /me al montar y
 *    tras cada paso); se reanuda donde el expediente quedó.
 *  - Guard propio del modulo (NO existe PrivateRoute en el repo): sin sesion
 *    manda a login con returnTo; si el expediente ya esta resuelto
 *    (approved/rejected/suspended) redirige a /repartidor/estado.
 */
const QuieroRepartir = () => {
  const { isAuthenticated, isLoading, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const { toast } = useNotifications() || {};
  const navigate = useNavigate();

  const [token, setToken] = useState(null);
  const [me, setMe] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState(null);

  const obtenerToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently({ authorizationParams: { audience } });
    } catch {
      return null;
    }
  }, [getAccessTokenSilently]);

  const recargar = useCallback(async (tkn) => {
    const t = tkn || token;
    const resp = await repartidorService.miExpediente(t);
    setMe(resp);
    return resp;
  }, [token]);

  useEffect(() => {
    let vivo = true;
    const iniciar = async () => {
      if (isLoading) return;
      if (!isAuthenticated) {
        loginWithRedirect({ appState: { returnTo: '/repartidor/registro' } });
        return;
      }
      try {
        const t = await obtenerToken();
        if (!vivo) return;
        setToken(t);
        const resp = await repartidorService.miExpediente(t);
        if (!vivo) return;
        setMe(resp);

        if (resp?.exists && ['approved', 'rejected', 'suspended'].includes(resp.data.status)) {
          navigate('/repartidor/estado', { replace: true });
          return;
        }
        // Reanudar: si ya hay expediente avanzado, continuar en los datos.
        if (resp?.exists && resp.data.status !== 'draft') {
          setPaso(resp.data.vehicle ? 3 : 1);
        }
      } catch (e) {
        if (vivo) setError(e.message);
      } finally {
        if (vivo) setCargando(false);
      }
    };
    iniciar();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated]);

  if (isLoading || cargando) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: '#8A5CF5' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const propsPaso = {
    token,
    me,
    recargar,
    siguiente: (nuevoPaso) => setPaso(nuevoPaso),
    toast,
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>
          🚴 Quiero repartir
        </Typography>
        {me?.exists && <ChipEstado status={me.data.status} />}
      </Box>

      <Paper
        variant="outlined"
        sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, borderColor: 'rgba(138,92,245,0.4)', bgcolor: 'rgba(17,10,32,0.55)' }}
      >
        <Stepper activeStep={paso} alternativeLabel sx={{ mb: 4, '& .MuiStepLabel-label': { color: 'rgba(255,255,255,0.75)' } }}>
          {PASOS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {paso === 0 && <StepCobertura {...propsPaso} />}
        {paso === 1 && <StepIdentidad {...propsPaso} />}
        {paso === 2 && <StepVehiculo {...propsPaso} />}
        {paso === 3 && <StepEvidencias {...propsPaso} />}
        {paso === 4 && <StepPago {...propsPaso} />}
        {paso === 5 && <StepCapacitacion {...propsPaso} />}
        {paso === 6 && <StepResumen {...propsPaso} />}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="outlined"
          disabled={paso === 0}
          onClick={() => setPaso((p) => Math.max(0, p - 1))}
          sx={{ color: '#fff', borderColor: 'rgba(138,92,245,0.5)' }}
        >
          Atrás
        </Button>
        <Button
          variant="text"
          onClick={() => navigate('/repartidor/estado')}
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
          Ver estado de mi expediente
        </Button>
      </Box>
    </Container>
  );
};

export default QuieroRepartir;
