import path from 'node:path';

/**
 * Raiz fisica donde viven los archivos de las wikis, FUERA del proyecto.
 * Se configura con WIKI_ROOT_PATH en el .env del socket-service.
 */
export const WIKI_FS_ROOT: string = process.env.WIKI_ROOT_PATH
    ? path.resolve(process.env.WIKI_ROOT_PATH)
    : (process.platform === 'win32'
        ? path.resolve('./wikis')
        : '/var/www/apps/wikis');

const BS = String.fromCharCode(92); // barra invertida sin literal en el codigo

/**
 * Convierte una ruta logica de la BD (formato wiki/seccion/resto.md)
 * en la ruta fisica en disco dentro de la raiz configurada.
 * La raiz contiene una carpeta por wiki directamente (main, help, faq),
 * por lo que se elimina el prefijo logico wiki/.
 */
export function resolveWikiDiskPath(logicalPath: string): string {
    let normalized = logicalPath.split(BS).join('/');
    while (normalized.startsWith('/')) {
        normalized = normalized.slice(1);
    }
    const withoutWikiPrefix = normalized.slice(0, 5).toLowerCase() === 'wiki/'
        ? normalized.slice(5)
        : normalized;
    return path.join(WIKI_FS_ROOT, withoutWikiPrefix);
}
