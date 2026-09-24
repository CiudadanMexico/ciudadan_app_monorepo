import React, { useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { runRiskAssessment } from '../../../services/driverVerification/setters';

const SIGNAL_LABELS = {
  hash_mismatch: 'Hash inconsistente',
  duplicate_evidence: 'Evidencia duplicada',
  repuve_reported: 'REPUVE con reporte',
  vin_mismatch: 'VIN no coincide',
  gps_distant: 'GPS muy distante',
  checklist_incomplete: 'Checklist incompleto',
  external_source_unavailable: 'Fuente oficial no disponible',
  sequence_anomaly: 'Secuencia anómala',
};

// docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 5: muestra el
// risk_score y las señales antes de que el revisor intente aprobar — el
// backend es quien realmente bloquea la aprobación (completeValidation),
// esto solo da visibilidad para no descubrirlo hasta el rechazo del botón.
const RiskAssessmentPanel = ({ validationId, getToken, onAssessed }) => {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken?.();
      const result = await runRiskAssessment(validationId, token);
      setAssessment(result);
      onAssessed?.(result);
    } catch (err) {
      setError(err.message || 'No se pudo calcular el riesgo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={1}>
      <Button variant="outlined" onClick={handleRun} disabled={loading}>
        {loading ? 'Calculando...' : 'Calcular riesgo'}
      </Button>

      {error && <Alert severity="warning">{error}</Alert>}

      {assessment && (
        <Stack spacing={1}>
          <Typography variant="body2">
            Score: <strong>{assessment.score}</strong>
            {assessment.hasCriticalSignals && (
              <Typography component="span" color="error.main" sx={{ ml: 1 }}>
                (bloquea aprobación)
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {assessment.signals.length === 0 && (
              <Chip size="small" color="success" label="Sin señales de riesgo" />
            )}
            {assessment.signals.map((signal) => (
              <Chip
                key={signal.key}
                size="small"
                color={['repuve_reported', 'vin_mismatch'].includes(signal.key) ? 'error' : 'warning'}
                label={`${SIGNAL_LABELS[signal.key] || signal.key} (+${signal.weight})`}
              />
            ))}
          </Box>
        </Stack>
      )}
    </Stack>
  );
};

export default RiskAssessmentPanel;
