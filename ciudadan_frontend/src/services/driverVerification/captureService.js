import { Capacitor } from '@capacitor/core';

/**
 * docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 2 (sección 13 y 15):
 * la evidencia debe nacer de la cámara en el momento de la verificación, no
 * de la galería, y cada evidencia lleva su propio GPS. No hay plugins de
 * Capacitor para cámara/geolocalización instalados (@capacitor/camera y
 * @capacitor/geolocation no están en package.json) — el WebView de Capacitor
 * expone las mismas Web APIs (getUserMedia, MediaRecorder, geolocation), así
 * que un único adaptador basado en Web APIs sirve para Web y para el APK.
 */

export const isNativePlatform = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch (err) {
    return false;
  }
};

export const getLocationSource = () =>
  isNativePlatform() ? 'native_bridge' : 'browser_geolocation';

export const isCameraSupported = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === 'function';

export const isVideoRecordingSupported = () =>
  typeof window !== 'undefined' && typeof window.MediaRecorder === 'function';

/**
 * Abre la cámara del dispositivo. `facingMode` 'user' (selfie) o
 * 'environment' (trasera, para vehículo/documentos).
 */
export const openCameraStream = async ({ facingMode = 'environment' } = {}) => {
  if (!isCameraSupported()) {
    const error = new Error('Este dispositivo/navegador no soporta acceso a cámara.');
    error.code = 'CAMERA_UNSUPPORTED';
    throw error;
  }
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode },
    audio: false,
  });
};

export const stopStream = (stream) => {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
};

/**
 * Captura el frame actual de un <video> ya conectado a un stream de cámara
 * y lo devuelve como Blob JPEG.
 */
export const capturePhotoFromVideoElement = (videoEl, { quality = 0.92 } = {}) => {
  if (!videoEl || !videoEl.videoWidth) {
    throw new Error('El video de la cámara todavía no está listo.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la foto.'))),
      'image/jpeg',
      quality
    );
  });
};

/**
 * Wrapper de MediaRecorder para grabar video corto (p.ej. video_360). Usar:
 * const recorder = createVideoRecorder(stream); recorder.start();
 * ... await recorder.stop() -> Blob
 */
export const createVideoRecorder = (stream, { mimeType } = {}) => {
  if (!isVideoRecordingSupported()) {
    const error = new Error('Este dispositivo/navegador no soporta grabación de video.');
    error.code = 'VIDEO_RECORDING_UNSUPPORTED';
    throw error;
  }
  const type = mimeType && MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined;
  const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  let stopResolve;
  const stopped = new Promise((resolve) => {
    stopResolve = resolve;
  });
  recorder.onstop = () => {
    stopResolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
  };

  return {
    start: () => recorder.start(),
    stop: () => {
      if (recorder.state !== 'inactive') recorder.stop();
      return stopped;
    },
  };
};

const GEOLOCATION_TIMEOUT_MS = 15000;

/**
 * Ubicación GPS asociada a una evidencia. El GPS nunca es prueba absoluta de
 * presencia física por sí solo (sección 15) — solo es una señal más para el
 * motor de riesgo del servidor.
 */
export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Este dispositivo/navegador no soporta geolocalización.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy_m: position.coords.accuracy,
          client_timestamp: new Date(position.timestamp).toISOString(),
          location_source: getLocationSource(),
        });
      },
      (err) => reject(new Error(err?.message || 'No se pudo obtener la ubicación.')),
      { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 0 }
    );
  });
};

/** SHA-256 en hex de un Blob/File, calculado en el cliente con Web Crypto. */
export const computeSha256Hex = async (blob) => {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
