'use strict';

/**
 * Seed de las 16 categorías de Food (api::food-categorie.food-categorie).
 *
 * La lista de 16 es la DEFINITIVA: no incluye Tamales, ni Pescados y
 * mariscos, ni Postres, ni ninguna otra categoría de versiones anteriores
 * (esos registros, si existieran en la BD, NO se tocan ni se borran).
 *
 * Idempotente (el slug es la clave lógica del seed):
 *   - Si la categoría NO existe: la crea PUBLICADA (draftAndPublish está
 *     habilitado, se fija publishedAt explícito) y le asocia su imagen.
 *   - Si YA existe (p. ej. "desayunos" o "hamburguesas" de la versión
 *     anterior): actualiza nombre/descripción si cambiaron, corrige la
 *     relación de imagen si difiere y la publica si estaba en borrador.
 *   - Antes de subir una imagen busca en el Media Library un archivo con el
 *     mismo nombre (p. ej. "hamburguesas.avif") y lo REUTILIZA en vez de
 *     subir otra copia idéntica.
 *   - NO borra nada: ni categorías previas (aunque tengan otros slugs) ni
 *     archivos del Media Library. Seguro contra una BD con datos.
 *
 * Las imágenes se suben con el mecanismo de upload de Strapi
 * (plugin::upload → services/upload → upload), quedando como assets reales
 * del Media Library; el campo `imagen` es la relación Media del content type.
 *
 * Las imágenes fuente NO se convierten ni se descargan: se usan los .avif
 * existentes del monorepo (la ruta se resuelve desde __dirname, no desde el
 * cwd, así funciona desde cualquier carpeta):
 *   ../ciudadan_frontend/media_seeds/ciudadan_food_categorias_sin_fondo/*.avif
 *
 * Uso:
 *   node seed/seed-food-categories.js          (desde cualquier carpeta)
 *   npm run seed:food-categories
 *
 * Sale con código 1 si falla alguna validación previa o si una categoría
 * no pudo sembrarse (las demás sí se procesan y se reportan).
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Arranque de Strapi (patrón del proyecto: ver actualizar-videos-anuncios.js),
// pero sin depender del cwd: appDir y .env se resuelven desde __dirname.
// ---------------------------------------------------------------------------
const BACKEND_DIR = path.resolve(__dirname, '..');
const ENV_PATH = path.join(BACKEND_DIR, '.env');
// Strapi carga el .env con dotenv({ path: process.env.ENV_PATH }); apuntamos
// ENV_PATH al .env del backend para no depender de la carpeta de ejecución.
process.env.ENV_PATH = ENV_PATH;
try {
  // dotenv no sobrescribe variables ya presentes en el proceso (mismo
  // criterio que el dotenv interno de Strapi), solo garantiza que el .env
  // correcto se cargue aunque se ejecute el script desde otra carpeta.
  require('dotenv').config({ path: ENV_PATH });
} catch (_) {
  /* si dotenv no resuelve aquí, el require de @strapi/strapi lo carga igual */
}

const Strapi = require('@strapi/strapi');
const slugify = require('slugify');

// ---------------------------------------------------------------------------
// Configuración del seed
// ---------------------------------------------------------------------------

const UID = 'api::food-categorie.food-categorie';
const LABEL = 'Food';

// Monorepo: ciudadan_backend_26/ y ciudadan_frontend/ son carpetas hermanas.
const MEDIA_SEEDS_DIR = path.resolve(BACKEND_DIR, '..', 'ciudadan_frontend', 'media_seeds');
const IMAGES_DIR = path.join(MEDIA_SEEDS_DIR, 'ciudadan_food_categorias_sin_fondo');
// El seed de Marketplace usa la carpeta hermana; se valida que exista (spec 11).
const SIBLING_IMAGES_DIR = path.join(MEDIA_SEEDS_DIR, 'ciudadan_categorias_sinfondo');

const TOTAL_ESPERADO = 16;

