import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

/**
 * Bloque desplegable reutilizable para la explicación larga de una ficha de
 * Cartera. Un único componente para todas las fichas (spec: "no crear doce
 * implementaciones diferentes"). Diseñado para verse bien en desktop y móvil.
 *
 * `contenido` es el objeto `descripcion` de la config del token, con el
 * esquema editorial compartido de `tokenContent.js`:
 *   { proposito, comoFunciona, comoSeObtiene, paraQueSirve, miActividad,
 *     acciones, reglas, saberMas, estado, ... }
 *
 * Sólo se renderizan las secciones que la ficha declare: así "Mi actividad"
 * no aparece donde no hay fuente real y ninguna ficha se rellena con el mismo
 * texto genérico. `SECCIONES` es la lista; agregar una sección nueva es agregar
 * una entrada aquí, no tocar el componente.
 */

// Secciones en el orden editorial acordado.
// - `clave` puede ser un string (campo plano) o un array de claves alternas.
// - `siempre` marca la explicación PRINCIPAL: se muestra desplegada, sin que la
//   persona tenga que abrir nada para entender el instrumento. Lo extenso
//   (reglas, estado, pantalla de wiki) va dentro del bloque desplegable.
const SECCIONES = [
  { clave: ['proposito', 'queEs'], titulo: 'Resumen y propósito', siempre: true },
  { clave: 'comoFunciona', titulo: 'Cómo funciona dentro de Ciudadan', siempre: true },
  { clave: 'comoSeObtiene', titulo: '¿Cómo se obtiene o se participa?', siempre: true },
  { clave: 'paraQueSirve', titulo: '¿Qué permite hacer?', siempre: true },
  { clave: 'miActividad', titulo: 'Mi actividad', siempre: true },
  { clave: 'acciones', titulo: 'Acciones y destinos', siempre: true },
  { clave: 'reglas', titulo: 'Reglas y transparencia' },
  { clave: 'saberMas', titulo: 'Saber más: wiki y documentos' },
  { clave: 'estado', titulo: 'Estado de implementación' },
];

/** Toma el primer campo declarado de una sección (soporta alias de esquema). */
const leerCampo = (contenido, clave) => {
  if (Array.isArray(clave)) {
    for (const k of clave) {
      if (contenido?.[k]) return contenido[k];
    }
    return null;
  }
  return contenido?.[clave] || null;
};

/** Lista de strings a texto con viñetas, sin inventar viñetas vacías. */
const listaATexto = (items) =>
  Array.isArray(items) ? items.filter(Boolean).map((i) => `• ${i}`).join('\n') : '';

/**
 * Secciones compuestas: arman su texto a partir de sub-campos.
 * Sólo se muestran si la ficha declara esos sub-campos.
 */
