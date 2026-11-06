'use strict';

/**
 * Tests del seed idempotente del catálogo de áreas (`scripts/seed-hackabot-areas.js`).
 *
 * Contexto: en producción `GET /api/areas` devolvía `total: 0` y el formulario
 * público `/candidatos` se quedaba sin opciones de área.
 *
 * Se verifica con un MOCK EN MEMORIA de Strapi (no se levanta Strapi ni se toca
 * ninguna base de datos):
 *   (a) la lista canónica son exactamente los 5 nombres oficiales del lifecycle;
 *   (b) el seed es idempotente (dos corridas → sin duplicados);
 *   (c) cada área queda con level 0, is_active true y publishedAt no nulo.
 *
 * Ejecutar: node --test tests/seed-hackabot-areas.test.js
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const {
  AREA_UID,
  NIVEL_RAIZ,
  NOMBRES_CANONICOS,
  leerNombresLifecycle,
  normalizarNombre,
  verificarContratoLifecycle,
  sembrarAreas,
} = require('../scripts/seed-hackabot-areas');

const RUTA_LIFECYCLE = path.resolve(
  __dirname,
  '..',
  'src',
  'api',
  'area',
  'content-types',
  'area',
  'lifecycles.js'
);

const SILENCIO = () => {};

/**
 * Mock en memoria de Strapi para `api::area.area`.
 *
 * Reproduce las restricciones reales del content-type:
 *  - las áreas raíz (level 0) sólo pueden llamarse como ROOT_AREA_NAMES;
 *  - como máximo hay 5 áreas raíz;
 *  - `draftAndPublish: true`: un área sin `publishedAt` es un borrador y las
 *    lecturas 'live' no la devuelven.
 */
function crearMockStrapi({
  areas = [],
  nombresPermitidos = NOMBRES_CANONICOS,
  maxRaices = 5,
} = {}) {
  const filas = areas.map((area, i) => ({
    id: area.id !== undefined ? area.id : i + 1,
    ...area,
  }));
  let siguienteId =
    filas.reduce((max, fila) => Math.max(max, Number(fila.id) || 0), 0) + 1;
  const escrituras = [];

  const permitido = (nombre) =>
    nombresPermitidos.some((n) => normalizarNombre(n) === normalizarNombre(nombre));
  const contarRaices = () => filas.filter((fila) => fila.level === NIVEL_RAIZ).length;

  const entityService = {
    findMany: async (uid, params = {}) => {
      assert.strictEqual(uid, AREA_UID, 'UID no mockeado');
      const filters = params.filters || {};
      const soloPublicadas = params.publicationState === 'live';
      return filas
        .filter((fila) => {
          if (filters.level !== undefined) {
            const nivel =
              typeof filters.level === 'object' ? filters.level.$eq : filters.level;
            if (fila.level !== nivel) return false;
          }
          if (filters.name !== undefined) {
            const nombre =
              typeof filters.name === 'object'
                ? filters.name.$eqi !== undefined
                  ? filters.name.$eqi
                  : filters.name.$eq
                : filters.name;
            if (normalizarNombre(fila.name) !== normalizarNombre(nombre)) return false;
          }
          if (soloPublicadas && !fila.publishedAt) return false;
          return true;
        })
        .map((fila) => ({ ...fila }));
    },

    create: async (uid, { data }) => {
      assert.strictEqual(uid, AREA_UID, 'UID no mockeado');
      const nivel = data.level === undefined ? NIVEL_RAIZ : data.level;
      if (nivel === NIVEL_RAIZ) {
        if (contarRaices() >= maxRaices) {
          throw new Error(
            `Solo se permiten ${maxRaices} áreas raíz. Actualmente ya existen ${contarRaices()}.`
          );
        }
        if (data.name && !permitido(data.name)) {
          throw new Error(
            `Las áreas raíz solo pueden llamarse: ${nombresPermitidos.join(', ')}.`
          );
        }
      }
      const fila = { id: siguienteId++, ...data, level: nivel };
      filas.push(fila);
      escrituras.push({ operacion: 'create', data: { ...data } });
      return { ...fila };
    },

    update: async (uid, id, { data }) => {
      assert.strictEqual(uid, AREA_UID, 'UID no mockeado');
      const fila = filas.find((f) => f.id === id);
      if (!fila) throw new Error(`Área ${id} inexistente en el mock`);
      if (data.name && data.level === NIVEL_RAIZ && !permitido(data.name)) {
        throw new Error(
          `Las áreas raíz solo pueden llamarse: ${nombresPermitidos.join(', ')}.`
        );
      }
      Object.assign(fila, data);
      escrituras.push({ operacion: 'update', id, data: { ...data } });
      return { ...fila };
    },
  };

  // Vía directa a la BD: no aplica filtro de publicación (como en Strapi real).
  const db = {
    query: (uid) => {
      assert.strictEqual(uid, AREA_UID, 'UID no mockeado');
      return {
        findMany: async ({ where = {} } = {}) =>
          filas
            .filter((fila) =>
              where.level === undefined ? true : fila.level === where.level
            )
            .map((fila) => ({ ...fila })),
      };
    },
  };

  return { entityService, db, filas, escrituras };
}
// ───────────────────────── (a) lista canónica ─────────────────────────

