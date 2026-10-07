'use strict';

/**
 * Seed de las 32 categorías del Marketplace (api::store-categorie.store-categorie).
 *
 * Idempotente (el slug es la clave lógica del seed):
 *   - Si la categoría NO existe: la crea PUBLICADA (draftAndPublish está
 *     habilitado, se fija publishedAt explícito) y le asocia su imagen.
 *   - Si YA existe: actualiza nombre/descripción solo si cambiaron, corrige la
 *     relación de imagen si difiere y la publica si estaba en borrador.
 *   - Antes de subir una imagen busca en el Media Library un archivo con el
 *     mismo nombre (p. ej. "electronica.avif") y lo REUTILIZA en vez de
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
 *   ../ciudadan_frontend/media_seeds/ciudadan_categorias_sinfondo/*.avif
 *
 * Uso:
 *   node seed/seed-store-categories.js          (desde cualquier carpeta)
 *   npm run seed:marketplace-categories
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

const UID = 'api::store-categorie.store-categorie';
const LABEL = 'Marketplace';

// Monorepo: ciudadan_backend_26/ y ciudadan_frontend/ son carpetas hermanas.
const MEDIA_SEEDS_DIR = path.resolve(BACKEND_DIR, '..', 'ciudadan_frontend', 'media_seeds');
const IMAGES_DIR = path.join(MEDIA_SEEDS_DIR, 'ciudadan_categorias_sinfondo');
// El seed de Food usa la carpeta hermana; se valida que exista (spec 11).
const SIBLING_IMAGES_DIR = path.join(MEDIA_SEEDS_DIR, 'ciudadan_food_categorias_sin_fondo');

const TOTAL_ESPERADO = 32;

/**
 * Las 32 categorías oficiales del Marketplace.
 * `imagen` = nombre del archivo .avif dentro de IMAGES_DIR, o null cuando no
 * existe un AVIF inequívoco para la categoría (se reporta, NO se inventa).
 */
