'use strict';

/**
 * Mock de `strapi` para el flujo de postulación a socio (`postulacion-socio`).
 *
 * Sigue el patrón de `tests/helpers/strapi-mock-repartidores.js` (tablas
 * arbitrarias por UID) pero modela lo que el controller de postulación-socio
 * hace REALMENTE contra Strapi v4:
 *
 * - `entityService.findMany(uid, { filters })` con `filters: { agencia: 7 }`
 *   filtra por la FK de la relación (en Strapi eso se traduce a un JOIN con
 *   `agencia.id = 7`, NO a un match por objeto).
 * - `entityService.findOne/findMany` con `populate` devuelven la relación
 *   como OBJETO (`{ id, nombre }`), igual que Strapi cuando se puebla.
 * - `ctx.badRequest/notFound/forbidden` NO lanzan: en Strapi v4 son helpers de
 *   Koa que fijan `ctx.status` y `ctx.body` con el formato de error estándar
 *   y devuelven `undefined` (ver `@strapi/strapi` → `services/server/koa.js`).
 *
 * Ningún archivo compartido existente se modifica (regla 11).
 */

const CRECIMIENTOS = { id: 9000 };

const UIDS = {
  POSTULACION: 'api::postulacion-socio.postulacion-socio',
  AREA: 'api::area.area',
  AGENCIA: 'api::agencia.agencia',
  USUARIO: 'plugin::users-permissions.user',
};

/** Compara un campo de la fila contra el valor pedido en un `where`. */
function coincideCampo(fila, campo, valor) {
  if (valor && typeof valor === 'object') {
    if ('$notNull' in valor) return fila[campo] !== null && fila[campo] !== undefined;
    if ('$null' in valor) return fila[campo] === null || fila[campo] === undefined;
    if ('$ne' in valor) return fila[campo] !== valor.$ne;
    if ('$in' in valor) return valor.$in.includes(fila[campo]);
    if ('$eq' in valor) return fila[campo] === valor.$eq;
    return false;
  }
  return fila[campo] === valor;
}

function coincide(fila, where = {}) {
  return Object.entries(where).every(([campo, valor]) => coincideCampo(fila, campo, valor));
}

function crearStrapiPostulacionMock({
  postulaciones = [],
  areas = [],
  agencias = [],
  usuarios = [],
} = {}) {
  const escrituras = [];

  const tablas = {
    [UIDS.POSTULACION]: postulaciones,
    [UIDS.AREA]: areas,
    [UIDS.AGENCIA]: agencias,
    [UIDS.USUARIO]: usuarios,
  };

  /** Relaciones que el controller puebla y que deben volver como objeto. */
  const relaciones = {
    area: areas,
    agencia: agencias,
  };

  const filasDe = (uid) => {
    if (!tablas[uid]) tablas[uid] = [];
    return tablas[uid];
  };

  /** Aplica `populate` como lo hace Strapi: la FK numérica pasa a objeto. */
  const aplicarPopulate = (fila, populate) => {
    if (!populate) return { ...fila };
    const salida = { ...fila };
    const pedidos =
      populate === '*' ? Object.keys(relaciones) : Object.keys(populate);
    pedidos.forEach((campo) => {
      const valor = salida[campo];
      if (valor === null || valor === undefined) return;
      if (typeof valor === 'object') return; // ya viene poblada
      const relacionada = (relaciones[campo] || []).find((r) => r.id === valor);
      salida[campo] = relacionada ? { ...relacionada } : { id: valor };
    });
    return salida;
  };

  const ordenar = (filas, sort) => {
    if (!sort) return filas;
    const [campo, direccion] = Object.entries(sort)[0] || [];
    if (!campo) return filas;
    const ordenadas = [...filas].sort((a, b) =>
      String(a[campo] ?? '').localeCompare(String(b[campo] ?? ''), 'es', { numeric: true })
    );
    return direccion === 'desc' ? ordenadas.reverse() : ordenadas;
  };

  const query = (uid) => ({
    findOne: async ({ where = {}, populate } = {}) => {
      const fila = filasDe(uid).find((f) => coincide(f, where)) || null;
      return fila ? aplicarPopulate(fila, populate) : null;
    },
    findMany: async ({ where = {}, populate, sort, limit } = {}) => {
      let filas = ordenar(filasDe(uid).filter((f) => coincide(f, where)), sort).map((f) =>
        aplicarPopulate(f, populate)
      );
      return typeof limit === 'number' ? filas.slice(0, limit) : filas;
    },
    count: async ({ where = {} } = {}) =>
      filasDe(uid).filter((f) => coincide(f, where)).length,
  });

  const strapi = {
    log: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    db: { query },
    entityService: {
      create: async (uid, { data, files } = {}) => {
        const fila = { id: (CRECIMIENTOS.id += 1), ...data };
        filasDe(uid).push(fila);
        escrituras.push({ uid, operacion: 'entityService.create', data, files });
        return { ...fila };
      },
      findMany: async (uid, { filters = {}, populate, sort, limit } = {}) => {
        let filas = filasDe(uid).filter((f) => coincide(f, filters));
        filas = ordenar(filas, sort).map((f) => aplicarPopulate(f, populate));
        return typeof limit === 'number' ? filas.slice(0, limit) : filas;
      },
      findOne: async (uid, id, { populate } = {}) => {
        const fila = filasDe(uid).find((f) => Number(f.id) === Number(id));
        return fila ? aplicarPopulate(fila, populate) : null;
      },
      update: async (uid, id, { data } = {}) => {
        const fila = filasDe(uid).find((f) => Number(f.id) === Number(id));
        if (!fila) return null;
        Object.assign(fila, data);
        escrituras.push({ uid, operacion: 'entityService.update', id, data });
        return aplicarPopulate(fila, true);
      },
    },
    contentType: (uid) => ({ uid, kind: 'collectionType', attributes: {} }),
    service: (uid) => {
      throw new Error(`Service no mockeado: ${uid}`);
    },
  };

  global.strapi = strapi;
  return { strapi, escrituras, tablas };
}



/**
 * ctx tipo Koa con los helpers de error de Strapi v4: NO lanzan, fijan
 * `status` + `body` con el formato `{ data, error: { status, name, message } }`.
 */
function crearCtxPostulacion({
  params = {},
  body = {},
  query = {},
  headers = {},
  files = {},
  multipart = false,
  strapiUser = null,
  ip = '1.2.3.4',
} = {}) {
  const ctx = {
    params,
    query,
    request: { body, files, headers },
    headers,
    ip,
    state: { strapiUser },
    sets: {},
    status: 200,
    body: undefined,
    is(tipo) {
      return tipo === 'multipart' ? multipart : false;
    },
    set(clave, valor) {
      this.sets[clave] = valor;
    },
  };

  const error = (status, name, mensaje) => {
    ctx.status = status;
    ctx.body = {
      data: null,
      error: { status, name, message: mensaje, details: {} },
    };
  };

  ctx.badRequest = (mensaje) => error(400, 'BadRequestError', mensaje);
  ctx.unauthorized = (mensaje) => error(401, 'UnauthorizedError', mensaje);
  ctx.forbidden = (mensaje) => error(403, 'ForbiddenError', mensaje);
  ctx.notFound = (mensaje) => error(404, 'NotFoundError', mensaje);
  ctx.internalServerError = (mensaje) => error(500, 'InternalServerError', mensaje);

  return ctx;
}

module.exports = { crearStrapiPostulacionMock, crearCtxPostulacion, UIDS, coincide };
