'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { submitAuditItem } = require('../../verification-audit/services/audit-workflow');

module.exports = createCoreController(
  'api::verification-audit-item.verification-audit-item',
  ({ strapi }) => ({
    async submit(ctx) {
      const { id } = ctx.params;
      const { checkKey, result, evidenceIds, externalVerificationIds, note } = ctx.request.body || {};

      if (!id) return ctx.badRequest('id es requerido.');

      try {
        const item = await submitAuditItem(strapi, {
          auditId: Number(id),
          checkKey,
          result,
          evidenceIds,
          externalVerificationIds,
          note,
        });
        return ctx.send({ data: item });
      } catch (error) {
        const status = error.status || 500;
        if (status === 404) return ctx.notFound(error.message);
        if (status === 400) return ctx.badRequest(error.message);
        strapi.log.error('submitAuditItem failed', error);
        return ctx.internalServerError(error.message || 'No se pudo registrar el punto de auditoría.');
      }
    },
  })
);
