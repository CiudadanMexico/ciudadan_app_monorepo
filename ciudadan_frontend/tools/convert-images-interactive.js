'use strict';

/**
 * Script interactivo para desarrolladores humanos.
 *
 * 1) Abre un cuadro nativo para seleccionar la carpeta de ENTRADA.
 * 2) Abre un cuadro nativo para seleccionar la carpeta de SALIDA.
 * 3) Convierte recursivamente PNG/JPG/JPEG a AVIF conservando la estructura
 *    relativa de carpetas.
 *
 * Si el usuario cancela cualquiera de las dos selecciones, el script termina
 * limpiamente (sin excepciones, exit code 0).
 *
 * Uso: npm run images:avif:dialog
 */

const { selectFolder } = require('./image-converter/folder-dialog');
const { convertAll, printSummary } = require('./image-converter/converter');

async function main() {
  const inputDir = await selectFolder('Selecciona la carpeta de ENTRADA (imágenes originales)');
  if (!inputDir) {
    console.log('Operación cancelada: no se seleccionó carpeta de entrada.');
    return; // fin limpio
  }
  console.log(`Carpeta de entrada: ${inputDir}`);

  const outputDir = await selectFolder('Selecciona la carpeta de SALIDA (archivos AVIF)');
  if (!outputDir) {
    console.log('Operación cancelada: no se seleccionó carpeta de salida.');
    return; // fin limpio
  }
  console.log(`Carpeta de salida: ${outputDir}`);

  const stats = await convertAll({ inputDir, outputDir });
  printSummary(stats);

  // Exit code distinto de 0 si hubo errores reales o colisiones.
  if (stats.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('ERROR FATAL:', err.message);
  process.exitCode = 1;
});