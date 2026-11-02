'use strict';

/**
 * Tests del flujo de postulación a socio (`postulacion-socio`).
 *
 * Cubre las tres piezas del contrato:
 *  - controller: `crearPublica` (alta pública con CV), `miAgencia` (listado
 *    acotado a la agencia del caller) y `resolver` (cambio de estado).
 *  - rutas custom: que el POST público sea `auth:false` con la policy
 *    `allow-public-relations` y que las rutas de gestión usen
 *    `is-admin-socio-or-root`.
 *  - policies: `allow-public-relations` y `is-admin-socio-or-root` (rol vía
 *    `roles.extra`, con `root` como bypass global).
 *
 * Se ejercita el camino REAL de Auth0: Bearer -> /userinfo (axios parcheado)
 * -> usuario por email -> roles.extra -> ctx.state.strapiUser.
 *
 * Nota: `getAuth0Email` cachea la verificación por token 30s; cada prueba usa
 * un token distinto para no pisarse.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  crearStrapiPostulacionMock,
  crearCtxPostulacion,
  UIDS,
} = require('./helpers/strapi-mock-postulacion');

const controllerFactory = require('../src/api/postulacion-socio/controllers/postulacion-socio');
const rutas = require('../src/api/postulacion-socio/routes/01-postulacion-socio');
const allowPublicRelations = require('../src/policies/allow-public-relations');
const isAdminSocioOrRoot = require('../src/policies/is-admin-socio-or-root');

process.env.AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'ciudadan-tests.auth0.local';

const originalAxiosGet = axios.get;

test.after(() => {
  axios.get = originalAxiosGet;
});

/** Simula la respuesta de /userinfo de Auth0 para un token dado. */
function auth0Responde({ email, status = 200 } = {}) {
  axios.get = async () => {
    if (status !== 200) {
      const err = new Error('Request failed with status code ' + status);
      err.response = { status, data: 'Unauthorized' };
      throw err;
    }
    return { data: { email } };
  };
}

const AREAS = [
  { id: 1, name: 'Administrativo', publishedAt: '2026-01-01T00:00:00Z' },
  { id: 2, name: 'Software', publishedAt: '2026-01-01T00:00:00Z' },
];

const AGENCIAS = [
  { id: 7, nombre: 'Local Centro', publishedAt: '2026-01-01T00:00:00Z' },
  { id: 9, nombre: 'Local Norte', publishedAt: '2026-01-01T00:00:00Z' },
];

const USUARIOS = [
  {
    id: 11,
    email: 'socio@ciudadan.org',
    roles: { extra: ['socio'] },
    agencia: { id: 7, nombre: 'Local Centro' },
  },
  {
    id: 12,
    email: 'admin@ciudadan.org',
    roles: { extra: ['admin'] },
    agencia: { id: 7, nombre: 'Local Centro' },
  },
  {
    id: 13,
    email: 'root@ciudadan.org',
    roles: { extra: ['root'] },
    agencia: { id: 7, nombre: 'Local Centro' },
  },
  {
    id: 14,
    email: 'nadie@ciudadan.org',
    roles: { extra: [] },
    agencia: { id: 9, nombre: 'Local Norte' },
  },
];

/** Monta el mock y devuelve el controller instanciado con ese strapi. */
function montar(opciones = {}) {
  const { strapi, escrituras, tablas } = crearStrapiPostulacionMock({
    postulaciones: opciones.postulaciones || [],
    areas: AREAS,
    agencias: AGENCIAS,
    usuarios: USUARIOS,
  });
  const controller = controllerFactory({ strapi });
  return { strapi, controller, escrituras, tablas };
}

/** Datos válidos mínimos del formulario público. */
const FORMULARIO_VALIDO = {
  nombre_completo: 'Ana Candidate',
  email: 'ana@example.com',
  telefono: '5512345678',
  descripcion: 'Quiero participar en el proyecto',
  consentimiento: true,
};

// ---------------------------------------------------------------------------
// crearPublica — alta pública
// ---------------------------------------------------------------------------

