'use strict';

/**
 * Mock de `strapi` (global) para los servicios del MVP de repartidores.
 * Sigue el patron de tests/helpers/strapi-mock.js (driver-launch-lead) pero
 * con tablas ARBITRARIAS por UID (el MVP usa 6 colecciones + users + agencias).
 * Ningun archivo compartido existente se modifica (regla 11).
 */

const CRECIMIENTOS = { id: 5000 };

function coincide(fila, where = {}) {
  if ('$or' in where) {
    const subconsultas = where.$or;
    if (!Array.isArray(subconsultas) || !subconsultas.some((sub) => coincide(fila, sub))) {
      return false;
    }
  }
  return Object.entries(where)
    .filter(([campo]) => campo !== '$or')
    .every(([campo, valor]) => {
      if (valor && typeof valor === 'object') {
        if ('$ne' in valor) return fila[campo] !== valor.$ne;
        if ('$in' in valor) return valor.$in.includes(fila[campo]);
        if ('$lt' in valor) return (fila[campo] ?? 0) < valor.$lt;
        if ('$gt' in valor) return (fila[campo] ?? 0) > valor.$gt;
        if ('$gte' in valor) return (fila[campo] ?? 0) >= valor.$gte;
        return false;
      }
      return fila[campo] === valor;
    });
}

function crearStrapiRepartidoresMock({ tablas = {}, servicios = {} } = {}) {
  const escrituras = [];

  const filasDe = (uid) => {
    if (!tablas[uid]) tablas[uid] = [];
    return tablas[uid];
  };

  const query = (uid) => ({
    findOne: async ({ where = {} } = {}) =>
      filasDe(uid).find((fila) => coincide(fila, where)) || null,
    findMany: async ({ where = {}, limit, offset = 0, orderBy } = {}) => {
      let filas = filasDe(uid).filter((fila) => coincide(fila, where));
      if (orderBy) {
        const [campo, dir] = Object.entries(orderBy)[0];
        filas = [...filas].sort((a, b) =>
          String(a[campo] ?? '').localeCompare(String(b[campo] ?? ''), 'es', { numeric: true })
        );
        if (dir === 'desc') filas.reverse();
      }
      if (offset) filas = filas.slice(offset);
      return typeof limit === 'number' ? filas.slice(0, limit) : filas;
    },
    count: async ({ where = {} } = {}) => filasDe(uid).filter((fila) => coincide(fila, where)).length,
    create: async ({ data }) => {
      const fila = { id: (CRECIMIENTOS.id += 1), ...data };
      filasDe(uid).push(fila);
      escrituras.push({ uid, operacion: 'create', data });
      return fila;
    },
    update: async ({ where, data }) => {
      const fila = filasDe(uid).find((f) => coincide(f, where));
      escrituras.push({ uid, operacion: 'update', where, data });
      if (!fila) return null;
      return Object.assign(fila, data);
    },
    updateMany: async ({ where, data } = {}) => {
      const filas = filasDe(uid).filter((f) => coincide(f, where));
      filas.forEach((f) => Object.assign(f, data));
      escrituras.push({ uid, operacion: 'updateMany', where, data });
      return { count: filas.length };
    },
  });

  const strapi = {
    log: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
    db: { query },
    entityService: {
      findOne: async (uid, id, _params) =>
        filasDe(uid).find((f) => Number(f.id) === Number(id)) || null,
      create: async (uid, { data }) => {
        const fila = { id: (CRECIMIENTOS.id += 1), ...data };
        filasDe(uid).push(fila);
        escrituras.push({ uid, operacion: 'entityService.create', data });
        return fila;
      },
    },
    dirs: { static: { public: require('os').tmpdir() } },
    service: (uid) => {
      if (servicios[uid]) return servicios[uid];
      throw new Error(`Service no mockeado: ${uid}`);
    },
    plugin: (nombre) => {
      if (nombre === 'upload') {
        return {
          services: {
            upload: servicios['plugin::upload'] || {
              fetch: async () => null,
              upload: async () => { throw new Error('plugin upload no mockeado'); },
            },
          },
        };
      }
      throw new Error(`Plugin no mockeado: ${nombre}`);
    },
  };

  global.strapi = strapi;
  return { strapi, escrituras, tablas };
}

/** ctx tipo Koa suficiente para los controladores de delivery-registration. */
function crearCtxRepartidores({ params = {}, body = {}, query = {}, headers = {}, files = {}, strapiUser = null, ip = '1.2.3.4' } = {}) {
  return {
    params,
    query,
    request: { body, files, headers },
    headers,
    ip,
    state: { strapiUser },
    sets: {},
    status: 200,
    body: undefined,
    set(clave, valor) {
      this.sets[clave] = valor;
    },
    badRequest(mensaje) {
      const e = new Error(mensaje);
      e.status = 400;
      e.expose = true;
      throw e;
    },
    notFound(mensaje) {
      const e = new Error(mensaje);
      e.status = 404;
      e.expose = true;
      throw e;
    },
    forbidden(mensaje) {
      const e = new Error(mensaje);
      e.status = 403;
      e.expose = true;
      throw e;
    },
    tooManyRequests(mensaje) {
      const e = new Error(mensaje);
      e.status = 429;
      e.expose = true;
      throw e;
    },
    conflict(mensaje) {
      const e = new Error(mensaje);
      e.status = 409;
      e.expose = true;
      throw e;
    },
  };
}

module.exports = { crearStrapiRepartidoresMock, crearCtxRepartidores, coincide };
