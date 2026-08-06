'use strict';

module.exports = {
    routes: [
        {
            method: 'PUT',
            path: '/viaje/pagar',
            handler: 'pagar.pagar',
            config: {
                auth: false,
                policies: ['global::is-authenticated-auth0', 'global::is-admin-or-socio']
            },
        },
    ],
};