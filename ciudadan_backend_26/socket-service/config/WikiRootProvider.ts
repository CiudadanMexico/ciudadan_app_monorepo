import axios from 'axios';
import { setActiveRoot, getWikiFsRoot, fallbackRoot, validateWikiRoot } from './WikiPaths';

/**
 * Resuelve la raíz física de los .md de la wiki con esta precedencia:
 *   1. `site-setting.wikis_path` en Strapi (GET /api/wiki/public-config)
 *   2. `WIKI_ROOT_PATH` del .env (fallback operativo)
 *   3. Default por plataforma (el de WikiPaths)
 *
 * El valor de Strapi se cachea con TTL para no pegarle al backend en cada
 * archivo: si Strapi no responde o el valor es inválido, se conserva el último
 * valor bueno (o el .env/default si nunca hubo uno).
 *
 * NOTA: se usa axios (no el fetch nativo) porque dentro de este proceso el
 * fetch global queda colgado contra `http://localhost:33032` y el arranque de
 * la wiki nunca terminaba. Con axios + timeout corto el servicio cae al
 * fallback en vez de bloquearse.
 */
const STRAPI_URL = (process.env.STRAPI_URL || '').replace(/\/$/, '');
const CACHE_TTL_MS = Number(process.env.WIKI_CONFIG_TTL_MS) || 60_000;
const REQUEST_TIMEOUT_MS = Number(process.env.WIKI_CONFIG_TIMEOUT_MS) || 5000;

let cachedRoot: string | null = null;
let cachedAt = 0;

/** Devuelve el body de GET /api/wiki/public-config, o null si no se pudo. */
export type WikiConfigRequest = () => Promise<{ wikisPath?: unknown } | null>;

const defaultRequest: WikiConfigRequest = async () => {
    if (!STRAPI_URL) return null;
    const res = await axios.get(`${STRAPI_URL}/api/wiki/public-config`, {
        timeout: REQUEST_TIMEOUT_MS,
    });
    return (res && res.data) || null;
};

function envOrDefaultRoot(): string {
    // .env → default de plataforma (recalculado; no el activeRoot mutado).
    return fallbackRoot();
}

/**
 * Resuelve y activa la raíz. Devuelve { root, source } para logging.
 * Nunca lanza: ante cualquier fallo conserva el valor vigente.
 */
export async function resolveActiveRoot(
    request: WikiConfigRequest = defaultRequest
): Promise<{ root: string; source: 'strapi' | 'env' | 'default' | 'cache' }> {
    const now = Date.now();

    // Caché vigente: no se consulta a Strapi en cada arranque de watcher.
    if (cachedRoot && now - cachedAt < CACHE_TTL_MS) {
        setActiveRoot(cachedRoot);
        return { root: cachedRoot, source: 'cache' };
    }

    let fromStrapi: string | null = null;
    try {
        const data = await request();
        if (data && typeof data.wikisPath === 'string' && data.wikisPath.trim()) {
            fromStrapi = validateWikiRoot(data.wikisPath);
        }
    } catch (err) {
        console.warn(
            '⚠️ [Wiki] No se pudo leer wikis_path de Strapi:',
            err && (err as Error).message ? (err as Error).message : err
        );
    }

    if (fromStrapi) {
        cachedRoot = fromStrapi;
        cachedAt = now;
        setActiveRoot(fromStrapi);
        return { root: fromStrapi, source: 'strapi' };
    }

    // Fallback: .env o default (si Strapi cae o no tiene valor, la wiki sigue viva).
    const fallback = envOrDefaultRoot();
    setActiveRoot(fallback);
    const fromEnv = !!process.env.WIKI_ROOT_PATH;
    return { root: fallback, source: fromEnv ? 'env' : 'default' };
}

/** Solo para tests: limpia la caché en memoria. */
export function __resetWikiRootCache(): void {
    cachedRoot = null;
    cachedAt = 0;
}