/**
 * Las 16 categorías definitivas de Food.
 * `imagen` = nombre del archivo .avif dentro de IMAGES_DIR, o null cuando no
 * existe un AVIF inequívoco para la categoría (se reporta, NO se inventa).
 */
const CATEGORIAS = [
  { nombre: 'Hamburguesas', imagen: 'hamburguesas.avif', descripcion: 'Hamburguesas clásicas, dobles y de especialidad, con guarniciones para acompañar.' },
  { nombre: 'Pizza', imagen: 'pizza.avif', descripcion: 'Pizzas artesanales, por pieza o completas, con ingredientes para todos los gustos.' },
  { nombre: 'Tacos y antojitos', imagen: 'tacos.avif', descripcion: 'Tacos, quesadillas, gorditas y otros antojitos de cocina mexicana.' },
  { nombre: 'Pollo', imagen: 'pollo.avif', descripcion: 'Pollo rostizado, frito o a la leña, en piezas, raciones o para compartir.' },
  { nombre: 'Carnes y parrilla', imagen: 'carne.avif', descripcion: 'Cortes de res y cerdo, arracheras y parrilladas para cualquier ocasión.' },
  { nombre: 'Sushi y japonesa', imagen: null, descripcion: 'Sushi, rolls, ramen y especialidades de la cocina japonesa.' },
  { nombre: 'Asiática', imagen: 'asiatica.avif', descripcion: 'Noodles, arroz frito, dumplings y especialidades de la cocina asiática.' },
  { nombre: 'Italiana', imagen: 'italiana.avif', descripcion: 'Pastas, lasañas, risottos y clásicos de la cocina italiana.' },
  { nombre: 'Ensaladas y saludable', imagen: 'ensaladas.avif', descripcion: 'Ensaladas frescas, bowls nutritivos y opciones ligeras y equilibradas.' },
  { nombre: 'Vegana y vegetariana', imagen: 'vegana.avif', descripcion: 'Platos veganos y vegetarianos con proteínas vegetales e ingredientes frescos.' },
  { nombre: 'Tortas, sándwiches y baguettes', imagen: 'tortas.avif', descripcion: 'Tortas, sándwiches y baguettes recién preparados, para comer aquí o llevar.' },
  { nombre: 'Desayunos', imagen: 'desayunos.avif', descripcion: 'Desayunos, chilaquiles, hot cakes y más para empezar bien el día.' },
  { nombre: 'Comida mexicana', imagen: 'mexicana.avif', descripcion: 'Guisos tradicionales, moles y antojitos de la cocina mexicana de siempre.' },
  { nombre: 'Comida corrida y casera', imagen: 'corrida.avif', descripcion: 'Comida corrida completa, con la sazón de la cocina casera.' },
  { nombre: 'Botanas', imagen: 'botanas.avif', descripcion: 'Botanas, snacks y antojos salados para picar y compartir.' },
  { nombre: 'Sopas y caldos', imagen: 'sopas.avif', descripcion: 'Caldos, consomés y sopas reconfortantes de la cocina tradicional.' },
];

