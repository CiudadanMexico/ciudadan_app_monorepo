'use strict';

const { parseMultipartData } = require('@strapi/utils');

function isAdminEditorOrVerificador(user) {
  const roles = Array.isArray(user?.roles?.extra) ? user.roles.extra : [];
  return ['admin', 'editor', 'verificador'].some((rol) => roles.includes(rol));
}

function isActiveSkill(skill) {
  return (skill?.attributes?.is_active ?? skill?.attributes?.isActive ?? skill?.is_active ?? skill?.isActive) !== false;
}

module.exports = {
  async find(ctx) {
    const skillService = strapi.service('api::skill.skill');
    const entities = ctx.query._q
      ? await skillService.search(ctx.query)
      : await skillService.find(ctx.query);

    const user = ctx.state.user || ctx.state.strapiUser;
    if (!user || !isAdminEditorOrVerificador(user)) {
      if (entities && Array.isArray(entities.data)) {
        return { ...entities, data: entities.data.filter(isActiveSkill) };
      }
      if (Array.isArray(entities)) {
        return entities.filter(isActiveSkill);
      }
    }

    return entities;
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const skillService = strapi.service('api::skill.skill');
    const skill = await skillService.findOne(id, ctx.query);

    if (!skill) {
      return ctx.notFound();
    }

    const user = ctx.state.user || ctx.state.strapiUser;
    const actualSkill = skill.data || skill;
    if (!user || !isAdminEditorOrVerificador(user)) {
      if (!isActiveSkill(actualSkill)) {
        return ctx.forbidden();
      }
    }

    return skill;
  },

  async create(ctx) {
    const user = ctx.state.user || ctx.state.strapiUser;
    if (!user || !['admin', 'editor'].some((rol) => Array.isArray(user.roles?.extra) && user.roles.extra.includes(rol))) {
      return ctx.forbidden();
    }

    const skillService = strapi.service('api::skill.skill');
    let entity;

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await skillService.create({ data, files });
    } else {
      entity = await skillService.create({ data: ctx.request.body.data ?? ctx.request.body });
    }

    return entity;
  },

  async update(ctx) {
    const user = ctx.state.user || ctx.state.strapiUser;
    if (!user || !['admin', 'editor'].some((rol) => Array.isArray(user.roles?.extra) && user.roles.extra.includes(rol))) {
      return ctx.forbidden();
    }

    const { id } = ctx.params;
    const skillService = strapi.service('api::skill.skill');
    let entity;

    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await skillService.update({ params: { id }, data, files });
    } else {
      entity = await skillService.update({ params: { id }, data: ctx.request.body.data ?? ctx.request.body });
    }

    return entity;
  },

  async delete(ctx) {
    const user = ctx.state.user || ctx.state.strapiUser;
    if (!user || !Array.isArray(user.roles?.extra) || !user.roles.extra.includes('admin')) {
      return ctx.forbidden();
    }

    const { id } = ctx.params;
    const skillService = strapi.service('api::skill.skill');
    const entity = await skillService.delete({ params: { id } });

    return entity;
  },
};
