// src/services/mediaJobDefinitions.js
/**
 * Bloque 5C: definición central de operaciones multimedia (formularios
 * MVP). Los parámetros reflejan SOLO lo que el backend 5B acepta
 * (allowlist por tipo; camelCase → el backend convierte a snake_case).
 *
 * La capability API (mediaCapabilities()) sigue siendo la AUTORIDAD de
 * disponibilidad: esta config solo describe cómo construir el formulario.
 *
 * Campos de upload: los IDs de archivo subido (uploadId/videoUpload/
 * audioUpload/sourceUpload/targetUpload) los resuelve el backend a rutas
 * internas (nunca expuestas).
 */

export const UPLOAD_KIND_BY_PARAM = {
  uploadId: ["audio", "video"],
  videoUpload: ["video"],
  audioUpload: ["audio"],
  sourceUpload: ["image", "video"],
  targetUpload: ["image", "video"],
};

export const mediaJobDefinitions = {
  transcribe: {
    label: "Transcribir",
    description: "Transcribir audio o video (provider auto del backend).",
    resourceClass: "light",
    fields: [
      { key: "uploadId", type: "file", required: true, label: "Archivo (audio/video)" },
      { key: "language", type: "text", required: false, label: "Idioma (opcional, ej. es)" },
    ],
    hiddenParams: ["provider"], // backend usa auto; no se muestra
    uploadHint: "MP3, WAV, M4A, MP4, MOV, MKV, WEBM...",
  },
  av_sync: {
    label: "Sincronizar A/V",
    description: "Ajustar desfase entre video y audio (modo auto).",
    resourceClass: "light",
    fields: [
      { key: "videoUpload", type: "file", required: true, label: "Video" },
      { key: "audioUpload", type: "file", required: true, label: "Audio" },
      { key: "offsetMs", type: "number", required: false, label: "Offset manual (ms, avanzado)", min: -60000, max: 60000 },
    ],
    defaults: { mode: "auto" }, // allowGenerative=false implícito (backend)
    hiddenParams: ["mode", "allowGenerative"],
    uploadHint: "MP4/MOV/MKV/WEBM + audio WAV/MP3/M4A",
  },
  faceswap: {
    label: "Face swap",
    description: "Intercambio de rostro. Uso comercial NO aprobado (solo interno).",
    resourceClass: "heavy",
    commercialBlocked: true, // la capability confirma; la UI muestra el motivo
    fields: [
      { key: "sourceUpload", type: "file", required: true, label: "Imagen/video fuente (rostro)" },
      { key: "targetUpload", type: "file", required: true, label: "Imagen/video destino" },
    ],
    uploadHint: "JPG/PNG/WEBP o MP4/MOV",
  },
  lipsync: {
    label: "Lip sync",
    description: "Sincronizar labios con audio. Procesamiento intensivo: puede tardar considerablemente en CPU.",
    resourceClass: "heavy",
    heavyHint: true,
    fields: [
      { key: "videoUpload", type: "file", required: true, label: "Video" },
      { key: "audioUpload", type: "file", required: true, label: "Audio" },
    ],
    uploadHint: "MP4/MOV/MKV/WEBM + audio WAV/MP3/M4A",
  },
  music_generate: {
    label: "Generar música",
    description: "Generar música a partir de un prompt (ACE-Step).",
    resourceClass: "heavy",
    heavyHint: true,
    fields: [
      { key: "prompt", type: "textarea", required: true, label: "Prompt (descripción de la música)" },
      { key: "lyrics", type: "textarea", required: false, label: "Letra (opcional)" },
      { key: "duration", type: "number", required: false, label: "Duración (segundos)", min: 5, max: 240 },
    ],
  },
  music_repaint: {
    label: "Repintar música",
    description: "Regenerar un tramo de un audio existente.",
    resourceClass: "heavy",
    heavyHint: true,
    fields: [
      { key: "uploadId", type: "file", required: true, label: "Audio" },
      { key: "start", type: "number", required: true, label: "Inicio (segundos)", min: 0 },
      { key: "end", type: "number", required: true, label: "Fin (segundos)", min: 0 },
      { key: "prompt", type: "textarea", required: true, label: "Prompt del tramo" },
    ],
    validate: (v) => {
      const start = Number(v.start), end = Number(v.end);
      if (Number.isNaN(start) || start < 0) return "start debe ser >= 0";
      if (Number.isNaN(end) || end <= start) return "end debe ser mayor que start";
      return null;
    },
  },
  music_add_track: {
    label: "Agregar pista",
    description: "Agregar una pista generada a un audio existente.",
    resourceClass: "heavy",
    heavyHint: true,
    fields: [
      { key: "uploadId", type: "file", required: true, label: "Audio" },
      { key: "track", type: "text", required: true, label: "Pista a agregar (vocals, drums, bass...)" },
      { key: "prompt", type: "textarea", required: false, label: "Prompt (opcional)" },
    ],
  },
  music_complete: {
    label: "Completar música",
    description: "Completar una pista faltante de un audio/stem (ACE-Step).",
    resourceClass: "heavy",
    heavyHint: true,
    fields: [
      { key: "uploadId", type: "file", required: true, label: "Audio/stem" },
      { key: "track", type: "text", required: true, label: "Pista a completar (vocals, drums, bass...)" },
      { key: "prompt", type: "textarea", required: false, label: "Prompt (opcional)" },
    ],
  },
  stem_extract: {
    label: "Separar stems",
    description: "Separar una pista específica (Demucs).",
    resourceClass: "heavy",
    heavyHint: true,
    fields: [
      { key: "uploadId", type: "file", required: true, label: "Audio" },
      { key: "track", type: "select", required: true, label: "Pista a separar",
        options: ["vocals", "backing_vocals", "drums", "bass", "guitar", "keyboard",
          "percussion", "strings", "synth", "fx", "brass", "woodwinds"] },
    ],
    uploadHint: "MP3, WAV, FLAC, M4A...",
  },
  stems: {
    label: "Separar múltiples stems",
    description: "Separar varias pistas a la vez (Demucs).",
    resourceClass: "heavy",
    heavyHint: true,
    fields: [
      { key: "uploadId", type: "file", required: true, label: "Audio" },
      { key: "tracks", type: "multiselect", required: true, label: "Pistas",
        options: ["vocals", "backing_vocals", "drums", "bass", "guitar", "keyboard",
          "percussion", "strings", "synth", "fx", "brass", "woodwinds"],
        defaultSelected: ["vocals", "drums", "bass"] },
    ],
    uploadHint: "MP3, WAV, FLAC, M4A...",
  },
};

export function getDefinition(type) {
  return mediaJobDefinitions[type] || null;
}
