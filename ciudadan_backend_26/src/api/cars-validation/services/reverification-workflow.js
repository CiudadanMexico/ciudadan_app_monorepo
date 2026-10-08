"use strict";

const { logValidationEvent } = require("./validation-audit");

const VALIDATION_UID = "api::cars-validation.cars-validation";

const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const notFound = (message) => {
  const error = new Error(message);
  error.status = 404;
  return error;
};

/**
 * docs/TAXIS-VERIFICACION-CONDUCTORES-FASES.md, Fase 7: cierra el ciclo
 * cuando algo sale mal SIN borrar el historial — crea un expediente NUEVO
 * vinculado al anterior (`reverification_of`) y conserva el motivo. El
 * original nunca se modifica ni se borra.
 *
 * El documento dice "asignado preferentemente a otra agencia/verificador"
 * (preferentemente, no obligatorio) — así que no se rechaza si coincide,
 * solo se informa en la respuesta para que quien asigna lo note.
 */
const createReverification = async (
  strapi,
  { originalValidationId, reason, preferredAgencyId, preferredVerifierId, actorId }
) => {
  if (!originalValidationId) throw badRequest("originalValidationId es requerido.");
  if (!reason || !String(reason).trim()) throw badRequest("reason es requerido.");

  const original = await strapi.entityService.findOne(VALIDATION_UID, originalValidationId, {
    populate: { driver: true, agency: true, reviewer: true },
  });
  if (!original) throw notFound("Validación original no encontrada.");

  const originalAgencyId = original.agency?.id || original.agency || null;
  const originalReviewerId = original.reviewer?.id || original.reviewer || null;
  const driverId = original.driver?.id || original.driver || null;

  const sameAgencyWarning = Boolean(
    preferredAgencyId && originalAgencyId && Number(preferredAgencyId) === Number(originalAgencyId)
  );
  const sameVerifierWarning = Boolean(
    preferredVerifierId && originalReviewerId && Number(preferredVerifierId) === Number(originalReviewerId)
  );

  const reverification = await strapi.entityService.create(VALIDATION_UID, {
    data: {
      driver: driverId,
      agency: preferredAgencyId || null,
      reviewer: preferredVerifierId || null,
      status: "pending",
      reverification_of: originalValidationId,
      reverification_reason: reason,
      protocol_version: original.protocol_version || "1.0",
    },
  });

  await logValidationEvent(strapi, {
    validationId: originalValidationId,
    actorId,
    action: "reverification_created",
    payload: { reverificationId: reverification.id, reason },
  });
  await logValidationEvent(strapi, {
    validationId: reverification.id,
    actorId,
    action: "reverification_created",
    payload: { originalValidationId, reason },
  });

  return { reverification, sameAgencyWarning, sameVerifierWarning };
};

module.exports = { createReverification };
