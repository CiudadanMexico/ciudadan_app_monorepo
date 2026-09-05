'use strict';

/**
 * MODO PRUEBAS SIN JWT: resuelve el usuario que participa en el flujo de
 * anuncios remunerados (el demo creado por seed-ad-rewards.js). Sin Auth0
 * no hay token que identificar, así que se busca directo en la BD.
 * async (strapi) => usuario | null
 */
module.exports = async function buscarUsuarioAnuncios(strapi) {
  return strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email: 'demo-ads@ciudadan.org' },
  });
};
