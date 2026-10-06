'use strict';

/**
 * Mock mínimo de `strapi` (global) para probar servicios/controladores sin
 * arrancar el servidor ni tocar la base de datos.
 */

const CRECIMIENTOS = { id: 1000 };

function crearStrapiMock({ leads = [], drivers = [], config = {}, servicios = {} } = {}) {
  const escrituras = [];

  const tablas = {
    'api::driver-launch-lead.driver-launch-lead': leads,
    'api::driver.driver': drivers,
  };

  const query = uid => {
    const filas = tablas[uid];
    if (!filas) throw new Error(`UID no mockeado: ${uid}`);
    return {
      findOne: async ({ where = {} } = {}) => {
        const entradas = Object.entries(where);
        return filas.find(fila => entradas.every(([campo, valor]) => {
          if (valor && typeof valor === 'object') return String(fila[campo] || '').toLowerCase() === String(valor.$ilike).toLowerCase();
          return fila[campo] === valor;
        })) || null;
      },
      findMany: async ({ where = {}, limit } = {}) => {
        const entradas = Object.entries(where).filter(([campo]) => campo !== 'id');
        let resultado = filas.filter(fila => entradas.every(([campo, valor]) => {
          if (valor && typeof valor === 'object' && '$ne' in valor) return fila[campo] !== valor.$ne;
          if (valor && typeof valor === 'object' && '$lt' in valor) return (fila[campo] || 0) < valor.$lt;
          return fila[campo] === valor;
        }));
        return typeof limit === 'number' ? resultado.slice(0, limit) : resultado;
      },
      create: async ({ data }) => {
        const fila = { id: (CRECIMIENTOS.id += 1), ...data };
        filas.push(fila);
        escrituras.push({ uid, operacion: 'create', data });
        return fila;
      },
      update: async ({ where, data }) => {
        const fila = filas.find(f => f.id === where.id);
        escrituras.push({ uid, where, data });
        if (!fila) throw new Error(`Fila ${uid}/${JSON.stringify(where)} inexistente en el mock`);
        return Object.assign(fila, data);
      },
    };
  };

  const strapi = {
    log: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    db: { query },
    service: uid => {
      if (servicios[uid]) return servicios[uid];
      if (uid === 'api::driver-membership-config.driver-membership-config') {
        const { normalizarConfig, sePuedeReclamarPromocion } = require('../../src/api/driver-membership-config/utils/precios');
        const cfg = normalizarConfig(config);
        return {
          getConfig: async () => cfg,
          estadoPromocion: async () => sePuedeReclamarPromocion(cfg),
        };
      }
      throw new Error(`Service no mockeado: ${uid}`);
    },
  };

  global.strapi = strapi;
  return { strapi, escrituras };
}

/** ctx tipo Koa suficiente para los controladores de la landing. */
function crearCtx({ params = {}, body = {}, ip = '1.2.3.4' } = {}) {
  return {
    params,
    request: { body },
    ip,
    headers: {},
    sets: {},
    status: 200,
    body: undefined,
    set(clave, valor) {
      this.sets[clave] = valor;
    },
    badRequest(mensaje) {
      throw Object.assign(new Error(mensaje), { status: 400 });
    },
    notFound(mensaje) {
      throw Object.assign(new Error(mensaje), { status: 404 });
    },
    tooManyRequests(mensaje) {
      throw Object.assign(new Error(mensaje), { status: 429 });
    },
    serviceUnavailable(mensaje) {
      throw Object.assign(new Error(mensaje), { status: 503 });
    },
    throw(status, mensaje) {
      throw Object.assign(new Error(mensaje), { status });
    },
  };
}

module.exports = { crearStrapiMock, crearCtx };
