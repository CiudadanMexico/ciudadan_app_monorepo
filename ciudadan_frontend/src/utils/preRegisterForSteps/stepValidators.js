import {
  isEmail,
  isFutureDateTime,
  isFutureOrTodayDate,
  isPastOrTodayDate,
  isValidCurp,
  isValidLicensePlate,
  isValidPhone,
  isValidRfc,
  isValidVin,
  isValidZipCode,
  validateFilesByRule,
} from "./fieldValidators";

export const buildStepRules = () => ({
  email: {
    required: "El correo es obligatorio.",
    validate: (value) => isEmail(value) || "Ingresa un correo valido.",
  },
  password: {
    required: "La contraseña es obligatoria.",
    minLength: { value: 8, message: "Minimo 8 caracteres." },
  },
  telefono: {
    required: "El telefono es obligatorio.",
    validate: (value) => isValidPhone(value) || "Debe tener 10 digitos.",
  },
  phoneVerified: {
    validate: (value) => Boolean(value) || "Debes verificar tu numero de WhatsApp antes de continuar.",
  },
  nombre: { required: "Nombre requerido." },
  apellido_paterno: { required: "Apellido paterno requerido." },
  apellido_materno: { required: "Apellido materno requerido." },
  fecha_nacimiento: {
    required: "Fecha de nacimiento requerida.",
    validate: (value) => isPastOrTodayDate(value) || "La fecha no puede ser futura.",
  },
  sexo: { required: "Selecciona el sexo." },
  curp: {
    required: "CURP requerida.",
    validate: (value) => isValidCurp(value) || "CURP invalida (Se requiere 18 caracteres).",
  },
  rfc: {
    required: "RFC requerido.",
    validate: (value) => isValidRfc(value) || "RFC invalido (Formato incorrecto).",
  },
  telefono_emergencia: {
    validate: (value) => !value || isValidPhone(value) || "Debe tener 10 digitos.",
  },
  direccion: {
    required: "Direccion requerida.",
    validate: (value) => value.trim().length > 6 || "Direccion invalida o muy corta",
  },
  codigo_postal: {
    required: "Codigo postal requerido.",
    validate: (value) => isValidZipCode(value) || "Debe tener 5 digitos.",
  },
  foto_perfil: {
    validate: (value) => (value && (Array.isArray(value) ? value.length > 0 : true)) || "Sube foto de perfil.",
  },
  selfie_verificacion: {
    validate: (value) => (value && (Array.isArray(value) ? value.length > 0 : true)) || "Sube selfie de verificacion.",
  },
  ine_frente: {
    validate: (value) => (value ? true : "Sube INE frente."),
  },
  ine_reverso: {
    validate: (value) => (value ? true : "Sube INE reverso."),
  },
  licencia_frente: {
    validate: (value) => (value ? true : "Sube licencia frente."),
  },
  licencia_reverso: {
    validate: (value) => (value ? true : "Sube licencia reverso."),
  },
  comprobante_domicilio: {
    validate: (value) =>
      (value && (Array.isArray(value) ? value.length > 0 : true)) || "Sube comprobante de domicilio.",
  },
  numero_licencia: { required: "Numero de licencia requerido." },
  tipo_licencia: { required: "Tipo de licencia requerido." },
  vigencia_licencia: {
    required: "Vigencia requerida.",
    validate: (value) => isFutureOrTodayDate(value) || "La vigencia debe ser actual o futura.",
  },
  marca: { required: "Marca requerida." },
  modelo: { required: "Modelo requerido." },
  anio: {
    required: "Anio requerido.",
    validate: (value) => Number(value) >= 1990 || "Anio invalido.",
  },
  color: { required: "Color requerido." },
  placas: {
    required: "Placas requeridas.",
    validate: (value) => isValidLicensePlate(value) || "Formato de placas invalido.",
  },
  numero_serie_vin: {
    required: "VIN requerido.",
    validate: (value) => isValidVin(value) || "VIN invalido.",
  },
  tipo_vehiculo: { required: "Tipo de vehiculo requerido." },
  capacidad_pasajeros: {
    required: "Capacidad requerida.",
    validate: (value) => Number(value) > 0 || "Capacidad invalida.",
  },
  foto_vehiculo_frontal: { validate: (value) => (value ? true : "Sube foto frontal.") },
  foto_vehiculo_lateral: { validate: (value) => (value ? true : "Sube foto lateral.") },
  foto_vehiculo_trasera: { validate: (value) => (value ? true : "Sube foto trasera.") },
  foto_interior: { validate: (value) => (value ? true : "Sube foto interior.") },
  tarjeta_circulacion: { validate: (value) => (value ? true : "Sube tarjeta de circulacion.") },
  seguro_vehiculo: { validate: (value) => (value ? true : "Sube seguro del vehiculo.") },
  fecha: {
    required: "Fecha y hora de cita requerida.",
    validate: (value) => isFutureDateTime(value) || "La cita debe ser futura.",
  },
  sede: { required: "Selecciona una sede." },
});

export const validateFileField = (fieldName, value) => validateFilesByRule(fieldName, value);
