'use strict';

const axios = require('axios');

/**
 * Permite continuar si el usuario trae un token de Auth0 válido y existe
 * en Strapi. A diferencia de is-admin-or-socio, NO exige ningún rol extra:
 * cualquier usuario autenticado pasa. Pensada para acciones que cualquier
 * socio puede hacer (ej. resolver/tomar una tarea general).
 */
module.exports = async (ctx, config, { strapi }) => {
    const authHeader = ctx.request.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
        strapi.log.warn('is-authenticated-auth0: falta el header Authorization');
        return false;
    }

    const token = authHeader.slice(7);
    const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;

    if (!AUTH0_DOMAIN) {
        strapi.log.error('is-authenticated-auth0: falta AUTH0_DOMAIN en el .env');
        return false;
    }

    let email;
    try {
        const { data } = await axios.get(`https://${AUTH0_DOMAIN}/userinfo`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        email = data.email;
    } catch (err) {
        strapi.log.warn('is-authenticated-auth0: token inválido en Auth0', err.response?.data || err.message);
        return false;
    }

    if (!email) {
        strapi.log.warn('is-authenticated-auth0: Auth0 no devolvió email');
        return false;
    }

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email },
    });

    if (!user) {
        strapi.log.warn(`is-authenticated-auth0: no existe usuario en Strapi con email ${email}`);
        return false;
    }

    ctx.state.strapiUser = user;
    return true;
};