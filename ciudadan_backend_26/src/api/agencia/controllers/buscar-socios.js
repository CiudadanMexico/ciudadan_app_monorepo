'use strict';

/**
 * GET /api/agencias/mi-agencia/socios/buscar?q=...
 *
 * Busca usuarios SIN agencia por email o username, para agregarlos como
 * socios (chat.md: "aquí solo muestra a usuarios que no tengan agencia" /
 * "no es necesario mostrar a todos... es para buscar a alguien
 * concretamente").
 *
 * Exige un mínimo de caracteres en el query para no volcar el listado
 * completo de usuarios con las primeras letras (chat.md: "que no funcione
 * desde las primeras letras... hasta que ya sea casi única").
 *
 * Si el texto buscado coincide exactamente con el email de un usuario que
 * SÍ tiene agencia, se informa explícitamente en vez de simplemente
 * omitirlo de los resultados (chat.md: "si ellos buscaran ahí un usuario
 * que ya tiene agencia, les debería de indicar que se tiene que dar de
 * baja").
 */

const USER_UID = 'plugin::users-permissions.user';
const MIN_QUERY_LENGTH = 4;
const MAX_RESULTS = 10;

module.exports = {
  async buscarSocios(ctx) {
    const q = String(ctx.query.q || '').trim();

    if (q.length < MIN_QUERY_LENGTH) {
      return ctx.badRequest(`Escribe al menos ${MIN_QUERY_LENGTH} caracteres para buscar`);
    }

    const sinAgencia = await strapi.db.query(USER_UID).findMany({
      where: {
        $and: [
          { agencia: null },
          {
            $or: [
              { email: { $containsi: q } },
              { username: { $containsi: q } },
            ],
          },
        ],
      },
      select: ['id', 'email', 'username'],
      limit: MAX_RESULTS,
      orderBy: { email: 'asc' },
    });

    // Si el texto coincide exacto con el email de alguien que YA tiene
    // agencia, avisar explícitamente (en vez de que simplemente no aparezca
    // y parezca que no existe).
    let yaTieneAgencia = null;
    if (q.includes('@')) {
      const conAgencia = await strapi.db.query(USER_UID).findOne({
        where: { email: q },
        populate: { agencia: true },
      });
      if (conAgencia?.agencia) {
        yaTieneAgencia = {
          email: conAgencia.email,
          agencia: { id: conAgencia.agencia.id, nombre: conAgencia.agencia.nombre },
        };
      }
    }

    ctx.body = {
      ok: true,
      data: sinAgencia.map((u) => ({ id: u.id, email: u.email, username: u.username })),
      yaTieneAgencia,
    };
  },
};
