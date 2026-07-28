'use strict';

const { DRIVER_EVIDENCE_MAP, toMediaList } = require('./helpers');

const findExistingEvidence = async (
  strapi,
  validationId,
  sourceDriverField,
  sourceFileId
) => {
  const rows = await strapi.entityService.findMany(
    'api::cars-evidence.cars-evidence',
    {
      filters: {
        validation: { id: validationId },
        source_driver_field: sourceDriverField,
        source_file_id: sourceFileId,
      },
      limit: 1,
    }
  );
  return rows[0] || null;
};

const findCurrentEvidencesForField = async (strapi, validationId, sourceDriverField) => {
  return strapi.entityService.findMany('api::cars-evidence.cars-evidence', {
    filters: {
      validation: { id: validationId },
      source_driver_field: sourceDriverField,
      is_current: true,
    },
  });
};

const getNextVersion = async (strapi, validationId, sourceDriverField) => {
  const rows = await strapi.entityService.findMany('api::cars-evidence.cars-evidence', {
    filters: {
      validation: { id: validationId },
      source_driver_field: sourceDriverField,
    },
    sort: { version: 'desc' },
    limit: 1,
  });
  return (rows[0]?.version || 0) + 1;
};

const supersedeEvidence = async (strapi, evidenceId) => {
  await strapi.entityService.update('api::cars-evidence.cars-evidence', evidenceId, {
    data: {
      is_current: false,
      review_status: 'superseded',
    },
  });
};

const createEvidenceRecord = async (
  strapi,
  {
    validationId,
    def,
    fileId,
    version,
    origin,
    supersedesId = null,
  }
) => {
  return strapi.entityService.create('api::cars-evidence.cars-evidence', {
    data: {
      validation: validationId,
      type: def.type,
      file: fileId,
      review_status: 'pending',
      origin,
      source_driver_field: def.field,
      source_file_id: fileId,
      version,
      is_current: true,
      supersedes: supersedesId,
      uploaded_from_gallery: origin !== 'live_capture',
      timestamp_server: new Date(),
    },
  });
};

const syncEvidencesFromDriver = async (
  strapi,
  { validationId, driver, actorId, origin = 'preregister' }
) => {
  const created = [];
  const skipped = [];
  const superseded = [];

  for (const def of DRIVER_EVIDENCE_MAP) {
    const files = toMediaList(driver[def.field]);
    if (!files.length) continue;

    for (const file of files) {
      const fileId = Number(file.id);
      if (!fileId) continue;

      const existing = await findExistingEvidence(
        strapi,
        validationId,
        def.field,
        fileId
      );
      if (existing) {
        skipped.push(existing.id);
        continue;
      }

      let supersedesId = null;

      if (!def.allowMany) {
        const currentForField = await findCurrentEvidencesForField(
          strapi,
          validationId,
          def.field
        );
        const replaceable = currentForField.find(
          (item) => Number(item.source_file_id) !== fileId
        );
        if (replaceable) {
          await supersedeEvidence(strapi, replaceable.id);
          superseded.push(replaceable.id);
          supersedesId = replaceable.id;
        }
      }

      const version = await getNextVersion(strapi, validationId, def.field);
      const evidence = await createEvidenceRecord(strapi, {
        validationId,
        def,
        fileId,
        version,
        origin,
        supersedesId,
      });

      created.push(evidence.id);
    }
  }

  return {
    created,
    skipped,
    superseded,
    evidenceCount: created.length + skipped.length,
  };
};

module.exports = {
  syncEvidencesFromDriver,
  findExistingEvidence,
  findCurrentEvidencesForField,
};
