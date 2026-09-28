import React from 'react';
import TokenPlaceholderPage from '../components/Cartera/TokenPlaceholderPage.jsx';

/**
 * Ruta /objetos — ficha navegable del Object-Token.
 * Marcador de posición: no hay registro de objetos todavía.
 */
const Objetos = () => (
  <TokenPlaceholderPage
    titulo="Objetos y activos (Object-Token)"
    chip="Módulo en desarrollo"
    subtitulo="El Object-Token representa objetos y activos registrados dentro del ecosistema Ciudadan."
    bloques={[
      {
        titulo: '¿Qué será este módulo?',
        texto:
          'Un registro de objetos y activos con significado para la comunidad: herramientas, equipos, productos o pertenencias que conviene identificar y vincular a las personas y agencias que los usan.',
      },
      {
        titulo: 'Por qué importa',
        texto:
          'Las agencias suelen administrar activos compartidos y las tareas muchas veces requieren o producen objetos. Darles trazabilidad permite saber qué existe, quién lo tiene y en qué trabajo se usa.',
      },
      {
        titulo: 'Qué falta para que funcione',
        texto:
          'Faltan el alta de objetos, la vinculación con tu cuenta o tu agencia y la integración con las tareas del CoWork. Ninguna de esas piezas está implementada todavía.',
      },
    ]}
    notaEstado="Estado actual: sección informativa y navegable. Todavía no se pueden registrar objetos ni consultar activos; el módulo se encuentra en desarrollo."
  />
);

export default Objetos;
