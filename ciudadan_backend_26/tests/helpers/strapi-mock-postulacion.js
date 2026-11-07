'use strict';

/**
 * Mock de `strapi` para las pruebas de postulación a socio / invitación.
 *
 * No arranca el servidor ni toca la base de datos: solo implementa la parte
 * de la API que usan el controlador `resolver` y el util de invitación:
 *   - `strapi.entityService.findMany/findOne/create/update` sobre tablas en
 *     memoria (con filtro por correo y por id de agencia);
 *   - `strapi.db.transaction(fn)` (el patrón transaccional del repo);
 *   - `strapi.log` mudo.
 *
 * También trae un `ctx` tipo Koa con `state.strapiUser`, para poder probar
 * el PATCH /api/postulacion-socios/:id/estado sin permisos ni red.
 */

const UID_POSTULACION = 'api::postulacion-socio.postulacion-socio';
const UID_INVITACION = 'api::invitacion.invitacion';

function crearMockPostulacion({ postulaciones = [], invitaciones = [] } = {}) {
  const escrituras = [];
  let secuencia = 1000;

  const tablas = {
    [UID_POSTULACION]: postulaciones,
    [UID_INVITACION]: invitaciones,
  };

  const tablaDe = (uid) => {
    if (!tablas[uid]) throw new Error(`UID no mockeado: ${uid}`);
    return tablas[uid];
  };

  const idDeRelacion = (valor) => {
    if (valor === null || valor === undefined) return null;
    if (typeof valor === 'object') return valor.id ?? null;
    return valor;
  };

  const cumpleFiltros = (fila, filtros = {}) =>
    Object.entries(filtros).every(([campo, valor]) => {
      if (valor === undefined) return true;
      if (campo === 'agencia') return idDeRelacion(fila.agencia) === idDeRelacion(valor);
      return fila[campo] === valor;
    });

  const entityService = {
    async findMany(uid, params = {}) {
      const filas = tablaDe(uid).filter((fila) => cumpleFiltros(fila, params.filters));
      return typeof params.limit === 'number' ? filas.slice(0, params.limit) : filas;
    },
    async findOne(uid, id) {
      return tablaDe(uid).find((fila) => String(fila.id) === String(id)) || null;
    },
    async create(uid, { data } = {}) {
      const fila = { id: (secuencia += 1), ...data };
      tablaDe(uid).push(fila);
      escrituras.push({ uid, operacion: 'create', data });
      return fila;
    },
    async update(uid, id, { data } = {}) {
      const fila = tablaDe(uid).find((f) => String(f.id) === String(id));
      if (!fila) throw new Error(`Fila ${uid}/${id} inexistente en el mock`);
      Object.assign(fila, data);
      escrituras.push({ uid, operacion: 'update', id, data });
      return fila;
    },
  };

  const strapi = {
    log: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    entityService,
    // `createCoreController` envuelve el content-type en un Proxy: necesita un
    // objeto (no undefined) para poder construir el controller base.
    contentType: (uid) => ({
      uid,
      modelName: 'mock',
      attributes: {},
      options: { draftAndPublish: true },
    }),
    db: {
      // El mock no simula rollback: se ejecuta la función y se devuelve su
      // resultado. Para probar que un fallo NO deja la postulación aceptada a
      // medias, el propio mock propaga la excepción (el controlador aborta
      // antes de actualizar).
      transaction: async (fn) => fn(),
      query: () => {
        throw new Error('db.query no mockeado en este helper');
      },
    },
  };

  global.strapi = strapi;
  return { strapi, escrituras, tablas };
}

/** ctx tipo Koa para el controlador de postulaciones. */
function crearCtxPostulacion({ params = {}, body = {}, user = null } = {}) {
  return {
    params,
    request: { body },
    state: { strapiUser: user },
    status: 200,
    body: undefined,
    badRequest(mensaje) {
      throw Object.assign(new Error(mensaje), { status: 400 });
    },
    notFound(mensaje) {
      throw Object.assign(new Error(mensaje), { status: 404 });
    },
    forbidden(mensaje) {
      throw Object.assign(new Error(mensaje), { status: 403 });
    },
  };
}

/** Usuario root de prueba (ve todas las agencias). */
const usuarioRoot = (id = 1) => ({
  id,
  roles: { extra: ['root'] },
  agencia: { id: 999, nombre: 'Todas (root)' },
});

module.exports = {
  UID_POSTULACION,
  UID_INVITACION,
  crearMockPostulacion,
  crearCtxPostulacion,
  usuarioRoot,
};
