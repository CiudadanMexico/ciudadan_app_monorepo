import path from 'node:path';

/**
 * Raíz física donde viven los archivos de las wikis, FUERA del proyecto.
 *
 * La raíz REAL se resuelve en arranque mediante `WikiRootProvider`
 * (config/WikiRootProvider.ts) con esta precedencia:
 *   1. `site-setting.wikis_path` en Strapi (`GET /api/wiki/public-config`)
 *   2. `WIKI_ROOT_PATH` del .env (fallback operativo)
 *   3. Default por plataforma (`/var/www/apps/wikis` en linux, `./wikis` en Windows)
 *
 * Este módulo conserva la raíz activa en memoria para que el watcher y el
 * servicio de lectura usen siempre la misma sin re-resolver en cada archivo.
 * `setActiveRoot()` permite cambiarla en caliente (sin reiniciar el proceso).
 */
let activeRoot: string = fallbackRoot();

/** Raíz activa actual (resuelta en arranque por WikiRootProvider). */
export function getWikiFsRoot(): string {
    return activeRoot;
}

/**
 * Compatibilidad: importadores existentes que leían la constante.
 * Se evalúa al cargar el módulo; usa `getWikiFsRoot()` para el valor vivo.
 */
export const WIKI_FS_ROOT: string = fallbackRoot();

/**
 * Raíz de respaldo (precedencia .env → default de plataforma).
 * Se recalcula en CADA llamada para que `WIKI_ROOT_PATH` siga mandando aunque
 * haya cambiado la raíz activa (p. ej. luego de un fallo de Strapi).
 */
export function fallbackRoot(): string {
    if (process.env.WIKI_ROOT_PATH) return path.resolve(process.env.WIKI_ROOT_PATH);
    return process.platform === 'win32'
        ? path.resolve('./wikis')
        : '/var/www/apps/wikis';
}

/** Fija la raíz activa (la valida y normaliza). Lanza si la ruta es inválida. */
export function setActiveRoot(root: string): string {
    const normalized = validateWikiRoot(root);
    activeRoot = normalized;
    return activeRoot;
}

/**
 * Valida que la raíz sea una ruta física absoluta y contenida.
 * Solo se aceptan absolutas: nada relativo al proyecto.
 */
export function validateWikiRoot(root: unknown): string {
    const raw = typeof root === 'string' ? root.trim() : '';
    if (!raw) throw new Error('wikis_path vacío: se esperaba una ruta física absoluta.');
    if (raw.includes('..')) throw new Error(`wikis_path inválido (contiene ".."): ${raw}`);
    if (!path.isAbsolute(raw)) throw new Error(`wikis_path debe ser una ruta absoluta, no relativa: ${raw}`);
    return path.normalize(raw);
}

const BS = String.fromCharCode(92); // barra invertida sin literal en el codigo

/**
 * Convierte una ruta logica de la BD (formato wiki/seccion/resto.md)
 * en la ruta fisica en disco dentro de la raiz configurada.
 * La raiz contiene una carpeta por wiki directamente (main, help, faq),
 * por lo que se elimina el prefijo logico wiki/.
 *
 * @param logicalPath ruta lógica (ej. "wiki/help/guia-usuario.md")
 * @param root raíz opcional; por defecto la activa (permite testear sin estado)
 */
export function resolveWikiDiskPath(logicalPath: string, root?: string): string {
    const base = root ?? activeRoot;
    let normalized = logicalPath.split(BS).join('/');
    while (normalized.startsWith('/')) {
        normalized = normalized.slice(1);
    }
    const withoutWikiPrefix = normalized.slice(0, 5).toLowerCase() === 'wiki/'
        ? normalized.slice(5)
        : normalized;
    return path.join(base, withoutWikiPrefix);
}
