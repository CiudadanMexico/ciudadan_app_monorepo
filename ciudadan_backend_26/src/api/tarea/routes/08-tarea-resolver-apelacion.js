'use strict';

/**
 * Fix A — Endpoint formal de resolución de apelaciones.
 *
 * Política: global::is-admin-or-socio → solo admin/socio pueden resolver.
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/tareas/resolver-apelacion',
      handler: 'resolver-apelacion.resolverApelacion',
      config: {
        auth: false,
        policies: ['global::is-admin-or-socio'],
      },
    },
  ],
};