test('crearPublica: crea la postulación y responde 201 con el resumen público', async () => {
  const { controller, escrituras } = montar();

  const ctx = crearCtxPostulacion({ body: { ...FORMULARIO_VALIDO } });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 201);
  assert.equal(ctx.body.data.estado, 'pendiente');
  assert.equal(ctx.body.data.email, 'ana@example.com');
  assert.ok(ctx.body.data.id, 'devuelve el id creado');
  assert.equal(escrituras.length, 1);
  assert.equal(escrituras[0].uid, UIDS.POSTULACION);
});

test('crearPublica: el estado, las fechas y el metadata los decide el servidor', async () => {
  const { controller, escrituras } = montar();

  // El visitante intenta colar estado/flujo de revisión: la whitelist lo ignora.
  const ctx = crearCtxPostulacion({
    body: {
      ...FORMULARIO_VALIDO,
      estado: 'aceptada',
      revisado_por: 999,
      notas: 'aprobada por admins',
      fecha_solicitud: '1999-01-01T00:00:00.000Z',
      fecha_resolucion: '1999-01-01T00:00:00.000Z',
      metadata: { origen: 'manipulado' },
    },
  });
  await controller.crearPublica(ctx);

  const { data } = escrituras[0];
  assert.equal(data.estado, 'pendiente', 'el estado no lo elige el visitante');
  assert.equal(data.revisado_por, undefined, 'no se puede auto-revisar');
  assert.equal(data.notas, undefined, 'no se puede injectar notas');
  assert.equal(data.fecha_resolucion, undefined);
  assert.equal(data.metadata.origen, 'web-candidatos');
  assert.equal(data.metadata.consentimiento, true);
  assert.notEqual(data.fecha_solicitud, '1999-01-01T00:00:00.000Z');
});

test('crearPublica: normaliza el email a minúsculas y recorta los textos', async () => {
  const { controller, escrituras } = montar();

  const ctx = crearCtxPostulacion({
    body: {
      ...FORMULARIO_VALIDO,
      email: '  ANA@Example.COM ',
      nombre_completo: '  Ana Candidate  ',
    },
  });
  await controller.crearPublica(ctx);

  assert.equal(escrituras[0].data.email, 'ana@example.com');
  assert.equal(escrituras[0].data.nombre_completo, 'Ana Candidate');
});

test('crearPublica: exige nombre, email válido, teléfono, descripción y consentimiento', async () => {
  const casos = [
    ['sin nombre', { nombre_completo: '' }, 'Escribe tu nombre completo.'],
    ['sin email', { email: '' }, 'Escribe un correo electrónico válido.'],
    ['email inválido', { email: 'no-es-un-email' }, 'Escribe un correo electrónico válido.'],
    ['sin teléfono', { telefono: '' }, 'Escribe un teléfono de contacto.'],
    ['sin descripción', { descripcion: '' }, 'Cuéntanos por qué quieres ser socio.'],
    [
      'sin consentimiento',
      { consentimiento: false },
      'Debes aceptar el consentimiento para enviar tu postulación.',
    ],
  ];

  for (const [nombre, override, mensaje] of casos) {
    const { controller, escrituras } = montar();
    const ctx = crearCtxPostulacion({ body: { ...FORMULARIO_VALIDO, ...override } });
    await controller.crearPublica(ctx);

    assert.equal(ctx.status, 400, nombre);
    assert.equal(ctx.body.error.message, mensaje, nombre);
    assert.equal(escrituras.length, 0, `${nombre}: no debe persistir nada`);
  }
});

test('crearPublica: rechaza area/agencia con id no numérico', async () => {
  const { controller, escrituras } = montar();

  const ctx = crearCtxPostulacion({
    body: { ...FORMULARIO_VALIDO, area: 'no-es-un-id', agencia: 'tampoco' },
  });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 400);
  assert.equal(ctx.body.error.message, 'El área seleccionada no es válida.');
  assert.equal(escrituras.length, 0);
});

