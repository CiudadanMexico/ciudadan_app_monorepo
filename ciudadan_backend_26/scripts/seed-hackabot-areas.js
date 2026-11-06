#!/usr/bin/env node
'use strict';

/**
 * Seed idempotente del catálogo de áreas raíz del backend (`api::area.area`).
 *
 * Contexto (2026-11-06): en producción `GET https://back.ciudadan.org/api/areas`
 * devolvía `total: 0`, así que el formulario público `/candidatos` (que alimenta
 * su `<select>` de área desde ese endpoint) se quedaba sin opciones y la agencia
 * no podía filtrar por área.
 *
 * ⚠️ NOMBRES OFICIALES (no tocar):
 *   El lifecycle `src/api/area/content-types/area/lifecycles.js` impone que las
 *   áreas raíz (level 0) se llamen EXACTAMENTE:
 *     Administrativo · Técnico · Comercial-difusión · Software · Creación multimedia
 *   y que haya como máximo 5. Los nombres de Hackabot de
 *   `ciudadan_frontend/src/config/generationFounderConfig.js`
 *   (software, tecnica, administracion, multimedia, comercial-humanidades) son
 *   OTRO conjunto y el backend los RECHAZA: este seed usa siempre los 5 oficiales.
 *   El lifecycle y el schema son un contrato compartido con CoWork: no se tocan.
 *
 * Idempotente: por cada nombre oficial busca un área raíz con ese nombre
 * (comparación sin distinguir mayúsculas/minúsculas ni espacios sobrantes) y:
 *   - si existe, la REUTILIZA dejando `is_active: true` y PUBLICADA;
 *   - si no existe, la CREA con `level: 0`, `is_active: true` y `publishedAt`.
 * Repetir el seed no crea duplicados.
 *
 * Uso:
 *   cd ciudadan_backend_26
 *   node scripts/seed-hackabot-areas.js --dry-run   # sólo muestra el plan, no escribe
 *   node scripts/seed-hackabot-areas.js              # aplica el seed
 *
 * No imprime secretos ni credenciales.
 */

const fs = require('node:fs');
const path = require('node:path');

const AREA_UID = 'api::area.area';
const NIVEL_RAIZ = 0;

/** Los 5 nombres oficiales admitidos por el lifecycle de `api::area.area`. */
const NOMBRES_CANONICOS = Object.freeze([
  'Administrativo',
  'Técnico',
  'Comercial-difusión',
  'Software',
  'Creación multimedia',
]);

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

function normalizarNombre(nombre) {
  if (nombre === null || nombre === undefined) return '';
  return String(nombre).trim().toLowerCase();
}

function mismosNombres(a, b) {
  return normalizarNombre(a) === normalizarNombre(b);
}
/**
 * Extrae `ROOT_AREA_NAMES` del lifecycle del content-type area.
 * Devuelve `null` si no se puede leer o parsear (el seed no se rompe por eso:
 * el propio lifecycle sigue rechazando los nombres no permitidos).
 */
function leerNombresLifecycle(ruta = RUTA_LIFECYCLE) {
  try {
    const src = fs.readFileSync(ruta, 'utf8');
    const bloque = src.match(/ROOT_AREA_NAMES\s*=\s*\[([\s\S]*?)\]/);
    if (!bloque) return null;
    const nombres = [];
    const re = /'([^']*)'|"([^"]*)"/g;
    let coincidencia;
    while ((coincidencia = re.exec(bloque[1])) !== null) {
      const valor = String(
        coincidencia[1] !== undefined ? coincidencia[1] : coincidencia[2]
      ).trim();
      if (valor) nombres.push(valor);
    }
    return nombres.length ? nombres : null;
  } catch {
    return null;
  }
}

/**
 * Verifica que la lista del seed siga coincidiendo con la del lifecycle.
 * Si divergen, falla con un mensaje claro ANTES de escribir nada, en vez de
 * dejar que el backend rechace los nombres a medias.
 */