// Slugs exactos que debe producir slugify para las 16 categorías. Si slugify
// llegara a generar algo distinto, el seed ABORTA antes de escribir en la BD
// en lugar de sembrar slugs no deseados.
const SLUGS_ESPERADOS = [
  'hamburguesas',
  'pizza',
  'tacos-y-antojitos',
  'pollo',
  'carnes-y-parrilla',
  'sushi-y-japonesa',
  'asiatica',
  'italiana',
  'ensaladas-y-saludable',
  'vegana-y-vegetariana',
  'tortas-sandwiches-y-baguettes',
  'desayunos',
  'comida-mexicana',
  'comida-corrida-y-casera',
  'botanas',
  'sopas-y-caldos',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const log = (msg) => console.log(`[${LABEL}] ${msg}`);

const slugDe = (nombre) => slugify(nombre, { lower: true, strict: true });

const stats = {
  creadas: 0,
  actualizadas: 0,
  yaExistentes: 0,
  imagenesNuevas: 0,
  imagenesReutilizadas: 0,
  errores: 0,
};

/** Lista los archivos .avif de una carpeta (null si la carpeta no existe). */
function listarAvif(dir) {
  if (!fs.existsSync(dir)) return null;
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.avif'))
    .filter((f) => fs.statSync(path.join(dir, f)).isFile())
    .sort();
}

/**
 * Validaciones ANTES de escribir en la BD (spec 11):
 * media_seeds existe, existen las dos carpetas de categorías, los archivos
 * mapeados existen y son .avif, el número de categorías es el esperado y el
 * mapeo categoría ↔ imagen es consistente (sin duplicados).
 */
function validar(avifDisponibles) {
  const problemas = [];

  if (!fs.existsSync(MEDIA_SEEDS_DIR)) {
    problemas.push(`No existe la carpeta de medios: ${MEDIA_SEEDS_DIR}`);
  } else {
    if (!fs.existsSync(IMAGES_DIR)) {
      problemas.push(`No existe la carpeta de imágenes de Food: ${IMAGES_DIR}`);
    }
    if (!fs.existsSync(SIBLING_IMAGES_DIR)) {
      problemas.push(`No existe la carpeta de imágenes del Marketplace: ${SIBLING_IMAGES_DIR}`);
    }
  }

  if (CATEGORIAS.length !== TOTAL_ESPERADO) {
    problemas.push(`La definición interna tiene ${CATEGORIAS.length} categorías y se esperaban ${TOTAL_ESPERADO}`);
  }

  // Slugs generados por slugify vs slugs esperados (sin duplicados).
  const slugs = CATEGORIAS.map((c) => slugDe(c.nombre));
  const slugsVacios = slugs.filter((s) => !s);
  if (slugsVacios.length) problemas.push('Hay categorías cuyo nombre no genera slug');
  const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dupSlugs.length) {
    problemas.push(`Slugs duplicados en la definición: ${[...new Set(dupSlugs)].join(', ')}`);
  }
  const faltan = SLUGS_ESPERADOS.filter((s) => !slugs.includes(s));
  const sobran = slugs.filter((s) => !SLUGS_ESPERADOS.includes(s));
  if (faltan.length || sobran.length) {
    problemas.push(`slugify no genera los slugs esperados (faltan: ${faltan.join(', ') || '—'} / sobran: ${sobran.join(', ') || '—'})`);
  }

  // Mapeo categoría ↔ imagen: sin imágenes repetidas, extensión .avif real.
  const mapeadas = CATEGORIAS.map((c) => c.imagen).filter(Boolean);
  const dupImg = mapeadas.filter((f, i) => mapeadas.indexOf(f) !== i);
  if (dupImg.length) {
    problemas.push(`Imágenes usadas por más de una categoría: ${[...new Set(dupImg)].join(', ')}`);
  }
  for (const c of CATEGORIAS) {
    if (!c.imagen) continue;
    if (path.extname(c.imagen).toLowerCase() !== '.avif') {
      problemas.push(`El archivo mapeado "${c.imagen}" (${c.nombre}) no es .avif`);
    } else if (!fs.existsSync(path.join(IMAGES_DIR, c.imagen))) {
      problemas.push(`No existe el archivo ${path.join(IMAGES_DIR, c.imagen)} para "${c.nombre}"`);
    }
  }

  return problemas;
}

/**
 * Busca en el Media Library un archivo ya subido con el mismo nombre
 * (misma clave que usa el seed al subir) para reutilizarlo en vez de
 * duplicar la imagen.
 */
async function archivoYaSubido(app, nombreArchivo) {
  const existentes = await app.db.query('plugin::upload.file').findMany({
    where: { name: nombreArchivo, ext: '.avif' },
  });
  if (!existentes || existentes.length === 0) return null;
  if (existentes.length > 1) {
    log(`⚠ hay ${existentes.length} archivos "${nombreArchivo}" en el Media Library; se reutiliza el primero (id=${existentes[0].id})`);
  }
  return existentes[0];
}

