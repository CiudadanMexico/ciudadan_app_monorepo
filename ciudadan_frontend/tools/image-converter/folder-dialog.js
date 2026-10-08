'use strict';

/**
 * Selectores de carpetas nativos del sistema, sin dependencias npm.
 * Soporta Windows (FolderBrowserDialog vía PowerShell), macOS (osascript)
 * y Linux (zenity con fallback a kdialog).
 *
 * Devuelve la ruta seleccionada o null si el usuario cancela / no hay selector.
 */

const { execFile } = require('child_process');

/** Ejecuta un comando y devuelve { ok, code, stdout } sin lanzar excepciones. */
function run(executable, args, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve) => {
    execFile(executable, args, { timeout: timeoutMs, windowsHide: true }, (err, stdout) => {
      if (err) {
        resolve({ ok: false, code: err.code, stdout: (stdout || '').trim() });
        return;
      }
      resolve({ ok: true, code: 0, stdout: (stdout || '').trim() });
    });
  });
}

/** Windows: FolderBrowserDialog nativo vía PowerShell + WinForms. */
async function selectFolderWindows(title) {
  const safeTitle = String(title).replace(/'/g, "''");
  const script =
    "Add-Type -AssemblyName System.Windows.Forms; " +
    "$d = New-Object System.Windows.Forms.FolderBrowserDialog; " +
    `$d.Description = '${safeTitle}'; ` +
    "$d.ShowNewFolderButton = $true; " +
    "if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { " +
    "[Console]::WriteLine($d.SelectedPath) }";

  const result = await run('powershell.exe', ['-NoProfile', '-STA', '-Command', script]);
  if (result.ok && result.stdout) return result.stdout;
  return null; // cancelado o sin selección
}

/** macOS: selector nativo vía osascript. */
async function selectFolderMac(title) {
  const safeTitle = String(title).replace(/"/g, '\\"');
  const script = `POSIX path of (choose folder with prompt "${safeTitle}")`;
  const result = await run('osascript', ['-e', script]);
  if (result.ok && result.stdout) return result.stdout;
  return null; // cancelado
}

/** Linux: zenity con fallback a kdialog. Sin ninguno, error claro. */
async function selectFolderLinux(title) {
  let result = await run('zenity', ['--file-selection', '--directory', '--title', title]);
  if (result.code === 'ENOENT') {
    // zenity no está instalado; intentar kdialog
    result = await run('kdialog', ['--getexistingdirectory', process.cwd(), '--title', title]);
    if (result.code === 'ENOENT') {
      throw new Error(
        'En Linux se requiere "zenity" o "kdialog" para el selector de carpetas. ' +
          'Instala uno de los dos (p. ej. sudo apt install zenity).'
      );
    }
  }
  if (result.ok && result.stdout) return result.stdout;
  return null; // cancelado
}

/**
 * Abre un cuadro nativo para seleccionar una carpeta.
 * @param {string} title
 * @returns {Promise<string|null>} ruta seleccionada o null si se cancela.
 */
async function selectFolder(title = 'Selecciona una carpeta') {
  switch (process.platform) {
    case 'win32':
      return selectFolderWindows(title);
    case 'darwin':
      return selectFolderMac(title);
    case 'linux':
      return selectFolderLinux(title);
    default:
      console.error(`Plataforma no soportada para el selector de carpetas: ${process.platform}`);
      return null;
  }
}

module.exports = { selectFolder };