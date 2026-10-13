'use strict';

/**
 * Vehicle controller — lectura privada de la documentación del vehículo y
 * de la tarjeta de circulación (solo verificadores autorizados).
 *
 * Las rutas públicas básicas de lectura están restringidas por policy en el
 * router (config.routes). Este controller solo expone:
 *   - GET /api/vehicle/card/:id   → el identificador del expediente de la
 *     tarjeta para el verificador autorizado (policy global::is-verificador).
 */
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::vehicle.vehicle', ({ strapi }) => ({
  /**
   * GET /api/vehicles
   *
   * Lista los vehículos del expediente del usuario autenticado (o de su
   * agencia). La política `global::is-authenticated-auth0` garantiza que
   * exista un token de Auth0 válido y deja el usuario en ctx.state.strapiUser.
   *
   * Sin sesión la respuesta queda vacía: los expedientes (y su documentación)
   * son privados y no deben filtrarse en listados anónimos.
   */
  async find(ctx) {
    const user = ctx.state?.strapiUser || ctx.state?.user;

    if (!user?.id) {
      ctx.query = { ...ctx.query, filters: { id: { $null: true } } };
      return super.find(ctx);
    }

    // El usuario ve su propio expediente y el de su agencia (si pertenece a
    // una). Sin agencia el filtro se limita al usuario para no ampliar el
    // alcance sin control.
    const agencyId = user?.agencia?.id ?? user?.agencia;
    const orFilters = [{ user: user.id }];
    if (agencyId) {
      orFilters.push({ agency: agencyId });
    }

    ctx.query = {
      ...ctx.query,
      filters: {
        ...(ctx.query?.filters || {}),
        $or: orFilters,
      },
    };

    return super.find(ctx);
  },

  /**
   * GET /api/vehicles/:id
   *
   * Lectura puntual con gate de propiedad: solo el dueño del expediente
   * (vehicle.user) o un miembro de su misma agencia. Cualquier otro
   * autenticado recibe 403. Los verificadores usan getCard (rol + estado).
   */
  async findOne(ctx) {
    const user = ctx.state?.strapiUser || ctx.state?.user;
    if (!user?.id) {
      return ctx.forbidden('Sesión requerida para leer un expediente.');
    }

    const { id } = ctx.params;
    const vehicle = await strapi.db.query('api::vehicle.vehicle').findOne({
      where: { id },
      populate: ['user', 'agency'],
    });

    if (!vehicle) {
      return ctx.notFound('Vehículo no encontrado');
    }

    const ownerId = vehicle.user?.id ?? vehicle.user;
    const vehicleAgencyId = vehicle.agency?.id ?? vehicle.agency;
    const requesterAgencyId = user?.agencia?.id ?? user?.agencia;

    const isOwner = ownerId != null && String(ownerId) === String(user.id);
    const isSameAgency =
      vehicleAgencyId != null &&
      requesterAgencyId != null &&
      String(vehicleAgencyId) === String(requesterAgencyId);

    if (!isOwner && !isSameAgency) {
      return ctx.forbidden('No tienes permiso para ver este expediente.');
    }

    return super.findOne(ctx);
  },

  /**
   * GET /api/vehicle/card/:id
   *
   * Devuelve la tarjeta de circulación y los datos del expediente al
   * verificador autorizado (policy global::is-verificador). El conductor
   * propio nunca llega aquí: su lectura va por find/findOne con su sesión.
   */
  async getCard(ctx) {
    const { id } = ctx.params;

    const vehicle = await strapi
      .query('api::vehicle.vehicle')
      .findOne({ where: { id } }, { populate: ['user', 'agency', 'driver', 'validated_by'] });

    if (!vehicle) {
      return ctx.notFound('Vehículo no encontrado');
    }

    // Solo exponemos los recursos documentales cuando el expediente está
    // listo para ser auditado (documento_completo/en_revision/aprobado).
    const auditable = ['documento_completo', 'en_revision', 'aprobado'];
    if (!auditable.includes(vehicle.status)) {
      return ctx.forbidden('El expediente no está listo para ser auditado.');
    }

    return ctx.send({ data: vehicle });
  },

  /**
   * POST /api/vehicles/:id/open-review
   *
   * El líder verificador abre la revisión documental/física:
   * documento_completo → en_revision. Guarda evidencia en observation.
   */
  async openReview(ctx) {
    const verifier = ctx.state?.strapiUser;
    const { id } = ctx.params;
    const { observation } = ctx.request.body || {};
    try {
      const vehicle = await strapi
        .service('api::vehicle.vehicle')
        .openReview(id, verifier);
      if (observation != null) {
        await strapi.db.query('api::vehicle.vehicle').update({
          where: { id },
          data: { observation, updated_by: verifier?.id ?? null },
        });
      }
      return ctx.send({ data: vehicle });
    } catch (err) {
      return ctx.badRequest(err.message || 'No se pudo abrir la revisión.');
    }
  },

  /**
   * POST /api/vehicles/:id/close-review
   *
   * Body: { outcome: 'aprobado'|'suspenso', observation? }.
   * Marca validated_by/validated_at. Solo desde en_revision.
   */
  async closeReview(ctx) {
    const verifier = ctx.state?.strapiUser;
    const { id } = ctx.params;
    const { outcome, observation } = ctx.request.body || {};
    try {
      const vehicle = await strapi
        .service('api::vehicle.vehicle')
        .closeReview(id, outcome, verifier, observation);
      return ctx.send({ data: vehicle });
    } catch (err) {
      return ctx.badRequest(err.message || 'No se pudo cerrar la revisión.');
    }
  },
}));
