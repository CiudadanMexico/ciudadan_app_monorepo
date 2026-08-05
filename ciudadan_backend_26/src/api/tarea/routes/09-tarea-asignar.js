'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/tareas/asignar',
      handler: 'asignar.asignar',
      config: {
        auth: false,
        policies: ['global::can-asignar-tarea'],
      },
    },
  ],
};
