'use strict';
module.exports = {
  routes: [{
    method: 'POST',
    path: '/prelanzamiento',
    handler: 'prelanzamiento.registrar',
    config: { auth: false },
  }],
};
