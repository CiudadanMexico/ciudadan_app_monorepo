import React, { useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import repartidorService from '../../../services/Repartidor/repartidorService';
import { TarjetaPaso, etiquetaFaltante } from '../helpers';

/**
 * Paso 7 (spec §6.10-6.11): resumen final. El backend valida la completitud
 * al enviar (prechecks server-side); si falta algo, esta pantalla lo lista
 * tal cual lo devuelve GET /me. El solicitante no puede forzar el envío.
 */
const StepResumen = ({ token, me, recargar, siguiente, toast }) => {
  const d = me?.data || {};
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(null);

  const enviar = async () => {
    setEnviando(true);
    try {
      const resp = await repartidorService.enviarExpediente(token);
      setEnviado(resp);
      await recargar();
      toast?.success('Expediente enviado a revisión');
    } catch (e) {
      toast?.error(e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (enviado || ['pending_review', 'pending_federal_audit', 'corrections_required', 'eligible_for_video_review'].includes(d.status)) {
    const estatus = enviado?.status || d.status;
    return (
      <TarjetaPaso titulo="Expediente enviado">
        <Alert severity={estatus === 'pending_federal_audit' ? 'warning' : 'success'} sx={{ mb: 2 }}>
          {estatus === 'pending_federal_audit'
            ? 'Tu expediente quedó sujeto a revisión de la auditoría federal antes de que tu agencia pueda aprobarlo. Te avisamos cada cambio aquí y por notificaciones.'
            : '¡Tu expediente está en revisión por tu agencia! Recibirás notificaciones de cada cambio de estado.'}
        </Alert>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          Próximos pasos: revisión documental con cotejo de fuentes oficiales → sesión grupal
          de validación por Zoom (organizada por tu agencia) → validación individual →
          decisión. La inspección presencial no es obligatoria.
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={() => siguiente(6)}
            sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' }, fontWeight: 700 }}
          >
            Ver estado de mi expediente
          </Button>
        </Box>
      </TarjetaPaso>
    );
  }

  const faltantes = d.faltantes || [];

  return (
    <TarjetaPaso titulo="7. Resumen final">
      <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.8)' }}>
        Requisitos que faltan según el servidor (se validan de nuevo al enviar y al aprobar):
      </Typography>

      {faltantes.length === 0 ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Todo completo: puedes enviar tu expediente a revisión.
        </Alert>
      ) : (
        <Box sx={{ mb: 2 }}>
          {faltantes.map((f, i) => (
            <Alert key={i} severity="warning" sx={{ mb: 1 }}>
              {etiquetaFaltante(f)}
            </Alert>
          ))}
        </Box>
      )}

      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 2 }}>
        Al enviar: tu agencia revisa cada documento contra la fuente oficial disponible y
        registra la evidencia de cada cotejo. No se declara "verificado oficialmente" nada
        que no se haya consultado realmente.
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          disabled={enviando}
          onClick={enviar}
          sx={{ bgcolor: '#8A5CF5', '&:hover': { bgcolor: '#6A3FCB' }, fontWeight: 700 }}
        >
          {enviando ? 'Enviando…' : 'Enviar a revisión'}
        </Button>
      </Box>
    </TarjetaPaso>
  );
};

export default StepResumen;
