import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  capturePhotoFromVideoElement,
  createVideoRecorder,
  getCurrentPosition,
  isVideoRecordingSupported,
  openCameraStream,
  stopStream,
} from '../../../services/driverVerification/captureService';
import {
  captureAndUploadEvidence,
  getCompletedStepTypes,
} from '../../../services/driverVerification/evidenceCapture';

// Fase 8: pasado este tiempo subiendo, se avisa que la red está lenta en vez
// de dejar el spinner sin explicación.
const SLOW_UPLOAD_WARNING_MS = 8000;

// docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 2: protocolo secuencial
// de captura en vivo. Usa los valores de cars-evidence.type que ya existen
// hoy (Fase 3 introducirá tipos nuevos); no incluye proof_of_address ni
// profile_photo porque esos se resuelven en el prerregistro, no en la visita.
const LIVE_CAPTURE_STEPS = [
  { type: 'selfie_live', label: 'Selfie del conductor', facingMode: 'user', kind: 'photo' },
  { type: 'id_front', label: 'Identificación (frente)', facingMode: 'environment', kind: 'photo' },
  { type: 'id_back', label: 'Identificación (reverso)', facingMode: 'environment', kind: 'photo' },
  { type: 'license_front', label: 'Licencia (frente)', facingMode: 'environment', kind: 'photo' },
  { type: 'license_back', label: 'Licencia (reverso)', facingMode: 'environment', kind: 'photo' },
  { type: 'registration_card', label: 'Tarjeta de circulación', facingMode: 'environment', kind: 'photo' },
  { type: 'insurance_document', label: 'Póliza de seguro', facingMode: 'environment', kind: 'photo' },
  { type: 'plates', label: 'Placas del vehículo', facingMode: 'environment', kind: 'photo' },
  { type: 'vin', label: 'Número de serie (VIN)', facingMode: 'environment', kind: 'photo' },
  { type: 'vehicle_front', label: 'Vehículo — frente', facingMode: 'environment', kind: 'photo' },
  { type: 'vehicle_back', label: 'Vehículo — atrás', facingMode: 'environment', kind: 'photo' },
  { type: 'vehicle_left', label: 'Vehículo — lado izquierdo', facingMode: 'environment', kind: 'photo' },
  { type: 'vehicle_right', label: 'Vehículo — lado derecho', facingMode: 'environment', kind: 'photo' },
  { type: 'interior', label: 'Interior del vehículo', facingMode: 'environment', kind: 'photo' },
  { type: 'trunk', label: 'Cajuela', facingMode: 'environment', kind: 'photo' },
  { type: 'video_360', label: 'Video 360° del vehículo', facingMode: 'environment', kind: 'video' },
];

const STATUS = {
  IDLE: 'idle',
  STREAMING: 'streaming',
  RECORDING: 'recording',
  PREVIEW: 'preview',
  UPLOADING: 'uploading',
  DONE: 'done',
  ERROR: 'error',
};

/**
 * Diálogo de captura en vivo: recorre LIVE_CAPTURE_STEPS en orden, uno a la
 * vez, sin permitir saltarse pasos ni usar archivos de galería. Cada paso
 * abre la cámara, captura foto/video, toma el GPS del momento y sube la
 * evidencia via captureAndUploadEvidence (challenge + hash + registro).
 */