test('(a) la lista canónica son exactamente los 5 nombres oficiales del lifecycle', () => {
  const delLifecycle = leerNombresLifecycle(RUTA_LIFECYCLE);
  assert.ok(Array.isArray(delLifecycle), 'el lifecycle debe exponer ROOT_AREA_NAMES');
  assert.strictEqual(delLifecycle.length, 5, 'el lifecycle fija exactamente 5 áreas raíz');
  assert.deepStrictEqual(delLifecycle, [...NOMBRES_CANONICOS]);
  assert.strictEqual(NOMBRES_CANONICOS.length, 5);
});

test('(a) los nombres de Hackabot NO son los nombres oficiales admitidos', () => {
  const nombresHackabot = [
    'Técnica',
    'Administración',
    'Multimedia',
    'Comercial / Humanidades',
    'comercial-humanidades',
  ];
  for (const nombre of nombresHackabot) {
    assert.ok(
      !NOMBRES_CANONICOS.some((n) => normalizarNombre(n) === normalizarNombre(nombre)),
      `"${nombre}" no es un nombre oficial de área raíz: el backend lo rechazaría`
    );
  }
  // Única coincidencia real: 'software' de Hackabot es 'Software' oficial.
  assert.ok(
    NOMBRES_CANONICOS.some((n) => normalizarNombre(n) === normalizarNombre('software'))
  );
});

test('(a) la verificación del contrato falla si el seed diverge del lifecycle', () => {
  assert.throws(
    () => verificarContratoLifecycle(['Técnica'], RUTA_LIFECYCLE, SILENCIO),
    /NO coinciden con el lifecycle/
  );
  assert.deepStrictEqual(
    verificarContratoLifecycle(NOMBRES_CANONICOS, RUTA_LIFECYCLE, SILENCIO),
    [...NOMBRES_CANONICOS]
  );
});

// ───────────────────────── (b) idempotencia ─────────────────────────

test('(b) el seed es idempotente: correrlo dos veces no crea duplicados', async () => {
  const mock = crearMockStrapi();

  const primera = await sembrarAreas(mock, { log: SILENCIO });
  const segunda = await sembrarAreas(mock, { log: SILENCIO });

  assert.strictEqual(mock.filas.length, 5, 'deben existir exactamente 5 áreas raíz');
  assert.strictEqual(primera.creadas, 5);
  assert.strictEqual(segunda.creadas, 0, 'la segunda corrida no debe crear nada');
  assert.strictEqual(segunda.actualizadas, 0, 'la segunda corrida no debe actualizar nada');
  assert.strictEqual(segunda.sinCambios, 5);

  const nombres = mock.filas.map((fila) => normalizarNombre(fila.name));
  assert.strictEqual(new Set(nombres).size, 5, 'no puede haber nombres duplicados');
});

