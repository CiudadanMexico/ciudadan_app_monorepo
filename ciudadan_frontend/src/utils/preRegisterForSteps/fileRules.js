export const MAX_FILE_SIZE_MB = 8;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const DEFAULT_FILE_ACCEPT = "image/*,application/pdf";

export const FILE_RULES = {
  foto_perfil: { accept: DEFAULT_FILE_ACCEPT, multiple: false, maxFiles: 1, maxSize: MAX_FILE_SIZE_BYTES },
  selfie_verificacion: { accept: DEFAULT_FILE_ACCEPT, multiple: false, maxFiles: 1, maxSize: MAX_FILE_SIZE_BYTES },
  ine_frente: { accept: DEFAULT_FILE_ACCEPT, multiple: false, maxFiles: 1, maxSize: MAX_FILE_SIZE_BYTES },
  ine_reverso: { accept: DEFAULT_FILE_ACCEPT, multiple: false, maxFiles: 1, maxSize: MAX_FILE_SIZE_BYTES },
  licencia_frente: { accept: DEFAULT_FILE_ACCEPT, multiple: false, maxFiles: 1, maxSize: MAX_FILE_SIZE_BYTES },
  licencia_reverso: { accept: DEFAULT_FILE_ACCEPT, multiple: false, maxFiles: 1, maxSize: MAX_FILE_SIZE_BYTES },
  comprobante_domicilio: { accept: DEFAULT_FILE_ACCEPT, multiple: true, maxFiles: 3, maxSize: MAX_FILE_SIZE_BYTES },
  foto_vehiculo_frontal: { accept: DEFAULT_FILE_ACCEPT, multiple: true, maxFiles: 3, maxSize: MAX_FILE_SIZE_BYTES },
  foto_vehiculo_lateral: { accept: DEFAULT_FILE_ACCEPT, multiple: true, maxFiles: 3, maxSize: MAX_FILE_SIZE_BYTES },
  foto_vehiculo_trasera: { accept: DEFAULT_FILE_ACCEPT, multiple: true, maxFiles: 3, maxSize: MAX_FILE_SIZE_BYTES },
  foto_interior: { accept: DEFAULT_FILE_ACCEPT, multiple: true, maxFiles: 3, maxSize: MAX_FILE_SIZE_BYTES },
  tarjeta_circulacion: { accept: DEFAULT_FILE_ACCEPT, multiple: true, maxFiles: 3, maxSize: MAX_FILE_SIZE_BYTES },
  seguro_vehiculo: { accept: DEFAULT_FILE_ACCEPT, multiple: true, maxFiles: 3, maxSize: MAX_FILE_SIZE_BYTES },
};
