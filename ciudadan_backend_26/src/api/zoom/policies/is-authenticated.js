"use strict";

const utils = require("@strapi/utils");
const { UnauthorizedError } = utils.errors;

module.exports = async (policyContext, config, { strapi }) => {
  const authHeader = policyContext.request.header.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError(
      "Header de autorización ausente o con formato inválido."
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const jwtService = strapi.plugin("users-permissions").service("jwt");
    const payload = await jwtService.verify(token);

    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      payload.id,
      {
        populate: ["role"],
      }
    );

    if (!user || user.blocked) {
      throw new UnauthorizedError("Usuario inactivo o bloqueado.");
    }

    policyContext.state.user = user;
    return true;
  } catch (err) {
    throw new UnauthorizedError("Token JWT inválido o expirado.");
  }
};
