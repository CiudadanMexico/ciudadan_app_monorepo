'use strict';

/**
 * Lógica compartida de conversión de imágenes a AVIF (herramienta de desarrollo).
 *
 * CommonJS: el package.json del frontend no declara "type": "module".
 * Solo se usa en herramientas de /tools; nunca se importa desde /src.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// === Configuración fácilmente modificable ===
const AVIF_QUALITY = 68;
const AVIF_EFFORT = 4;

// Extensiones soportadas (case-insensitive: .PNG, .Jpg, .JPEG, etc.)
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

/**
 * Recorre recursivamente inputDir y devuelve las rutas absolutas de las
 * imágenes soportadas (png/jpg/jpeg en cualquier combinación de mayúsculas).
 */
async function findImages(inputDir) {
  const images = [];
  const entries = await fs.promises.readdir(inputDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(inputDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findImages(fullPath);
      images.push(...nested);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext)) {
        images.push(fullPath);
      }
    }
  }
  return images;
}

/**
 * Construye los trabajos de conversión conservando la estructura relativa:
 * cada imagen produce un .avif con la misma ruta relativa dentro de outputDir.
 */
function buildJobs(images, inputDir, outputDir) {
  return images.map((src) => {
    const rel = path.relative(inputDir, src);
    const relAvif = rel.replace(/\.(png|jpe?g)$/i, '.avif');
    return {
      src,
      outPath: path.join(outputDir, relAvif),
      rel: relAvif,
      srcRel: rel.split(path.sep).join('/'), // ruta del original (para mensajes de error)
    };
  });
}

/**
 * Detecta colisiones de salida: dos o más fuentes distintas que producirían
 * el mismo archivo .avif (p. ej. foo.png y foo.jpg => foo.avif).
 * Devuelve [{ outPath, sources: [...] }].
 */
function detectCollisions(jobs) {
  const groups = new Map();
  for (const job of jobs) {
    const key = path.normalize(job.outPath).toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(job);
  }
  const collisions = [];
  for (const group of groups.values()) {
    if (group.length > 1) {
      collisions.push({ outPath: group[0].outPath, sources: group.map((j) => j.src) });
    }
  }
  return collisions;
}

/**
 * Convierte todas las imágenes de inputDir a AVIF dentro de outputDir,
 * replicando la estructura relativa de carpetas.
 *
 * - Incremental: si el .avif ya existe y su fecha de modificación es igual o
 *   posterior a la del original, se omite (SKIP). Si el original es más
 *   reciente, se reconvierte.
 * - No modifica/borra/mueve nunca los originales: solo los lee.
 * - Sin resize: las dimensiones de salida son idénticas a las de entrada.
 * - rotate() respeta la orientación EXIF (importante en JPEG).
 * - Sin flatten(): los PNG con transparencia conservan su canal alpha.
 * - Los errores individuales (imagen corrupta, formato no soportado, etc.)
 *   no abortan el proceso: se registran y continúa con las demás.
 *
 * Nota de estadísticas: los archivos omitidos (SKIP) contabilizan el tamaño
 * de su original Y de su .avif existente, para que el tamaño total refleje
 * el conjunto completo de imágenes del proyecto.
 *
 * Devuelve el objeto de estadísticas. El entrypoint decide el exitCode
 * (debe ser != 0 si errors > 0, incluyendo colisiones).
 */
async function convertAll({ inputDir, outputDir, logger = console }) {
  const stats = {
    found: 0,
    converted: 0,
    skipped: 0,
    errors: 0,
    collisionGroups: 0,
    originalBytes: 0,
    avifBytes: 0,
  };

  // 1) Encontrar imágenes (recursivo)
  const images = await findImages(inputDir);
  stats.found = images.length;

  // 2) Detectar colisiones de nombres antes de convertir
  const jobs = buildJobs(images, inputDir, outputDir);
  const collisions = detectCollisions(jobs);
  const collidingSources = new Set();
  for (const collision of collisions) {
    stats.collisionGroups += 1;
    stats.errors += 1;
    logger.error('ERROR: Output collision:');
    for (const src of collision.sources) {
      collidingSources.add(src);
      logger.error(`  ${path.relative(inputDir, src)}`);
    }
    logger.error(`  => ${collision.outPath}`);
    logger.error('  Resuelve el conflicto renombrando uno de los archivos; esa salida no se procesa.');
  }

  // 3) Convertir (los trabajos en colisión no se procesan)
  const pending = jobs.filter((job) => !collidingSources.has(job.src));
  let index = 0;
  for (const job of pending) {
    index += 1;
    const label = job.rel.split(path.sep).join('/');
    try {
      const srcStat = await fs.promises.stat(job.src);
      stats.originalBytes += srcStat.size;

      let outStat = null;
      try {
        outStat = await fs.promises.stat(job.outPath);
      } catch (_) {
        outStat = null; // el AVIF aún no existe
      }

      // Conversión incremental: AVIF igual o más reciente que el original => SKIP
      if (outStat && outStat.mtimeMs >= srcStat.mtimeMs) {
        stats.skipped += 1;
        // Los omitidos cuentan ambos tamaños (original + AVIF existente) para
        // que las estadísticas del conjunto completo sean coherentes.
        stats.avifBytes += outStat.size;
        logger.log(`[${index}/${pending.length}] SKIP ${label}`);
        continue;
      }

      // Crear las carpetas de salida necesarias
      await fs.promises.mkdir(path.dirname(job.outPath), { recursive: true });

      // Convertir. sharp lee la imagen, respeta la orientación EXIF con
      // rotate(), mantiene las dimensiones (sin resize) y codifica a AVIF.
      await sharp(job.src)
        .rotate()
        .avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT })
        .toFile(job.outPath);

      const newOutStat = await fs.promises.stat(job.outPath);
      stats.converted += 1;
      stats.avifBytes += newOutStat.size;
      logger.log(`[${index}/${pending.length}] CONVERT ${label}`);
    } catch (err) {
      stats.errors += 1;
      logger.error(`ERROR ${job.srcRel || label}`);
      logger.error(`  ${err.message}`);
      // Continuar con las demás imágenes; el error queda en el contador.
    }
  }

  return stats;
}

/** Resumen final en el formato acordado. */
function printSummary(stats, logger = console) {
  const originalMB = stats.originalBytes / (1024 * 1024);
  const avifMB = stats.avifBytes / (1024 * 1024);
  const reduction = stats.originalBytes > 0 ? (1 - stats.avifBytes / stats.originalBytes) * 100 : 0;

  logger.log('');
  logger.log('Conversión AVIF completada');
  logger.log('');
  logger.log(`Encontradas: ${stats.found}`);
  logger.log(`Convertidas: ${stats.converted}`);
  logger.log(`Omitidas: ${stats.skipped}`);
  logger.log(`Errores: ${stats.errors}`);
  logger.log('');
  logger.log(`Tamaño original: ${originalMB.toFixed(2)} MB`);
  logger.log(`Tamaño AVIF: ${avifMB.toFixed(2)} MB`);
  logger.log(`Reducción: ${reduction.toFixed(1)}%`);
}

module.exports = {
  convertAll,
  printSummary,
  findImages,
  detectCollisions,
  AVIF_QUALITY,
  AVIF_EFFORT,
};