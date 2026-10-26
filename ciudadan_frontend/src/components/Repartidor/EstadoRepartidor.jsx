import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Alert, Box, Button, CircularProgress, Container, Paper, Typography,
} from '@mui/material';
import { useRoles } from '../../Contexts/RolesContext';
import { useNotifications } from '../../Contexts/NotificationsContext';
import repartidorService from '../../services/Repartidor/repartidorService';
import { ChipEstado, TarjetaPaso, etiquetaFaltante } from './helpers';

const audience = process.env.REACT_APP_AUTH0_AUDIENCE ?? 'https://api.ciudadan.org';

const MENSAJES_ESTADO = {
  draft: 'Tu expediente apenas comienza. Completa los pasos del registro.',
  pending_documents: 'Te faltan requisitos para poder enviar tu expediente.',
  pending_review: 'Tu agencia está revisando tu documentación con fuentes oficiales.',
  corrections_required: 'Tu agencia te pidió correcciones. Atiéndelas y vuelve a enviar.',
  eligible_for_video_review: 'Documentación verificada. Espera la sesión grupal de Zoom de tu agencia.',
  pending_federal_audit: 'Se activó una señal de riesgo alto: la auditoría federal revisa tu caso antes de que tu agencia pueda aprobar.',
  approved: '¡Eres repartidor verificado! Conserva tu historial y vigencias al día.',
  rejected: 'Tu expediente fue rechazado con motivo documentado. Puedes apelar respondiendo la notificación o acudiendo a tu agencia.',
  suspended: 'Tu perfil está suspendido por motivo documentado. Tu expediente e historial se conservan.',
};

/**
 * Estado del expediente del repartidor (spec §6.11): consultar estado,
 * requisitos, correcciones y motivos. Destino del link de las notificaciones
 * (`/repartidor/estado`). Tras aprobación, refresca roles en caliente
 * (patron PreRegistroConductor2.jsx:793-794 con fetchRolesYMembresia(true)).
 */
const EstadoRepartidor = () => {
  const { isAuthenticated, isLoading, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const { fetchRolesYMembresia, isRepartidor } = useRoles();
  const { toast } = useNotifications() || {};
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently({ authorizationParams: { audience } });
      const resp = await repartidorService.miExpediente(token);
      setMe(resp);
      // Si el backend acaba de aprobar, refrescar roles en caliente para que
      // isRepartidor() se active sin recargar la página.
      if (resp?.data?.status === 'approved') {
        fetchRolesYMembresia(true).catch(() => {});
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, [getAccessTokenSilently, fetchRolesYMembresia]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      loginWithRedirect({ appState: { returnTo: '/repartidor/estado' } });
      return;
    }
    cargar();
  }, [isLoading, isAuthenticated, cargar, loginWithRedirect]);

  const refrescarRoles = async () => {
    setRefrescando(true);
    try {
      await fetchRolesYMembresia(true);
      toast?.success(isRepartidor() ? 'Rol repartidor activo ✓' : 'Roles actualizados');
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setRefrescando(false);
    }
  };

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

  if (!me?.exists) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 4, borderColor: 'rgba(138,92,245,0.4)' }}>
          <Typography variant="h5" sx={{ color: '#fff', mb: 2 }}>Aún no tienes expediente de repartidor</Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/repartidor/registro')}
            sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' }, fontWeight: 700 }}
          >
            Iniciar «Quiero repartir»
          </Button>
        </Paper>
      </Container>
    );
  }

  const d = me.data;
  const editable = ['draft', 'pending_documents', 'corrections_required'].includes(d.status);
  const correcciones = d.correction_requests?.items || [];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff' }}>
          📋 Estado de tu expediente
        </Typography>
        <ChipEstado status={d.status} />
      </Box>

      <Alert severity={d.status === 'approved' ? 'success' : d.status === 'rejected' || d.status === 'suspended' ? 'error' : 'info'} sx={{ mb: 3 }}>
        {MENSAJES_ESTADO[d.status]}
      </Alert>

      {d.status === 'approved' && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 3, borderColor: 'rgba(76,175,80,0.5)', bgcolor: 'rgba(76,175,80,0.07)' }}>
          <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
            {isRepartidor() ? '🚴 Rol repartidor activo en tu cuenta' : 'Rol repartidor recién otorgado'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mb: 2 }}>
            Aprobado el {d.timestamps.approved_at ? new Date(d.timestamps.approved_at).toLocaleString('es-MX') : '—'}
            {d.timestamps.last_revalidated_at ? ` · Revalidado ${new Date(d.timestamps.last_revalidated_at).toLocaleString('es-MX')}` : ''}.
            La aprobación documental no implica conformidad laboral ni fiscal.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            disabled={refrescando}
            onClick={refrescarRoles}
            sx={{ color: '#fff', borderColor: 'rgba(138,92,245,0.5)' }}
          >
            {refrescando ? 'Actualizando…' : 'Refrescar mis roles'}
          </Button>
        </Paper>
      )}

      {editable && (d.faltantes || []).length > 0 && (
        <TarjetaPaso titulo="Requisitos pendientes" sx={{ mb: 3 }}>
          {(d.faltantes || []).map((f, i) => (
            <Alert key={i} severity="warning" sx={{ mb: 1 }}>
              {etiquetaFaltante(f)}
            </Alert>
          ))}
        </TarjetaPaso>
      )}

      {correcciones.length > 0 && (
        <TarjetaPaso titulo="Correcciones solicitadas por tu agencia" sx={{ mb: 3 }}>
          {correcciones.map((c, i) => (
            <Alert key={i} severity="warning" sx={{ mb: 1 }}>
              <strong>{c.document_id || c.campo || 'Expediente'}:</strong> {c.motivo}
            </Alert>
          ))}
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Solicitadas el {d.correction_requests.requested_at ? new Date(d.correction_requests.requested_at).toLocaleString('es-MX') : '—'}
          </Typography>
        </TarjetaPaso>
      )}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, borderColor: 'rgba(255,255,255,0.12)', bgcolor: 'rgba(17,10,32,0.5)' }}>
        <Typography variant="subtitle1" sx={{ color: '#8A5CF5', fontWeight: 700, mb: 2 }}>Resumen</Typography>
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>Ciudad: {d.territory_ref}</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>Agencia: #{d.agency_id}</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            Capacitación: {d.training.status === 'aprobado' ? `aprobada (${d.training.score}/10)` : d.training.status}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            CLABE: {d.payout.clabe_last4 ? `•••• ${d.payout.clabe_last4}` : 'pendiente'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            Validación por video: {d.zoom.validated ? `completada (${new Date(d.zoom.validated_at).toLocaleString('es-MX')})` : 'pendiente'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            Enviado: {d.timestamps.submitted_at ? new Date(d.timestamps.submitted_at).toLocaleString('es-MX') : '—'}
          </Typography>
        </Box>
      </Paper>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        {editable && (
          <Button
            variant="contained"
            onClick={() => navigate('/repartidor/registro')}
            sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' }, fontWeight: 700 }}
          >
            Continuar mi registro
          </Button>
        )}
      </Box>
    </Container>
  );
};

export default EstadoRepartidor;