/** Sube un .avif con el mecanismo de upload de Strapi (asset real del Media Library). */
async function subirImagen(app, categoria, nombreArchivo) {
  const filePath = path.join(IMAGES_DIR, nombreArchivo);
  const [subido] = await app.plugin('upload').service('upload').upload({
    data: {
      fileInfo: {
        name: nombreArchivo, // clave de deduplicación del seed
        alternativeText: `Categoría ${categoria.nombre}`,
        caption: categoria.nombre,
      },
    },
    files: {
      name: nombreArchivo,
      type: 'image/avif',
      size: fs.statSync(filePath).size,
      path: filePath,
    },
  });
  return subido;
}

/** Reutiliza o sube la imagen de una categoría; null si no tiene AVIF mapeado. */
async function resolverImagen(app, categoria) {
  if (!categoria.imagen) return null;
  const existente = await archivoYaSubido(app, categoria.imagen);
  if (existente) {
    stats.imagenesReutilizadas += 1;
    return existente;
  }
  const subido = await subirImagen(app, categoria, categoria.imagen);
  stats.imagenesNuevas += 1;
  return subido;
}

/** Siembra (o actualiza) una categoría por slug. Errores por categoría, sin abortar el resto. */
async function sembrarCategoria(app, categoria) {
  const slug = slugDe(categoria.nombre);
  try {
    const existentes = await app.db.query(UID).findMany({ where: { slug } });
    if (existentes.length > 1) {
      log(`⚠ hay ${existentes.length} categorías con slug "${slug}" en la BD; se trabaja sobre la primera (id=${existentes[0].id})`);
    }
    const existente = existentes[0] || null;

    // Imagen: reutilizar del Media Library o subir como asset nuevo.
    const archivo = await resolverImagen(app, categoria);

    if (!existente) {
      const data = {
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        slug,
        // draftAndPublish: sin publishedAt el registro queda en borrador.
        publishedAt: new Date(),
      };
      if (archivo) data.imagen = archivo.id;
      await app.entityService.create(UID, { data });
      stats.creadas += 1;
      log(`✓ ${categoria.nombre} -> ${slug}`);
      if (archivo) {
        log(`✓ imagen asociada: ${archivo.name} (id=${archivo.id})`);
      } else {
        log(`⚠ sin AVIF mapeado para "${categoria.nombre}"; se crea sin imagen`);
      }
      return;
    }

    // Categoría existente: actualizar solo lo que cambió.
    const actual = await app.entityService.findOne(UID, existente.id, {
      populate: { imagen: true },
    });
    const cambios = {};
    if (actual.nombre !== categoria.nombre) cambios.nombre = categoria.nombre;
    if ((actual.descripcion || null) !== (categoria.descripcion || null)) {
      cambios.descripcion = categoria.descripcion;
    }
    if (!existente.publishedAt) cambios.publishedAt = new Date();

    const imagenActualId = actual.imagen ? actual.imagen.id : null;
    if (archivo) {
      if (imagenActualId !== archivo.id) cambios.imagen = archivo.id;
    } else if (imagenActualId) {
      log(`⚠ "${categoria.nombre}" no tiene AVIF mapeado; se conserva la imagen ya asociada (id=${imagenActualId})`);
    }

    if (Object.keys(cambios).length === 0) {
      stats.yaExistentes += 1;
      log(`= ya existente y vigente: ${categoria.nombre} -> ${slug}`);
      if (archivo) log(`✓ imagen vigente: ${archivo.name} (id=${archivo.id})`);
      return;
    }

    await app.entityService.update(UID, existente.id, { data: cambios });
    stats.actualizadas += 1;
    log(`↻ actualizada (${Object.keys(cambios).join(', ')}): ${categoria.nombre} -> ${slug}`);
    if (cambios.imagen && archivo) {
      log(`✓ imagen asociada: ${archivo.name} (id=${archivo.id})`);
    }
  } catch (err) {
    stats.errores += 1;
    const detalle = err && err.details ? ` | detalles: ${JSON.stringify(err.details)}` : '';
    log(`✗ ERROR en "${categoria.nombre}" (slug ${slug}${categoria.imagen ? `, imagen ${categoria.imagen}` : ''}): ${err && (err.message || err)}${detalle}`);
  }
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------

(async () => {
  let app;
  try {
    // ---- 1. Validaciones de entorno (antes de tocar la BD) ----
    const avifDisponibles = listarAvif(IMAGES_DIR);
    const problemas = validar(avifDisponibles);
    if (problemas.length > 0) {
      problemas.forEach((p) => log(`✗ ${p}`));
      process.exit(1);
    }

    const mapeadas = CATEGORIAS.map((c) => c.imagen).filter(Boolean);
    const sinCorrespondencia = avifDisponibles.filter((f) => !mapeadas.includes(f));
    const sinAvif = CATEGORIAS.filter((c) => !c.imagen);

    log(`carpetas verificadas: ${path.basename(IMAGES_DIR)} y ${path.basename(SIBLING_IMAGES_DIR)}`);
    log(`archivos .avif encontrados en ${path.basename(IMAGES_DIR)}: ${avifDisponibles.length}`);
    log(`categorías definidas: ${CATEGORIAS.length} | con AVIF: ${mapeadas.length} | sin AVIF: ${sinAvif.length}`);
    if (sinAvif.length > 0) {
      log(`⚠ categorías sin AVIF inequívoco (se crean/actualizan sin imagen): ${sinAvif.map((c) => c.nombre).join(', ')}`);
    }
    if (sinCorrespondencia.length > 0) {
      log(`⚠ AVIF sin categoría asignada (NO se suben): ${sinCorrespondencia.join(', ')}`);
    }

    // ---- 2. Arrancar Strapi con la configuración real del proyecto ----
    app = await Strapi({ appDir: BACKEND_DIR }).load();

    // ---- 3. Pre-vuelo sobre la BD (reporte, sin borrados) ----
    const slugs = CATEGORIAS.map((c) => slugDe(c.nombre));
    const previas = await app.db.query(UID).findMany({ where: { slug: { $in: slugs } } });
    log(`categorías objetivo ya presentes en la BD: ${previas.length}`);
    const porSlug = {};
    for (const fila of previas) {
      porSlug[fila.slug] = (porSlug[fila.slug] || 0) + 1;
    }
    const duplicadosPre = Object.entries(porSlug).filter(([, n]) => n > 1);
    if (duplicadosPre.length > 0) {
      log(`⚠ slugs objetivo duplicados ANTES del seed (no se borran): ${duplicadosPre.map(([s, n]) => `${s}×${n}`).join(', ')}`);
    }

    // ---- 4. Sembrar categoría por categoría ----
    for (const categoria of CATEGORIAS) {
      await sembrarCategoria(app, categoria);
    }

    // ---- 5. Resumen final ----
    const linea = '─'.repeat(46);
    console.log(linea);
    console.log(`${LABEL}:`);
    console.log(`  creadas: ${stats.creadas}`);
    console.log(`  actualizadas: ${stats.actualizadas}`);
    console.log(`  ya existentes: ${stats.yaExistentes}`);
    console.log(`  imágenes nuevas: ${stats.imagenesNuevas}`);
    console.log(`  imágenes reutilizadas: ${stats.imagenesReutilizadas}`);
    console.log(`  errores: ${stats.errores}`);
    if (sinAvif.length > 0) {
      console.log(`  categorías sin AVIF: ${sinAvif.map((c) => c.nombre).join(', ')}`);
    }
    if (sinCorrespondencia.length > 0) {
      console.log(`  AVIF sin correspondencia (no subidos): ${sinCorrespondencia.join(', ')}`);
    }
    console.log(linea);

    if (stats.errores > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(`[${LABEL}] ✗ ERROR fatal del seed: ${err && (err.stack || err.message || err)}`);
    process.exitCode = 1;
  } finally {
    if (app) await app.destroy();
  }
})();
