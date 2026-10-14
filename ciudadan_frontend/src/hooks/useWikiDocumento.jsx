import { useCallback, useEffect, useState } from 'react';
import { wikiService } from '../services/wikiService';

/**
 * Capa de consumo REUTILIZABLE de la wiki para las fichas de Cartera.
 *
 * BLOQUE 1 (cartera integral): el objetivo es no duplicar a mano el contenido
 * editorial. Este hook lee un documento de la wiki usando el servicio que YA
 * existe (`src/services/wikiService.js` → `wikiService.getDocument`), sin
 * agregar dependencias nuevas.
 *
 * ARQUITECTURA REAL DE LA WIKI (verificada, NO es Strapi):
 *   - El contenido son archivos `.md` servidos por `socket-service`
 *     (`routes/WikiRouter.ts`) en `{REACT_APP_SOCKET_URL}/wiki/{seccion}/{ruta}`.
 *   - La raíz física se resuelve con esta precedencia:
 *     `site-setting.wikis_path` (Strapi, `GET /api/wiki/public-config`)
 *       → `WIKI_ROOT_PATH` (.env) → default de plataforma.
 *   - Los `.md` de ejemplo viven versionados en `wikiseed/{main,help,faq}/` y
 *     se publican al destino vivo con `node wikiseed/sync-wikis.js`.
 *
 * ESTADO DE LA CONEXIÓN (honesto, sin afirmar sincronía inexistente):
 *   Las dos superficies NO están sincronizadas automáticamente. Este repo
 *   contiene la fuente (wikiseed/ + tokenContent.js); la wiki viva sólo tiene
 *   un documento después de sincronizarlo contra el destino configurado. Por
 *   eso este hook:
 *     - nunca rompe la ficha si la wiki no responde o el documento no existe;
 *     - expone `estado` para que la UI diga la verdad ("no disponible"
 *       en lugar de mostrar un hueco vacío o inventar contenido).
 *
 * Uso:
 *   const { documento, cargando, estado, error } = useWikiDocumento(ref, { activo });
 *   // ref = { seccion, ruta }  (las claves de WIKI_REFERENCIAS en tokenContent.js)
 */

/** Estados posibles del documento. `ausente` = la wiki respondió 404. */
export const WIKI_ESTADO = {
  INACTIVO: 'inactivo', // no se pidió (carga perezosa)
  CARGANDO: 'cargando',
  LISTO: 'listo',
  AUSENTE: 'ausente', // el documento no está publicado en la wiki viva
  ERROR: 'error', // la wiki no responde (socket-service caído, red, etc.)
};

/** Ruta lógica que espera `wikiService.getDocument`: 'wiki/<seccion>/<ruta>.md' */
export const rutaWiki = (ref) => {
  if (!ref?.seccion || !ref?.ruta) return null;
  return `wiki/${ref.seccion}/${String(ref.ruta).replace(/\.md$/i, '')}.md`;
};

/**
 * Lee un documento de la wiki.
 * @param {object} ref      { seccion, ruta } de la referencia del documento.
 * @param {object} opciones { activo } — carga perezosa: sólo pide cuando `activo`.
 */
export const useWikiDocumento = (ref, { activo = true } = {}) => {
  const ruta = rutaWiki(ref);
  const [documento, setDocumento] = useState(null);
  const [estado, setEstado] = useState(activo && ruta ? WIKI_ESTADO.CARGANDO : WIKI_ESTADO.INACTIVO);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (!ruta) {
      setEstado(WIKI_ESTADO.INACTIVO);
      return;
    }
    setEstado(WIKI_ESTADO.CARGANDO);
    setError(null);
    try {
      const encontrado = await wikiService.getDocument(ruta);
      setDocumento(encontrado || null);
      setEstado(encontrado ? WIKI_ESTADO.LISTO : WIKI_ESTADO.AUSENTE);
    } catch (err) {
      // 404 del WikiRouter → el documento no está publicado. Cualquier otro
      // fallo (socket-service caído, CORS, red) → error. En ambos casos la
      // ficha sigue funcionando: no se inventa contenido.
      setDocumento(null);
      setEstado(err?.response?.status === 404 ? WIKI_ESTADO.AUSENTE : WIKI_ESTADO.ERROR);
      setError(err?.message || 'No se pudo cargar el documento.');
    }
  }, [ruta]);

  useEffect(() => {
    if (!activo || !ruta) {
      setEstado(WIKI_ESTADO.INACTIVO);
      return undefined;
    }
    let cancelado = false;
    setEstado(WIKI_ESTADO.CARGANDO);
    (async () => {
      try {
        const encontrado = await wikiService.getDocument(ruta);
        if (cancelado) return;
        setDocumento(encontrado || null);
        setEstado(encontrado ? WIKI_ESTADO.LISTO : WIKI_ESTADO.AUSENTE);
      } catch (err) {
        if (cancelado) return;
        setDocumento(null);
        setEstado(err?.response?.status === 404 ? WIKI_ESTADO.AUSENTE : WIKI_ESTADO.ERROR);
        setError(err?.message || 'No se pudo cargar el documento.');
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [activo, ruta]);

  return { documento, cargando: estado === WIKI_ESTADO.CARGANDO, estado, error, recargar: cargar };
};

export default useWikiDocumento;
