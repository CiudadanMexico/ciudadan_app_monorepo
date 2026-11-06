'use strict';

/**
 * Pruebas de la envoltura de producción de la wiki.
 *
 * No abren la BD real ni tocan `/var/www/apps/wikis`. Las piezas caras
 * (better-sqlite3 y el layout del release) se inyectan como dependencias.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const produccion = require('../../wikiseed/sync-wikis-production');

const temporal = (prefijo) => fs.mkdtempSync(path.join(os.tmpdir(), prefijo));

test('la envoltura delega la copia al script base e inyecta el indexador', async () => {
  const destino = temporal('wiki-produccion-destino-');
  const indexados = [];

  const stats = await produccion.main([], {
    resolverDestino: async () => ({ destino, origen: 'test' }),
    comprobarAbiDriver: async () => ({ ok: true, motivo: null }),
    indexarDocumento: async (rutaLogica, contenido) => {
      indexados.push({ rutaLogica, contenido });
      return { ok: true, indexado: true, motivo: null };
    },
  });

  assert.ok(stats.copiados > 0);
  assert.equal(stats.sinIndexar, 0);
  assert.equal(indexados.length, stats.copiados);
  assert.ok(indexados.every((item) => item.rutaLogica.startsWith('wiki/')));
  assert.ok(indexados.every((item) => typeof item.contenido === 'string'));
});

test('el indexador inyectado también repara filas ausentes sin copiar de nuevo', async () => {
  const destino = temporal('wiki-produccion-reindex-');
  let llamadas = 0;

  const deps = {
    resolverDestino: async () => ({ destino, origen: 'test' }),
    comprobarAbiDriver: async () => ({ ok: true, motivo: null }),
    indexarDocumento: async () => {
      llamadas += 1;
      return { ok: true, indexado: true, motivo: null };
    },
  };

  await produccion.main([], deps);
  const primera = llamadas;
  await produccion.main([], deps);

  assert.ok(primera > 0);
  assert.equal(llamadas, primera * 2, 'la segunda pasada debe reindexar todos los seeds');
});

test('pathsIndexados devuelve únicamente rutas wiki de documents', () => {
  const db = {
    prepare(sql) {
      assert.match(sql, /SELECT path FROM documents/);
      return {
        all: () => [
          { path: 'wiki/help/a.md' },
          { path: 'wiki/main/b.md' },
        ],
      };
    },
  };

  assert.deepEqual(
    [...produccion.pathsIndexados(db)].sort(),
    ['wiki/help/a.md', 'wiki/main/b.md']
  );
});

test('la envoltura de producción falla cerrada si un seed no se indexa', async () => {
  const destino = temporal('wiki-produccion-sin-indice-');
  await assert.rejects(
    produccion.main([], {
      resolverDestino: async () => ({ destino, origen: 'test' }),
      comprobarAbiDriver: async () => ({ ok: true, motivo: null }),
      indexarDocumento: async () => ({ ok: false, indexado: false, motivo: 'sin-dist' }),
    }),
    /Falló la indexación/
  );
});

test('comprobarAbiDriver falla cerrado si falta el driver nativo', () => {
  const resultado = produccion.comprobarAbiDriver();
  assert.equal(resultado.ok, false);
  assert.match(resultado.motivo, /sin-better-sqlite3|Node 22|Node >= 22|Node 20/);
});
