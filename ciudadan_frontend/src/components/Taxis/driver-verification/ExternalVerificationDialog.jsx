import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  capturePhotoFromVideoElement,
  openCameraStream,
  stopStream,
} from '../../../services/driverVerification/captureService';
import { captureAndUploadEvidence } from '../../../services/driverVerification/evidenceCapture';
import { registerExternalVerification } from '../../../services/driverVerification/externalVerification';

// docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 4: el MVP es consulta
// MANUAL a portales oficiales por el verificador — este diálogo solo registra
// que la consulta ocurrió y su resultado, nunca la ejecuta automáticamente.
const SOURCES = {
  INE: {
    label: 'INE — Identidad',
    checkType: 'credential',
    entityType: 'driver',
    methods: [
      { value: 'app', label: 'Valida INE-QR (app oficial)' },
      { value: 'web', label: 'Verificación visual (sin convenio SVCV)' },
    ],
  },
  REPUVE: {
    label: 'REPUVE — Situación legal del vehículo',
    checkType: 'vehicle_theft',
    entityType: 'vehicle',
    methods: [{ value: 'web', label: 'Consulta Ciudadana (portal oficial)' }],
  },
  LICENSE: {
    label: 'Licencia estatal',
    checkType: 'license',
    entityType: 'license',
    methods: [
      { value: 'web', label: 'Portal oficial (web)' },
      { value: 'app', label: 'App oficial' },
      { value: 'api', label: 'API oficial' },
    ],
  },
};

const RESULT_OPTIONS = [
  { value: 'verified', label: 'Verificado / sin reporte' },
  { value: 'not_found', label: 'No encontrado' },
  { value: 'reported', label: 'Con reporte (robo/irregularidad)' },
  { value: 'mismatch', label: 'No coincide con los datos del conductor' },
  { value: 'unavailable', label: 'Fuente no disponible en este momento' },
  { value: 'error', label: 'Error al realizar la consulta' },
];

const ExternalVerificationDialog = ({ open, validationId, driverId, sessionId, getToken, onClose, onRegistered }) => {
  const [sourceKey, setSourceKey] = useState('INE');
  const [licenseProviderName, setLicenseProviderName] = useState('');
  const [method, setMethod] = useState(SOURCES.INE.methods[0].value);
  const [queryReference, setQueryReference] = useState('');
  const [result, setResult] = useState('verified');
  const [notes, setNotes] = useState('');
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const source = SOURCES[sourceKey];

  const handleSourceChange = (key) => {
    setSourceKey(key);
    setMethod(SOURCES[key].methods[0].value);
  };

  const handleCaptureEvidence = async () => {
    setError('');
    setCapturing(true);
    let stream = null;
    try {
      stream = await openCameraStream({ facingMode: 'environment' });
      const videoEl = document.createElement('video');
      videoEl.srcObject = stream;
      videoEl.muted = true;
      await videoEl.play();
      // Pequeña espera para que el primer frame ya tenga contenido real.
      await new Promise((resolve) => setTimeout(resolve, 400));
      const blob = await capturePhotoFromVideoElement(videoEl);
      setCapturedBlob(blob);
      setCapturedPreviewUrl(URL.createObjectURL(blob));
    } catch (captureError) {
      setError(captureError.message || 'No se pudo capturar la constancia visual.');
    } finally {
      stopStream(stream);
      setCapturing(false);
    }
  };

  const resetForm = () => {
    setSourceKey('INE');
    setLicenseProviderName('');
    setMethod(SOURCES.INE.methods[0].value);
    setQueryReference('');
    setResult('verified');
    setNotes('');
    if (capturedPreviewUrl) URL.revokeObjectURL(capturedPreviewUrl);
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose?.();
  };

  const handleSubmit = async () => {
    setError('');
    const sourceName = sourceKey === 'LICENSE' ? licenseProviderName.trim() : sourceKey;
    if (sourceKey === 'LICENSE' && !sourceName) {
      setError('Indica el nombre del proveedor de licencias (debe existir en el catálogo).');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken?.();
      let evidenceId = null;
      if (capturedBlob) {
        const evidence = await captureAndUploadEvidence({
          validationId,
          type: 'official_query_capture',
          blob: capturedBlob,
          filename: `official-query-${Date.now()}.jpg`,
          sessionId,
          idempotencyKey: `${sessionId}:official_query_capture:${Date.now()}`,
          token,
        });
        evidenceId = evidence.id;
      }

      const created = await registerExternalVerification(
        validationId,
        {
          entityType: source.entityType,
          entityId: Number(driverId),
          sourceName,
          verificationMethod: method,
          checkType: source.checkType,
          queryReference: queryReference || undefined,
          result,
          resultData: notes ? { notes } : undefined,
          evidenceId,
        },
        token
      );

      onRegistered?.(created);
      resetForm();
      onClose?.();
    } catch (submitError) {
      setError(submitError.message || 'No se pudo registrar la consulta oficial.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar consulta oficial</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Esta consulta se realiza manualmente en el portal oficial correspondiente. Aquí solo se
            registra que ocurrió y su resultado — no se ejecuta ninguna consulta automática.
          </Typography>

          {error && <Alert severity="warning">{error}</Alert>}

          <TextField
            select
            label="Fuente"
            value={sourceKey}
            onChange={(e) => handleSourceChange(e.target.value)}
          >
            {Object.entries(SOURCES).map(([key, value]) => (
              <MenuItem key={key} value={key}>
                {value.label}
              </MenuItem>
            ))}
          </TextField>

          {sourceKey === 'LICENSE' && (
            <TextField
              label="Proveedor de licencias (debe existir en el catálogo)"
              value={licenseProviderName}
              onChange={(e) => setLicenseProviderName(e.target.value)}
              placeholder="Ej. Licencias CDMX (SEMOVI)"
            />
          )}

          <TextField select label="Método" value={method} onChange={(e) => setMethod(e.target.value)}>
            {source.methods.map((m) => (
              <MenuItem key={m.value} value={m.value}>
                {m.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Folio / referencia consultada (no se guarda en claro)"
            value={queryReference}
            onChange={(e) => setQueryReference(e.target.value)}
          />

          <TextField select label="Resultado" value={result} onChange={(e) => setResult(e.target.value)}>
            {RESULT_OPTIONS.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Constancia visual (opcional, recomendada)
            </Typography>
            {capturedPreviewUrl ? (
              <Stack spacing={1}>
                <img
                  src={capturedPreviewUrl}
                  alt="Constancia capturada"
                  style={{ width: '100%', maxHeight: 200, objectFit: 'contain', background: '#000' }}
                />
                <Button size="small" onClick={handleCaptureEvidence} disabled={capturing}>
                  Repetir captura
                </Button>
              </Stack>
            ) : (
              <Button variant="outlined" onClick={handleCaptureEvidence} disabled={capturing}>
                {capturing ? 'Abriendo cámara...' : 'Capturar pantalla/portal como evidencia'}
              </Button>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Registrando...' : 'Registrar consulta'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExternalVerificationDialog;
