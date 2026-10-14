import React, { useState } from 'react';
import { Box, Button, CircularProgress, Divider, Link, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { WIKI_REFERENCIAS } from '../../Pages/Cartera/tokenContent';
import { useWikiDocumento, WIKI_ESTADO } from '../../hooks/useWikiDocumento';

/**
 * "Saber más: wiki y documentos" de una ficha de Cartera.
 *
 * BLOQUE 1 (cartera integral). Integración MÍNIMA con la wiki, sin duplicar
 * contenido a mano y sin dependencias nuevas:
 *
 *   - Reutiliza `src/services/wikiService.js` (el servicio que ya usa la app)
 *     mediante el hook reutilizable `useWikiDocumento`.
 *   - La ficha declara sus referencias por clave en `tokenContent.js`
 *     (`wiki: ['carteraLabory', ...]`) y aquí se resuelven contra
 *     `WIKI_REFERENCIAS`. No hay rutas escritas a mano en cada ficha.
 *   - Carga PEREZOSA: el documento sólo se pide cuando la persona abre
 *     "Saber más", así la ficha no hace una petición extra al cargar.
 *
 * HONESTIDAD DE LA CONEXIÓN (requisito explícito del bloque):
 *   El repo contiene la fuente (`wikiseed/help/*.md`) y el contrato de
 *   integración. La wiki VIVA sólo tiene el documento tras sincronizarlo con
 *   `node wikiseed/sync-wikis.js` contra el destino configurado
 *   (`site-setting.wikis_path` → `WIKI_ROOT_PATH` → default). Las dos
 *   superficies NO están sincronizadas automáticamente, y este componente lo
 *   dice explícitamente en lugar de aparentar que sí:
 *     - documento publicado → se muestra su resumen y el enlace a la wiki.
 *     - documento ausente   → se indica que todavía no está publicado y se
 *                             mantiene el enlace.
 *     - wiki no responde    → se indica el fallo sin romper la ficha.
 *
 *   No se expone contenido en borrador: sólo se lee lo que la wiki sirve.
 */

/**
 * Enlace canónico al ARTÍCULO de la wiki (ruta que ya existe en la app).
 * `/wiki/:slug` lo resuelve `WikiWrapper` buscando el slug en las secciones
 * main/help/faq, así que el enlace lleva directo al documento, no a la sección.
 * Si el documento no está publicado, `WikiWrapper` muestra el visor vacío y la
 * ficha conserva su contenido versionado: nunca queda en blanco ni rompe.
 */
const enlaceWikiApp = (ref) => `/wiki/${ref.ruta}`;

const TokenSaberMas = ({ referencias = [] }) => {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);

  const refs = (Array.isArray(referencias) ? referencias : [])
    .map((clave) => WIKI_REFERENCIAS[clave])
    .filter(Boolean);

  const principal = refs[0] || null;

  // Los hooks van ANTES de cualquier return condicional (reglas de React).
  const { documento, cargando, estado } = useWikiDocumento(principal, { activo: abierto });

  // Sin referencias declaradas, la sección no aparece (nada inventado).
  if (!principal) return null;

  return (
    <Box sx={{ mt: 2, width: '100%', textAlign: 'left' }}>
      <Divider sx={{ mb: 1.5, borderColor: 'rgba(255,255,255,0.1)' }} />

      <Typography
        sx={{
          fontWeight: 700,
          fontSize: { xs: '0.8rem', sm: '0.85rem' },
          color: '#8ee9d6',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          mb: 1,
        }}
      >
        Saber más: wiki y documentos
      </Typography>

      {/* Referencias declaradas por la ficha */}
      <Box component="ul" sx={{ m: 0, pl: 2.5, mb: 1.5 }}>
        {refs.map((ref) => (
          <Box component="li" key={`${ref.seccion}/${ref.ruta}`} sx={{ mb: 0.5 }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(enlaceWikiApp(ref))}
              sx={{
                color: '#c9b4ff',
                fontSize: { xs: '0.8rem', sm: '0.85rem' },
                textAlign: 'left',
                textDecoration: 'underline',
              }}
            >
              {ref.titulo}
            </Link>
          </Box>
        ))}
      </Box>

      {/* Carga perezosa del documento principal */}
      {!abierto ? (
        <Button
          size="small"
          startIcon={<MenuBookIcon />}
          onClick={() => setAbierto(true)}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            color: '#c9b4ff',
            border: '1px solid rgba(138,92,245,0.55)',
          }}
        >
          Ver el documento en la wiki
        </Button>
      ) : (
        <Box
          sx={{
            mt: 1,
            p: 1.5,
            bgcolor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 2,
          }}
        >
          {cargando && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={14} sx={{ color: '#c9b4ff' }} />
              <Typography sx={{ fontSize: 12 }}>Cargando el documento…</Typography>
            </Box>
          )}

          {estado === WIKI_ESTADO.LISTO && documento && (
            <>
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>
                {documento.title || principal.titulo}
              </Typography>
              {/* HTML ya parseado por el WikiRouter: se muestra lo que la wiki
                  sirve, no contenido generado localmente. */}
              <Box
                sx={{
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: 'rgba(255,255,255,0.82)',
                  '& p': { mb: 1 },
                  '& ul, & ol': { pl: 2.5, mb: 1 },
                }}
                dangerouslySetInnerHTML={{ __html: documento.htmlContent || '' }}
              />
            </>
          )}

          {estado === WIKI_ESTADO.AUSENTE && (
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
              Este documento todavía no está publicado en la wiki. La ficha se basa en el
              contenido versionado de la app; publicarlo en la wiki requiere sincronizar el
              contenido con el destino configurado.
            </Typography>
          )}

          {estado === WIKI_ESTADO.ERROR && (
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
              No se pudo cargar la wiki en este momento. El resto de la ficha funciona con
              normalidad.
            </Typography>
          )}

          <Button
            size="small"
            endIcon={<OpenInNewIcon />}
            onClick={() => navigate(enlaceWikiApp(principal))}
            sx={{ mt: 1, textTransform: 'none', color: '#c9b4ff' }}
          >
            Abrir el artículo en la wiki
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TokenSaberMas;