test('crearPublica: solo acepta areas y agencias publicadas', async () => {
  // La DB solo tiene publicadas las áreas 1 y 2 y las agencias 7 y 9.
  for (const [campo, idInvalido] of [['area', 99], ['agencia', 99]]) {
    const { controller, escrituras } = montar();
    const ctx = crearCtxPostulacion({
      body: { ...FORMULARIO_VALIDO, [campo]: idInvalido },
    });
    await controller.crearPublica(ctx);

    assert.equal(ctx.status, 400, campo);
    assert.match(ctx.body.error.message, /ya no está disponible/);
    assert.equal(escrituras.length, 0, campo);
  }
});

test('crearPublica: guarda area y agencia solo si el visitante las eligió', async () => {
  const { controller, escrituras } = montar();

  const ctx = crearCtxPostulacion({
    body: { ...FORMULARIO_VALIDO, area: '1', agencia: '7' },
  });
  await controller.crearPublica(ctx);

  assert.equal(escrituras[0].data.area, 1);
  assert.equal(escrituras[0].data.agencia, 7);
});

test('crearPublica: sin area ni agencia la postulación se guarda igual', async () => {
  const { controller, escrituras } = montar();

  const ctx = crearCtxPostulacion({ body: { ...FORMULARIO_VALIDO } });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 201);
  assert.equal(escrituras[0].data.area, undefined);
  assert.equal(escrituras[0].data.agencia, undefined);
});

// ---------------------------------------------------------------------------
// crearPublica — CV y multipart
// ---------------------------------------------------------------------------

/** Fichero con la forma que produce formidable v1 (`{ path, name, type, size }`). */
const archivoCv = (nombre = 'cv.pdf', type = 'application/pdf', size = 1024) => ({
  path: `/tmp/${nombre}`,
  name: nombre,
  type,
  size,
});

test('crearPublica: acepta multipart con el CV en files.cv y lo sube al campo cv', async () => {
  const { controller, escrituras } = montar();

  const ctx = crearCtxPostulacion({
    multipart: true,
    body: { data: JSON.stringify(FORMULARIO_VALIDO) },
    files: { 'files.cv': archivoCv() },
  });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 201);
  assert.equal(escrituras.length, 1);
  // La clave que espera `entityService.create({ files })` es el NOMBRE del
  // atributo (`cv`), no la clave multipart `files.cv`.
  assert.deepEqual(escrituras[0].files, { cv: archivoCv() });
});

test('crearPublica: sin CV no manda la propiedad files', async () => {
  const { controller, escrituras } = montar();

  const ctx = crearCtxPostulacion({
    multipart: true,
    body: { data: JSON.stringify(FORMULARIO_VALIDO) },
    files: {},
  });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 201);
  assert.equal(escrituras[0].files, undefined);
});

test('crearPublica: rechaza un CV con extensión no admitida', async () => {
  const { controller, escrituras } = montar();

  const ctx = crearCtxPostulacion({
    multipart: true,
    body: { data: JSON.stringify(FORMULARIO_VALIDO) },
    files: { 'files.cv': archivoCv('malware.exe', 'application/octet-stream') },
  });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 400);
  assert.match(ctx.body.error.message, /PDF, Word o una imagen/);
  assert.equal(escrituras.length, 0);
});

test('crearPublica: rechaza un CV que supera los 10 MB', async () => {
  const { controller, escrituras } = montar();

  const ctx = crearCtxPostulacion({
    multipart: true,
    body: { data: JSON.stringify(FORMULARIO_VALIDO) },
    files: { 'files.cv': archivoCv('grande.pdf', 'application/pdf', 10 * 1024 * 1024 + 1) },
  });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 400);
  assert.match(ctx.body.error.message, /10 MB/);
  assert.equal(escrituras.length, 0);
});

test('crearPublica: deduce el mime del CV cuando el navegador no lo envía', async () => {
  const { controller, escrituras } = montar();

  // Sin `type` en el objeto (así llega cuando el navegador no lo manda).
  const cv = { path: '/tmp/cv.png', name: 'cv.png', size: 2048 };
  const ctx = crearCtxPostulacion({
    multipart: true,
    body: { data: JSON.stringify(FORMULARIO_VALIDO) },
    files: { 'files.cv': cv },
  });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 201);
  assert.equal(escrituras[0].files.cv.type, 'image/png');
});

