'use strict';

/**
 * postulacion-socio controller
 *
 * Endpoint público para que un candidato se postule a socio de una agencia.
 * `create` es público (auth:false) porque llega gente sin cuenta; el core
 * controller ya valida y persiste.
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::postulacion-socio.postulacion-socio');
