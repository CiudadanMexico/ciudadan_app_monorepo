import React from 'react';
import TokenPlaceholderPage from '../components/Cartera/TokenPlaceholderPage.jsx';

/**
 * Ruta /votaciones — ficha navegable del Vote-Token.
 * Marcador de posición integrado: no existen votaciones reales todavía.
 */
const Votaciones = () => (
  <TokenPlaceholderPage
    titulo="Votaciones y gobernanza (Vote-Token)"
    chip="Módulo en desarrollo"
    subtitulo="El Vote-Token representa tu voz en las decisiones colectivas de la comunidad Ciudadan."
    bloques={[
      {
        titulo: '¿Qué será este módulo?',
        texto:
          'Aquí se reunirán las votaciones abiertas de la comunidad: propuestas, prioridades y decisiones que hoy se toman sin un registro público y verificable.',
      },
      {
        titulo: 'Por qué importa',
        texto:
          'En el modelo de Cooperativismo 6.0 la gobernanza es parte de la participación: quien aporta trabajo, aprendizaje y continuidad debería poder influir en las decisiones que afectan al conjunto.',
      },
      {
        titulo: 'Qué falta para que funcione',
        texto:
          'Faltan la definición formal de cómo se emiten los votos, con qué peso (relación con tu identidad, tu reputación y tus evaluaciones) y cómo se registra el resultado. Nada de eso está implementado todavía.',
      },
    ]}
    notaEstado="Estado actual: sección informativa y navegable. No hay votaciones activas ni emisión de votos; el módulo se encuentra en desarrollo."
  />
);

export default Votaciones;