function verificarContratoLifecycle(
  nombres = NOMBRES_CANONICOS,
  ruta = RUTA_LIFECYCLE,
  log = console.log
) {
  const delLifecycle = leerNombresLifecycle(ruta);
  if (!delLifecycle) {
    log('[AVISO] No se pudo leer ROOT_AREA_NAMES del lifecycle; se usará la lista canónica del seed.');
    return null;
  }
  const faltan = delLifecycle.filter((n) => !nombres.some((m) => mismosNombres(n, m)));
  const sobran = nombres.filter((n) => !delLifecycle.some((m) => mismosNombres(n, m)));
  if (faltan.length || sobran.length) {
    throw new Error(
      'Los nombres del seed NO coinciden con el lifecycle de api::area.area. ' +
      `Lifecycle: ${delLifecycle.join(', ')}. Seed: ${nombres.join(', ')}. ` +
      `Faltan: ${faltan.join(', ') || '—'}. Sobran: ${sobran.join(', ') || '—'}. ` +
      'Corrige el seed (o el lifecycle, que es un contrato compartido) antes de ejecutar.'
    );
  }
  return delLifecycle;
}

/**
 * Lista las áreas raíz (level 0) incluyendo BORRADORES.
 *
 * Importante: `api::area.area` tiene `draftAndPublish: true`, así que un área
 * sin `publishedAt` es un borrador y podría quedar invisible en las lecturas
 * por defecto. Si no la viéramos, el seed intentaría crear un duplicado. Por
 * eso se consultan varias vías y se fusionan por id:
 *   1. entityService con `publicationState: 'preview'` (incluye borradores);
 *   2. query directo a la BD (sin filtro de publicación).
 */
async function listarAreasRaiz(strapi) {
  const porId = new Map();
  const anotar = (lista) => {
    (Array.isArray(lista) ? lista : []).forEach((area) => {
      if (area && area.id !== undefined && area.id !== null) porId.set(area.id, area);
    });
  };

  const existentes = await strapi.entityService.findMany(AREA_UID, {
    filters: { level: NIVEL_RAIZ },
    publicationState: 'preview',
    fields: ['id', 'name', 'level', 'is_active', 'publishedAt'],
  });
  anotar(existentes);

  if (strapi.db && typeof strapi.db.query === 'function') {
    try {
      const query = strapi.db.query(AREA_UID);
      anotar(await query.findMany({ where: { level: NIVEL_RAIZ } }));
    } catch {
      // Sin acceso directo a la BD: la vía del entityService es suficiente.
    }
  }

  return Array.from(porId.values());
}

/** Devuelve el área raíz con ese nombre (sin distinguir mayúsculas) o null. */
async function buscarAreaRaiz(strapi, nombre) {
  const areas = await listarAreasRaiz(strapi);
  return (
    areas.find(
      (area) =>
        area &&
        area.level === NIVEL_RAIZ &&
        mismosNombres(area.name, nombre)
    ) || null
  );
}

function selloFecha(fecha) {
  const valor = fecha instanceof Date ? fecha : new Date(fecha || Date.now());
  return valor.toISOString();
}
/**
 * Aplica el seed sobre un cliente de Strapi (o un mock en memoria).
 *
 * Opciones:
 *   - `dryRun`: no escribe nada; sólo devuelve el plan.
 *   - `nombres`: lista de áreas raíz a sembrar (por defecto, la canónica).
 *   - `fecha`: fecha para `publishedAt` (Date o función que devuelva Date).
 *   - `log`: logger (por defecto console.log).
 */
