'use strict';

/**
 * Service de la colección vehicle.
 *
 * Además de los CRUD por defecto, centraliza las transiciones de estado del
 * expediente del conductor. La máquina de estados es:
 *
 *   preregistrado ──(documentos completos)──▶ documento_completo
 *   documento_completo ──(líder abre revisión)──▶ en_revision
 *   en_revision ──(verificación física ok)──▶ aprobado
 *   en_revision ──(hallazgos)──▶ suspenso / reevaluacion
 *   aprobado ──(incidencia)──▶ suspenso ──▶ reevaluacion ──▶ aprobado
 *
 * El frontend NUNCA envía el estado destino: lo resuelve el servidor a partir
 * del expediente y de quién hace la petición (verificador).
 */
const { createCoreService } = require('@strapi/strapi').factories;

/** Documentos mínimos para que el expediente se considere completo. */
const REQUIRED_DOC_FIELDS = [
  'registration_card',
  'insurance_document',
  'vehicle_front_photo',
  'vehicle_side_photo',
  'vehicle_back_photo',
  'vehicle_interior_photo',
];

module.exports = createCoreService('api::vehicle.vehicle', ({ strapi }) => ({
  /**
   * Marca el expediente como `documento_completo` si ya tiene la
   * documentación obligatoria. Se llama desde el lifecycle al guardar.
   *
   * @param {number|string} vehicleId
   * @returns {Promise<object|null>} el vehículo actualizado o null si no aplica
   */
  async markDocumentsCompleteIfReady(vehicleId) {
    const vehicle = await strapi.db.query('api::vehicle.vehicle').findOne({
      where: { id: vehicleId },
    });

    if (!vehicle || vehicle.status !== 'preregistrado') return null;

    const pending = REQUIRED_DOC_FIELDS.filter((field) => !vehicle[field]);
    if (pending.length > 0) return null;

    return strapi.db.query('api::vehicle.vehicle').update({
      where: { id: vehicleId },
      data: { status: 'documento_completo' },
    });
  },

  /**
   * Pasa el expediente a `en_revision` cuando el líder verificador lo abre.
   * Solo aplica sobre expedientes en `documento_completo`.
   *
   * @param {number|string} vehicleId
   * @param {object} verifier usuario que abre la revisión (ctx.state.strapiUser)
   */
  async openReview(vehicleId, verifier) {
    const vehicle = await strapi.db.query('api::vehicle.vehicle').findOne({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new Error('Vehículo no encontrado');
    }
    if (vehicle.status !== 'documento_completo') {
      throw new Error(
        `No se puede abrir revisión sobre un expediente en estado "${vehicle.status}".`,
      );
    }

    return strapi.db.query('api::vehicle.vehicle').update({
      where: { id: vehicleId },
      data: {
        status: 'en_revision',
        updated_by: verifier?.id ?? null,
      },
    });
  },

  /**
   * Cierra la revisión: `aprobado` o `suspenso`. Guarda quién validó y cuándo.
   *
   * @param {number|string} vehicleId
   * @param {'aprobado'|'suspenso'} outcome
   * @param {object} verifier usuario verificador
   * @param {string} [observation] evidencia/observación del verificador
   */
  async closeReview(vehicleId, outcome, verifier, observation) {
    if (!['aprobado', 'suspenso'].includes(outcome)) {
      throw new Error(`Resultado de revisión inválido: "${outcome}".`);
    }

    const vehicle = await strapi.db.query('api::vehicle.vehicle').findOne({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new Error('Vehículo no encontrado');
    }
    if (vehicle.status !== 'en_revision') {
      throw new Error(
        `No se puede cerrar revisión sobre un expediente en estado "${vehicle.status}".`,
      );
    }

    return strapi.db.query('api::vehicle.vehicle').update({
      where: { id: vehicleId },
      data: {
        status: outcome,
        validated_by: verifier?.id ?? null,
        validated_at: new Date().toISOString(),
        observation: observation ?? vehicle.observation ?? null,
        updated_by: verifier?.id ?? null,
      },
    });
  },
}));
