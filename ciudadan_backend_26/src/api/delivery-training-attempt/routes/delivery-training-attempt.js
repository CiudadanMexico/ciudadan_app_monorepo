'use strict';

/**
 * delivery-training-attempt router
 *
 * CRUD core CERRADO: los intentos solo los crea el backend al calificar
 * (respuestas correctas jamas viajan al frontend).
 */
const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::delivery-training-attempt.delivery-training-attempt', {
  except: ['find', 'findOne', 'create', 'update', 'delete'],
});