async function sembrarAreas(strapi, opciones = {}) {
  const {
    dryRun = false,
    nombres = NOMBRES_CANONICOS,
    fecha = () => new Date(),
    log = console.log,
    verificarLifecycle = true,
  } = opciones;

  if (verificarLifecycle) {
    verificarContratoLifecycle(nombres, RUTA_LIFECYCLE, log);
  }

  const plan = [];
  let creadas = 0;
  let actualizadas = 0;
  let sinCambios = 0;

  for (const nombre of nombres) {
    const existente = await buscarAreaRaiz(strapi, nombre);

    if (existente) {
      const data = {};
      if (existente.is_active !== true) data.is_active = true;
      if (!existente.publishedAt) data.publishedAt = selloFecha(fecha());
      const cambios = Object.keys(data);

      if (cambios.length === 0) {
        sinCambios += 1;
        plan.push({ nombre, accion: 'sin-cambios', id: existente.id, cambios: [] });
        log(`Área raíz ya existe, activa y publicada: ${nombre} (#${existente.id})`);
        continue;
      }

      if (!dryRun) {
        try {
          await strapi.entityService.update(AREA_UID, existente.id, { data });
        } catch (err) {
          throw new Error(
            `No se pudo actualizar el área raíz "${nombre}" (#${existente.id}): ${err.message}`
          );
        }
      }
      actualizadas += 1;
      plan.push({ nombre, accion: 'actualizar', id: existente.id, cambios });
      log(
        `${dryRun ? '[dry-run] actualizaría' : 'Actualizada'} área raíz: ${nombre} ` +
          `(#${existente.id}) → ${cambios.join(', ')}`
      );
      continue;
    }

    const data = {
      name: nombre,
      level: NIVEL_RAIZ,
      is_active: true,
      publishedAt: selloFecha(fecha()),
    };

    if (!dryRun) {
      let creada;
      try {
        creada = await strapi.entityService.create(AREA_UID, { data });
      } catch (err) {
        throw new Error(
          `El backend rechazó el área raíz "${nombre}": ${err.message}. ` +
          `Los nombres válidos para áreas raíz (level 0) son: ${nombres.join(', ')}.`
        );
      }
      creadas += 1;
      plan.push({
        nombre,
        accion: 'crear',
        id: creada && creada.id !== undefined ? creada.id : null,
        cambios: Object.keys(data),
      });
      log(`Área raíz creada y publicada: ${nombre} (#${creada && creada.id})`);
    } else {
      creadas += 1;
      plan.push({ nombre, accion: 'crear', id: null, cambios: Object.keys(data) });
      log(`[dry-run] crearía área raíz publicada: ${nombre} (level 0, is_active true)`);
    }
  }

  return { plan, creadas, actualizadas, sinCambios, dryRun };
}

/**
 * CLI real: carga Strapi (para leer/escribir la base de datos) y aplica el seed.
 * `--dry-run` no escribe nada.
 */
async function main(argv = process.argv.slice(2)) {
  const dryRun = argv.includes('--dry-run');

  // Validación previa: los nombres deben coincidir con los del lifecycle.
  verificarContratoLifecycle(NOMBRES_CANONICOS, RUTA_LIFECYCLE);

  const Strapi = require('@strapi/strapi');
  const dir = path.resolve(__dirname, '..');
  const app = await Strapi({ dir }).load();
  try {
    const resumen = await sembrarAreas(app, { dryRun, log: console.log });
    console.log(
      `SEED_AREAS_OK ${dryRun ? '(dry-run) ' : ''}creadas=${resumen.creadas} ` +
        `actualizadas=${resumen.actualizadas} sin_cambios=${resumen.sinCambios}`
    );
    return resumen;
  } finally {
    await app.destroy();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('SEED_AREAS_ERROR', err.message);
      process.exit(1);
    });
}

module.exports = {
  AREA_UID,
  NIVEL_RAIZ,
  NOMBRES_CANONICOS,
  RUTA_LIFECYCLE,
  normalizarNombre,
  mismosNombres,
  leerNombresLifecycle,
  verificarContratoLifecycle,
  listarAreasRaiz,
  buscarAreaRaiz,
  sembrarAreas,
  main,
};
