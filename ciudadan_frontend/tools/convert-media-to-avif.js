'use strict';

/**
 * Script automático: convierte todas las imágenes PNG/JPG/JPEG de
 * /media/pngs a AVIF en /media/avifs, recorriendo todas las subcarpetas y
 * replicando exactamente la misma estructura.
 *
 * No muestra cuadros de diálogo ni requiere intervención humana.
 *
 * Las rutas se calculan respecto a la raíz real del proyecto (ciudadan_frontend,
 * donde vive este package.json), NO respecto al directorio desde el que se
 * ejecuta el comando. Por eso `npm run images:avif` funciona incluso si se
 * invoca desde otro working directory.
 *
 * Uso: npm run images:avif
 */

const fs = require('fs');
const path = require('path');
const { convertAll, printSummary } = require('./image-converter/converter');

// tools/.. = raíz real del proyecto frontend (mismo nivel que /src)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const INPUT_DIR = path.join(PROJECT_ROOT, 'media', 'pngs');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'media', 'avifs');

async function main() {
  // Crear la estructura media/pngs y media/avifs si aún no existen.
  fs.mkdirSync(INPUT_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const stats = await convertAll({ inputDir: INPUT_DIR, outputDir: OUTPUT_DIR });
  printSummary(stats);

  // Exit code distinto de 0 si hubo errores reales o colisiones
  // (importante para automatizaciones futuras).
  if (stats.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('ERROR FATAL:', err.message);
  process.exitCode = 1;
});