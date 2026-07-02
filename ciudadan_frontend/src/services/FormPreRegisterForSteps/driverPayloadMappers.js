import { onlyDigits } from '../../utils/preRegisterForSteps/fieldValidators';
import { STEP_TO_BACKEND_FLAG } from '../../utils/preRegisterForSteps/stepsConfig';

const upper = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

export const DEFAULT_FORM_VALUES = {
  email: '',
  password: '',
  telefono: '',
  phoneVerified: false,
  nombre: '',
  apellido_paterno: '',
  apellido_materno: '',
  fecha_nacimiento: '',
  sexo: '',
  curp: '',
  rfc: '',
  telefono_emergencia: '',
  direccion: '',
  codigo_postal: '',
  estado: '',
  municipio: '',
  ciudad: '',
  foto_perfil: null,
  selfie_verificacion: null,
  ine_frente: null,
  ine_reverso: null,
  licencia_frente: null,
  licencia_reverso: null,
  comprobante_domicilio: [],
  numero_licencia: '',
  tipo_licencia: '',
  vigencia_licencia: '',
  marca: '',
  modelo: '',
  anio: '',
  color: '',
  placas: '',
  numero_serie_vin: '',
  tipo_vehiculo: '',
  capacidad_pasajeros: '',
  foto_vehiculo_frontal: [],
  foto_vehiculo_lateral: [],
  foto_vehiculo_trasera: [],
  foto_interior: [],
  tarjeta_circulacion: [],
  seguro_vehiculo: [],
  fecha: '',
  sede: '',
};

export const hydrateFormFromDriver = (driver) => {
  if (!driver) return {};
  const attrs = driver.attributes || driver;
  const mediaRef = (field) => attrs?.[field] || null;
  const mediaArray = (field) => attrs?.[field] || [];

  return {
    email: attrs.email || '',
    telefono: String(attrs.phone || '')
      .replace(/\D/g, '')
      .slice(-10),
    phoneVerified: Boolean(attrs.phone_verified),
    nombre: attrs.firstname || '',
    apellido_paterno: attrs.lastname || '',
    apellido_materno: attrs.middlename || '',
    fecha_nacimiento: attrs.birthdate ? String(attrs.birthdate).slice(0, 10) : '',
    sexo: attrs.gender || '',
    curp: attrs.curp || '',
    rfc: attrs.rfc || '',
    telefono_emergencia: attrs.emergency_phone || '',
    direccion: attrs.address || '',
    codigo_postal: attrs.zip_code || '',
    estado: attrs.state || '',
    municipio: attrs.municipality || '',
    ciudad: attrs.city || '',
    foto_perfil: mediaRef('profile_pic'),
    selfie_verificacion: mediaRef('verification_selfie'),
    ine_frente: mediaRef('id_front'),
    ine_reverso: mediaRef('id_back'),
    licencia_frente: mediaRef('driver_license_front'),
    licencia_reverso: mediaRef('driver_license_back'),
    comprobante_domicilio: mediaArray('proof_of_address'),
    numero_licencia: attrs.license_number || '',
    tipo_licencia: attrs.license_type || '',
    vigencia_licencia: attrs.license_expiration_date
      ? String(attrs.license_expiration_date).slice(0, 10)
      : '',
    marca: attrs.vehicle_brand || '',
    modelo: attrs.vehicle_model || '',
    anio: attrs.vehicle_year || '',
    color: attrs.vehicle_color || '',
    placas: attrs.license_plate || '',
    numero_serie_vin: attrs.vin_number || '',
    tipo_vehiculo: attrs.vehicle_type || '',
    capacidad_pasajeros: attrs.passenger_capacity || '',
    foto_vehiculo_frontal: mediaArray('vehicle_front_photo'),
    foto_vehiculo_lateral: mediaArray('vehicle_side_photo'),
    foto_vehiculo_trasera: mediaArray('vehicle_back_photo'),
    foto_interior: mediaArray('vehicle_interior_photo'),
    tarjeta_circulacion: mediaArray('vehicle_registration_card'),
    seguro_vehiculo: mediaArray('vehicle_insurance_document'),
    fecha: attrs.appointment_date || '',
    sede: attrs?.agency?.id || attrs?.agency || '',
  };
};

