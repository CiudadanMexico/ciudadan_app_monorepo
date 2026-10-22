'use strict';

/**
 * Constantes del MVP de repartidores (api::delivery-registration).
 * Referencias de la auditoria (docs/REPARTIDORES-MVP-FASE-A-AUDITORIA.md):
 *  - UIDs reales de Strapi, nombres exactos.
 *  - CIUDADES_HABILITADAS: decision cerrada de producto (spec §12): CDMX
 *    exclusivamente. No existe modelo territorial en el repo; el "activo" de
 *    una agencia es su publishedAt (draftAndPublish), y lo "federal" es
 *    agencia.tipo === 'federal'.
 */

const UIDS = {
  USER: 'plugin::users-permissions.user',
  AGENCIA: 'api::agencia.agencia',
  PROFILE: 'api::delivery-profile.delivery-profile',
  VEHICLE: 'api::delivery-vehicle.delivery-vehicle',
  EVENT: 'api::delivery-verification-event.delivery-verification-event',
  TRAINING: 'api::delivery-training-attempt.delivery-training-attempt',
  WAITLIST: 'api::delivery-waitlist-entry.delivery-waitlist-entry',
  SIGNAL: 'api::delivery-risk-signal.delivery-risk-signal',
  NOTIFICACION: 'api::notificacion.notificacion',
  UPLOAD_FILE: 'plugins::upload.files',
  UPLOAD_SERVICE: 'upload',
};

/** Unica ciudad habilitada para operar en el MVP (spec: decision cerrada). */
const CIUDADES_HABILITADAS = ['CDMX'];

/** Version de la logica de cobertura con la que se sella el expediente. */
const COVERAGE_VERSION = 'v1';

/** Rol funcional que SOLO concede el backend tras aprobacion autorizada. */
const ROL_REPARTIDOR = 'repartidor';

/** Roles que pueden revisar/aprobar en su agencia (spec §8). */
const ROLES_REVISOR = ['socio', 'admin', 'root'];

/** Tipos de vehiculo permitidos (spec §1: sin autos, sin a pie). */
const TIPOS_VEHICULO = ['bicicleta', 'bicicleta_electrica', 'motocicleta'];

/** Slots de evidencia del EXPEDIENTE (identidad). */
const SLOTS_EXPEDIENTE = ['id_front', 'id_back', 'selfie'];

/** Slots de evidencia del VEHICULO (los exigidos dependen del tipo). */
const SLOTS_VEHICULO = [
  'photo_front',
  'photo_side',
  'photo_back',
  'photo_helmet',
  'photo_delivery_bag',
  'video_presentation',
  'motor_label_photo',
  'license_front_photo',
  'license_back_photo',
  'circulation_card_photo',
  'insurance_policy_photo',
];

/** Limites de subida por clase de slot (precedente taxi: imgs 15MB, video 150MB). */
const LIMITES_MEDIA = {
  imagen: { maxSize: 15 * 1024 * 1024, mime: ['image/jpeg', 'image/png', 'image/webp'] },
  video: { maxSize: 150 * 1024 * 1024, mime: ['video/mp4', 'video/quicktime', 'video/webm'] },
};

/** Slots que aceptan video; el resto solo imagenes. */
const SLOTS_VIDEO = ['video_presentation'];

/** Version de terminos/privacidad vigentes del MVP de repartidores. */
const TERMS_VERSION = 'repartidores-mvp-v1';
const PRIVACY_VERSION = 'repartidores-mvp-v1';

/** Version del consentimiento de la lista de espera. */
const WAITLIST_PRIVACY_VERSION = 'repartidores-waitlist-v1';

/** Umbral de aprobacion del examen: >= 8 de 10 (spec §6.9). */
const EXAMEN_MINIMO_APROBATORIO = 8;

/** Version del cuestionario. */
const CUESTIONARIO_VERSION = 1;

module.exports = {
  UIDS,
  CIUDADES_HABILITADAS,
  COVERAGE_VERSION,
  ROL_REPARTIDOR,
  ROLES_REVISOR,
  TIPOS_VEHICULO,
  SLOTS_EXPEDIENTE,
  SLOTS_VEHICULO,
  LIMITES_MEDIA,
  SLOTS_VIDEO,
  TERMS_VERSION,
  PRIVACY_VERSION,
  WAITLIST_PRIVACY_VERSION,
  EXAMEN_MINIMO_APROBATORIO,
  CUESTIONARIO_VERSION,
};