test('crearPublica: multipart sin el campo data devuelve 400', async () => {
  const { controller, escrituras } = montar();

  const ctx = crearCtxPostulacion({
    multipart: true,
    body: {},
    files: {},
  });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 400);
  assert.match(ctx.body.error.message, /Falta la información del formulario/);
  assert.equal(escrituras.length, 0);
});

test('crearPublica: multipart con data que no es JSON válido devuelve 400', async () => {
  const { controller, escrituras } = montar();

  const ctx = crearCtxPostulacion({
    multipart: true,
    body: { data: '{esto-no-es-json' },
    files: {},
  });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 400);
  assert.match(ctx.body.error.message, /no tiene un formato válido/);
  assert.equal(escrituras.length, 0);
});

// ---------------------------------------------------------------------------
// crearPublica — tamaño real del CV (forma real de formidable v1)
// ---------------------------------------------------------------------------

/**
 * formidable v1 entrega el fichero como `{ path, name, type, hash }`: NO
 * incluye `size` (lo inicializa a 0 y nunca lo actualiza). Estos tests usan
 * esa forma REAL, con un fichero de verdad en disco, para comprobar que el
 * límite de 10 MB se aplica de todos modos.
 */
const archivoCvReal = (bytes, nombre = 'cv.pdf') => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'postulacion-cv-'));
  const ruta = path.join(dir, nombre);
  fs.writeFileSync(ruta, Buffer.alloc(bytes, 1));
  return { path: ruta, name: nombre, type: 'application/pdf', hash: null };
};

test('crearPublica: mide el CV en disco porque formidable v1 no da file.size', async () => {
  const { controller, escrituras } = montar();

  const cv = archivoCvReal(2048); // 2 KB, sin propiedad `size`
  assert.equal(cv.size, undefined, 'el fichero de formidable v1 no trae size');

  const ctx = crearCtxPostulacion({
    multipart: true,
    body: { data: JSON.stringify(FORMULARIO_VALIDO) },
    files: { 'files.cv': cv },
  });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 201);
  // El tamaño se corrige para que plugin-upload guarde los metadatos reales.
  assert.equal(escrituras[0].files.cv.size, 2048);
});

test('crearPublica: rechaza el CV de más de 10 MB medido en disco', async () => {
  const { controller, escrituras } = montar();

  const cv = archivoCvReal(10 * 1024 * 1024 + 1); // 10 MB + 1 byte
  const ctx = crearCtxPostulacion({
    multipart: true,
    body: { data: JSON.stringify(FORMULARIO_VALIDO) },
    files: { 'files.cv': cv },
  });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 400);
  assert.match(ctx.body.error.message, /10 MB/);
  assert.equal(escrituras.length, 0, 'no debe persistir un CV demasiado grande');
});

test('crearPublica: acepta un CV de exactamente 10 MB', async () => {
  const { controller, escrituras } = montar();

  const cv = archivoCvReal(10 * 1024 * 1024);
  const ctx = crearCtxPostulacion({
    multipart: true,
    body: { data: JSON.stringify(FORMULARIO_VALIDO) },
    files: { 'files.cv': cv },
  });
  await controller.crearPublica(ctx);

  assert.equal(ctx.status, 201);
  assert.equal(escrituras.length, 1);
});


// ---------------------------------------------------------------------------
// miAgencia — listado acotado a la agencia del caller
// ---------------------------------------------------------------------------

const POSTULACIONES = [
  {
    id: 101,
    nombre_completo: 'Ana Centro',
    email: 'ana@example.com',
    estado: 'pendiente',
    fecha_solicitud: '2026-10-01T00:00:00.000Z',
    area: 1,
    agencia: 7,
  },
  {
    id: 102,
    nombre_completo: 'Luis Centro',
    email: 'luis@example.com',
    estado: 'revisada',
    fecha_solicitud: '2026-10-02T00:00:00.000Z',
    area: 2,
    agencia: 7,
  },
  {
    id: 103,
    nombre_completo: 'Marta Norte',
    email: 'marta@example.com',
    estado: 'pendiente',
    fecha_solicitud: '2026-10-03T00:00:00.000Z',
    area: 1,
    agencia: 9,
  },
];