const LiveCaptureWizard = ({ open, validationId, sessionId, getToken, onClose, onEvidenceUploaded, onFinished }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [resumingStep, setResumingStep] = useState(true);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [error, setError] = useState('');
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [gps, setGps] = useState(null);
  const [slowUpload, setSlowUpload] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const slowUploadTimerRef = useRef(null);

  const currentStep = LIVE_CAPTURE_STEPS[stepIndex];
  const isLastStep = stepIndex === LIVE_CAPTURE_STEPS.length - 1;

  const cleanupStream = () => {
    stopStream(streamRef.current);
    streamRef.current = null;
  };

  const resetPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewBlob(null);
    setPreviewUrl(null);
  };

  const startStep = async () => {
    setError('');
    resetPreview();
    setStatus(STATUS.STREAMING);
    try {
      const [stream, position] = await Promise.all([
        openCameraStream({ facingMode: currentStep.facingMode }),
        getCurrentPosition().catch((gpsError) => {
          // El GPS es una señal más para el riesgo, no un bloqueo duro.
          setError(`Aviso: no se pudo obtener GPS (${gpsError.message}). Puedes continuar.`);
          return null;
        }),
      ]);
      streamRef.current = stream;
      setGps(position);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (streamError) {
      setStatus(STATUS.ERROR);
      setError(streamError.message || 'No se pudo abrir la cámara.');
    }
  };

  // Fase 8 ("cierre/reapertura de sesión"): si el wizard se abre y ya hay
  // evidencia subida para pasos anteriores (por ejemplo, la app se cerró a
  // la mitad del protocolo), retoma en el primer paso pendiente en vez de
  // reiniciar siempre desde el paso 1.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setResumingStep(true);
    (async () => {
      try {
        const token = await getToken?.();
        const completedTypes = await getCompletedStepTypes(validationId, token);
        if (cancelled) return;
        const firstPending = LIVE_CAPTURE_STEPS.findIndex((step) => !completedTypes.has(step.type));
        setStepIndex(firstPending === -1 ? 0 : firstPending);
      } catch {
        if (!cancelled) setStepIndex(0);
      } finally {
        if (!cancelled) setResumingStep(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || resumingStep) return undefined;
    startStep();
    return () => {
      cleanupStream();
      resetPreview();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resumingStep, stepIndex]);

  const handleCapturePhoto = async () => {
    try {
      const blob = await capturePhotoFromVideoElement(videoRef.current);
      const url = URL.createObjectURL(blob);
      cleanupStream();
      setPreviewBlob(blob);
      setPreviewUrl(url);
      setStatus(STATUS.PREVIEW);
    } catch (captureError) {
      setError(captureError.message || 'No se pudo capturar la foto.');
    }
  };

  const handleStartRecording = () => {
    try {
      recorderRef.current = createVideoRecorder(streamRef.current);
      recorderRef.current.start();
      setStatus(STATUS.RECORDING);
    } catch (recordError) {
      setError(recordError.message || 'No se pudo iniciar la grabación.');
    }
  };

  const handleStopRecording = async () => {
    const blob = await recorderRef.current.stop();
    cleanupStream();
    const url = URL.createObjectURL(blob);
    setPreviewBlob(blob);
    setPreviewUrl(url);
    setStatus(STATUS.PREVIEW);
  };

  const handleRetry = () => {
    resetPreview();
    startStep();
  };

  const handleConfirmUpload = async () => {
    setStatus(STATUS.UPLOADING);
    setError('');
    setSlowUpload(false);
    slowUploadTimerRef.current = setTimeout(() => setSlowUpload(true), SLOW_UPLOAD_WARNING_MS);
    try {
      const token = await getToken?.();
      const evidence = await captureAndUploadEvidence({
        validationId,
        type: currentStep.type,
        blob: previewBlob,
        filename: `${currentStep.type}-${Date.now()}.${currentStep.kind === 'video' ? 'webm' : 'jpg'}`,
        gps,
        sessionId,
        idempotencyKey: `${sessionId}:${currentStep.type}`,
        token,
      });
      onEvidenceUploaded?.(evidence);
      if (isLastStep) {
        setStatus(STATUS.DONE);
        onFinished?.();
      } else {
        setStepIndex((prev) => prev + 1);
      }
    } catch (uploadError) {
      setStatus(STATUS.ERROR);
      setError(uploadError.message || 'No se pudo subir la evidencia.');
    } finally {
      clearTimeout(slowUploadTimerRef.current);
      setSlowUpload(false);
    }
  };

  const handleClose = () => {
    cleanupStream();
    resetPreview();
    setStepIndex(0);
    setStatus(STATUS.IDLE);
    setError('');
    onClose?.();
  };

  if (!open) return null;

  if (resumingStep) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth>
        <DialogContent>
          <Stack spacing={2} alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Revisando qué pasos ya se capturaron...
            </Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Captura en vivo — Paso {stepIndex + 1} de {LIVE_CAPTURE_STEPS.length}
        <LinearProgress
          variant="determinate"
          value={((stepIndex + (status === STATUS.DONE ? 1 : 0)) / LIVE_CAPTURE_STEPS.length) * 100}
          sx={{ mt: 1 }}
        />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="subtitle1">{currentStep.label}</Typography>

          {error && <Alert severity="warning">{error}</Alert>}

          {status === STATUS.UPLOADING && slowUpload && (
            <Alert severity="info">
              Esto está tardando más de lo normal — sigue conectado, revisa tu señal.
            </Alert>
          )}

          {gps && (
            <Chip
              size="small"
              color="info"
              label={`GPS: ${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)} (±${Math.round(
                gps.accuracy_m
              )}m)`}
            />
          )}

          <Box
            sx={{
              width: '100%',
              aspectRatio: '4 / 3',
              bgcolor: 'black',
              borderRadius: 1,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {status === STATUS.PREVIEW && previewUrl ? (
              currentStep.kind === 'video' ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video src={previewUrl} controls style={{ width: '100%', height: '100%' }} />
              ) : (
                <img src={previewUrl} alt="Vista previa capturada" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            )}
          </Box>

          {status === STATUS.STREAMING && (
            <Typography variant="caption" color="text.secondary">
              Encuadra {currentStep.label.toLowerCase()} y captura cuando esté listo. No se permite
              subir desde galería.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={status === STATUS.UPLOADING}>
          Cancelar
        </Button>

        {status === STATUS.STREAMING && currentStep.kind === 'photo' && (
          <Button variant="contained" onClick={handleCapturePhoto}>
            Capturar foto
          </Button>
        )}

        {status === STATUS.STREAMING && currentStep.kind === 'video' && isVideoRecordingSupported() && (
          <Button variant="contained" onClick={handleStartRecording}>
            Iniciar grabación
          </Button>
        )}

        {status === STATUS.RECORDING && (
          <Button variant="contained" color="error" onClick={handleStopRecording}>
            Detener grabación
          </Button>
        )}

        {status === STATUS.PREVIEW && (
          <>
            <Button onClick={handleRetry}>Repetir</Button>
            <Button variant="contained" onClick={handleConfirmUpload}>
              Confirmar y subir
            </Button>
          </>
        )}

        {status === STATUS.UPLOADING && (
          <Button variant="contained" disabled startIcon={<CircularProgress size={16} />}>
            Subiendo...
          </Button>
        )}

        {status === STATUS.ERROR && (
          <Button variant="contained" onClick={handleRetry}>
            Reintentar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default LiveCaptureWizard;
export { LIVE_CAPTURE_STEPS };
