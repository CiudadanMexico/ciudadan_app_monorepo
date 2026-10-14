import React, { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ── IMÁGENES ORIGINALES RECUPERADAS ────────────────────────────────────────
// Procedencia: estas 4 imágenes y el carrusel de personajes vienen del
// componente `src/components/Home/Intro.jsx` (hero del Home), que es el
// componente de roles con una imagen por rol que existía en el repo.
// Se reutilizan TAL CUAL (mismos archivos, mismos títulos): no se sustituyen
// por emojis ni iconos genéricos.
//
// Rutas verificadas en el árbol actual y en el historial
// (`git log --all --diff-filter=A`), presentes además en las ramas
// `feature/abraham-home`, `feature/abraham-gana`, `feature/abraham-cartera`,
// `feature/abraham-wallet` y `feature/abraham-lideresysociosconductores`:
//   src/assets/programadores.png    (281 KB)
//   src/assets/becarios.png         (307 KB)
//   src/assets/profesionales.png    (335 KB)
//   src/assets/universitarios.png   (283 KB)
import programadores from '../../assets/programadores.png';
import becarios from '../../assets/becarios.png';
import profesionales from '../../assets/profesionales.png';
import universitarios from '../../assets/universitarios.png';

/**
 * Carrusel de roles para participar y generar ingresos, integrado en la ficha
 * de Pesos MXN de la Cartera.
 *
 * ADAPTACIÓN (no restauración literal): el `Intro.jsx` original es un hero de
 * pantalla completa (`100vw`/`100vh`, fondo propio, tipografías neón y textos de
 * marketing). Aquí se conserva lo esencial y verificable —las 4 imágenes
 * originales, sus títulos y la navegación con flechas— y se adapta a la
 * arquitectura de la Cartera:
 *   - componentes funcionales + hooks, MUI + `sx` (como el resto de Cartera);
 *   - se integra en el panel existente en lugar de inventar una página nueva;
 *   - fondo y estilos morados de la Cartera, no los del hero.
 *
 * NO se restaura el `alert()` que tenía
 * `components/Cartera/ImagenInteractiva.jsx` (botones que no hacían nada) ni se
 * inventan enlaces: cada rol declara su destino real y, si no existe, su
 * simulador se anuncia como pendiente sin botón.
 *
 * `roles` es inyectable para reutilizar el carrusel con otros datos.
 */

const ROLES_RECUPERADOS = [
  {
    key: 'programadores',
    img: programadores,
    titulo: 'Programadores y Profesores',
    descripcion:
      'Resuelve encargos de software y docencia publicados por agencias, y participa como colaborador habilitado.',
    destino: { label: 'Ver tareas', to: '/coowork?tab=generales', estado: 'disponible' },
    simulador: { label: 'Simulador de colaborador', estado: 'pendiente' },
  },
  {
    key: 'becarios',
    img: becarios,
    titulo: 'Becarios',
    descripcion:
      'Formación y actividades remuneradas del ecosistema mientras adquieres capacidades acreditables.',
    destino: { label: 'Ir a Gana', to: '/gana/ver-anuncios', estado: 'disponible' },
    simulador: { label: 'Simulador de becario', estado: 'pendiente' },
  },
  {
    key: 'profesionales',
    img: profesionales,
    titulo: 'Profesionales y Expertos',
    descripcion:
      'Aporta tu especialidad en tareas de agencia y en proyectos productivos de la red.',
    destino: { label: 'Ver tareas', to: '/coowork?tab=generales', estado: 'disponible' },
    simulador: { label: 'Simulador de socio de agencia', estado: 'pendiente' },
  },
  {
    key: 'universitarios',
    img: universitarios,
    titulo: 'Universitarios',
    descripcion:
      'Participa en encargos y actividades de la comunidad compaginándolo con tus estudios.',
    destino: { label: 'Ver tareas', to: '/coowork?tab=generales', estado: 'disponible' },
    simulador: { label: 'Simulador de universitario', estado: 'pendiente' },
  },
];

const RolesParticipar = ({ roles = ROLES_RECUPERADOS, onAbrirWiki }) => {
  const navigate = useNavigate();
  const [indice, setIndice] = useState(0);

  // El carrusel avanza solo, como en el componente original. Se detiene si la
  // lista cambia de tamaño para no salirnos de rango.
  useEffect(() => {
    if (roles.length <= 1) return undefined;
    const t = setInterval(() => setIndice((i) => (i + 1) % roles.length), 6000);
    return () => clearInterval(t);
  }, [roles.length]);

  if (!roles || roles.length === 0) return null;

  const actual = roles[Math.min(indice, roles.length - 1)];
  const mover = (delta) => setIndice((i) => (i + delta + roles.length) % roles.length);

  return (
    <Box sx={{ width: '100%', textAlign: 'left' }}>
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: 11,
          color: '#8ee9d6',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          mb: 1,
        }}
      >
        Formas de participar y generar ingresos
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          p: { xs: 1.5, sm: 2 },
          bgcolor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(138,92,245,0.35)',
          borderRadius: 2,
        }}
      >
        {/* Imagen del rol: la original, sin recortes forzados */}
        <Box
          sx={{
            flex: { xs: 'none', sm: '0 0 42%' },
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            minHeight: { xs: 180, sm: 220 },
          }}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={actual.key}
              src={actual.img}
              alt={actual.titulo}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              style={{
                maxWidth: '100%',
                maxHeight: 260,
                objectFit: 'contain',
                borderRadius: 8,
              }}
            />
          </AnimatePresence>
        </Box>

        {/* Texto y acciones del rol */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${actual.key}-txt`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#c9b4ff' }}>
                {actual.titulo}
              </Typography>
              <Typography sx={{ fontSize: 12, mt: 0.5, lineHeight: 1.6, opacity: 0.85 }}>
                {actual.descripcion}
              </Typography>
            </motion.div>
          </AnimatePresence>

          {/* Acciones reales: sólo si el destino existe de verdad */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5, alignItems: 'center' }}>
            {actual.destino && actual.destino.estado === 'disponible' && actual.destino.to ? (
              <Button
                size="small"
                variant="contained"
                onClick={() => navigate(actual.destino.to)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: '#8A5CF5',
                  '&:hover': { bgcolor: '#7346e0' },
                }}
              >
                {actual.destino.label}
              </Button>
            ) : null}

            {/* Simulador pendiente: se ANUNCIA, no se ofrece como botón. */}
            {actual.simulador ? (
              <Typography sx={{ fontSize: 11, opacity: 0.7 }}>
                {actual.simulador.label}: próximamente
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Box>

      {/* Navegación del carrusel (flechas, como en el componente original) */}
      {roles.length > 1 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mt: 1 }}>
          <Button
            size="small"
            onClick={() => mover(-1)}
            aria-label="Rol anterior"
            sx={{ minWidth: 40, color: '#c9b4ff', border: '1px solid rgba(138,92,245,0.55)' }}
          >
            ◀
          </Button>

          <Typography sx={{ fontSize: 11, opacity: 0.75, minWidth: 60, textAlign: 'center' }}>
            {indice + 1} / {roles.length}
          </Typography>

          <Button
            size="small"
            onClick={() => mover(1)}
            aria-label="Rol siguiente"
            sx={{ minWidth: 40, color: '#c9b4ff', border: '1px solid rgba(138,92,245,0.55)' }}
          >
            ▶
          </Button>
        </Box>
      ) : null}

      {typeof onAbrirWiki === 'function' ? (
        <Button
          size="small"
          onClick={onAbrirWiki}
          sx={{ mt: 1, textTransform: 'none', color: '#c9b4ff', fontSize: 11 }}
        >
          Ver explicación ampliada en la wiki
        </Button>
      ) : null}
    </Box>
  );
};

export default RolesParticipar;