const usuario = (email) => USUARIOS.find((u) => u.email === email);

test('miAgencia: admin/socio solo ven las postulaciones de SU agencia', async () => {
  const { controller } = montar({ postulaciones: [...POSTULACIONES] });

  const ctx = crearCtxPostulacion({ strapiUser: usuario('socio@ciudadan.org') });
  await controller.miAgencia(ctx);

  assert.equal(ctx.body.ok, true);
  assert.equal(ctx.body.esRoot, false);
  assert.equal(ctx.body.agencia.id, 7);
  assert.equal(ctx.body.agencia.nombre, 'Local Centro');
  const ids = ctx.body.data.map((p) => p.id).sort();
  assert.deepEqual(ids, [101, 102], 'no debe ver la postulación de otra agencia');
});

test('miAgencia: la lista llega poblada (área y agencia como objetos)', async () => {
  const { controller } = montar({ postulaciones: [...POSTULACIONES] });

  const ctx = crearCtxPostulacion({ strapiUser: usuario('socio@ciudadan.org') });
  await controller.miAgencia(ctx);

  const primera = ctx.body.data.find((p) => p.id === 101);
  assert.equal(typeof primera.area, 'object', 'el área se puebla como objeto');
  assert.equal(primera.area.id, 1);
  assert.equal(primera.agencia.id, 7);
});

test('miAgencia: root ve todas las postulaciones (bypass server-side)', async () => {
  const { controller } = montar({ postulaciones: [...POSTULACIONES] });

  const ctx = crearCtxPostulacion({ strapiUser: usuario('root@ciudadan.org') });
  await controller.miAgencia(ctx);

  assert.equal(ctx.body.esRoot, true);
  assert.equal(ctx.body.agencia.nombre, 'Todas (root)');
  assert.equal(ctx.body.agencia.id, null);
  assert.equal(ctx.body.data.length, 3, 'root ve las tres agencias');
});

test('miAgencia: un usuario sin agencia y sin root no ve nada', async () => {
  const { controller } = montar({ postulaciones: [...POSTULACIONES] });

  const ctx = crearCtxPostulacion({
    strapiUser: { id: 14, email: 'nadie@ciudadan.org', roles: { extra: [] } },
  });
  await controller.miAgencia(ctx);

  assert.equal(ctx.body.ok, true);
  assert.equal(ctx.body.agencia, null);
  assert.deepEqual(ctx.body.data, []);
});

// ---------------------------------------------------------------------------
// resolver — cambio de estado con autorización por agencia
// ---------------------------------------------------------------------------

test('resolver: admin/socio resuelven una postulación de SU agencia', async () => {
  const { controller, escrituras } = montar({ postulaciones: [...POSTULACIONES] });

  const ctx = crearCtxPostulacion({
    params: { id: '101' },
    body: { estado: 'aceptada', notas: 'Documentación correcta' },
    strapiUser: usuario('socio@ciudadan.org'),
  });
  await controller.resolver(ctx);

  assert.equal(ctx.body.ok, true);
  assert.equal(ctx.body.data.estado, 'aceptada');
  assert.equal(escrituras.length, 1);
  assert.equal(escrituras[0].operacion, 'entityService.update');
  assert.equal(escrituras[0].data.estado, 'aceptada');
  assert.equal(escrituras[0].data.revisado_por, 11, 'audita quién revisó');
  assert.ok(escrituras[0].data.fecha_resolucion, 'registra la fecha de resolución');
});

test('resolver: root puede resolver una postulación de cualquier agencia', async () => {
  const { controller, escrituras } = montar({ postulaciones: [...POSTULACIONES] });

  const ctx = crearCtxPostulacion({
    params: { id: '103' },
    body: { estado: 'rechazada' },
    strapiUser: usuario('root@ciudadan.org'),
  });
  await controller.resolver(ctx);

  assert.equal(ctx.body.ok, true);
  assert.equal(escrituras[0].data.estado, 'rechazada');
});

