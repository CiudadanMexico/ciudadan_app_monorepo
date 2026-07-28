"use strict";

const logValidationEvent = async (
  strapi,
  { validationId, evidenceId, actorId, action, payload }
) => {
  return strapi.entityService.create(
    "api::cars-validation-event.cars-validation-event",
    {
      data: {
        validation: validationId,
        evidence: evidenceId || null,
        actor: actorId || null,
        action,
        payload: payload || {},
      },
    }
  );
};

module.exports = { logValidationEvent };