const construirSeccionesExtra = (contenido) => {
  const extras = [];

  if (Array.isArray(contenido?.aristas) && contenido.aristas.length > 0) {
    extras.push({
      titulo: 'Factor de desempeño (seis aristas, socios de agencia)',
      texto: `${listaATexto(contenido.aristas)}\n\nEstas aristas están definidas; sus ponderaciones y efectos económicos no lo están y por eso no se muestran.`,
    });
  }

  if (Array.isArray(contenido?.simuladores) && contenido.simuladores.length > 0) {
    const lineas = contenido.simuladores.map((sim) => {
      const estado = sim.estado === 'pendiente' ? 'Próximamente' : 'Disponible';
      return `• ${sim.rol} — ${estado}`;
    });
    extras.push({
      titulo: 'Simuladores (destinos declarados)',
      texto: `${lineas.join(
        '\n'
      )}\n\nLos destinos marcados como próximamente todavía no existen: no son operativos y no muestran fórmulas ni cifras.`,
    });
  }

  // Fondo de recompra de Labory: la fórmula acordada se documenta tal cual.
  const recompra = contenido?.recompra;
  if (recompra) {
    const partes = [];
    if (Array.isArray(recompra.formula) && recompra.formula.length > 0) {
      partes.push(`El fondo se integra con:\n${listaATexto(recompra.formula)}`);
    }
    if (Array.isArray(recompra.reparto) && recompra.reparto.length > 0) {
      partes.push(`Y se divide:\n${listaATexto(recompra.reparto)}`);
    }
    if (Array.isArray(recompra.aclaraciones) && recompra.aclaraciones.length > 0) {
      partes.push(listaATexto(recompra.aclaraciones));
    }
    if (recompra.simulador) {
      const modos = listaATexto(recompra.simulador.modos);
      const muestra = listaATexto(recompra.simulador.muestra);
      const bloqueSim = [
        'El simulador de recompra tendrá los modos:',
        modos,
        muestra ? `\nMostrará:\n${muestra}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      partes.push(bloqueSim);
      if (recompra.simulador.estado) partes.push(recompra.simulador.estado);
    }
    if (recompra.estado) partes.push(recompra.estado);

    if (partes.length > 0) {
      extras.push({ titulo: recompra.titulo || 'Fondo de recompra', texto: partes.join('\n\n') });
    }
  }

  // Simulador genérico (CIT).
  const simulador = contenido?.simulador;
  if (simulador) {
    const modos = listaATexto(simulador.modos);
    const partes = [
      'El simulador tendrá los modos:',
      modos,
      simulador.estado || '',
    ].filter(Boolean);
    extras.push({ titulo: 'Simulador', texto: partes.join('\n\n') });
  }

  return extras;
};

const TokenDetails = ({ nombre, contenido, defaultExpanded = false }) => {
  const [, setExpanded] = useState(defaultExpanded);

  if (!contenido) return null;

  const secciones = SECCIONES.map(({ clave, titulo }) => ({
    titulo,
    texto: leerCampo(contenido, clave),
  })).filter((seccion) => Boolean(seccion.texto));

  const seccionesCompuestas = construirSeccionesExtra(contenido);

  // Caja HECHA VISIBLE: explicación principal, desplegada desde el inicio.
  const principales = secciones.filter((s) => s.titulo !== 'Reglas y transparencia');

  // Bloque DESPLEGABLE: lo extenso (reglas y transparencia, estado,
  // documentos wiki, etc.). El usuario lo abre solo si lo requiere.
  const desplegables = [
    ...secciones.filter((s) => s.titulo === 'Reglas y transparencia'),
    ...seccionesCompuestas,
    ...secciones.filter((s) => s.titulo === 'Estado de implementación'),
  ];

  if (principales.length === 0 && desplegables.length === 0) return null;

  return (
    <Box
      sx={{
        mt: 2,
        width: '100%',
        border: '1px solid rgba(138,92,245,0.35)',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: 'rgba(255,255,255,0.04)',
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
          Conoce {nombre}
        </Typography>
      </AccordionSummary>

      {/* 1) Principal, siempre visible */}
      {principales.map((seccion, index) => (
        <Box key={seccion.titulo} sx={{ p: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: { xs: '0.78rem', sm: '0.82rem' },
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
        </Box>
      ))}

      {/* 2) Bloque desplegable: reglas y transparencia, estado, documentos wiki. */}
      {desplegables.length > 0 ? (
        <Accordion
          defaultExpanded={defaultExpanded}
          onChange={(_, next) => setExpanded(next)}
          disableGutters
          elevation={0}
          sx={{
            mt: 0,
            border: '1px solid rgba(138,92,245,0.35)',
            borderTop: 'none',
            width: '100%',
            '&:first-of-type': { borderTop: '1px solid rgba(138,92,245,0.35)' },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: '#c9b4ff' }} />}
            aria-controls={`token-detail-${nombre}`}
            id={`token-detail-header-${nombre}`}
            sx={{ '& .MuiAccordionSummary-content': { my: 1 } }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: '0.8rem', sm: '0.85rem' },
                color: '#c9b4ff',
                letterSpacing: '-0.01em',
              }}
            >
              {desplegables.map((d) => d.titulo).join(' · ')}
            </Typography>
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0 }}>
            {desplegables.map((seccion, index) => (
              <Box key={seccion.titulo} sx={{ mb: index === desplegables.length - 1 ? 0 : 2 }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '0.78rem', sm: '0.82rem' },
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
              </Box>
            ))}
          </AccordionDetails>
        </Accordion>
      ) : null}
      )}

      {/* Versión y fecha de revisión del contenido (transparencia editorial) */}
      {contenido.version && (
        <Typography
          sx={{
            mt: 1,
            fontSize: 10,
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'left',
          }}
        >
          Versión del contenido: {contenido.version}
          {contenido.fecha ? ` · Revisado el ${contenido.fecha}` : ''}
        </Typography>
      )}
    </Box>
  );
};

export default TokenDetails;