test('resolver: NO deja resolver postulaciones de otra agencia', async () => {
  const { controller, escrituras } = montar({ postulaciones: [...POSTULACIONES] });

  const ctx = crearCtxPostulacion({
    params: { id: '103' }, // agencia 9, el caller es de la agencia 7
    body: { estado: 'aceptada' },
    strapiUser: usuario('socio@ciudadan.org'),
  });
  await controller.resolver(ctx);

  assert.equal(ctx.status, 403);
  assert.equal(ctx.body.error.message, 'No puedes gestionar postulaciones de otra agencia.');
  assert.equal(escrituras.length, 0, 'no debe escribir nada');
});

test('resolver: un caller sin agencia no puede resolver nada', async () => {
  const { controller, escrituras } = montar({ postulaciones: [...POSTULACIONES] });

  const ctx = crearCtxPostulacion({
    params: { id: '101' },
    body: { estado: 'aceptada' },
    strapiUser: { id: 14, email: 'nadie@ciudadan.org', roles: { extra: [] } },
  });
  await controller.resolver(ctx);

  assert.equal(ctx.status, 403);
  assert.equal(escrituras.length, 0);
});

test('resolver: rechaza un estado fuera de la lista válida', async () => {
  const { controller, escrituras } = montar({ postulaciones: [...POSTULACIONES] });

  const ctx = crearCtxPostulacion({
    params: { id: '101' },
    body: { estado: 'inventado' },
    strapiUser: usuario('socio@ciudadan.org'),
  });
  await controller.resolver(ctx);

  assert.equal(ctx.status, 400);
  assert.match(ctx.body.error.message, /Estado inválido/);
  assert.equal(escrituras.length, 0);
});

test('resolver: 404 si la postulación no existe', async () => {
  const { controller, escrituras } = montar({ postulaciones: [...POSTULACIONES] });

  const ctx = crearCtxPostulacion({
    params: { id: '999' },
    body: { estado: 'aceptada' },
    strapiUser: usuario('root@ciudadan.org'),
  });
  await controller.resolver(ctx);

  assert.equal(ctx.status, 404);
  assert.equal(ctx.body.error.message, 'Postulación no encontrada.');
  assert.equal(escrituras.length, 0);
});

test('resolver: las notas se recortan a 4000 caracteres', async () => {
  const { controller, escrituras } = montar({ postulaciones: [...POSTULACIONES] });

  const ctx = crearCtxPostulacion({
    params: { id: '101' },
    body: { estado: 'contactada', notas: 'x'.repeat(5000) },
    strapiUser: usuario('socio@ciudadan.org'),
  });
  await controller.resolver(ctx);

  assert.equal(escrituras[0].data.notas.length, 4000);
});

// ---------------------------------------------------------------------------
// Rutas custom — contrato HTTP
// ---------------------------------------------------------------------------

test('rutas: el POST público es auth:false con allow-public-relations', () => {
  const post = rutas.routes.find((r) => r.method === 'POST');

  assert.ok(post, 'debe existir la ruta POST');
  assert.equal(post.path, '/postulacion-socios');
  assert.equal(post.handler, 'postulacion-socio.crearPublica');
  assert.equal(post.config.auth, false, 'el alta es pública');
  assert.deepEqual(post.config.policies, ['global::allow-public-relations']);
});

test('rutas: las rutas de gestión usan is-admin-socio-or-root', () => {
  const gestion = rutas.routes.filter((r) => r.method !== 'POST');

  assert.equal(gestion.length, 2);
  const miAgencia = gestion.find((r) => r.method === 'GET');
  const resolver = gestion.find((r) => r.method === 'PATCH');

  assert.equal(miAgencia.path, '/postulacion-socios/mi-agencia');
  assert.equal(miAgencia.handler, 'postulacion-socio.miAgencia');
  assert.deepEqual(miAgencia.config.policies, ['global::is-admin-socio-or-root']);

  assert.equal(resolver.path, '/postulacion-socios/:id/estado');
  assert.equal(resolver.handler, 'postulacion-socio.resolver');
  assert.deepEqual(resolver.config.policies, ['global::is-admin-socio-or-root']);
});

