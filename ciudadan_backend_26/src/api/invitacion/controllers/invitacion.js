'use strict';

/**
 * invitacion controller
 *
 * `find` (GET /api/invitaciones) está SOBREESCRITO a propósito, por dos
 * razones concretas:
 *
 *  1. AUTENTICACIÓN. El frontend (Coowork/AgregarSocio.jsx, vía
 *     `getInvitaciones` de candidatosService.js) llama a este endpoint con el
 *     token de Auth0 (`Authorization: Bearer ...`). Con el core router por
 *     defecto, Strapi intenta validar ese token como si fuera su propio JWT
 *     nativo, lo rechaza y responde 401 ANTES de llegar al controlador: es
 *     el mismo bug ya corregido en `src/api/agencia/routes/agencia.js`. La
 *     ruta se declara con `auth: false` + policy `is-admin-socio-or-root`,
 *     que valida el token Auth0 y deja el usuario en `ctx.state.strapiUser`.
 *
 *  2. AISLAMIENTO POR AGENCIA. Una invitación guarda datos personales de un
 *     candidato (correo y nombre). Sin filtro por agencia, un admin de una
 *     agencia vería las invitaciones de OTRAS agencias. Aquí se devuelve solo
 *     lo que pertenece a la agencia del llamante; `root` ve todas.
 *
 * El resto de acciones (findOne/create/update/delete) quedan como las del
 * core controller: no las usa el frontend y las crea el backend al aceptar
 * una postulación.
 */

const { createCoreController } = require('@strapi/strapi').factories;

const UID_INVITACION = 'api::invitacion.invitacion';

const LIMITE_MAXIMO = 200;
const LIMITE_POR_DEFECTO = 100;

/** Lee un parámetro de la query de Strapi (tolera `clave` y `clave[algo]`). */
const leerQuery = (query = {}, clave) => {
  if (query[clave] !== undefined) return query[clave];
  const prefijo = `${clave}[`;
  for (const [k, v] of Object.entries(query)) {
    if (k.startsWith(prefijo) && k.endsWith(']')) return v;
  }
  return undefined;
};

const aEntero = (valor, porDefecto) => {
  const n = Number.parseInt(valor, 10);
  return Number.isInteger(n) && n > 0 ? n : porDefecto;
};

module.exports = createCoreController(UID_INVITACION, ({ strapi }) => ({
  async find(ctx) {
    const caller = ctx.state.strapiUser || {};
    const extra = Array.isArray(caller.roles?.extra) ? caller.roles.extra : [];
    const roleName = caller.role?.name || caller.role?.type || caller.role?.code || null;
    const esRoot = extra.includes('root') || roleName === 'root';
    const agenciaId = caller.agencia?.id || null;

    const query = ctx.query || {};

    // Sin agencia y sin root: no se ve nada. Nunca se listan invitaciones
    // que no son de la agencia del llamante.
    if (!esRoot && !agenciaId) {
      ctx.body = {
        data: [],
        meta: { pagination: { page: 1, pageSize: 0, pageCount: 0, total: 0 } },
      };
      return;
    }

    const estado = leerQuery(query, 'filters[estado][$eq]');
    const limite = Math.min(
      aEntero(leerQuery(query, 'pagination[limit]'), LIMITE_POR_DEFECTO),
      LIMITE_MAXIMO
    );

    const filtros = {};
    if (!esRoot) filtros.agencia = agenciaId;
    if (estado) filtros.estado = estado;

    const rows = await strapi.entityService.findMany(UID_INVITACION, {
      filters: filtros,
      sort: { fecha_invitacion: 'desc' },
      limit: limite,
      // Solo las publicadas: una invitación no publicada no debe aparecer en
      // el listado de la agencia (mismo criterio que el core controller).
      publicationState: 'live',
    });

    const data = (rows || []).map((row) => ({
      id: row.id,
      attributes: {
        email: row.email,
        nombre: row.nombre,
        estado: row.estado,
        fecha_invitacion: row.fecha_invitacion,
        fecha_respuesta: row.fecha_respuesta,
        metadata: row.metadata,
        agencia: row.agencia,
      },
    }));

    ctx.body = {
      data,
      meta: {
        pagination: { page: 1, pageSize: data.length, pageCount: 1, total: data.length },
      },
    };
  },
}));
