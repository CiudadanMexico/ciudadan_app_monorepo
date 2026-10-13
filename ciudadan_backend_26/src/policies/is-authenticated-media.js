"use strict";

/**
 * Policy is-authenticated-media (Bloque 5B): autenticacion del modulo media.
 * REUTILIZA los dos sistemas de login EXISTENTES del backend (no inventa uno
 * nuevo):
 *  1. Token Auth0 (RS256/JWKS) -> getAuth0Email + usuario en Strapi (mismo
 *     flujo que is-authenticated-auth0).
 *  2. JWT local de users-permissions (HS256 con JWT_SECRET, payload {id})
 *     emitido por POST /api/auth/local del plugin users-permissions ya
 *     presente. Util para tests y para usuarios de servicio sin Auth0.
 * En ambos casos llena ctx.state.strapiUser.
 */
const { getAuth0Email } = require("../utils/auth0-verify");
const jwt = require("jsonwebtoken");

async function fromAuth0(ctx, { strapi }) {
  const authHeader = ctx.request.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const email = await getAuth0Email(token, { strapi });
    const user = await strapi.db.query("plugin::users-permissions.user").findOne({ where: { email } });
    if (!user) return null;
    ctx.state.mediaAuthProvider = "auth0";
    return user;
  } catch (e) {
    return null;
  }
}

async function fromLocalJwt(ctx, { strapi }) {
  const authHeader = ctx.request.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const payload = jwt.verify(token, secret);
    if (!payload || !payload.id) return null;
    const user = await strapi.db.query("plugin::users-permissions.user").findOne({ where: { id: payload.id } });
    if (!user) return null;
    ctx.state.mediaAuthProvider = "users-permissions-local";
    return user;
  } catch (e) {
    return null;
  }
}

module.exports = async (ctx, config, { strapi }) => {
  const user = (await fromAuth0(ctx, { strapi })) || (await fromLocalJwt(ctx, { strapi }));
  if (!user) {
    strapi.log.warn("is-authenticated-media: credencial invalida (auth0 o jwt local)");
    return false;
  }
  ctx.state.strapiUser = user;
  return true;
};