test('rutas: el alta pública NO exige rol admin/socio', () => {
  const post = rutas.routes.find((r) => r.method === 'POST');
  const policies = (post.config.policies || []).join(' ');

  assert.doesNotMatch(policies, /is-admin-or-socio/);
  assert.doesNotMatch(policies, /is-verificador/);
});

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

test('allow-public-relations: rellena ctx.state.auth sin verify', () => {
  const ctx = crearCtxPostulacion();

  assert.equal(allowPublicRelations(ctx), true);
  assert.ok(ctx.state.auth, 'debe dejar una estrategia de autenticación');
  assert.equal(ctx.state.auth.strategy.name, 'public-read-passthrough');
  assert.equal(typeof ctx.state.auth.strategy.verify, 'undefined', 'sin verify no valida');
});

test('allow-public-relations: no pisa una estrategia de auth ya existente', () => {
  const ctx = crearCtxPostulacion();
  ctx.state.auth = { strategy: { name: 'otro' } };

  allowPublicRelations(ctx);

  assert.equal(ctx.state.auth.strategy.name, 'otro');
});

test('is-admin-socio-or-root: sin header Authorization responde 403', async () => {
  const { strapi } = montar();

  await assert.rejects(
    () => isAdminSocioOrRoot(crearCtxPostulacion(), {}, { strapi }),
    (err) => {
      assert.equal(err.status, 403);
      assert.equal(err.name, 'ForbiddenError');
      assert.match(err.message, /Sin cabecera Authorization/);
      return true;
    }
  );
});

test('is-admin-socio-or-root: un token inválido en Auth0 responde 403', async () => {
  const { strapi } = montar();
  auth0Responde({ status: 401 });

  await assert.rejects(
    () =>
      isAdminSocioOrRoot(
        crearCtxPostulacion({ headers: { authorization: 'Bearer token-invalido-1' } }),
        {},
        { strapi }
      ),
    (err) => {
      assert.equal(err.status, 403);
      assert.match(err.message, /sesión no es válida o expiró/);
      return true;
    }
  );
});

test('is-admin-socio-or-root: un email sin usuario en Strapi responde 403', async () => {
  const { strapi } = montar();
  auth0Responde({ email: 'desconocido@example.com' });

  await assert.rejects(
    () =>
      isAdminSocioOrRoot(
        crearCtxPostulacion({ headers: { authorization: 'Bearer token-desconocido-2' } }),
        {},
        { strapi }
      ),
    (err) => {
      assert.equal(err.status, 403);
      assert.match(err.message, /No existe una cuenta de usuario/);
      return true;
    }
  );
});

test('is-admin-socio-or-root: un usuario sin rol admin/socio/root responde 403', async () => {
  const { strapi } = montar();
  auth0Responde({ email: 'nadie@ciudadan.org' });

  await assert.rejects(
    () =>
      isAdminSocioOrRoot(
        crearCtxPostulacion({ headers: { authorization: 'Bearer token-sin-rol-3' } }),
        {},
        { strapi }
      ),
    (err) => {
      assert.equal(err.status, 403);
      assert.match(err.message, /no tiene rol admin\/socio/);
      return true;
    }
  );
});

test('is-admin-socio-or-root: admin, socio y root pasan y reciben ctx.state.strapiUser', async () => {
  const casos = [
    ['admin@ciudadan.org', 'Bearer token-admin-4'],
    ['socio@ciudadan.org', 'Bearer token-socio-5'],
    ['root@ciudadan.org', 'Bearer token-root-6'],
  ];

  for (const [email, token] of casos) {
    const { strapi } = montar();
    auth0Responde({ email });

    const ctx = crearCtxPostulacion({ headers: { authorization: token } });
    const ok = await isAdminSocioOrRoot(ctx, {}, { strapi });

    assert.equal(ok, true, email);
    assert.equal(ctx.state.strapiUser.email, email, email);
    assert.equal(ctx.state.strapiUser.agencia.id, 7, `${email}: la agencia viene populada`);
  }
});
