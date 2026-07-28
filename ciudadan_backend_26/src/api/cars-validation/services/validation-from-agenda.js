"use strict";

const crypto = require("crypto");
const { syncEvidencesFromDriver } = require("./evidence-sync");
const { logValidationEvent } = require("./validation-audit");
const {
  mergeAgendaMetadata,
  getRelationId,
  DRIVER_MEDIA_POPULATE,
} = require("./helpers");

const createFromAgenda = async (
  strapi,
  { userId, driverId, agendaId, agencyId, appointmentDate }
) => {
  const driver = await strapi.entityService.findOne(
    "api::driver.driver",
    driverId,
    {
      populate: { user: true, ...DRIVER_MEDIA_POPULATE },
    }
  );

  if (!driver) {
    const error = new Error("Conductor no encontrado.");
    error.status = 404;
    throw error;
  }

  const driverUserId = getRelationId(driver.user);
  if (String(driverUserId) !== String(userId)) {
    const error = new Error("No puedes crear validación para este conductor.");
    error.status = 403;
    throw error;
  }

  const agenda = await strapi.entityService.findOne(
    "api::agenda.agenda",
    agendaId
  );
  if (!agenda) {
    const error = new Error("Agenda no encontrada.");
    error.status = 404;
    throw error;
  }

  const existingByAgenda = await strapi.entityService.findMany(
    "api::cars-validation.cars-validation",
    {
      filters: { agenda: { id: agendaId } },
      limit: 1,
    }
  );

  let validation = existingByAgenda[0] || null;
  let reused = false;

  if (validation) {
    reused = true;
  } else {
    validation = await strapi.entityService.create(
      "api::cars-validation.cars-validation",
      {
        data: {
          driver: driverId,
          agenda: agendaId,
          agency: agencyId || getRelationId(driver.agency) || null,
          appointment_date: appointmentDate,
          opened_at: new Date(),
          status: "pending",
          result: "manual_review",
          nonce: crypto.randomUUID(),
          session_token: crypto.randomUUID(),
          metadata: {
            source: "preregister",
            user_id: userId,
            agenda_id: agendaId,
            driver_id: driverId,
          },
        },
      }
    );

    await logValidationEvent(strapi, {
      validationId: validation.id,
      actorId: userId,
      action: "validation_created",
      payload: { agendaId, driverId, agencyId, appointmentDate },
    });
  }

  const syncResult = await syncEvidencesFromDriver(strapi, {
    validationId: validation.id,
    driver,
    actorId: userId,
  });

  if (syncResult.created.length) {
    await logValidationEvent(strapi, {
      validationId: validation.id,
      actorId: userId,
      action: "evidence_synced",
      payload: {
        createdEvidenceIds: syncResult.created,
        skippedEvidenceIds: syncResult.skipped,
        evidenceCount: syncResult.evidenceCount,
      },
    });
  }

  await strapi.entityService.update("api::agenda.agenda", agendaId, {
    data: {
      metadata: mergeAgendaMetadata(agenda, validation.id, driverId),
    },
  });

  if (driver.status !== "pending_review") {
    await strapi.entityService.update("api::driver.driver", driverId, {
      data: { status: "pending_review" },
    });

    await logValidationEvent(strapi, {
      validationId: validation.id,
      actorId: userId,
      action: "driver_status_synced",
      payload: { driverId, status: "pending_review" },
    });
  }

  const fullValidation = await strapi.entityService.findOne(
    "api::cars-validation.cars-validation",
    validation.id,
    {
      populate: {
        driver: true,
        agency: true,
        agenda: true,
        evidences: { populate: { file: true } },
      },
    }
  );

  return {
    validation: fullValidation,
    meta: {
      reused,
      evidenceCreated: syncResult.created.length,
      evidenceSkipped: syncResult.skipped.length,
      evidenceTotal: syncResult.evidenceCount,
    },
  };
};

const resolveByAgenda = async (strapi, agendaId) => {
  const rows = await strapi.entityService.findMany(
    "api::cars-validation.cars-validation",
    {
      filters: { agenda: { id: agendaId } },
      limit: 1,
      sort: { createdAt: "desc" },
    }
  );
  return rows[0] || null;
};

const getReviewBundle = async (strapi, validationId) => {
  const validation = await strapi.entityService.findOne(
    "api::cars-validation.cars-validation",
    validationId,
    {
      populate: {
        driver: {
          populate: DRIVER_MEDIA_POPULATE,
        },
        agency: true,
        agenda: true,
        reviewer: true,
        evidences: {
          populate: { file: true, reviewer: true },
        },
        events: {
          populate: { actor: true, evidence: true },
          sort: { createdAt: "desc" },
        },
      },
    }
  );

  if (!validation) {
    const error = new Error("Validación no encontrada.");
    error.status = 404;
    throw error;
  }

  return validation;
};

module.exports = {
  createFromAgenda,
  resolveByAgenda,
  getReviewBundle,
};
