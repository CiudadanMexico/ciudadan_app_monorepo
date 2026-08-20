'use strict';

/**
 * skill controller
 *
 * BUGS REALES ENCONTRADOS Y CORREGIDOS AQUÍ: el controller anterior llamaba
 * directo a `strapi.service('api::skill.skill')` (find/create/update/delete)
 * en vez de usar `super.find()/create()/update()/delete()` del core
 * controller. Eso rompía dos cosas:
 *
 *   1. Forma de respuesta no estándar: find() devolvía {results, pagination}
 *      y create()/update() devolvían el objeto plano de la entidad — ninguno
 *      pasaba por el sanitizador/transformador de respuesta de Strapi que
 *      produce {data, meta}. El hook del frontend (useSkills.js) espera
 *      json.data en todos los casos: como resultado, fetchSkills() SIEMPRE
 *      devolvía [] (aunque hubiera skills reales en la DB) y createSkill()/
 *      updateSkill() guardaban `undefined` en el estado local.
 *   2. delete() llamaba `skillService.delete({ params: { id } })` — firma
 *      incorrecta para el core service (que espera el id directo, no un
 *      objeto {params}). Confirmado invocando el controller real con un
 *      usuario admin: tira "Undefined attribute level operator params"
 *      SIEMPRE, sin importar el permiso — borrar un skill nunca funcionó.
 *
 * Usar createCoreController + super.<method>() delega en la implementación
 * de Strapi (que sí arma {data, meta} correctamente y sí sabe borrar una
 * entidad), y aquí solo se añaden los checks de permiso/visibilidad.
 */

const { createCoreController } = require('@strapi/strapi').factories;

function getRoles(user) {
  return Array.isArray(user?.roles?.extra) ? user.roles.extra : [];
}
function isAdminEditorOrVerificador(user) {
  return ['admin', 'editor', 'verificador'].some((rol) => getRoles(user).includes(rol));
}
function isAdminOrEditor(user) {
  return ['admin', 'editor'].some((rol) => getRoles(user).includes(rol));
}
function isAdmin(user) {
  return getRoles(user).includes('admin');
}

module.exports = createCoreController('api::skill.skill', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!isAdminEditorOrVerificador(user)) {
      ctx.query = {
        ...ctx.query,
        filters: { ...(ctx.query?.filters || {}), is_active: { $eq: true } },
      };
    }
    return super.find(ctx);
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.strapiUser || ctx.state.user;

    const skill = await strapi.entityService.findOne('api::skill.skill', id, {
      fields: ['is_active'],
    });
    if (!skill) return ctx.notFound();

    if (!isAdminEditorOrVerificador(user) && skill.is_active === false) {
      return ctx.forbidden();
    }

    return super.findOne(ctx);
  },

  async create(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!isAdminOrEditor(user)) return ctx.forbidden();
    return super.create(ctx);
  },

  async update(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!isAdminOrEditor(user)) return ctx.forbidden();
    return super.update(ctx);
  },

  async delete(ctx) {
    const user = ctx.state.strapiUser || ctx.state.user;
    if (!isAdmin(user)) return ctx.forbidden();
    return super.delete(ctx);
  },
}));
