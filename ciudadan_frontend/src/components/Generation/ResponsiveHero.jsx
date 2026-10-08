/**
 * ResponsiveHero — hero con imagen de ambientación (assets oficiales,
 * nunca con texto incrustado). Requisito 18: posición configurable por
 * asset y por breakpoint; en mobile el texto lleva fondo rgba(0,0,0,0.65)
 * para no meter texto sobre zonas complejas de la imagen.
 *
 * El texto SIEMPRE va en HTML/CSS encima de la imagen, con overlay oscuro.
 */
import { Box, Container } from '@mui/material';

const positionFor = (assetPosition = {}) => ({
  xs: assetPosition.mobile || 'center center',
  sm: assetPosition.tablet || 'center center',
  md: assetPosition.desktop || 'center center',
});

/**
 * @param {object} asset   entrada de GENERATION_ASSETS: { src, alt, position }
 * @param {node}   children contenido HTML del hero (títulos, CTAs…)
 * @param {bool}   priority  true en el hero del primer viewport (LCP eager)
 * @param {number} overlay  fuerza del overlay (0–1, default 0.62)
 * @param {object} minHeightSx override de alturas si la sección lo pide
 */
const ResponsiveHero = ({
  asset,
  children,
  priority = false,
  overlay = 0.62,
  minHeightSx,
  contentSx,
}) => {
  if (!asset?.src) return null;

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        bgcolor: '#000',
        minHeight: minHeightSx || { xs: '88svh', sm: '78vh', md: '100vh' },
      }}
    >
      {/* Imagen de ambientación: hero principal eager (LCP), resto lazy */}
      <Box
        component="img"
        src={asset.src}
        alt={asset.alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: positionFor(asset.position),
        }}
      />

      {/* Overlay oscuro: gradiente inferior para asegurar contraste AA */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, rgba(0,0,0,${Math.min(
            overlay * 0.75,
            0.9
          )}) 0%, rgba(0,0,0,${overlay}) 55%, rgba(0,0,0,0.92) 100%)`,
        }}
      />

      {/* Contenido en HTML — móvil con fondo propio para legibilidad */}
      <Container
        sx={{ position: 'relative', zIndex: 2, py: { xs: 5, md: 8 } }}
      >
        <Box
          sx={{
            maxWidth: { xs: '100%', sm: 720, md: 860 },
            bgcolor: { xs: 'rgba(0,0,0,0.65)', sm: 'transparent' },
            p: { xs: 2.5, sm: 0 },
            borderRadius: { xs: 3, sm: 0 },
            ...contentSx,
          }}
        >
          {children}
        </Box>
      </Container>
    </Box>
  );
};

export default ResponsiveHero;