test('(b) --dry-run no escribe nada: sólo muestra el plan', async () => {
  const mock = crearMockStrapi();

  const resumen = await sembrarAreas(mock, { dryRun: true, log: SILENCIO });

  assert.strictEqual(mock.filas.length, 0, 'no debe crear áreas');
  assert.strictEqual(mock.escrituras.length, 0, 'no debe escribir nada');
  assert.strictEqual(resumen.plan.length, 5);
  assert.ok(resumen.plan.every((paso) => paso.accion === 'crear'));
  assert.strictEqual(resumen.dryRun, true);
});

test('(b) reutiliza un área existente aunque difiera en mayúsculas/minúsculas', async () => {
  const mock = crearMockStrapi({
    areas: [
      {
        id: 3,
        name: 'técnico',
        level: 0,
        is_active: false,
        publishedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  });

  const resumen = await sembrarAreas(mock, { log: SILENCIO });

  const tecnicos = mock.filas.filter(
    (fila) => normalizarNombre(fila.name) === normalizarNombre('Técnico')
  );
  assert.strictEqual(tecnicos.length, 1, 'no debe duplicar el área existente');
  assert.strictEqual(tecnicos[0].is_active, true, 'debe quedar activa');
  assert.strictEqual(resumen.creadas, 4);
  assert.strictEqual(resumen.actualizadas, 1);
});

test('(b) un área raíz en borrador se publica en vez de duplicarse', async () => {
  const mock = crearMockStrapi({
    areas: [
      { id: 7, name: 'Software', level: 0, is_active: true, publishedAt: null },
    ],
  });

  const resumen = await sembrarAreas(mock, { log: SILENCIO });

  const softwares = mock.filas.filter(
    (fila) => normalizarNombre(fila.name) === normalizarNombre('Software')
  );
  assert.strictEqual(softwares.length, 1, 'el borrador no debe duplicarse');
  assert.ok(softwares[0].publishedAt, 'el borrador debe quedar publicado');
  assert.strictEqual(resumen.creadas, 4);
  assert.strictEqual(resumen.actualizadas, 1);
});

// ───────────────────── (c) atributos de cada área ─────────────────────

test('(c) cada área queda con level 0, is_active true y publishedAt no nulo', async () => {
  const mock = crearMockStrapi();

  await sembrarAreas(mock, { log: SILENCIO });

  assert.strictEqual(mock.filas.length, 5);
  for (const area of mock.filas) {
    assert.strictEqual(area.level, 0, `${area.name} debe ser área raíz`);
    assert.strictEqual(area.is_active, true, `${area.name} debe estar activa`);
    assert.ok(area.publishedAt, `${area.name} debe quedar publicada`);
    assert.ok(!Number.isNaN(Date.parse(area.publishedAt)), 'publishedAt debe ser una fecha');
  }
});

test('(c) las 5 áreas creadas se llaman como los nombres oficiales', async () => {
  const mock = crearMockStrapi();

  await sembrarAreas(mock, { log: SILENCIO });

  const nombres = mock.filas.map((fila) => fila.name);
  assert.deepStrictEqual([...nombres].sort(), [...NOMBRES_CANONICOS].sort());
});

// ─────────────────── lifecycle: rechazo con mensaje claro ───────────────────

test('si el lifecycle rechaza un nombre, el seed falla con un mensaje claro', async () => {
  const mock = crearMockStrapi();

  await assert.rejects(
    () =>
      sembrarAreas(mock, {
        nombres: ['Técnica'],
        verificarLifecycle: false,
        log: SILENCIO,
      }),
    (err) => {
      assert.match(err.message, /El backend rechazó el área raíz "Técnica"/);
      assert.match(err.message, /Las áreas raíz solo pueden llamarse/);
      return true;
    }
  );
});