const CATEGORIAS = [
  { nombre: 'Electrónica y tecnología', imagen: 'electronica.avif', descripcion: 'Dispositivos electrónicos, accesorios, equipos inteligentes y tecnología para uso personal, profesional y del hogar.' },
  { nombre: 'Ropa y moda', imagen: 'ropa.avif', descripcion: 'Prendas de vestir, accesorios y tendencias para hombres, mujeres y niños en todas las ocasiones.' },
  { nombre: 'Calzado', imagen: 'calzado.avif', descripcion: 'Zapatos, tenis, botas y sandalias para toda la familia y para cada ocasión.' },
  { nombre: 'Hogar y decoración', imagen: 'hogar.avif', descripcion: 'Artículos de hogar, textiles, utensilios y decoración para embellecer cada espacio.' },
  { nombre: 'Herramientas y ferretería', imagen: 'herramientas.avif', descripcion: 'Herramientas manuales y eléctricas, tornillería, pinturas y todo lo necesario para construir y reparar.' },
  { nombre: 'Muebles', imagen: 'muebles.avif', descripcion: 'Muebles para sala, comedor, recámara y oficina, nuevos y en buen estado.' },
  { nombre: 'Movilidad y vehículos', imagen: 'movilidad.avif', descripcion: 'Autos, motocicletas, bicicletas y vehículos para el transporte personal y de trabajo.' },
  { nombre: 'Refacciones y accesorios automotrices', imagen: null, descripcion: 'Refacciones, llantas, accesorios y equipos para mantener tu vehículo siempre en buen camino.' },
  { nombre: 'Computación', imagen: 'computo.avif', descripcion: 'Laptops, computadoras de escritorio, componentes y periféricos para trabajar y jugar.' },
  { nombre: 'Videojuegos y entretenimiento', imagen: 'videojuego.avif', descripcion: 'Consolas, videojuegos, controles y coleccionables para jugadores de todas las edades.' },
  { nombre: 'Libros, educación y oficina', imagen: 'papeleria.avif', descripcion: 'Libros, material educativo, artículos de oficina y papelería para estudiar y trabajar.' },
  { nombre: 'Niños, bebés y juguetes', imagen: 'juguetes.avif', descripcion: 'Ropa y artículos para bebé, juguetes didácticos y entretenimiento para los más pequeños.' },
  { nombre: 'Mascotas', imagen: 'mascotas.avif', descripcion: 'Alimentos, accesorios, juguetes y productos de cuidado para perros, gatos y otras mascotas.' },
  { nombre: 'Jardín, campo y agricultura', imagen: 'jardin.avif', descripcion: 'Plantas, herramientas de jardinería e insumos para el hogar, el campo y la siembra.' },
  { nombre: 'Hecho a mano y producción local', imagen: 'artesanal.avif', descripcion: 'Piezas artesanales y productos de talleres y productores locales hechos con oficio.' },
  { nombre: 'Segunda mano y reacondicionados', imagen: 'segundamano.avif', descripcion: 'Artículos usados y reacondicionados en buen estado, a precio accesible.' },
  { nombre: 'Energía y sustentabilidad', imagen: 'energia.avif', descripcion: 'Paneles solares, baterías y soluciones de ahorro de energía para casa o negocio.' },
  { nombre: 'Maquinaria y producción', imagen: 'maquinas.avif', descripcion: 'Maquinaria y equipo para talleres, fábricas y procesos productivos de todo tamaño.' },
  { nombre: 'Impresión 3D y fabricación digital', imagen: '3d.avif', descripcion: 'Impresoras 3D, filamentos y servicios de impresión y fabricación digital bajo demanda.' },
  { nombre: 'Productos cooperativos', imagen: null, descripcion: 'Bienes y servicios de cooperativas y proyectos de economía solidaria y comunitaria.' },
  { nombre: 'Arte y diseño', imagen: 'arte.avif', descripcion: 'Obras de arte, ilustración, piezas de diseño y creaciones visuales originales.' },
  { nombre: 'Salud y cuidado personal', imagen: 'salud.avif', descripcion: 'Insumos y equipos de salud, higiene y cuidado personal para toda la familia.' },
  { nombre: 'Belleza', imagen: 'belleza.avif', descripcion: 'Cosméticos, cuidado de la piel, fragancias y servicios de belleza profesional.' },
  { nombre: 'Deportes y aire libre', imagen: 'deportes.avif', descripcion: 'Equipo deportivo, camping, ciclismo y artículos para la vida activa al aire libre.' },
  { nombre: 'Instrumentos musicales', imagen: 'musica.avif', descripcion: 'Guitarras, teclados, baterías y equipo de audio para músicos de todos los niveles.' },
  { nombre: 'Coleccionables', imagen: 'coleccionables.avif', descripcion: 'Monedas, tarjetas, figuras y objetos de colección para coleccionistas principiantes y expertos.' },
  { nombre: 'Seguridad', imagen: 'seguridad.avif', descripcion: 'Cámaras, alarmas, cerraduras inteligentes y equipos de protección y vigilancia.' },
  { nombre: 'Industria y comercio', imagen: 'industria.avif', descripcion: 'Equipamiento, maquinaria ligera e insumos para talleres, negocios e industria local.' },
  { nombre: 'Inmuebles y equipamiento', imagen: 'inmuebles.avif', descripcion: 'Locales, bodegas, terrenos y equipamiento para vivienda, comercio o industria.' },
  { nombre: 'Productos digitales', imagen: 'digitales.avif', descripcion: 'Licencias de software, gift cards, cursos y productos digitales de entrega inmediata.' },
  { nombre: 'Software y tecnología abierta', imagen: null, descripcion: 'Aplicaciones, herramientas y proyectos de tecnología libre y de código abierto.' },
  { nombre: 'Otros', imagen: 'otros.avif', descripcion: 'Publicaciones que no encajan en las demás categorías del marketplace.' },
];

// Slugs exactos que debe producir slugify para las 32 categorías. Si slugify
// llegara a generar algo distinto, el seed ABORTA antes de escribir en la BD
// en lugar de sembrar slugs no deseados.
const SLUGS_ESPERADOS = [
  'electronica-y-tecnologia',
  'ropa-y-moda',
  'calzado',
  'hogar-y-decoracion',
  'herramientas-y-ferreteria',
  'muebles',
  'movilidad-y-vehiculos',
  'refacciones-y-accesorios-automotrices',
  'computacion',
  'videojuegos-y-entretenimiento',
  'libros-educacion-y-oficina',
  'ninos-bebes-y-juguetes',
  'mascotas',
  'jardin-campo-y-agricultura',
  'hecho-a-mano-y-produccion-local',
  'segunda-mano-y-reacondicionados',
  'energia-y-sustentabilidad',
  'maquinaria-y-produccion',
  'impresion-3d-y-fabricacion-digital',
  'productos-cooperativos',
  'arte-y-diseno',
  'salud-y-cuidado-personal',
  'belleza',
  'deportes-y-aire-libre',
  'instrumentos-musicales',
  'coleccionables',
  'seguridad',
  'industria-y-comercio',
  'inmuebles-y-equipamiento',
  'productos-digitales',
  'software-y-tecnologia-abierta',
  'otros',
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
      problemas.push(`No existe la carpeta de imágenes del Marketplace: ${IMAGES_DIR}`);
    }
    if (!fs.existsSync(SIBLING_IMAGES_DIR)) {
      problemas.push(`No existe la carpeta de imágenes de Food: ${SIBLING_IMAGES_DIR}`);
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
