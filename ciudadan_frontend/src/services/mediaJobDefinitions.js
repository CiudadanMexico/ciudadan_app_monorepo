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
 *
 * help: guía completa de uso por operación (botón "Ayuda" en la UI).
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
    help: {
      que: "Convierte el habla de un archivo de audio o video en texto escrito (transcripción).",
      requisitos: [
        "Un archivo de audio o video: MP3, WAV, M4A, MP4, MOV, MKV o WEBM.",
        "Que tenga voz/habla clara; la música o el ruido fuerte reducen la precisión.",
      ],
      pasos: [
        "Selecciona la operación «Transcribir».",
        "Sube el archivo con el botón de archivo (espera el mensaje «listo»).",
        "Opcional: escribe el idioma (ej. «es» para español). Si lo dejas vacío, se detecta automáticamente.",
        "Pulsa «Crear trabajo».",
        "Sigue el estado en «Mis trabajos»: se actualiza solo, sin refrescar la página.",
        "Cuando aparezca «succeeded», abre «Artifacts»: puedes ver la transcripción como texto o descargarla (VTT/JSON).",
      ],
      resultado: "Texto transcrito en artifacts: transcripción legible y/o archivos VTT/JSON según el caso.",
      tiempo: "Operación ligera: normalmente termina en menos de 1-2 minutos.",
      tips: [
        "Audio claro y sin ruido = mejor precisión.",
        "Para español escribe «es» en idioma.",
        "Si el video es largo, la transcripción tarda proporcionalmente más.",
      ],
    },
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
    help: {
      que: "Detecta y corrige el desfase entre un video y una pista de audio (labios que no coinciden con el sonido).",
      requisitos: [
        "El video (MP4, MOV, MKV o WEBM).",
        "El audio por separado (WAV, MP3 o M4A).",
        "Ambos deben ser del mismo contenido (misma toma, misma duración aproximada).",
      ],
      pasos: [
        "Selecciona la operación «Sincronizar A/V».",
        "Sube el video y el audio en sus respectivos campos.",
        "Deja vacío el offset: el modo automático calcula el desfase solo.",
        "Avanzado: solo si conoces el desfase exacto, pon el offset manual en milisegundos.",
        "Pulsa «Crear trabajo» y espera el estado «succeeded».",
        "Abre «Artifacts» y descarga el video ya sincronizado.",
      ],
      resultado: "Un nuevo video con la pista de audio alineada correctamente.",
      tiempo: "Operación ligera: suele tardar poco más que la duración del propio material.",
      tips: [
        "Usa los archivos originales, sin re-codificar previamente.",
        "El offset manual positivo retrasa el audio; negativo lo adelanta.",
      ],
    },
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
    help: {
      que: "Intercambia el rostro de una persona (fuente) sobre otra persona (destino) en una imagen o un video.",
      requisitos: [
        "Imagen o video FUENTE con el rostro a tomar (JPG, PNG, WEBP, MP4 o MOV).",
        "Imagen o video DESTINO donde se colocará el rostro.",
        "Rostros visibles, frontales y con buena iluminación en ambos archivos.",
      ],
      pasos: [
        "Selecciona la operación «Face swap».",
        "Sube la fuente (el rostro que quieres usar) y el destino (donde se colocará).",
        "Pulsa «Crear trabajo».",
        "Espera en «Mis trabajos»: verás queued → running → succeeded en tiempo real, sin refrescar.",
        "Al terminar, abre «Artifacts»: previsualiza el resultado (imagen o video) o descárgalo.",
      ],
      resultado: "Una imagen o video nuevo con el rostro de la fuente aplicado sobre el destino.",
      tiempo: "Operación intensiva (heavy): de varios minutos para imágenes; considerablemente más para videos largos.",
      tips: [
        "Solo se procesa UN trabajo pesado a la vez por usuario.",
        "Fotos frontales y bien iluminadas dan resultados mucho mejores.",
        "Para probar, empieza con imágenes pequeñas o videos muy cortos.",
        "Uso interno: el uso comercial de esta operación no está aprobado.",
      ],
    },
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
    help: {
      que: "Ajusta los labios de la persona del video para que coincidan con la pista de audio que proporciones (doblaje).",
      requisitos: [
        "Un video con UNA persona hablando de frente a cámara (MP4, MOV, MKV o WEBM).",
        "El audio nuevo (voz) en WAV, MP3 o M4A.",
      ],
      pasos: [
        "Selecciona la operación «Lip sync».",
        "Sube el video original y el audio con la nueva voz.",
        "Pulsa «Crear trabajo».",
        "Espera: es una operación intensiva; el estado avanza en vivo en «Mis trabajos».",
        "Al terminar, abre «Artifacts» para reproducir o descargar el video con labios sincronizados.",
      ],
      resultado: "Un video nuevo con los labios de la persona sincronizados al audio indicado.",
      tiempo: "Operación pesada en CPU: puede tardar bastante; usa videos cortos para probar.",
      tips: [
        "Funciona mejor con una sola persona, de frente y con el rostro bien visible.",
        "Videos de menos de 30 segundos para pruebas: tarda mucho menos.",
        "Solo UN trabajo pesado a la vez por usuario.",
      ],
    },
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
    help: {
      que: "Genera música original a partir de una descripción escrita (prompt), con el modelo ACE-Step.",
      requisitos: [
        "Un prompt descriptivo (obligatorio): estilo, género, instrumentos, ambiente.",
        "Opcional: letra (si quieres voz cantada). Sin letra, la pieza es instrumental.",
        "Opcional: duración entre 5 y 240 segundos.",
      ],
      pasos: [
        "Selecciona la operación «Generar música».",
        "Escribe el prompt, ej.: «piano jazz suave, tempo lento, ambiente nocturno, sin batería».",
        "Opcional: pega o escribe la letra (una línea por frase).",
        "Opcional: indica la duración en segundos (más corto = más rápido).",
        "Pulsa «Crear trabajo».",
        "Verás el estado avanzar en vivo (queued → running → succeeded) sin refrescar.",
        "Abre «Artifacts»: reproduce el resultado directamente (reproductor con seek) o descárgalo como MP3.",
      ],
      resultado: "Una pieza musical generada (audio MP3), reproducible y descargable desde artifacts.",
      tiempo: "Operación intensiva: ~2-5 minutos para piezas cortas (15-30 s); más para piezas largas.",
      tips: [
        "Prompts específicos dan mejores resultados: género + instrumentos + tempo + ambiente.",
        "Si no quieres voz, deja la letra vacía.",
        "Genera primero 15 segundos para validar la idea; luego genera la versión larga.",
      ],
    },
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
    uploadHint: "MP3, WAV, FLAC, M4A...",
    help: {
      que: "Regenera («repinta») un tramo concreto de un audio existente siguiendo tus instrucciones, dejando el resto intacto.",
      requisitos: [
        "El audio original (MP3, WAV, FLAC o M4A).",
        "El tramo a regenerar: segundo de inicio y segundo de fin.",
        "Un prompt que describa cómo quieres ese tramo (obligatorio).",
      ],
      pasos: [
        "Selecciona la operación «Repintar música».",
        "Sube el audio original.",
        "Indica Inicio y Fin (en segundos) del tramo a regenerar (fin > inicio).",
        "Escribe el prompt del tramo, ej.: «aquí un solo de guitarra eléctrica con distorsión».",
        "Pulsa «Crear trabajo» y espera el estado «succeeded».",
        "Abre «Artifacts» y reproduce el audio regenerado.",
      ],
      resultado: "El audio completo con el tramo indicado regenerado según tu prompt.",
      tiempo: "Operación intensiva: tramos cortos (5-15 s) tardan pocos minutos.",
      tips: [
        "Escucha el original antes para elegir bien el tramo.",
        "Tramos cortos = mejor calidad y menos espera.",
      ],
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
    uploadHint: "MP3, WAV, FLAC, M4A...",
    help: {
      que: "Genera y agrega una pista nueva (voz, batería, bajo, etc.) mezclada sobre un audio existente.",
      requisitos: [
        "El audio base (MP3, WAV, FLAC o M4A).",
        "El nombre de la pista a agregar: vocals, drums, bass, guitar, keyboard, percussion, strings, synth, fx, brass, woodwinds.",
        "Opcional: un prompt que guíe el estilo de la pista nueva.",
      ],
      pasos: [
        "Selecciona la operación «Agregar pista».",
        "Sube el audio base.",
        "Escribe la pista a agregar (ej.: «drums»).",
        "Opcional: describe el estilo deseado en el prompt.",
        "Pulsa «Crear trabajo» y espera; luego reproduce el resultado en «Artifacts».",
      ],
      resultado: "El audio con la nueva pista mezclada.",
      tiempo: "Operación intensiva: unos pocos minutos para audios cortos.",
      tips: [
        "«vocals» agrega voz cantada; usa el prompt para indicar qué debería decir o cantar.",
        "Prueba primero con audios de menos de un minuto.",
      ],
    },
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
    uploadHint: "MP3, WAV, FLAC, M4A...",
    help: {
      que: "Completa una pista que falta en un audio o stem (por ejemplo, tienes la voz y quiere generarse el acompañamiento).",
      requisitos: [
        "El audio o stem existente (MP3, WAV, FLAC o M4A).",
        "La pista que falta y quieres completar: vocals, drums, bass, guitar, etc.",
      ],
      pasos: [
        "Selecciona la operación «Completar música».",
        "Sube el audio/stem existente.",
        "Indica la pista faltante a completar.",
        "Opcional: describe el estilo en el prompt.",
        "Pulsa «Crear trabajo», espera «succeeded» y escucha el resultado en «Artifacts».",
      ],
      resultado: "El audio con la pista faltante completada y mezclada.",
      tiempo: "Operación intensiva: unos pocos minutos para material corto.",
      tips: [
        "Ideal para stems aislados (solo voz o solo instrumento).",
        "Cuanto más limpio el stem, mejor la completación.",
      ],
    },
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
    help: {
      que: "Separa UNA pista concreta de una mezcla de audio (por ejemplo, extraer solo la voz) con Demucs.",
      requisitos: [
        "El audio mezclado (MP3, WAV, FLAC o M4A).",
        "Elegir UNA pista a separar: vocals, drums, bass, guitar, keyboard, etc.",
      ],
      pasos: [
        "Selecciona la operación «Separar stems».",
        "Sube el audio.",
        "Elige la pista a separar en el desplegable (ej.: vocals).",
        "Pulsa «Crear trabajo» y espera el estado «succeeded».",
        "Abre «Artifacts» y descarga la pista separada.",
      ],
      resultado: "Un audio nuevo con solo la pista elegida.",
      tiempo: "Operación intensiva: minutos; depende de la duración del audio.",
      tips: [
        "Para extraer varias pistas a la vez, usa «Separar múltiples stems».",
        "«vocals» = voz principal; «backing_vocals» = coros.",
      ],
    },
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
    help: {
      que: "Separa VARIAS pistas de una mezcla en un solo trabajo (un artifact por pista elegida).",
      requisitos: [
        "El audio mezclado (MP3, WAV, FLAC o M4A).",
        "Elegir al menos una pista del listado.",
      ],
      pasos: [
        "Selecciona la operación «Separar múltiples stems».",
        "Sube el audio.",
        "Marca las pistas que quieres separar (por defecto: vocals, drums y bass).",
        "Pulsa «Crear trabajo».",
        "Al terminar, cada pista aparece como su propio artifact: previsualiza o descarga cada una.",
      ],
      resultado: "Un artifact de audio por cada pista seleccionada.",
      tiempo: "Operación intensiva: más pistas = algo más de espera.",
      tips: [
        "Selecciona solo las pistas que realmente necesites.",
        "Puedes borrar los artifacts que no quieras conservar con el botón de borrado.",
      ],
    },
  },
};

export function getDefinition(type) {
  return mediaJobDefinitions[type] || null;
}
