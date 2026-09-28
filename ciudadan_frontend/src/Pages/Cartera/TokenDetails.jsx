import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

/**
 * Bloque desplegable reutilizable para la explicación larga de una moneda/token.
 * Un único componente para todas las fichas de Cartera (spec: "no crear doce
 * implementaciones diferentes"). Diseñado para verse bien en desktop y móvil.
 *
 * `contenido` es el objeto `descripcion` de la config del token:
 * { queEs, comoSeObtiene, paraQueSirve, ecosistema, estado }
 */
const SECCIONES = [
  ['queEs', '¿Qué es?'],
  ['comoSeObtiene', '¿Cómo se obtiene?'],
  ['paraQueSirve', '¿Para qué sirve?'],
  ['ecosistema', 'Relación con Ciudadan'],
  ['estado', 'Estado actual'],
];

const TokenDetails = ({ nombre, contenido, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!contenido) return null;

  const secciones = SECCIONES.map(([clave, titulo]) => ({
    titulo,
    texto: contenido[clave],
  })).filter((seccion) => Boolean(seccion.texto));

  if (secciones.length === 0) return null;

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, next) => setExpanded(next)}
      disableGutters
      elevation={0}
      sx={{
        mt: 2,
        width: '100%',
        bgcolor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(138,92,245,0.35)',
        borderRadius: 2,
        '&:before': { display: 'none' },
        color: 'white',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: '#c9b4ff' }} />}
        aria-controls={`token-details-${nombre}`}
        id={`token-details-header-${nombre}`}
        sx={{ '& .MuiAccordionSummary-content': { my: 1 } }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { xs: '0.9rem', sm: '1rem' },
            color: '#c9b4ff',
            letterSpacing: '-0.01em',
          }}
        >
          ¿Qué es {nombre}?
        </Typography>
      </AccordionSummary>

      <AccordionDetails sx={{ pt: 0 }}>
        {secciones.map((seccion, index) => (
          <Box key={seccion.titulo} sx={{ mb: index === secciones.length - 1 ? 0 : 2 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: '0.8rem', sm: '0.85rem' },
                color: '#8ee9d6',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                mb: 0.5,
              }}
            >
              {seccion.titulo}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '0.82rem', sm: '0.88rem' },
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.88)',
                whiteSpace: 'pre-line',
                textAlign: 'left',
              }}
            >
              {seccion.texto}
            </Typography>
            {index < secciones.length - 1 && (
              <Divider sx={{ mt: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
            )}
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
};

export default TokenDetails;