export const toDriverPayloadByStep = (stepId, values, mediaIds = {}) => {
  const payload = {};

  if (stepId === 'cuenta') {
    payload.email = values.email?.trim();
    payload.phone = onlyDigits(values.telefono);
  }

  if (stepId === 'verificacion') {
    payload.phone = onlyDigits(values.telefono);
    payload.phone_verified = Boolean(values.phoneVerified);
  }

  if (stepId === 'personales') {
    payload.firstname = values.nombre?.trim();
    payload.lastname = values.apellido_paterno?.trim();
    payload.middlename = values.apellido_materno?.trim();
    payload.birthdate = values.fecha_nacimiento || null;
    payload.gender = values.sexo || null;
    payload.curp = upper(values.curp);
    payload.rfc = upper(values.rfc);
    payload.emergency_phone = onlyDigits(values.telefono_emergencia);
    payload.address = values.direccion?.trim();
    payload.zip_code = values.codigo_postal?.trim();
    payload.state = values.estado?.trim();
    payload.municipality = values.municipio?.trim();
    if (values.ciudad?.trim()) {
      payload.address = `${values.direccion?.trim() || ''}, ${values.ciudad.trim()}`
        .trim()
        .replace(/^,\s*/, '');
    }
  }

  if (stepId === 'documentos') {
    if (mediaIds.foto_perfil !== undefined) payload.profile_pic = mediaIds.foto_perfil;
    if (mediaIds.selfie_verificacion !== undefined)
      payload.verification_selfie = mediaIds.selfie_verificacion;
    if (mediaIds.ine_frente !== undefined) payload.id_front = mediaIds.ine_frente;
    if (mediaIds.ine_reverso !== undefined) payload.id_back = mediaIds.ine_reverso;
    if (mediaIds.licencia_frente !== undefined)
      payload.driver_license_front = mediaIds.licencia_frente;
    if (mediaIds.licencia_reverso !== undefined)
      payload.driver_license_back = mediaIds.licencia_reverso;
    if (mediaIds.comprobante_domicilio !== undefined)
      payload.proof_of_address = mediaIds.comprobante_domicilio;
  }

  if (stepId === 'licencia') {
    payload.license_number = values.numero_licencia?.trim();
    payload.license_type = values.tipo_licencia?.trim();
    payload.license_expiration_date = values.vigencia_licencia || null;
  }

  if (stepId === 'vehiculo') {
    payload.vehicle_brand = values.marca?.trim();
    payload.vehicle_model = values.modelo?.trim();
    payload.vehicle_year = String(values.anio || '').trim();
    payload.vehicle_color = values.color?.trim();
    payload.license_plate = upper(values.placas);
    payload.vin_number = upper(values.numero_serie_vin);
    payload.vehicle_type = values.tipo_vehiculo?.trim();
    payload.passenger_capacity = String(values.capacidad_pasajeros || '').trim();
  }

  if (stepId === 'fotos') {
    if (mediaIds.foto_vehiculo_frontal !== undefined)
      payload.vehicle_front_photo = mediaIds.foto_vehiculo_frontal;
    if (mediaIds.foto_vehiculo_lateral !== undefined)
      payload.vehicle_side_photo = mediaIds.foto_vehiculo_lateral;
    if (mediaIds.foto_vehiculo_trasera !== undefined)
      payload.vehicle_back_photo = mediaIds.foto_vehiculo_trasera;
    if (mediaIds.foto_interior !== undefined)
      payload.vehicle_interior_photo = mediaIds.foto_interior;
    if (mediaIds.tarjeta_circulacion !== undefined)
      payload.vehicle_registration_card = mediaIds.tarjeta_circulacion;
    if (mediaIds.seguro_vehiculo !== undefined)
      payload.vehicle_insurance_document = mediaIds.seguro_vehiculo;
  }

  if (stepId === 'cita') {
    payload.appointment_date = values.fecha || null;
    payload.agency = values.sede || null;
  }

  return { ...payload, ...(STEP_TO_BACKEND_FLAG[stepId] || {}), current_step: stepId };
};

export const buildFinalDriverPayload = (values) => ({
  profile_completed: true,
  documents_completed: true,
  appointment_scheduled: true,
  status: 'pending_review',
  current_step: 'resumen',
  final_approval: false,
  in_person_verification_completed: false,
  email: values.email?.trim(),
});

export const sanitizeValuesForLocal = (values) => {
  const clean = { ...values };
  Object.keys(clean).forEach((key) => {
    const value = clean[key];
    if (value instanceof File) clean[key] = null;
    if (Array.isArray(value)) {
      clean[key] = value.map((item) => {
        if (item instanceof File) {
          return { name: item.name, type: item.type, size: item.size };
        }
        return item;
      });
    }
  });
  return clean;
};
